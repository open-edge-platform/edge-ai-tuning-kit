# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

import os
import json
import yaml
import uuid
import logging
from typing import Annotated
from typing_extensions import TypedDict
from dotenv import find_dotenv, load_dotenv

from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.encoders import jsonable_encoder
from celery.result import AsyncResult

from services.common import HardwareService
from services.tasks import TaskService
from services.data import DataService
from services.datasets import DatasetService
from services.deployments import DeploymentService
from services.llm import LLMService
from utils.common import remove_dir, is_storage_available, ID_MAX
from utils.docker_client import DockerClient
from utils.celery_app import celery_app

load_dotenv(find_dotenv())
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/tasks",
                   responses={404: {"description": "Unable to find routes for tasks"}})
TASK_PATH = "./data/tasks"


class IUpdateRunningTask(TypedDict):
    task_id: int
    celery_task_id: str


class ICreateTask(TypedDict):
    project_id: int = 1
    dataset_id: int = 1
    task_type: str = "QLORA"
    num_gpus: str = '-1'
    model_path: str = "mistralai/Mistral-7B-Instruct-v0.1"
    device: str = 'xpu'
    max_length: str = "2048"
    per_device_train_batch_size: str = "1"
    per_device_eval_batch_size: str = "1"
    gradient_accumulation_steps: str = "1"
    learning_rate: str = "0.00001"
    num_train_epochs: str = "3"
    lr_scheduler_type: str = "cosine"
    optim: str = "adamw_hf"
    enabled_synthetic_generation: bool = True

    def __init__(self):
        self.task_type = "QLORA"
        self.per_device_train_batch_size = "2"
        self.per_device_eval_batch_size = "1"
        self.gradient_accumulation_steps = "1"
        self.learning_rate = "0.003"
        self.num_train_epochs = "3"
        self.lr_scheduler_type = "cosine"
        self.optim = "adamw_hf"


@router.get("", status_code=200)
async def get_all_tasks(service: Annotated[TaskService, Depends()], filter={}):
    try:
        if filter:
            filter = json.loads(filter)
            if not isinstance(filter, dict):
                logger.error(
                    f"Invalid filter: {filter}. Filter must be a dictionary.")
                return {"status": False, "message": "Invalid filter"}
    except Exception as e:
        logger.error(f"Invalid filter: {e}")
        return {"status": False, "message": "Invalid filter"}

    logger.info(f"Fetching all tasks with filter: {filter}")
    results = []
    try:
        results = await service.get_all_tasks(filter=filter)
    except Exception as e:
        logger.error(f"Error fetching tasks: {e}")
        return {"status": False, "message": "Error fetching tasks"}

    return {"status": True, "data": results}


