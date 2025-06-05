# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import re
import torch
from celery.contrib.abortable import AbortableAsyncResult

def fill_value_in_dict(data: dict, required_keys: list) -> dict:
    for key in required_keys:
        if key not in data:
            data[key] = ""
    return data


def get_cpu_info():
    import subprocess
    cpu_output = subprocess.check_output(["lscpu"])
    cpu_info = cpu_output.decode("utf-8").strip().split("\n")
    for line in cpu_info:
        if "Model name" in line:
            cpu_name = line.split(":")[1].strip()
            break
    return cpu_name


def get_gpu_info():
    if not torch.xpu.is_available():
        return []
    
    return [
        {
            'id': i,
            'name': torch.xpu.get_device_name(i),
            'capability': torch.xpu.get_device_capability(i),
            'memory': torch.xpu.get_device_properties(i).total_memory / (1024 ** 3)  # in GB
        }
        for i in range(torch.xpu.device_count())
    ]

def is_aborted(task_id):
    abortable_result = AbortableAsyncResult(task_id)
    return abortable_result.is_aborted()