# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

import os
import math
import argparse
from omegaconf import OmegaConf

import torch
import torch.distributed as dist
from trl import SFTTrainer, SFTConfig
from peft import prepare_model_for_kbit_training, LoraConfig, get_peft_model, AutoPeftModelForCausalLM
from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments, EarlyStoppingCallback, BitsAndBytesConfig
from intel_extension_for_pytorch.llm.functional.utils import ipex_update_causal_mask

from utils.common import is_rank_zero
from utils.callbacks import CustomCallback
from utils.datasets import DatasetLoader
from utils.logger import setup_logger

logger = setup_logger(__name__)


class QLORATrainer:
    def __init__(self, model_name_or_path: str, device: str):
        self.model_name_or_path = model_name_or_path
        self.device = device
        self.model, self.tokenizer = self._load_model_and_tokenizer()
        self.model = self._load_lora_adapter()
        self._print_trainable_parameters()

    def _print_trainable_parameters(self):
        """
        Prints the number of trainable parameters in the model.
        """
        trainable_params = 0
        all_param = 0
        for _, param in self.model.named_parameters():
            all_param += param.numel()
            if param.requires_grad:
                trainable_params += param.numel()
        logger.info(
            f"trainable params: {trainable_params} || all params: {all_param} || trainable%: {100 * trainable_params / all_param}"
        )

    def _load_model_and_tokenizer(self, quant_type: str = "nf4", dtype: torch.dtype = torch.bfloat16, attention_implementation: str = "eager"):
        logger.info("Initializing model and tokenizer ...")
        model_name = self.model_name_or_path.split("/")[-1]
        model_path = f"./data/models/hf/{model_name}"

        # Verify if the model is available in the local path
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model path {model_path} does not exist.")

        tokenizer = AutoTokenizer.from_pretrained(
            model_path
        )
        if tokenizer.pad_token_id is None:
            logger.info("Setting pad token id to eos token id")
            tokenizer.pad_token_id = tokenizer.eos_token_id

        world_size = int(os.getenv("WORLD_SIZE", 1))

        if quant_type == "nf4":
            if world_size > 1:
                bnb_config = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_quant_type="nf4",
                    bnb_4bit_use_double_quant=True,
                    bnb_4bit_compute_dtype=torch.bfloat16 if torch.xpu.is_bf16_supported() else torch.float16,
                    bnb_4bit_quant_storage=torch.bfloat16 if torch.xpu.is_bf16_supported() else torch.float16,
                )
            else:
                bnb_config = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_quant_type="nf4",
                    bnb_4bit_use_double_quant=False,
                    bnb_4bit_compute_dtype=torch.bfloat16 if torch.xpu.is_bf16_supported() else torch.float16,
                )
        elif quant_type == "int8":
            bnb_config = BitsAndBytesConfig(load_in_8bit=True)
        else:
            raise ValueError(f"Unsupported quantization type: {quant_type}")

        model = AutoModelForCausalLM.from_pretrained(
            model_path,
            torch_dtype=dtype,
            quantization_config=bnb_config,
        )

        # model.gradient_checkpointing_enable()
        # model = prepare_model_for_kbit_training(model)

        return model, tokenizer

    def _load_lora_adapter(self):
        logger.info("Initializing LORA adapter ...")
        lora_config = LoraConfig(
            r=8,
            lora_alpha=16,
            lora_dropout=0.05,
            target_modules='all-linear',
            task_type="CAUSAL_LM",
            bias="none"
        )
        return get_peft_model(self.model, lora_config)

    def _save_merge_model(self, adapter_path: str, save_path: str):
        logger.info("Merging LORA adapter ...")
        model = AutoPeftModelForCausalLM.from_pretrained(
            adapter_path,
            torch_dtype=torch.float16,
            low_cpu_mem_usage=True,
            device_map={"": "cpu"},
        )
        merged_model = model.merge_and_unload()
        merged_model.save_pretrained(
            save_path,
            safe_serialization=True,
            max_shard_size="2GB"
        )

    def train(self, train_dataset, eval_dataset, training_args, callbacks=[]):
        logger.info("Initializing trainer ...")
        ipex_update_causal_mask(self.model)
        self.trainer = SFTTrainer(
            model=self.model,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            args=training_args,
            callbacks=callbacks
        )

        if self.trainer.is_fsdp_enabled:
            from peft.utils.other import fsdp_auto_wrap_policy
            fsdp_plugin = self.trainer.accelerator.state.fsdp_plugin
            fsdp_plugin.auto_wrap_policy = fsdp_auto_wrap_policy(
                self.trainer.model
            )

        self.model.config.use_cache = False
        logger.info("Empty GPU cache before running training ...")
        torch.xpu.empty_cache()

        logger.info("Starting training ...")
        self.trainer.train()

    def evaluate(self):
        logger.info(f"Evaluating model ...")
        eval_results = self.trainer.evaluate()
        perplexity_scores = round(math.exp(eval_results['eval_loss']), 4)
        logger.info(f"Perplexity score: {perplexity_scores}")

    def save_model(self, output_dir: str):
        logger.info("Saving model ...")
        adapter_save_path = output_dir + '/adapters'
        model_save_path = output_dir + '/models'

        if self.trainer.is_fsdp_enabled:
            self.trainer.accelerator.state.fsdp_plugin.set_state_dict_type(
                "FULL_STATE_DICT")
            dist.barrier()

        logger.info(f"Saving LORA adapater in {adapter_save_path}")
        self.trainer.save_model(adapter_save_path)

        if is_rank_zero():
            self._save_merge_model(adapter_save_path, model_save_path)
            self.tokenizer.save_pretrained(model_save_path)


