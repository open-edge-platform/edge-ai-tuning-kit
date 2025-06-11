# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

from typing import List
from pydantic import BaseModel
from celery.contrib.abortable import AbortableAsyncResult

import torch


class GPUModel(BaseModel):
    device_id: int
    name: str
    total_memory_mb: int
    max_compute_units: int
    eu_count: int
    support_fp64: bool
    support_fp16: bool
    support_atomic64: bool


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


def get_gpu_info() -> List[GPUModel]:
    device_count = torch.xpu.device_count()

    devices = []
    for id in range(device_count):
        device = torch.xpu.get_device_properties(id)
        gpu_dev = GPUModel(
            device_id=id,
            name=device.name,
            total_memory_mb=int(device.total_memory / 1024 / 1024),
            max_compute_units=device.max_compute_units,
            eu_count=device.gpu_eu_count,
            support_atomic64=device.has_atomic64,
            support_fp16=device.has_fp16,
            support_fp64=device.has_fp64
        )
        devices.append(gpu_dev.dict())
    return devices


def is_aborted(task_id):
    abortable_result = AbortableAsyncResult(task_id)
    return abortable_result.is_aborted()


if __name__ == "__main__":
    print(get_gpu_info())
