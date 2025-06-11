# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import json
import argparse
from omegaconf import OmegaConf

from utils.common import get_inference_device
from utils.inference import OVInference
from utils.logger import setup_logger

logger = setup_logger(__name__)

def main(args):
    logger.info(f"Loading config: {args.config}")
    config = OmegaConf.load(args.config)
    task_id = config.logging_args.task_id
    test_dataset_path = config.dataset_args.test_dataset_path
    quant_format = "int4"
    logger.info("Converting and quantizing model ...")
    model = OVInference(
        model_path=f"./data/tasks/{task_id}/models/checkpoints/models",
        converted_model_path=f"./data/tasks/{task_id}/models/checkpoints/ov_model",
        device=get_inference_device(),
        model_precision=quant_format
    )

    logger.info("Running evaluation ...")
    mean_similarity, evaluate_results = model.evaluate_test_dataset(
        test_dataset_path, 
        config.dataset_args.system_message
    )
    results = {
        "results": list(evaluate_results),
        "mean_similarity": mean_similarity
    }
    logger.info(f"Evaluation result with merged model: {results}")

    with open(f"./data/tasks/{task_id}/models/evaluation_results.txt", "w") as f:
        f.write(json.dumps(results, indent=4))

if __name__ == "__main__":
    argparser = argparse.ArgumentParser()
    argparser.add_argument(
        "--config", type=str, required=True, help="LLM Finetuning Toolkit Config File"
    )
    args = argparser.parse_args()
    main(args)
