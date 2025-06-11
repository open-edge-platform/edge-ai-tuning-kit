# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
from dotenv import find_dotenv, load_dotenv

from celery import Celery
from celery.signals import worker_ready, worker_shutting_down
from celery.utils.log import get_task_logger

from utils.model_download import HFModelDownloadPipeline
from utils.callbacks import on_model_download_failure

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
    "common_queue": {"exchange": "common_queue", "binding_key": "common_queue"}
}


@app.task(bind=True, name="common_node:download_model", on_failure=on_model_download_failure, queue='common_queue')
def download_model(self, task_type: str, id: int, model_id: str, model_dir: str, model_revision: str):
    if task_type == "HF_Model_Download":
        HFModelDownloadPipeline(
            id,
            self.request.id,
            model_id,
            model_dir,
            model_revision
        )
    elif task_type == "Custom_Model_Download":
        raise NotImplementedError("Custom model upload not supported for now.")
    return True


@worker_ready.connect
def init_worker(sender, **k):
    logger.info(f"{sender}: Worker is ready. Running init worker function.")


@worker_shutting_down.connect
def worker_shutting_down_handler(sig, how, exitcode, ** kwargs):
    logger.info("Worker shutting down.")
