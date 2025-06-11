# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import re
import asyncio
import pathlib
import zipfile
from celery.utils.log import get_task_logger
from clients.tasks import TasksService

logger = get_task_logger(__name__)


async def callback(task_id, data: dict, state: str):
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

    def _get_latest_epoch_folder_path(self, model_path):
        epoch_folders = [f for f in os.listdir(
            model_path) if re.match(r'epoch_\d+', f)]
        if not epoch_folders:
            return None
        epoch_numbers = [int(re.search(r'\d+', folder).group())
                         for folder in epoch_folders]
        latest_epoch_number = max(epoch_numbers)
        latest_epoch_folder = f"epoch_{latest_epoch_number}"
        return os.path.join(model_path, latest_epoch_folder)

    def _check_file_exists(self, zip_file, task_id):
        """Checks if zip file already existed and its contents."""
        deploy_dir = pathlib.Path('./assets/deployment')
        model_path = pathlib.Path(
            f'./data/tasks/{task_id}/models/checkpoints/models')

        file_paths = [str(file)
                      for file in deploy_dir.rglob('*') if file.is_file()]
        file_paths.extend(str(file)
                          for file in model_path.rglob('*') if file.is_file())
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
        """
        Create a deployment zip file with progress tracking.

        The zip file contains:
        - Model weights and checkpoints
        - Deployment assets
        - Vector embedding data (if available)

        Progress is reported via callback updates.

        Args:
            zip_filename: Path to the output zip file
            project_id: ID of the project
            task_id: ID of the task for progress reporting
        """
        # Reset progress trackers for this zip operation
        self.prev_progress = 0
        self.bytes_written = 0

        # Collect and validate all source directories
        source_dirs = self._collect_source_directories(project_id, task_id)

        # Calculate total size of all files to be included
        total_size = self._calculate_total_size(source_dirs)

        # Create the zip file with all components
        with zipfile.ZipFile(zip_filename, 'w') as zip_file:
            self._add_model_files_to_zip(
                zip_file, source_dirs["model"], total_size, task_id)
            self._add_deployment_files_to_zip(
                zip_file, source_dirs["deployment"], total_size, task_id)
            self._add_embedding_files_to_zip(
                zip_file, source_dirs["embedding"], total_size, task_id)

    def _collect_source_directories(self, project_id, task_id):
        """Collect and validate all source directories needed for the deployment package."""
        source_dirs = {}

        # Model directory
        model_path = f'./data/tasks/{task_id}/models/checkpoints/ov_model'
        if not os.path.isdir(model_path):
            raise RuntimeError(
                "Error: Failed to find model weights file directory.")
        source_dirs["model"] = {
            "path": pathlib.Path(model_path),
            "zip_dir_structure": 'rag-toolkit/data/models/llm/'
        }

        # Deployment assets directory
        deploy_asset_dir = f"./assets/deployment"
        if not os.path.isdir(deploy_asset_dir):
            raise RuntimeError("Error: Failed to find deployment assets.")
        source_dirs["deployment"] = {
            "path": pathlib.Path(deploy_asset_dir),
            "zip_dir_structure": ''  # Files will be at the root of the zip
        }

        # Vector embeddings directory
        embedding_dir = f"./data/projects/{project_id}/chroma"
        source_dirs["embedding"] = {
            "path": pathlib.Path(embedding_dir),
            "zip_dir_structure": 'rag-toolkit/data/embeddings/'
        }
        if not os.path.isdir(embedding_dir):
            logger.warning("Deployment does not have chroma db.")

        return source_dirs

    def _calculate_total_size(self, source_dirs):
        """Calculate the total size of all files to be included in the zip."""
        total_size = 0

        for dir_info in source_dirs.values():
            dir_path = dir_info["path"]
            if os.path.exists(dir_path):
                total_size += self.get_total_size([
                    str(file) for file in dir_path.rglob('*') if file.is_file()
                ])

        return total_size

    def _add_model_files_to_zip(self, zip_file, dir_info, total_size, task_id):
        """Add model files to the zip file with progress tracking."""
        folder = dir_info["path"]
        zip_dir_structure = dir_info["zip_dir_structure"]

        for file in folder.rglob('*'):
            if file.is_file():
                arcname = os.path.join(
                    zip_dir_structure, os.path.basename(file))
                zip_file.write(file, arcname=arcname)
                self.update_zipping_progress(task_id, file, total_size)

    def _add_deployment_files_to_zip(self, zip_file, dir_info, total_size, task_id):
        """Add deployment asset files to the zip file with progress tracking."""
        folder = dir_info["path"]

        for file in folder.rglob('*'):
            if file.is_file():
                arcname = file.relative_to(folder)
                zip_file.write(file, arcname=arcname)
                self.update_zipping_progress(task_id, file, total_size)

    def _add_embedding_files_to_zip(self, zip_file, dir_info, total_size, task_id):
        """Add vector embedding files to the zip file with progress tracking, if they exist."""
        folder = dir_info["path"]
        zip_dir_structure = dir_info["zip_dir_structure"]

        if os.path.exists(folder):
            for file in folder.rglob('*'):
                if file.is_file():
                    relative_path = file.relative_to(folder)
                    arcname = os.path.join(zip_dir_structure, relative_path)
                    zip_file.write(file, arcname=arcname)
                    self.update_zipping_progress(task_id, file, total_size)