@router.get("/{id}", status_code=200)
async def get_task(service: Annotated[TaskService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
    result = await service.get_task(id)
    status = False
    if result:
        status = True
    return {"status": status, "data": result}


@router.post("", status_code=200)
async def create_task(service: Annotated[TaskService, Depends()], dataService: Annotated[DataService, Depends()], datasetService: Annotated[DatasetService, Depends()], data: ICreateTask):
    isStorage = is_storage_available()
    if not isStorage:
        return {
            "status": False,
            "message": "Insufficient storage available. Minimum 60GB is required to create a task."
        }

    logger.info(
        f"Removing all running evaluation containers before creating a new task.")
    docker_client = DockerClient()
    docker_client.remove_all_running_evaluation_container()

    # Get the system message from dataset service
    results = await datasetService.get_dataset(data['dataset_id'])
    if not results:
        return {
            "status": False,
            "message": f"Unable to find dataset."
        }

    dataset = jsonable_encoder(results)
    system_message = dataset['prompt_template']
    tools = dataset['tools']

    configs = {
        'training_configs': {
            'num_gpus': int(data['num_gpus']),
            'enabled_synthetic_generation': data['enabled_synthetic_generation']
        },
        'model_args': {
            'model_name_or_path': data["model_path"],
            'device': data["device"],
            'task_type': data["task_type"],
            'task_args': {
                'r': 8,
                'lora_alpha': 16,
                'lora_dropout': 0.05,
                'bias': 'none',
                'task_type': 'CAUSAL_LM',
            }
        },
        "dataset_args": {
            'train_dataset_path': None,
            'eval_dataset_path': None,
            'test_dataset_path': None,
            'tools_path': None,
            'system_message': system_message,
            'max_seq_length': 2048
        },
        'training_args': {
            'output_dir': None,
            'max_length': int(data['max_length']),
            'per_device_train_batch_size': int(data['per_device_train_batch_size']),
            'per_device_eval_batch_size': int(data['per_device_eval_batch_size']),
            'do_eval': True,
            'eval_strategy': 'epoch',
            'logging_strategy': 'steps',
            'logging_steps': 1,
            'save_strategy': 'epoch',
            'save_total_limit': 2,
            'load_best_model_at_end': True,
            'warmup_steps': 0,
            'gradient_accumulation_steps': int(data['gradient_accumulation_steps']) if 'gradient_accumulation_steps' in data else 8,
            'learning_rate': float(data['learning_rate']) if 'learning_rate' in data else 0.0003,
            'num_train_epochs': int(data['num_train_epochs']) if 'num_train_epochs' in data else 3,
            'lr_scheduler_type': str(data['lr_scheduler_type']),
            'optim': str(data['optim'])
        },
        'logging_args': {
            'task_id': None
        }
    }

    try:
        inference_configs = {
            "prompt_template": system_message,
            "temperature": 0.3,
            "max_new_tokens": 512,
            "isRAG": False
        }

        new_task = {
            "type": str(data["task_type"]).upper(),
            "status": "PENDING",
            "configs": configs,
            "inference_configs": inference_configs,
            "results": {},
            "project_id": data["project_id"]
        }
        result = await service.create_task(new_task)
    except:
        return {
            "status": False,
            "message": "Failed to create task with the configuration provided."
        }

    if not result['status']:
        return {
            "status": False,
            "message": f"Failed to create task with the configuration provided."
        }
    created_task_id = result["data"]

    logger.info("Creating the dataset for the task ...")
    createDataResponse = await dataService.export_to_json(data["dataset_id"], f"{TASK_PATH}/{created_task_id}/datasets")
    if not createDataResponse or not createDataResponse['status']:
        logger.error(
            "Failed to create dataset. Proceed to delete the created task.")
        await service.delete_task(created_task_id)
        return {
            "status": False,
            "message": f"Failed to create task with the configuration provided."
        }
    dataset_uuid = createDataResponse['data']

    logger.info("Updating dataset path ...")
    configs["dataset_args"]['train_dataset_path'] = f"{TASK_PATH}/{created_task_id}/datasets/{dataset_uuid}"
    configs['training_args']['output_dir'] = f"{TASK_PATH}/{created_task_id}/models/checkpoints"
    configs['logging_args']['task_id'] = created_task_id
    await service.update_task(created_task_id, {"configs": configs})
    logger.info(configs)

    task_dir = f'{TASK_PATH}/{created_task_id}/models'
    os.makedirs(task_dir, exist_ok=True)
    task_conf_path = f'{task_dir}/train.yml'

    with open(task_conf_path, 'w') as file:
        yaml.dump(configs, file, default_flow_style=False)

    logger.info("Publishing task to trainer node ...")
    celery_task_id = celery_app.send_task(
        name="training_node:model_finetuning",
        args=[
            created_task_id,
            task_conf_path
        ],
        queue='training_queue'
    )

    logger.info(f"Updating task with celery id: {celery_task_id}")
    await service.update_task(created_task_id, {"celery_task_id": str(celery_task_id)})

    return result


@router.post("/{id}/restart", status_code=200)
async def restart_task(service: Annotated[TaskService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
    result = await service.get_task(id)
    if not result:
        raise HTTPException(
            status_code=404, detail=f"Unable to restart task. Task with id: {id} not found.")
    task_conf_path = f'{TASK_PATH}/{id}/models/train.yml'

    celery_task_id = celery_app.send_task(
        name="training_node:model_finetuning",
        args=[
            id,
            task_conf_path
        ],
        queue='training_queue'
    )

    task_data = {
        "status": "PENDING",
        "results": {},
        "celery_task_id": str(celery_task_id)
    }
    updated_task = await service.update_task(id, task_data)
    return updated_task


@router.patch("/{id}", status_code=200)
async def update_task(service: Annotated[TaskService, Depends()],  data: dict, id: int = Path(..., gt=0, le=ID_MAX)):
    result = await service.get_task(id)
    if not result:
        raise HTTPException(
            status_code=404, detail=f"Task with id: {id} not found.")

    response = await service.update_task(id, data)
    if not response['status']:
        raise HTTPException(
            status_code=404, detail=f"Failed to update task with id: {id}.")

    updated_task = await service.get_task(id)
    return updated_task


@router.delete("/{id}", status_code=200)
async def delete_task(service: Annotated[TaskService, Depends()], deployment_service: Annotated[DeploymentService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
    response = await service.get_task(id)
    if not response:
        return {"status": False, "message": f"No task found with id: {id}"}
    task_data = jsonable_encoder(response)
    task_dir = f"./data/tasks/{id}"

    if task_data['celery_task_id']:
        logger.info(
            f"Cancelling celery task id: {task_data['celery_task_id']}. It will takes some time before it stops.")
        task_result = AsyncResult(task_data['celery_task_id'])
        task_result.revoke(terminate=True, signal='SIGKILL')

    try:
        await deployment_service.delete_deployment(id)
    except Exception as error:
        logger.warning(
            f"Error when deleting deployment for task {id}: {error}")

    result = await service.delete_task(id)
    if not result['status']:
        raise HTTPException(
            status_code=404, detail=f"Failed to delete task with id: {id}.")

    try:
        remove_dir(task_dir)
    except Exception as error:
        logger.warning(f"Error when deleting the dataset file: {error}")

    response = {
        "status": True,
        "message": f"Task {id} deleted successfully."
    }
    return response
