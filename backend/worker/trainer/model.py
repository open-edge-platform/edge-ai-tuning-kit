# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

# Model Pipeline scripts
import os
import re
import gc
import math
import asyncio
from datetime import datetime
from loguru import logger

import transformers
from transformers import AutoTokenizer, BitsAndBytesConfig, TrainerCallback
from huggingface_hub import login
from sentence_transformers import SentenceTransformer, util
from sklearn.metrics.pairwise import cosine_similarity

import torch
import intel_extension_for_pytorch as ipex
from peft import LoraConfig
from ipex_llm.transformers import AutoModelForCausalLM
from ipex_llm.transformers.low_bit_linear import LowBitLinear
from ipex_llm.transformers.qlora import get_peft_model, prepare_model_for_kbit_training, PeftModel

class TrainerCallback(TrainerCallback):
    def __init__(self, task_id, callback, resume_from_checkpoint=False):
        self.task_id = task_id
        self.callback = callback
        self.resume_from_checkpoint=resume_from_checkpoint
        self.train_history = []
        self.eval_history = []
        self.train_runtime = []
        self.start_time = datetime.now()
        self.step_processed = 0
        self.max_steps = 0
        self.train_remaining_time = 0

    def _calculate_remaining_time(self, step):
        elapsedTime = datetime.now() - self.start_time
        self.train_remaining_time = str(((elapsedTime/self.step_processed)*(self.max_steps - step)))
    
    def _resume_from_checkpoint(self, state):
        for train_history in state.log_history:
            if 'loss' in train_history.keys():
                self.train_history.append(train_history)
            if 'eval_loss' in train_history.keys():
                self.eval_history.append(train_history)
            if 'train_runtime' in train_history.keys():
                self.train_runtime.append(train_history)
        self.resume_from_checkpoint = False
    
    def on_log(self, args, state, control, logs=None, **kwargs):
        if state.is_local_process_zero:
            self.max_steps = state.max_steps
            if self.resume_from_checkpoint:
                self._resume_from_checkpoint(state)
            logs["step"] = state.global_step
            if isinstance(logs, dict):
                if 'loss' in logs.keys():
                    self.step_processed += 1
                    self._calculate_remaining_time(state.global_step)
                    self.train_history.append(logs)
                if 'eval_loss' in logs.keys():
                    self.eval_history.append(logs)
                if 'train_runtime' in logs.keys():
                    self.train_runtime.append(logs)
            result ={
                "results": {
                    "start_time": self.start_time.strftime('%Y-%m-%d %H:%M:%S'),
                    "recent_log_time": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "max_steps": self.max_steps,
                    "train_remaining_time": self.train_remaining_time,
                    "train_history": self.train_history,
                    "eval_history": self.eval_history,
                    "train_runtime": self.train_runtime,
                }
            }
            asyncio.run(self.callback(self.task_id, result, 'update_task'))

