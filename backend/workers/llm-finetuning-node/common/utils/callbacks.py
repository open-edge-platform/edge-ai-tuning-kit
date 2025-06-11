# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

from celery.utils.log import get_task_logger
from utils.clients import ModelsService

logger = get_task_logger(__name__)


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
