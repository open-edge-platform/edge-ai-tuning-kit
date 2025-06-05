# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import io
import asyncio
from zipfile import ZipFile
from loguru import logger

from huggingface_hub import snapshot_download
from tqdm import tqdm

from clients.models import ModelsService, update_model_download_progress

EXPORT_PATH = "./data/cache/hub"


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
            resume_download=True
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


# class CustomModelDownloadPipeline():
#     def __init__(self, file, model_id, model_path):
#         self.file = file
#         self.model_id = model_id
#         self.model_path = model_path

#     async def setup(self):
#         logger.info("Starting Custom model download task ...")
#         file_content = await self.file.read()
#         self.zip_ref = io.BytesIO(file_content)

#     def _check_modules(self):
#         logger.info("Checking modules required are available in zip file ...")
#         modules_list = ['config.json',
#                         'tokenizer.json',
#                         'tokenizer_config.json',
#                         'special_tokens_map.json',
#                         '.safetensors',
#                         '.bin'
#                         ]
#         with ZipFile(self.zip_ref, 'r') as zip_file:
#             zip_files = [f.filename for f in zip_file.infolist()]
#             final_modules = [module for module in modules_list if not any(
#                 module in file for file in zip_files)]
#         # if required modules are present, modules name not present in list
#         if not final_modules or final_modules == ['.safetensors'] or final_modules == ['.bin']:
#             return True
#         return False

#     def execute(self):
#         try:
#             logger.info("Starting to export files in zip file ...")
#             local_model_path = f"{EXPORT_PATH}/{self.model_path}"
#             os.makedirs(local_model_path, exist_ok=True)
#             value = 0
#             with ZipFile(self.zip_ref, 'r') as zip_file:
#                 for each_file in zip_file.infolist():
#                     zip_file.extract(each_file, local_model_path)
#                     total = len(zip_file.infolist())
#                     value += 1
#                     latest_value = value * 100 // total
#                     asyncio.run(update_model_download_progress(
#                         self.model_id, latest_value))
#             logger.info(f"DOWNLOAD COMPLETED (model_path: {self.model_path})")
#             model_client = ModelsService()
#             model_client.update_download_final_status(self.model_id)

#         except Exception as error:
#             raise RuntimeError(
#                 f"Failure in downloading model. Error: {error}")

#         return True
