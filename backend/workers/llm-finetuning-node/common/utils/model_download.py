# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import asyncio
from tqdm import tqdm
from huggingface_hub import snapshot_download
from celery.utils.log import get_task_logger
from utils.clients import ModelsService, update_model_download_progress

EXPORT_PATH = "./data/cache/hub"
logger = get_task_logger(__name__)


def HFModelDownloadPipeline(id: int, task_id: str, model_id: str, model_dir: str, model_revision: str = 'main'):
    class TqdmClass(tqdm):
        @property
        def n(self):
            return self.__n

        @n.setter
        def n(self, value):
            latest_value = value * 100 // self.total
            logger.info(f"Downloading {model_id}: {latest_value} %")
            download_progress = {
                "download_metadata": {
                    "download_task_id": task_id,
                    "status": "DOWNLOADING",
                    "progress": latest_value
                }
            }
            asyncio.run(update_model_download_progress(id, download_progress))
            self.__n = value

    try:
        model_client = ModelsService()
        logger.info("Starting HF model download task ...")
        download_status = {
            "download_metadata": {
                "status": "DOWNLOADING",
                "progress": -1
            }
        }
        model_client.update_status(id, download_status)

        snapshot_download(
            model_id,
            revision=model_revision,
            local_dir=model_dir,
            tqdm_class=TqdmClass,
            resume_download=True,
            ignore_patterns=["*.pth"] # only download .safetensors model files
        )
        logger.info(f"{model_id} download successsfully in {model_dir}")

        download_status = {
            "is_downloaded": True,
            "download_metadata": {
                "download_task_id": None,
                "status": "SUCCESS",
                "progress": 100
            }
        }
        model_client.update_status(id, download_status)
    except Exception as error:
        raise RuntimeError(f"Failed to download {model_id}. Error: {error}")
    return True
