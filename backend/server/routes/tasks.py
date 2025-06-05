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

from services.tasks import TaskService, RunningTaskService
from services.data import DataService
from services.datasets import DatasetService
from services.llm import LLMService
from utils.common import remove_dir, is_storage_available, ID_MAX
from utils.docker_client import DockerClient
from utils.celery_app import celery_app

load_dotenv(find_dotenv())
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/tasks",
                   responses={404: {"description": "Unable to find routes for tasks"}})


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
                return {"status": False, "message": "Invalid filter"}
    except:
        return {"status": False, "message": "Invalid filter"}

    result = await service.get_all_tasks(filter=filter)
    status = False
    if result:
        status = True
    return {"status": status, "data": result}


@router.get("/{id}", status_code=200)
async def get_task(service: Annotated[TaskService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
    result = await service.get_task(id)
    status = False
    if result:
        status = True
    return {"status": status, "data": result}


@router.get("/{id}/celery_id", status_code=200)
async def get_task(service: Annotated[TaskService, Depends()], celery_task_id: str):
    try:
        uuid.UUID(celery_task_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=400, detail=f"Invalid task id: {celery_task_id}.")
    result = await service.get_task_id(celery_task_id)
    return result


@router.get("/celery/running_task", status_code=200)
async def get_all_celery_tasks(service: Annotated[RunningTaskService, Depends()]):
    try:
        response = await service.get_running_task()
        return {
            'status': True,
            'data': response,
            'message': "Tasks info retrieve successfully."
        }
    except Exception as error:
        raise HTTPException(500, f"Unable to get tasks info. Error: {error}")


@router.patch("/celery/running_task", status_code=200)
async def update_task(service: Annotated[RunningTaskService, Depends()], data: IUpdateRunningTask):
    try:
        response = await service.update_running_task(data)
        if not response['status']:
            raise HTTPException(
                status_code=400, detail=f"Failed to update running task.")
        return response
    except Exception as error:
        raise HTTPException(400, f"Unable to get tasks info. Error: {error}")


@router.get("/celery/task_info", status_code=200)
async def get_all_celery_tasks():
    try:
        inspector = celery_app.control.inspect()
        registered_tasks = inspector.registered()
        revoked_tasks = inspector.revoked()
        data = {
            'registered_tasks': registered_tasks,
            'revoked_tasks': revoked_tasks
        }
        return {
            'status': True,
            'data': data,
            'message': "Tasks info retrieve successfully."
        }
    except Exception as error:
        raise HTTPException(500, f"Unable to get tasks info. Error: {error}")


@router.get("/{id}/celery_task_status", status_code=200)
async def get_celery_task_status(service: Annotated[TaskService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
    response = await service.get_task(id)
    if not response:
        raise HTTPException(404, f"Unable to get data for task: {id}")
    task_data = jsonable_encoder(response)
    if task_data['celery_task_id']:
        logger.info(f"Checking task results ...")
        task_result = AsyncResult(task_data['celery_task_id'])
        task_info = {
            "task_status": task_result.status,
            "task_result": task_result.result
        }
        logger.info(f"Task info: {task_info}")
        return {
            'status': True,
            'data': task_info,
            'message': f"Currently task is in state: {str(task_result.status)}"
        }
    else:
        raise HTTPException(404, f"Unable to get the task_id for task.")


@router.post("", status_code=200)
async def create_task(service: Annotated[TaskService, Depends()], dataService: Annotated[DataService, Depends()], datasetService: Annotated[DatasetService, Depends()], modelService: Annotated[LLMService, Depends()], data: ICreateTask):
    isStorage = is_storage_available()
    if not isStorage:
        raise HTTPException(
            status_code=404, detail=f"No enough storage available to create task. Please cleanup your disk first before creating a new task.")

    docker_client = DockerClient()
    docker_client.remove_all_running_evaluation_container()

    TASK_PATH = "./data/tasks"
    # Get the system message from dataset service
    results = await datasetService.get_dataset(data['dataset_id'])
    if not results:
        raise HTTPException(
            status_code=404, detail=f"Dataset id: {data['dataset_id']} not available.")
    dataset = jsonable_encoder(results)

    # Get the system message set by the user
    system_message = dataset['prompt_template']
    tools = dataset['tools']
    try:
        # Write the data to task configs
        task_configs = {
            'training_configs': {
                'num_gpus': data['num_gpus'],
                'enabled_synthetic_generation': data['enabled_synthetic_generation']
            },
            'model_args': {
                'model_name_or_path': data["model_path"],
                'device': data["device"]
            },
            'adapter_args': {
                'r': 8,
                'lora_alpha': 16,
                'lora_dropout': 0.05,
                'bias': 'none',
                'task_type': 'CAUSAL_LM',
                'training_type': data['task_type']
            },
            'data_args': {
                'cutoff_len': 2048,
                'task_id': '',
                'data_path': '',
                'system_message': system_message,
                'tools': tools
            },
            'training_args': {
                'output_dir': '',
                'per_device_train_batch_size': int(data['per_device_train_batch_size']) if 'per_device_train_batch_size' in data else 2,
                'per_device_eval_batch_size': int(data['per_device_eval_batch_size']) if 'per_device_eval_batch_size' in data else 1,
                'gradient_accumulation_steps': int(data['gradient_accumulation_steps']) if 'gradient_accumulation_steps' in data else 1,
                'learning_rate': float(data['learning_rate']) if 'learning_rate' in data else 0.0003,
                'num_train_epochs': int(data['num_train_epochs']) if 'num_train_epochs' in data else 3,
                'lr_scheduler_type': data['lr_scheduler_type'] if 'lr_scheduler_type' in data else "cosine",
                'optim': data['optim'] if 'optim' in data else "adamw_hf",
                'deepspeed': ''
            }
        }

        inference_configs = {
            "prompt_template": system_message,
            "temperature": 0.3,
            "max_new_tokens": 512,
            "isRAG": False
        }

        new_task = {
            "type": str(data["task_type"]).upper(),
            "status": "PENDING",
            "configs": task_configs,
            "inference_configs": inference_configs,
            "results": {},
            "project_id": data["project_id"]
        }
    except:
        return {"status": False, "message": "Invalid data provided"}

    result = await service.create_task(new_task)
    if not result['status']:
        raise HTTPException(
            status_code=404, detail=f"Failed to create task with project id: {data['project_id']}")
    created_task_id = result["data"]

    logger.info("Creating the dataset for the task ...")
    createDataResponse = await dataService.export_to_json(data["dataset_id"], f"{TASK_PATH}/{created_task_id}/datasets")
    if not createDataResponse or not createDataResponse['status']:
        logger.error(
            "Failed to create dataset. Proceed to delete the created task.")
        await service.delete_task(created_task_id)
        raise HTTPException(
            status_code=404, detail=f"Failed to create dataset for task")
    dataset_uuid = createDataResponse['data']

    logger.info("Updating dataset path ...")
    task_configs['data_args']['task_id'] = f"{created_task_id}"
    task_configs['data_args']['data_path'] = f"{TASK_PATH}/{created_task_id}/datasets/{dataset_uuid}"
    task_configs['training_args']['output_dir'] = f"{TASK_PATH}/{created_task_id}/models"
    await service.update_task(created_task_id, {"configs": task_configs})

    # Write the train config as a yml file for training
    logger.info("Updating the directory of the model.")
    results = await modelService.get_model_dir(data["model_path"])
    model = jsonable_encoder(results)
    model_dir = model['model_dir']

    # Do a copy here to change the model name
    task_yaml_configs = task_configs
    task_yaml_configs['model_args']['model_name_or_path'] = model_dir

    os.makedirs(f"{TASK_PATH}/{created_task_id}/models", exist_ok=True)
    with open(f'{TASK_PATH}/{created_task_id}/models/train.yml', 'w') as file:
        yaml.dump(task_yaml_configs, file, default_flow_style=False)

    logger.info("Publishing task to trainer node ...")
    celery_task_id = celery_app.send_task(
        name="celery_task:training",
        args=[
            created_task_id,
            data['num_gpus'],
            data['enabled_synthetic_generation']
        ],
        queue='trainer_queue'
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
    last_task_data = jsonable_encoder(result)

    celery_task_id = celery_app.send_task(
        name="celery_task:training",
        args=[
            id,
            last_task_data['configs']['training_configs']['num_gpus'],
            last_task_data['configs']['training_configs']['enabled_synthetic_generation'],
            True
        ],
        queue='trainer_queue'
    )

    task_data = {
        "status": "PENDING",
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
async def delete_task(service: Annotated[TaskService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
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

    result = await service.delete_task(id)
    if not result['status']:
        raise HTTPException(
            status_code=404, detail=f"Failed to delete task with id: {id}.")

    try:
        remove_dir(task_dir)
    except Exception as error:
        logger.error(f"Error when deleting the dataset file: {error}")

    response = {
        "status": True,
        "message": f"Task {id} deleted successfully."
    }
    return response
