# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

import os
import re
import logging
import pathlib
import zipfile

from models.tasks import TasksModel

logger = logging.getLogger(__name__)


class DeploymentPackageService:
    def __init__(self, db) -> None:
        self.db = db
        self.prev_progress = 0
        self.bytes_written = 0

    def _update_task(self, task_id: int, data: dict):
        try:
            self.db.query(TasksModel).filter(
                TasksModel.id == task_id).update(data)
            self.db.commit()
        except Exception:
            self.db.rollback()
            logger.error(f"Failed to update task {task_id}")

    def _check_file_exists(self, zip_file, task_id):
        """Checks if zip file already existed and its contents."""
        model_path = pathlib.Path(
            f'./data/tasks/{task_id}/models/checkpoints/models')

        file_paths = [str(file)
                      for file in model_path.rglob('*') if file.is_file()]
        if os.path.exists(zip_file):
            try:
                with zipfile.ZipFile(zip_file, 'r') as zip_ref:
                    zip_info_list = zip_ref.infolist()
                    zip_files = sum(
                        info.file_size for info in zip_info_list if not info.is_dir())

                model_files = sum(os.path.getsize(file) for file in file_paths)
                if zip_files == model_files:
                    return True
            except Exception:
                logger.error(f"Failed to read zip file: {zip_file}")
        return False

    def _get_total_size(self, file_paths):
        """Calculate the total size of all files to be zipped."""
        total_size = 0
        for file in file_paths:
            total_size += os.path.getsize(file)
        return total_size

    def _update_zipping_progress(self, task_id, file, total_size):
        self.bytes_written += os.path.getsize(file)
        progress = int(self.bytes_written / total_size * 100)
        if self.prev_progress == 0:
            self.prev_progress = progress
        elif self.prev_progress == progress:
            return
        self.prev_progress = progress
        self._update_task(task_id, {"download_progress": int(progress)})

    def _collect_source_directories(self, task_id):
        """Collect and validate all source directories needed for the deployment package."""
        source_dirs = {}
        adapters_path = f'./data/tasks/{task_id}/models/checkpoints/adapters'
        if not os.path.isdir(adapters_path):
            raise RuntimeError(
                "Error: Failed to find adapters file directory.")
        source_dirs["adapters"] = {
            "path": pathlib.Path(adapters_path),
            "zip_dir_structure": 'model_adapters/'
        }
        return source_dirs

    def _calculate_total_size(self, source_dirs):
        """Calculate the total size of all files to be included in the zip."""
        total_size = 0
        for dir_info in source_dirs.values():
            dir_path = dir_info["path"]
            exclude_dirs = dir_info.get("exclude_dirs", [])
            if os.path.exists(dir_path):
                total_size += self._get_total_size([
                    str(file) for file in dir_path.rglob('*')
                    if file.is_file() and not any(part in exclude_dirs for part in file.parts)
                ])
        return total_size

    def _add_model_files_to_zip(self, zip_file, dir_info, total_size, task_id):
        """Add model files to the zip file with progress tracking."""
        folder = dir_info["path"]
        zip_dir_structure = dir_info["zip_dir_structure"]
        exclude_dirs = dir_info.get("exclude_dirs", [])

        for file in folder.rglob('*'):
            if file.is_file() and not any(part in exclude_dirs for part in file.parts):
                arcname = os.path.join(
                    zip_dir_structure, os.path.basename(file))
                zip_file.write(file, arcname=arcname)
                self._update_zipping_progress(task_id, file, total_size)

    def prepare_deployment_file(self, project_id, task_id, zip_filename):
        """
        Prepare a deployment zip file with progress tracking.
        Intended to be run in a background thread.
        """
        try:
            if self._check_file_exists(zip_filename, task_id):
                self._update_task(task_id, {
                    "download_status": "SUCCESS",
                    "download_progress": 100
                })
                return

            self._update_task(task_id, {
                "download_status": "STARTED",
                "download_progress": 0
            })

            # Reset progress trackers
            self.prev_progress = 0
            self.bytes_written = 0

            source_dirs = self._collect_source_directories(task_id)
            total_size = self._calculate_total_size(source_dirs)

            with zipfile.ZipFile(zip_filename, 'w') as zip_file:
                self._add_model_files_to_zip(
                    zip_file, source_dirs["adapters"], total_size, task_id)

            self._update_task(task_id, {
                "download_status": "SUCCESS",
                "download_progress": 100
            })
            logger.info("Deployment zip file prepared successfully.")

        except Exception as e:
            logger.error(f"Failed to prepare deployment file: {e}")
            self._update_task(task_id, {
                "download_status": "FAILURE",
                "download_progress": 0
            })
