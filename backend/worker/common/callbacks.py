# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import re
from celery.utils.log import get_task_logger
from clients.tasks import TasksService
from clients.models import ModelsService

logger = get_task_logger(__name__)

def validate_id(id_value):
    """Validate that an ID contains only safe characters to prevent path traversal."""
    if isinstance(id_value, int):
        return id_value
        
    SAFE_PATH_PATTERN = re.compile(r'^[a-zA-Z0-9_\-\.]+$')
    if not id_value or not SAFE_PATH_PATTERN.match(str(id_value)):
        raise ValueError(f"Invalid ID format: {id_value}")
    
    # Try to convert to integer if possible
    try:
        return int(id_value)
    except ValueError:
        # If it's not an integer, return the string
        return id_value

# Model callback
def on_model_download_failure(self, exc, task_id, args, kwargs, einfo):
    logger.info(f"Failed to download model. Error: {exc}")
    model_client = ModelsService()
    id = args[1]
    download_status = {
        "is_downloaded": False,
        "download_metadata": {
            "download_task_id": None,
            "status": "FAILURE",
            "progress": -1,
        }
    }
    model_client.update_status(id, download_status)

# Training callback
async def on_training_callback(task_id, data: dict):
    tasks_client = TasksService()
    task = tasks_client.get_task(task_id)

    # Sanitize task id
    if task and 'id' in task and task['id'] is not None:
        sanitized_id = validate_id(task['id'])
        if isinstance(sanitized_id, int):
            tasks_client.update_task(sanitized_id, data)
        else:
            logger.error(f"Invalid task ID format: {sanitized_id}")
    else:
        logger.error(f"Invalid or missing task ID for task_id: {task_id}")


def on_training_success(self, retval, task_id, args, kwargs):
    logger.info("Training completed. Check the result in the dashboard.")
    client = TasksService()
    if retval is not None:
        data = {"status": "SUCCESS", "results": retval}
        id = args[0]
        client.update_task(id, data)


def on_training_failure(self, exc, task_id, args, kwargs, einfo):
    logger.error("Training failure. Updating task state to failure.")
    client = TasksService()
    data = {"status": "FAILURE", "results": {
        "status": f"Training failure. Error: {exc}"}}
    id = args[0]
    client.update_task(id, data)


def on_training_start(self, task_id, args, kwargs):
    logger.info("Updating the running task id.")
    client = TasksService()
    data = {
        "task_id": args[0],
        "celery_task_id": task_id
    }
    client.update_running_task(data)

# Deployment zip callback
def on_prepare_success(self, retval, task_id, args, kwargs):
    logger.info(
        "Preparing deployment zip file completed. You may start downloading your deployment zip file.")
    client = TasksService()
    data = {
        "download_status": "SUCCESS",
        "download_progress": 100
    }
    client.update_task(args[1], data)


def on_prepare_failure(self, exc, task_id, args, kwargs, einfo):
    logger.info("Preparing deployment zip file failed.")
    client = TasksService()
    data = {
        "download_status": "FAILURE",
        "download_progress": 0
    }
    client.update_task(args[1], data)
