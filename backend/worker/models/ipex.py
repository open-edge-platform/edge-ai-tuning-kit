# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import math
import asyncio
from pathlib import Path
from datetime import datetime
from packaging import version
from celery.utils.log import get_task_logger

import torch
from torch.nn import Linear
import transformers
from transformers import AutoTokenizer, EarlyStoppingCallback, TrainerCallback

import ipex_llm
import hooks.ipexllm
from ipex_llm.transformers import AutoModelForCausalLM
from ipex_llm.transformers.low_bit_linear import LowBitLinear, BF16Linear
from ipex_llm.transformers.qlora import get_peft_model, prepare_model_for_kbit_training, LoraConfig

logger = get_task_logger(__name__)


class ProgressCallback(TrainerCallback):
    def __init__(self, task_id, callback, resume_from_checkpoint=False):
        self.task_id = task_id
        self.callback = callback
        self.resume_from_checkpoint = resume_from_checkpoint
        self.train_history = []
        self.eval_history = []
        self.train_runtime = []
        self.start_time = datetime.now()
        self.step_processed = 0
        self.max_steps = 0
        self.train_remaining_time = 0

    def _calculate_remaining_time(self, step):
        elapsedTime = datetime.now() - self.start_time
        self.train_remaining_time = str(
            ((elapsedTime/self.step_processed)*(self.max_steps - step)))

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
            self.train_result = {
                "results": {
                    "start_time": self.start_time.astimezone().isoformat(),
                    "recent_log_time": datetime.now().astimezone().isoformat(),
                    "max_steps": self.max_steps,
                    "train_remaining_time": self.train_remaining_time,
                    "train_history": self.train_history,
                    "eval_history": self.eval_history,
                    "train_runtime": self.train_runtime,
                }
            }
            if self.task_id and self.callback:
                asyncio.run(self.callback(self.task_id, self.train_result))


