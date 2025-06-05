# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

from fastapi import Request

from routes.utils import get_db
from models.common import HardwareModel


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
