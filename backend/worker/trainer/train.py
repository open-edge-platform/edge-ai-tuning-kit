# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import sys
import shutil
sys.path.append("/usr/src/app")

import gc
import json
import yaml
import asyncio

from celery.utils.log import get_task_logger

import torch
from datasets import concatenate_datasets

from models.utils import merge_model_with_adapter, model_evaluation, mode_accuracy_evaluation, model_func_call_evaluation, analyze_chat_template, export_to_openvino, copy_phi_python_configs
from models.ipex import IPEXModel
from dataset.loader import DatasetHandler
from dataset.generator import SyntheticDataGenerator, SyntheticModel
from common.config import GENERATION_MODEL, GENERATION_MODEL_DEVICE
from common.callbacks import on_training_callback


logger = get_task_logger(__name__)


def val_test_dataset_generation(args):
    if not os.path.isfile(args.config_file):
        raise RuntimeError("No training config found. Exiting training.")
    with open(args.config_file, "r") as file:
        config = yaml.safe_load(file)

    data_args = config['data_args']
    asyncio.run(on_training_callback(data_args['task_id'], {"results": {"stage": "Starting Synthetic Validation & Test Dataset Generation"}}))
    synthetic_val_path = f"./data/tasks/{data_args['task_id']}/datasets/synthetic-val.json"
    synthetic_test_path = f"./data/tasks/{data_args['task_id']}/datasets/synthetic-test.json"
    
    if os.path.exists(synthetic_val_path) and os.path.exists(synthetic_test_path):
        logger.info(f"Synthetic dataset for val and test are available. Skipping synthetic generation workflow.")
        return

    ds_loader = DatasetHandler(data_args['data_path'])
    _, val_dataset, test_dataset = ds_loader.create_train_test_val_dataset()

    try:
        logger.info(f"Starting synthetic generation workflow ...")
        synthetic_val_dataset = None
        synthetic_test_dataset = None
        model_path = GENERATION_MODEL
        device = GENERATION_MODEL_DEVICE

        llm_pipeline = SyntheticModel(
            model_path=model_path,
            device=device,
        )
        tokenizer, model = llm_pipeline.init_model()
        generator = SyntheticDataGenerator(
            tokenizer=tokenizer,
            model=model,
            device=device
        )

        if not os.path.exists(synthetic_val_path):
            logger.info("Generating synthetic validation set")
            synthetic_val_dataset = generator.create_synthetic_dataset(
                val_dataset,
                data_args['task_id'],
                "val"
            )
            val_data = [data for data in synthetic_val_dataset]
            with open(synthetic_val_path, "w") as f:
                json.dump(val_data, f, indent=4)
        
        if not os.path.exists(synthetic_test_path):
            logger.info("Generating synthetic test set")
            synthetic_test_dataset = generator.create_synthetic_dataset(
                test_dataset,
                data_args['task_id'],
                "test"
            )
            test_data = [data for data in synthetic_test_dataset]
            with open(synthetic_test_path, "w") as f:
                json.dump(test_data, f, indent=4)

        if "xpu" in device:
            torch.xpu.empty_cache()

        del generator
        gc.collect()

    except Exception as error:
        raise RuntimeError(
            f"Error when generating synthetic validation and test set. Error: {error}")


def export_model(args):
    if not os.path.isfile(args.config_file):
        raise RuntimeError("No training config found. Exiting training.")

    with open(args.config_file, "r") as file:
        config = yaml.safe_load(file)
    
    data_args = config['data_args']

    # Convert model to OV format
    isConverted = export_to_openvino(data_args['task_id'])
    if not isConverted:
        raise RuntimeError("Failed to convert model to OpenVINO format.")
    

