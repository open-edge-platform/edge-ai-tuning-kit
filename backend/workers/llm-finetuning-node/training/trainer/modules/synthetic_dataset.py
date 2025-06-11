# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

import os
import argparse
from omegaconf import OmegaConf

from utils.callbacks import TaskCallback
from utils.common import get_inference_device
from utils.datasets import create_subset_from_dataset
from utils.inference import OVInference
from utils.logger import setup_logger

logger = setup_logger(__name__)


def generate_synthetic_dataset(args):
    logger.info(f"Loading config: {args.config}")
    config = OmegaConf.load(args.config)

    if config.training_configs.enabled_synthetic_generation:
        logger.info("Synthetic Generation is enabled")
        TaskCallback.update_task_data(
            task_id=config.logging_args.task_id,
            data={
                "status": "Starting Synthetic Validation & Test Dataset Generation"
            }
        )
        train_dataset_path = config.dataset_args.train_dataset_path
        eval_dataset_path = os.path.join(
            os.path.dirname(train_dataset_path), "eval.json")
        test_dataset_path = os.path.join(
            os.path.dirname(train_dataset_path), "test.json")
        model = OVInference(
            model_path="./data/models/hf/Mistral-7B-Instruct-v0.3",
            converted_model_path="./data/models/ov/Mistral-7B-Instruct-v0.3",
            device=get_inference_device(),
            model_precision="int4"
        )
        logger.info("Creating synthetic eval dataset ...")
        model.generate_synthetic_dataset(
            train_dataset_path,
            eval_dataset_path
        )
        logger.info("Creating synthetic test dataset ...")
        model.generate_synthetic_dataset(
            train_dataset_path,
            test_dataset_path
        )
    else:
        logger.info("Synthetic Generation is disabled")
        TaskCallback.update_task_data(
            task_id=config.task_id,
            data={
                "status": "Creating evaluation and testing subset from the original dataset"
            }
        )
        train_dataset_path = config.dataset_args.train_dataset_path
        eval_dataset_path = os.path.join(
            os.path.dirname(train_dataset_path), "eval.json")
        test_dataset_path = os.path.join(
            os.path.dirname(train_dataset_path), "test.json")
        create_subset_from_dataset(
            train_dataset_path,
            eval_dataset_path
        )
        create_subset_from_dataset(
            train_dataset_path,
            test_dataset_path
        )

    # update eval_dataset_path and test_dataset_path in config
    config.dataset_args.eval_dataset_path = eval_dataset_path
    config.dataset_args.test_dataset_path = test_dataset_path
    OmegaConf.save(config, args.config)


if __name__ == "__main__":
    argparser = argparse.ArgumentParser()
    argparser.add_argument(
        "--config", type=str, required=True, help="LLM Finetuning Toolkit Config File"
    )
    args = argparser.parse_args()
    generate_synthetic_dataset(args)
