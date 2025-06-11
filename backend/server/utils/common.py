# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import psutil
import shutil
import logging
import shlex
import subprocess

logger = logging.getLogger(__name__)

ID_MAX = 2147483647


def is_storage_available(partitions="/"):
    try:
        # Currently docker volume is using default path, if we were to allow user to use specific path, need to enhance here.
        partition_usage = psutil.disk_usage(partitions)
        available_gb = partition_usage.free / (1024 ** 3)
        logger.info(f"Available GB: {available_gb}")
        if available_gb <= 60:
            logger.warning(
                f"Not enough storage available to create task: {available_gb}")
            return False
        else:
            return True
    except Exception as error:
        logger.error(f"Error when getting the storage space: {error}")
        return False


def remove_dir(data_dir: str):
    if os.path.isdir(data_dir):
        logger.info(f"Removing the directory: {data_dir}")
        shutil.rmtree(data_dir)
    else:
        logger.warning(f"Unable to find & remove directory: {data_dir}")


def validate_model_filter(model, filter):
    model_columns = set(c.name for c in model.__table__.columns)
    result = {"status": True, "message": "Valid keys"}

    # Check if all keys in filter_dict exist in the model's columns
    for key in filter:
        if key not in model_columns:
            result = {
                "status": False,
                "message": "Key does not exist in table"
            }
            break

    return result


def export_to_openvino(task_id, task="text-generation-with-past", weight_format="int4", framework="pt"):
    model_path = f"./data/tasks/{task_id}/models/models"
    export_path = f"./data/tasks/{task_id}/models/ov_models"
    logger.info(f"Exporting model in {model_path} to OpenVINO format")

    # Define the command as a string
    logger.info(
        f"Converting {model_path} to OpenVINO format with task: {task} and weight format: {weight_format}")
    command_str = f"optimum-cli export openvino --task {task} --model {model_path} --weight-format {weight_format} --framework {framework} {export_path}"

    # Split the command string into a list of arguments using shlex
    command_args = shlex.split(command_str)

    # Run the command using subprocess
    try:
        subprocess.run(command_args, check=True)
        logger.info("Model conversion run successfully.")
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to convert model to openvino format: {e}")
        return False

    if os.path.isdir(export_path):
        return True
