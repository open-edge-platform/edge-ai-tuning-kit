# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

from celery.utils.log import get_task_logger
from clients.tasks import TasksService

logger = get_task_logger(__name__)

# Deployment zip callback
def on_prepare_success(self, retval, task_id, args, kwargs):
    logger.info("Preparing deployment zip file completed. You may start downloading your deployment zip file.")
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