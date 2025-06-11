# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
from dotenv import find_dotenv, load_dotenv

from common.callbacks import on_prepare_failure, on_prepare_success
from utils.package import PrepareDeploymentFile
from clients.tasks import TasksService

from celery import Celery
from celery.utils.log import get_task_logger
from celery.signals import worker_ready, worker_shutting_down

logger = get_task_logger(__name__)
load_dotenv(find_dotenv())


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
    "deployment_queue": {"exchange": "deployment_queue", "binding_key": "deployment_queue"},
}


@worker_ready.connect
def init_worker(sender, **k):
    logger.info(
        f"{sender}: Deployment worker is ready. Running init worker function.")


@worker_shutting_down.connect
def worker_shutting_down_handler(sig, how, exitcode, ** kwargs):
    logger.info("Deployment worker is shutting down.")


@app.task(bind=True, name="deployment_node:prepare_deployment_file", on_failure=on_prepare_failure, on_success=on_prepare_success, queue='deployment_queue')
def prepare_model(self, project_id, task_id, zip_filename):
    deployment = PrepareDeploymentFile()
    if not deployment._check_file_exists(zip_filename, task_id):
        tasks_client = TasksService()
        data = {
            "download_status": "STARTED",
            "download_progress": 0
        }
        tasks_client.update_task(task_id, data)
        deployment.create_zip_with_progress(
            zip_filename,
            project_id,
            task_id
        )
    return True