class IPEXModel:
    def __init__(self, model_id, device) -> None:
        self.model_id = model_id
        self.device = device
        self
    
    def _is_checkpoint_available(self, directory):
        dir_path = Path(directory)
        return any(entry.is_dir() for entry in dir_path.iterdir())
    
    def _get_latest_checkpoint(self, base_dir):
        directories = [d for d in os.listdir(base_dir) if os.path.isdir(os.path.join(base_dir, d)) and d.startswith('checkpoint-')]
        checkpoint_numbers = [int(d.split('-')[1]) for d in directories]
        latest_checkpoint_number = max(checkpoint_numbers)
        latest_checkpoint_dir = f'checkpoint-{latest_checkpoint_number}'
        return os.path.join(base_dir, latest_checkpoint_dir)

    def _get_all_linear_layers(self, model):
        lora_module_names = set()
        for name, module in model.named_modules():
            if isinstance(module, (LowBitLinear, BF16Linear, Linear)):
                names = name.split('.')
                lora_module_names.add(
                    names[0] if len(names) == 1 else names[-1])
        return list(lora_module_names)

    def create_model_and_tokenizer(self, tokenizer_cutoff_len=512, task_type="qlora", deepspeed=None):
        logger.info(f"Initializing model and tokenizer for {self.model_id}")
        
        current_torch_ver = torch.__version__
        sdpa_ver = "2.1.1"
        attn_func = "eager" if version.parse(current_torch_ver) < version.parse(sdpa_ver) else "sdpa"
        
        tokenizer = AutoTokenizer.from_pretrained(
            self.model_id,
            add_eos_token=True,
            max_model_length=tokenizer_cutoff_len,
            trust_remote_code=True
        )
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        if task_type == "qlora":
            low_bit_dtype = "sym_int4"
            if "xpu" in self.device:
                low_bit_dtype = "nf4"
        elif task_type == "lora":
            low_bit_dtype = "bf16"
        else:
            raise RuntimeError(f"{task_type} for model is not supported yet.")

        if deepspeed:
            logger.info(
                f"Loading model with deepspeed using device: {self.device}")
            model = AutoModelForCausalLM.from_pretrained(
                self.model_id,
                torch_dtype=torch.bfloat16
            ).half()
        else:
            logger.info(
                f"Loading model in {low_bit_dtype} using device: {self.device}")
            model = AutoModelForCausalLM.from_pretrained(
                self.model_id,
                load_in_low_bit=low_bit_dtype,
                attn_implementation=attn_func,
                optimize_model=False,
                torch_dtype=torch.bfloat16,
                modules_to_not_convert=["lm_head"]
            )
        return model, tokenizer

    def create_eval_model_and_tokenizer(self, low_bit_dtype="sym_int4"):
        logger.info(f"Creating model for inferencing: {self.model_id}")
        model = AutoModelForCausalLM.from_pretrained(
            self.model_id,
            load_in_low_bit=low_bit_dtype,
            optimize_model=False,
            trust_remote_code=True,
        )
        tokenizer = AutoTokenizer.from_pretrained(
            self.model_id,
            trust_remote_code=True
        )
        return model, tokenizer

    def init_model_adapter(self, model, adapter_config):
        logger.info(
            f"Initializing model adapter for task type: {adapter_config['training_type']}")
        linear_layers = []
        config = None
        if adapter_config['training_type'].lower() == "qlora" or adapter_config['training_type'].lower() == "lora":
            linear_layers = self._get_all_linear_layers(model)
            if 'lm_head' in linear_layers:
                linear_layers.remove('lm_head')
            logger.info(
                f"Training on the following linear layers: {linear_layers}")
            config = LoraConfig(
                r=adapter_config['r'],
                lora_alpha=adapter_config['lora_alpha'],
                target_modules=linear_layers,
                lora_dropout=adapter_config['lora_dropout'],
                bias=adapter_config['bias'],
                task_type=adapter_config['task_type'],
                training_mode=adapter_config['training_type']
            )
            model = prepare_model_for_kbit_training(model)
            model = get_peft_model(model, config)
        else:
            raise RuntimeError(
                f"{adapter_config['training_type']} is not supported yet.")

        model.print_trainable_parameters()
        model.config.use_cache = False
        return model

    def train_model(self, model, tokenizer, train_data, val_data, training_args, ddp, resume_from_checkpoint=False, task_id="", callback=None):
        checkpoints_dir = training_args['output_dir'] + '/checkpoints'
        
        if resume_from_checkpoint:
            logger.info("Training will resume from the latest checkpoint.")
            resume_from_checkpoint = False
            # TODO: resume from checkpoint has bug due to unmatch tensor type from optimizer to load saved dict. 
            # Currently need to remove and restart the training
            # Enable back once it is fixed
            # if not self._is_checkpoint_available(checkpoints_dir):
            #     logger.warning("No previous checkpoint found. Will restart from scratch.")
            #     resume_from_checkpoint = False

        is_gradient_checkpointing = False if training_args['gradient_accumulation_steps'] else True

        trainer_args = transformers.TrainingArguments(
            output_dir=checkpoints_dir,
            per_device_train_batch_size=training_args['per_device_train_batch_size'],
            per_device_eval_batch_size=training_args['per_device_eval_batch_size'],
            gradient_accumulation_steps=training_args['gradient_accumulation_steps'],
            learning_rate=training_args['learning_rate'],
            num_train_epochs=training_args['num_train_epochs'],
            lr_scheduler_type=training_args['lr_scheduler_type'],
            optim=training_args['optim'],
            gradient_checkpointing=is_gradient_checkpointing,
            ddp_find_unused_parameters=False,
            ddp_backend="ccl",
            evaluation_strategy="epoch",
            logging_strategy="steps",
            logging_steps=1,
            save_strategy="epoch",
            save_total_limit=2,
            bf16=True,
            load_best_model_at_end=True
        )

        # Initializing trainer callback
        earlystopping_callback = EarlyStoppingCallback(3, 0.1)
        progress_callback = ProgressCallback(
            task_id, callback, resume_from_checkpoint)
        
        trainer = transformers.Trainer(
            model=model,
            train_dataset=train_data,
            eval_dataset=val_data,
            args=trainer_args,
            data_collator=transformers.DataCollatorForLanguageModeling(
                tokenizer, mlm=False
            ),
            callbacks=[earlystopping_callback, progress_callback]
        )
        model.config.use_cache = False
        trainer.train(resume_from_checkpoint=resume_from_checkpoint)

        logger.info(f"Evaluating model perplexity score ...")
        eval_results = trainer.evaluate()
        perplexity_scores = round(math.exp(eval_results['eval_loss']), 4)
        logger.info(f"Model perplexity score: {perplexity_scores}")

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
        model.save_pretrained(training_args['output_dir'] + '/adapters')

        return results
