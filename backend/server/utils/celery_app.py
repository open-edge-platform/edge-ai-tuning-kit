# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os

from celery import Celery
from celery.result import AsyncResult
from celery.contrib.abortable import AbortableAsyncResult

class CeleryConfig:
    broker_url = os.environ.get(
        'CELERY_BROKER_URL', 
        f"redis://:{os.environ.get('REDIS_PASSWORD', '')}@redis:6379/0"
    )
    result_backend = os.environ.get(
        'CELERY_RESULT_BACKEND', 
        f"redis://:{os.environ.get('REDIS_PASSWORD', '')}@redis:6379/1"
    )
    accept_content = ["json"]
    result_serializer = "json"
    task_serializer = "json"
    task_track_started = True
    result_persistent = True
    worker_send_task_events = False
    worker_prefetch_multiplier = 1
    broker_connection_retry_on_startup = True

celery_app = Celery(__name__)
celery_app.config_from_object(CeleryConfig)


def terminate_celery_task(task_id):
    task_result = AsyncResult(task_id)
    task_result.revoke(terminate=True, signal='SIGKILL')
    
def abort_celery_task(task_id):
    task_result = AbortableAsyncResult(task_id)
    task_result.abort()