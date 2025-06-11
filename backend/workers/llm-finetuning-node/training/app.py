# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

import os
import json
import uuid
import shlex
import asyncio
import subprocess
from pydantic import BaseModel
from omegaconf import OmegaConf

from celery import Celery
from celery.utils.log import get_task_logger
from celery.signals import worker_ready, worker_shutting_down

from common.callbacks import on_training_callback
from clients.tasks import TasksService
from trainer.modules.utils.common import (
    get_accelerator_device_information,
)

logger = get_task_logger(__name__)
SUPPORTED_TASKS = [
    "LORA",
    "QLORA"
]


class Response(BaseModel):
    status: bool
    data: dict
    message: str


class CeleryConfig:
    broker_url = os.environ.get(
        'CELERY_BROKER_URL', "redis://redis:6379/0")
    result_backend = os.environ.get(
        'CELERY_RESULT_BACKEND', "redis://redis:6379/1")
    accept_content = ["json"]
    result_serializer = "json"
    task_serializer = "json"
    task_track_started = True
    result_persistent = True
    worker_send_task_events = False
    worker_prefetch_multiplier = 1
    broker_connection_retry_on_startup = True


app = Celery(__name__)
app.config_from_object(CeleryConfig)
app.conf.task_queues = {
    "training_queue": {"exchange": "training_queue", "binding_key": "training_queue"},
}


@worker_ready.connect
def init_worker(sender, **k):
    logger.info(
        f"{sender}: Training worker is ready. Running init worker function.")


@worker_shutting_down.connect
def worker_shutting_down_handler(sig, how, exitcode, ** kwargs):
    logger.info("Training worker is shutting down.")


def on_training_success(self, retval, task_id, args, kwargs):
    client = TasksService()
    data = {
        "status": "SUCCESS",
    }
    id = args[0]
    client.update_task(id, data)


def on_training_failure(self, exc, task_id, args, kwargs, einfo):
    client = TasksService()
    data = {
        "status": "FAILURE",
        "results": {
            "status": f"Error: {exc}"
        }
    }
    id = args[0]
    client.update_task(id, data)


@app.task(bind=True, name="training_node:model_finetuning", on_success=on_training_success, on_failure=on_training_failure, queue='training_queue')
def model_finetuning(self, task_id: int, config_path: str):
    is_update = False
    is_multi_gpu = False

    if not os.path.exists(config_path):
        logger.error(f"Config file {config_path} not found.")
        raise FileNotFoundError(f"Config file {config_path} not found.")

    config = OmegaConf.load(config_path)
    if config.logging_args.task_id:
        task_id = config.logging_args.task_id
        is_update = True
    else:
        task_id = uuid.uuid4()

    print(f"Task id: {task_id}")
    if is_update:
        tasks_client = TasksService()
        tasks_client.update_task(task_id, {"status": "STARTED"})

    output_dir = f"./data/tasks/{task_id}/models"
    os.makedirs(output_dir, exist_ok=True)

    asyncio.run(
        on_training_callback(
            task_id, {
                "results": {
                    "stage": "Starting Synthetic Validation & Test Dataset Generation"
                }
            }
        )
    )
    generate_dataset_cli = f"python3 trainer/modules/synthetic_dataset.py --config {config_path}"
    try:
        subprocess.run(
            shlex.split(generate_dataset_cli),
            check=True
        )
    except subprocess.CalledProcessError as e:
        error_msg = f"Failed to run synthetic dataset generation on GPU. Please check if GPU is available."
        logger.error(error_msg)
        raise RuntimeError(error_msg)
    except Exception as e:
        error_msg = f"Error while generating synthetic dataset: {str(e)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    config = OmegaConf.load(config_path)
    if config.training_configs.num_gpus == -1:
        is_multi_gpu = True

    if config.model_args.task_type not in SUPPORTED_TASKS:
        error_msg = f"Task type: {config.model_args.task_type} is not supported currently."
        raise NotImplementedError(error_msg)
    
    script_path = ""
    accelerate_config_path = None
    if config.model_args.task_type == "LORA":
        script_path = "trainer/modules/lora.py"
        accelerate_config_path = "./templates/fsdp.yaml"
    elif config.model_args.task_type == "QLORA":
        script_path = "trainer/modules/qlora.py"
        accelerate_config_path = None
    else:
        raise NotImplementedError(
            f"Task type {config.model_args.task_type} is not supported.")

    training_cli = f"python3 {script_path} --config {config_path}"
    num_gpus = len(get_accelerator_device_information())
    
    if is_multi_gpu and num_gpus > 1:
        logger.info(f"Detected {num_gpus} GPUs. Using multi-GPU training.")
        if not accelerate_config_path:
            raise RuntimeError(
                f"Task type {config.model_args.task_type} does not support multi-GPU training currently."
            )

        accelerate_conf_path = os.path.join(
            os.path.dirname(config_path), 
            "accelerate.yaml"
        )
        logger.info(f"Creating accelerate config file: {accelerate_conf_path}")
        accelerate_conf = OmegaConf.load(accelerate_config_path)
        accelerate_conf.num_processes = num_gpus
        OmegaConf.save(accelerate_conf, accelerate_conf_path)

        training_cli = f"accelerate launch --config_file {accelerate_conf_path} {script_path} --config {config_path}"

        logger.info("Configuring environment ...")
        os.environ['FI_PROVIDER'] = 'tcp'
        os.environ['CCL_ATL_TRANSPORT'] = 'ofi'
        os.environ['CCL_ZE_IPC_EXCHANGE'] = 'sockets'
        os.environ['CCL_LOG_LEVEL'] = 'error'
    else:
        logger.info(
            f"Detected {num_gpus} GPUs. Using single-GPU training.")

    try:
        logger.info(f"Training command: {training_cli}")
        subprocess.run(
            shlex.split(training_cli),
            check=True,
            env=os.environ.copy()
        )
    except subprocess.CalledProcessError as e:
        error_msg = f"Failed to run training on GPU. OOM error may occur if the model is too large for the GPU."
        logger.error(error_msg)
        raise RuntimeError(error_msg)
    except Exception as e:
        error_msg = f"Error during training: {str(e)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    logger.info(f"Running evaluation on synthetic test dataset ...")
    asyncio.run(on_training_callback(
        task_id, {"results": {"stage": "Evaluating model"}}))

    try:
        evaluation_cli = f"python3 trainer/modules/evaluate.py --config {config_path}"
        logger.info(f"Evaluation command: {evaluation_cli}")
        subprocess.run(
            shlex.split(evaluation_cli),
            check=True,
            env=os.environ.copy()
        )
        evaluation_result_path = f"./data/tasks/{task_id}/models/evaluation_results.txt"
        if os.path.exists(evaluation_result_path):
            with open(evaluation_result_path, "r") as f:
                mean_similarity = json.load(f)["mean_similarity"]
            asyncio.run(
                on_training_callback(task_id, {"results": {
                    "metrics": {
                        "accuracy": mean_similarity,
                    }}})
            )

    except subprocess.CalledProcessError as e:
        error_msg = f"Failed to run evaluation on GPU."
        logger.error(error_msg)
        raise RuntimeError(error_msg)
    except Exception as e:
        error_msg = f"Error during evaluation: {str(e)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    asyncio.run(
        on_training_callback(task_id, {"results": {
            "stage": "Training Completed",
        }})
    )
