# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
from dotenv import find_dotenv, load_dotenv

from celery import Celery
from celery.utils.log import get_task_logger
from celery.signals import worker_ready, worker_shutting_down

from common.utils import get_cpu_info, get_gpu_info
from clients.common import HardwareService


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
    "telemetry_queue": {"exchange": "telemetry_queue", "binding_key": "telemetry_queue"},
}


def update_hardware_info():
    cpu = get_cpu_info()
    gpu = get_gpu_info()
    service = HardwareService()
    response = service.update_hardware_info(cpu, gpu)
    if response:
        logger.info("Updated node hardware info to server.")
        return True
    else:
        logger.info("Failed to update node hardware info to server.")
        return False


@worker_ready.connect
def init_worker(sender, **k):
    logger.info(f"{sender}: Worker is ready. Running init worker function.")
    update_hardware_info()


@worker_shutting_down.connect
def worker_shutting_down_handler(sig, how, exitcode, ** kwargs):
    logger.info("Worker shutting down.")

@app.task(bind=True, name="telemetry_node:get_system_utilization", queue='telemetry_queue')
def get_system_utilization(self):
    pass
