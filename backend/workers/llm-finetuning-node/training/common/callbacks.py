# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

from celery.utils.log import get_task_logger
from clients.tasks import TasksService

logger = get_task_logger(__name__)

async def on_training_callback(task_id, data: dict):
    tasks_client = TasksService()
    task = tasks_client.get_task(task_id)
    tasks_client.update_task(task['id'], data)


def on_training_success(self, retval, task_id, args, kwargs):
    logger.info("Training completed. Check the result in the dashboard.")
    client = TasksService()
    if retval['status']:
        data = {"status": "SUCCESS"}
    else:
        data = {"status": "FAILURE"}
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
