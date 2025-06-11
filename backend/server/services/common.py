# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

from fastapi import Request

from routes.utils import get_db
from models.common import HardwareModel


def get_system_gpu_info(gpu_data):
    memory_by_device = {}
    if not 'gpu' in gpu_data:
        return memory_by_device

    for device in gpu_data['gpu']:
        device_name = device.get('name')
        memory_mb = device.get('total_memory_mb', 0)
        if device_name and memory_mb:
            if device_name in memory_by_device:
                memory_by_device[device_name]['total_memory_mb'] += memory_mb
                memory_by_device[device_name]['device_count'] += 1
            else:
                memory_by_device[device_name] = {
                    'total_memory_mb': memory_mb,
                    'device_count': 1
                }
    return memory_by_device


class HardwareService:
    def __init__(self, request: Request) -> None:
        self.db = get_db(request)
        self.request = request

    async def get_hardware(self):
        hardware = self.db.query(HardwareModel).first()
        return hardware

    async def update_hardware(self, cpu_name, gpu_name):
        try:
            data = {
                "cpu": cpu_name,
                "gpu": gpu_name
            }
            result = self.db.query(HardwareModel).filter(
                HardwareModel.id == 1).update(data)
            return {
                'status': True,
                'data': data,
                'message': "Hardware info updated"
            }
        except Exception as error:
            return {
                'status': False,
                'data': None,
                'message': error
            }
