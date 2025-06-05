# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import re
import zipfile
import pathlib
from loguru import logger
from clients.tasks import TasksService
import asyncio


# Safe path validation pattern - only allow alphanumeric, underscore, dash, and dot
SAFE_PATH_PATTERN = re.compile(r'^[a-zA-Z0-9_\-\.]+$')


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


async def callback(task_id, data: dict, state: str):
    # Validate task_id before using it
    validate_id(task_id)
    
    tasks_client = TasksService()
    if state == "update_task":
        task = tasks_client.get_task(task_id)
        tasks_client.update_task(task['id'], data)
    else:
        raise RuntimeError(f"No callback for state: {state}")


class PrepareDeploymentFile():
    def __init__(self) -> None:
        self.prev_progress = 0
        self.bytes_written = 0

    def _check_file_exists(self, zip_file, task_id):
        """Checks if zip file already existed and its contents."""
        deploy_dir = pathlib.Path('./assets/deployment')
        model_dir = pathlib.Path(f'./data/tasks/{task_id}/models/models')
        file_paths = [str(file)
                      for file in deploy_dir.rglob('*') if file.is_file()]
        file_paths.extend(str(file)
                          for file in model_dir.rglob('*') if file.is_file())
        if os.path.exists(zip_file):
            try:
                with zipfile.ZipFile(zip_file, 'r') as zip_ref:
                    zip_info_list = zip_ref.infolist()
                    zip_files = sum(
                        info.file_size for info in zip_info_list if not info.is_dir())

                model_files = sum(os.path.getsize(file) for file in file_paths)
                if zip_files == model_files:
                    return True
            except:
                logger.error(f"Failed to read zip file: {zip_file}")
        return False

    def get_total_size(self, file_paths):
        """Calculate the total size of all files to be zipped."""
        total_size = 0
        for file in file_paths:
            total_size += os.path.getsize(file)

        return total_size

    def update_zipping_progress(self, task_id, file, total_size):
        self.bytes_written += os.path.getsize(file)
        progress = int(self.bytes_written / total_size * 100)
        if self.prev_progress == 0:
            self.prev_progress = progress
        elif self.prev_progress == progress:
            return
        self.prev_progress = progress
        asyncio.run(
            callback(task_id, {"download_progress": int(progress)}, 'update_task'))

    def create_zip_with_progress(self, zip_filename, project_id, task_id):
        """Create a zip file with progress tracking."""
        model_dir = f"./data/tasks/{task_id}/models/models"
        if not os.path.isdir(model_dir):
            raise RuntimeError(
                f"Error: Failed to find model weights file directory.")

        model_folder = pathlib.Path(model_dir)
        model_zip_dir_structure = 'data/model/llm/'
        total_size = self.get_total_size(
            [str(file) for file in model_folder.rglob('*') if file.is_file()])

        deploy_asset_dir = f"./assets/deployment"
        if not os.path.isdir(model_dir):
            raise RuntimeError(
                f"Error: Failed to find deployment assets.")

        deploy_folder = pathlib.Path(deploy_asset_dir)
        total_size += self.get_total_size([str(file)
                                          for file in deploy_folder.rglob('*') if file.is_file()])

        embedding_dir = f"./data/projects/{project_id}/chroma"
        embedding_zip_dir_structure = 'data/embeddings/'
        if not os.path.isdir(embedding_dir):
            logger.warning("Deployment does not have chroma db.")

        embedding_folder = pathlib.Path(embedding_dir)
        total_size += self.get_total_size([str(file)
                                          for file in embedding_folder.rglob('*') if file.is_file()])

        with zipfile.ZipFile(zip_filename, 'w') as zip_file:
            # zip the model folder
            for file in model_folder.rglob('*'):
                arcname = os.path.join(
                    model_zip_dir_structure, os.path.basename(file))
                zip_file.write(file, arcname=arcname)
                self.update_zipping_progress(task_id, file, total_size)

            # zip the deployment assets files
            for file in deploy_folder.rglob('*'):
                arcname = file.relative_to(deploy_folder)
                zip_file.write(file, arcname=arcname)
                self.update_zipping_progress(task_id, file, total_size)

            # zip the vector embeddings assets
            for file in embedding_folder.rglob('*'):
                if file.is_file():  # Check if the path is a file
                    relative_path = file.relative_to(embedding_folder)
                    arcname = os.path.join(
                        embedding_zip_dir_structure, relative_path)
                    zip_file.write(file, arcname=arcname)
                    self.update_zipping_progress(task_id, file, total_size)