def finetuning(args):
    if not os.path.isfile(args.config_file):
        raise RuntimeError("No training config found. Exiting training.")

    with open(args.config_file, "r") as file:
        config = yaml.safe_load(file)

    model_args = config['model_args']
    adapter_args = config['adapter_args']
    data_args = config['data_args']
    training_args = config['training_args']

    # Verify if DDP is needed
    rank = int(os.environ.get('LOCAL_RANK', 0))
    logger.info(f"My rank is {rank}")
    world_size = int(os.environ.get("WORLD_SIZE", 1))
    logger.info(f"World size: {world_size}")
    ddp = world_size != 1
    logger.info(f"Using DDP: {ddp}")
    if ddp:
        training_args['gradient_accumulation_steps'] = training_args['gradient_accumulation_steps'] // world_size
        if training_args['gradient_accumulation_steps'] == 0:
            logger.warning(
                "Gradient accumulation steps does not set correctly for ddp. You should set it based on the [<your-current-gradient-accumulation-steps> * <world-size>]. Defaulting it to 1.")
            training_args['gradient_accumulation_steps'] = 1
            config['training_args'] = training_args
            asyncio.run(on_training_callback(
                data_args['task_id'], {'configs': config}))

    # Train, val, test dataloader
    synthetic_val_path = f"./data/tasks/{data_args['task_id']}/datasets/synthetic-val.json"
    synthetic_test_path = f"./data/tasks/{data_args['task_id']}/datasets/synthetic-test.json"
    if not os.path.isfile(synthetic_val_path):
        synthetic_val_path = None

    if not os.path.isfile(synthetic_test_path):
        synthetic_test_path = None

    ds_loader = DatasetHandler(
        data_args['data_path'], synthetic_val_path, synthetic_test_path)
    train_dataset, val_dataset, test_dataset = ds_loader.create_train_test_val_dataset()

    # Init model and tokenizer
    trainer = IPEXModel(
        model_args['model_name_or_path'], model_args['device'])
    model, tokenizer = trainer.create_model_and_tokenizer(
        task_type=adapter_args['training_type'].lower(),
        deepspeed=training_args['deepspeed']
    )
    logger.info(f"Model layers:\n{model}")
    logger.info(f"Model loaded on rank {os.environ.get('LOCAL_RANK')}")
    model = model.to(
        f'{model_args["device"]}:{os.environ.get("LOCAL_RANK", 0)}')
    logger.info(f"Model moved to rank {os.environ.get('LOCAL_RANK')}")

    # Patch model to specific task
    model = trainer.init_model_adapter(
        model,
        adapter_args
    )

    # Check chat_template allows system message as "role" based on jinja
    isSystemRole = analyze_chat_template(tokenizer)

    def generate_and_tokenize_prompt(data, isSystemRole, system_message=None, cutoff_len=512, eval=False, tools=None):
        # Check if have system key
        if 'user_message' and 'assistant_message' in data:
            if system_message == None:
                logger.warning(
                    "No system message received. Will use default system message to train the model.")
                system_message = "You are a helpful and truthful assistant. Provide an answer based on the question below.\n\nQuestion: "

            if tools is not None:
                system_message = system_message + \
                    f"Here are the available tools: <tools> {tools} </tools>"

            if eval == False:
                if isSystemRole:
                    chat_messages = [
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": data['user_message']},
                        {"role": "assistant",
                            "content": data['assistant_message']},
                    ]
                else:
                    chat_messages = [
                        {"role": "user", "content": system_message +
                            data['user_message']},
                        {"role": "assistant",
                            "content": data['assistant_message']},
                    ]
            else:
                if isSystemRole:
                    chat_messages = [
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": data['user_message']}
                    ]
                else:
                    chat_messages = [
                        {"role": "user", "content": system_message +
                            data['user_message']}
                    ]
                data['formatted_chat_message'] = chat_messages
            formatted_chat_message = tokenizer.apply_chat_template(
                chat_messages,
                tokenize=False,
                add_generation_prompt=False if eval == False else True
            )
            tokenized_chat_message = tokenizer(
                formatted_chat_message,
                truncation=True,
                max_length=cutoff_len,
                padding=False,
                return_tensors=None,
            )
            return tokenized_chat_message
        else:
            prompt_template = "[INST] You are a helpful assistant.\n\nUser: {user_message} [/INST] Assistant: {assistant_message}"
            formatted_prompt = prompt_template.format(**data)
            tokenized_formatted_prompt = tokenizer(formatted_prompt)
            return tokenized_formatted_prompt

    # Dataset Loader
    train_data = train_dataset.shuffle().map(lambda data: generate_and_tokenize_prompt(
        data, isSystemRole, system_message=data_args['system_message'], cutoff_len=data_args['cutoff_len']))
    val_data = val_dataset.shuffle().map(lambda data: generate_and_tokenize_prompt(
        data, isSystemRole, system_message=data_args['system_message'], cutoff_len=data_args['cutoff_len']))
    test_data = test_dataset.shuffle().map(lambda data: generate_and_tokenize_prompt(
        data, isSystemRole, system_message=data_args['system_message'], cutoff_len=data_args['cutoff_len'], eval=True))

    # Dataset Loader with tools
    if data_args["tools"] is not None and model_args['model_name_or_path'] == "NousResearch/Hermes-2-Pro-Mistral-7B":
        train_tools_data = train_dataset.shuffle().map(lambda data: generate_and_tokenize_prompt(
            data, isSystemRole, system_message=data_args['system_message'], cutoff_len=data_args['cutoff_len'], tools=data_args['tools']))
        val_tools_data = val_dataset.shuffle().map(lambda data: generate_and_tokenize_prompt(
            data, isSystemRole, system_message=data_args['system_message'], cutoff_len=data_args['cutoff_len'], tools=data_args['tools']))
        test_tools_data = test_dataset.shuffle().map(lambda data: generate_and_tokenize_prompt(
            data, isSystemRole, system_message=data_args['system_message'], cutoff_len=data_args['cutoff_len'], eval=True, tools=data_args['tools']))
        train_data = concatenate_datasets([train_data, train_tools_data])
        val_data = concatenate_datasets([val_data, val_tools_data])
        test_data = concatenate_datasets([test_data, test_tools_data])

    asyncio.run(on_training_callback(data_args['task_id'], {"results": {"stage": "Training Model"}}))
    # Training
    train_history = trainer.train_model(
        model,
        tokenizer,
        train_data,
        val_data,
        training_args,
        ddp,
        args.resume_from_checkpoint,
        data_args['task_id'],
        callback=on_training_callback
    )

    # Release GPU memory
    if model.device == "xpu":
        logger.debug(f"Release GPU memory after training ...")
        torch.xpu.empty_cache()

    del train_data
    del val_data
    del model
    gc.collect()

    # This only run on master node first card
    if rank == 0:
        asyncio.run(on_training_callback(data_args['task_id'], {"results": {"stage": "Merging Model"}}))
        # Merging the adpater with the model
        logger.info(f"[Node {rank}]: Merging the model adapter")
        if adapter_args['training_type'].lower() == 'lora' or adapter_args['training_type'].lower() == 'qlora':
            merge_model_with_adapter(
                model_args['model_name_or_path'],
                f"{training_args['output_dir']}/adapters",
                f"{training_args['output_dir']}/models"
            )

        # Evaluating the model accuracy
        asyncio.run(on_training_callback(data_args['task_id'], {"results": {"stage": "Evaluating Model"}}))
        
        # Copy python configuration files for Phi models
        copy_phi_python_configs(model_args['model_name_or_path'], training_args['output_dir'])
        
        evaluator = IPEXModel(
            f"{training_args['output_dir']}/models", model_args['device'])
        model, tokenizer = evaluator.create_eval_model_and_tokenizer()
        eval_result_list = model_evaluation(model, tokenizer, test_data)
        model_accuracy = mode_accuracy_evaluation(
            eval_result_list, result_dir=f"{training_args['output_dir']}")

        train_history['metrics'].append({"accuracy": round(model_accuracy, 2)})

        if data_args["tools"] is not None and model_args['model_name_or_path'] == "NousResearch/Hermes-2-Pro-Mistral-7B":
            func_call_accuracy = model_func_call_evaluation(
                eval_result_list, result_dir=f"{training_args['output_dir']}")
            train_history['metrics'].append(
                {"func_call_accuracy": round(func_call_accuracy, 2)})

        train_result = {
            'status': 'SUCCESS',
            'results': train_history
        }
        asyncio.run(on_training_callback(data_args['task_id'], train_result))
    else:
        logger.info(
            f"[Node {rank}]: Waiting for the master node to perform evaluation")