def sanity_check(config):
    if not config.training_args.output_dir:
        raise ValueError("Output directory is required")

    if not config.dataset_args.train_dataset_path:
        raise ValueError("Train dataset path is required")


def main(args):
    logger.info(f"Loading config: {args.config}")
    config = OmegaConf.load(args.config)
    sanity_check(config)
    model_args = config.model_args
    dataset_args = config.dataset_args
    training_args = SFTConfig(**config.training_args)

    train_dataset = DatasetLoader.get_dataset(dataset_args.train_dataset_path)
    eval_dataset = DatasetLoader.get_dataset(dataset_args.eval_dataset_path)

    if dataset_args.system_message:
        logger.info(f"Adding system message: {dataset_args.system_message}")
        train_dataset = DatasetLoader.add_system_messsage(
            train_dataset, dataset_args.system_message)
        eval_dataset = DatasetLoader.add_system_messsage(
            eval_dataset, dataset_args.system_message)

    # Format the dataset
    callbacks = [
        EarlyStoppingCallback(3, 0.01),
        CustomCallback(
            cutoff_len=dataset_args.max_seq_length,
            micro_batch_size=training_args.per_device_train_batch_size,
            gradient_accumulation_steps=training_args.gradient_accumulation_steps,
            task_id=config.logging_args.task_id
        )
    ]

    trainer = QLORATrainer(model_args.model_name_or_path, model_args.device)
    training_args.bf16 = True if torch.xpu.is_bf16_supported() else False
    training_args.fp16 = False if torch.xpu.is_bf16_supported() else True

    # Verify if training_args contains gradient_checkpointing_kwargs
    if hasattr(training_args, "gradient_checkpointing_kwargs"):
        training_args.gradient_checkpointing_kwargs = {
            'use_reentrant': False
        }

    # Modify max_length in training_args
    if hasattr(training_args, "max_length"):
        logger.info(f"Max token length is set to {dataset_args.max_seq_length}")

    # Setting packing to False
    if hasattr(training_args, "packing"):
        logger.warning("Packing is disabled to improve the training accuracy.")
        training_args.packing = False

    if hasattr(training_args, "eval_packing"):
        training_args.eval_packing = False

    trainer.train(
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        training_args=training_args,
        callbacks=callbacks
    )
    trainer.save_model(training_args.output_dir)


if __name__ == "__main__":
    argparser = argparse.ArgumentParser()
    argparser.add_argument(
        "--config", type=str, required=True, help="LLM Finetuning Toolkit Config File"
    )
    args = argparser.parse_args()
    main(args)