class ModelTrainer():
    def __init__(self, configs) -> None:
        self.configs = configs
        self.model_path = configs["model"]["model_path"] if configs[
            "model"]["model_path"] else "mistralai/Mistral-7B-v0.1"
        self.device = configs["model"]["device"]

    def _get_all_linear_layers(self, model):
        lora_module_names = set()
        for name, module in model.named_modules():
            if isinstance(module, LowBitLinear):
                names = name.split('.')
                lora_module_names.add(
                    names[0] if len(names) == 1 else names[-1])
        return list(lora_module_names)

    def merge_model_with_adapter(self, model_path, adapter_path, output_path):
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        base_model = AutoModelForCausalLM.from_pretrained(
            model_path,
            torch_dtype=torch.float16,
            device_map={"": "cpu"},
        )

        lora_model = PeftModel.from_pretrained(
            base_model,
            adapter_path,
            device_map={"": "cpu"},
            torch_dtype=torch.float16,
        )
        lora_model = lora_model.merge_and_unload()
        lora_model.train(False)

        lora_model_sd = lora_model.state_dict()
        deloreanized_sd = {
            k.replace("base_model.model.", ""): v
            for k, v in lora_model_sd.items()
            if "lora" not in k
        }
        base_model.save_pretrained(output_path, state_dict=deloreanized_sd)
        tokenizer.save_pretrained(output_path)

    def initialize_model_and_tokenizers(self):
        try:
            logger.info(
                f"Initializing model tokenizers: {self.model_path} ...")
            tokenizer = AutoTokenizer.from_pretrained(
                self.model_path,
                add_eos_token=True,
                max_model_length=512,
                trust_remote_code=True
            )
            tokenizer.pad_token_id = 0
            tokenizer.padding_side = "left"

            logger.info(f"Initializing model: {self.model_path} ...")
            if self.device == "cpu":
                model = AutoModelForCausalLM.from_pretrained(
                    self.model_path,
                    load_in_low_bit="sym_int4",
                    optimize_model=False,
                    torch_dtype=torch.bfloat16,
                    modules_to_not_convert=["lm_head"]
                )
            elif self.device == "xpu":
                model = AutoModelForCausalLM.from_pretrained(
                    self.model_path,
                    load_in_low_bit="nf4",
                    optimize_model=False,
                    torch_dtype=torch.bfloat16,
                    modules_to_not_convert=["lm_head"]
                )
            else:
                raise NotImplementedError(
                    f"Model finetuning on device: {self.device} is not supported currently ...")

            logger.info(f"Loading model into device: {self.device}")
            model = model.to(self.device)

            if self.configs["trainer"]['gradient_accumulation_steps'] > 1:
                logger.warning(
                    f"Gradient checkpoint is enabled. This will reduce memory usage but slowdown the finetuning speed ...")
                model.gradient_checkpointing_enable()

            model_lora_layers = self._get_all_linear_layers(model)
            logger.info(
                f"Training on the following linear layers: {model_lora_layers}")
            lora_config = LoraConfig(
                r=self.configs["lora"]['r'],
                lora_alpha=self.configs["lora"]['lora_alpha'],
                target_modules=model_lora_layers,
                lora_dropout=self.configs["lora"]['lora_dropout'],
                bias=self.configs["lora"]['bias'],
                task_type=self.configs["lora"]['task_type']
            )

            model = prepare_model_for_kbit_training(model)
            model = get_peft_model(model, lora_config)

            logger.info(f"----- Model Trainable Parameters -----")
            model.print_trainable_parameters()

            return model, tokenizer

        except Exception as error:
            raise RuntimeError(
                f"Error in initializing model and tokenizers, error: {error}")

    def _retrieve_key_in_prompt_template(self, prompt_template):
        pattern = r'\{([^{}]+)\}'
        matches = re.findall(pattern, prompt_template)
        return matches

    def _update_dict_with_missing_keys(self, data: dict, required_keys: list) -> dict:
        updated_data = data.copy()
        for key in required_keys:
            if key not in updated_data:
                updated_data[key] = ""
        return updated_data

    def _calculate_accuracy_score(self, result_list: list, task_id):
        model = SentenceTransformer('all-MiniLM-L6-v2')
        similarity_threshold = 0.8
        file_path = f"./data/models/{task_id}/training.txt"
        score_list = []
        for result in result_list:
            generated_result = result[0]
            original_result = result[1]
            generated_embeddings = model.encode(
                generated_result, convert_to_tensor=True)
            original_embeddings = model.encode(
                original_result, convert_to_tensor=True)
            similarity_score = util.cos_sim(
                generated_embeddings, original_embeddings)
            logger.debug(
                f"### Original:\n{original_result}\n### Generated:\n{generated_result}\n ### Cosine similarity score: {similarity_score}")
            with open(file_path, 'a') as file:
                file.write(f"### Original:\n{original_result}\n### Generated:\n{generated_result}\n ### Cosine similarity score: {similarity_score}\n")

            if similarity_score < similarity_threshold:
                score_list.append(False)
            else:
                score_list.append(True)

        true_count = score_list.count(True)
        result_percentage = (true_count / len(score_list)) * 100
        logger.info(
            f"Model accuracy with cosine similarity: {result_percentage}%")
        return result_percentage

    def evaluate_model(self, model_path, dataset, prompt_template, task_id):
        prompt_key = self._retrieve_key_in_prompt_template(prompt_template)
        result_key = prompt_key[-1]

        model = AutoModelForCausalLM.from_pretrained(
            model_path,
            load_in_4bit=True,
            trust_remote_code=True,
        )
        tokenizer = AutoTokenizer.from_pretrained(
            model_path,
            add_bos_token=True,
            trust_remote_code=True
        )
        tokenizer.pad_token = tokenizer.eos_token
        file_path = f"./data/models/{task_id}/training.txt"
        result_list = []
        model.eval()
        with torch.no_grad():
            for data in dataset:
                answer = data[result_key]
                data[result_key] = ""
                formatted_data = self._update_dict_with_missing_keys(
                    data, prompt_key)
                inputs = tokenizer(prompt_template.format(
                    **formatted_data), return_tensors="pt").input_ids
                outputs = model.generate(
                    inputs,
                    max_new_tokens=1024,
                    temperature=0.01,
                    do_sample=True,
                    repetition_penalty=1.15
                )
                result = tokenizer.batch_decode(
                    outputs[:, inputs.shape[1]:], skip_special_tokens=True
                )[0]
                with open(file_path, 'a') as file:
                    file.write(f"INPUT: {prompt_template.format(**formatted_data)}\n")
                    file.write(f"ANSWER: {answer}\n")
                    file.write(f"RESULT: {result}\n\n")
                    
                result_list.append((answer, result))

        model_accuracy = self._calculate_accuracy_score(result_list, task_id)
        return model_accuracy

    def train_model(self, task_id, model, tokenizer, train_data, val_data, output_dir, resume_from_checkpoint=False, callback=None):
        # Trainer args
        trainer_args = transformers.TrainingArguments(
            output_dir=output_dir + '/checkpoints',
            evaluation_strategy="epoch",
            per_device_train_batch_size=self.configs["trainer"]['per_device_train_batch_size'],
            per_device_eval_batch_size=self.configs["trainer"]['per_device_eval_batch_size'],
            gradient_accumulation_steps=self.configs["trainer"]['gradient_accumulation_steps'],
            learning_rate=self.configs["trainer"]['learning_rate'],
            # weight_decay=0,
            num_train_epochs=self.configs["trainer"]['num_train_epochs'],
            lr_scheduler_type=self.configs["trainer"]['lr_scheduler_type'],
            # warmup_steps=0,
            logging_strategy="steps",
            logging_steps=1,
            save_strategy="epoch",
            save_total_limit=2,
            bf16=True,
            load_best_model_at_end=True,
            optim=self.configs["trainer"]['optim'],
            gradient_checkpointing=False if self.configs["trainer"][
                'gradient_accumulation_steps'] == 1 else True
        )

        trainer = transformers.Trainer(
            model=model,
            train_dataset=train_data,
            eval_dataset=val_data,
            args=trainer_args,
            data_collator=transformers.DataCollatorForLanguageModeling(
                tokenizer, mlm=False),
            callbacks=[TrainerCallback(task_id, callback, resume_from_checkpoint)]
        )
        model.config.use_cache = False

        if (resume_from_checkpoint) and (os.listdir(output_dir+'/checkpoints')):
            logger.info(f"Resume model training from checkpoint ...")
        else:
            logger.info(f"Starting model training ...")
            resume_from_checkpoint=False
        trainer.train(resume_from_checkpoint=resume_from_checkpoint)

        logger.info(f"Evaluating model perplexity score ...")
        eval_results = trainer.evaluate()
        perplexity_scores = round(math.exp(eval_results['eval_loss']), 4)

        train_history = []
        eval_history = []
        train_runtime = []
        metrics = []

        for elem in trainer.state.log_history:
            if 'loss' in elem.keys():
                train_history.append(elem)
            if 'eval_loss' in elem.keys():
                eval_history.append(elem)
            if 'train_runtime' in elem.keys():
                train_runtime.append(elem)

        metrics.append({'perplexity': perplexity_scores})
        results = {
            "train_history": train_history,
            "eval_history": eval_history,
            "train_runtime": train_runtime,
            "metrics": metrics
        }

        logger.info(f"Saving trained model adapters ...")
        model.save_pretrained(output_dir + '/adapters')

        if self.device == "xpu":
            logger.debug(f"Release GPU memory after training ...")
            torch.xpu.empty_cache()

        return results
