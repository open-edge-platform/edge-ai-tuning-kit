# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import json
import requests

from clients.base import FastAPIService

TIMEOUT = 60

class HardwareService(FastAPIService):
    def __init__(self, api_url="backend", api_port=5999, tls=None, routes='v1/server') -> None:
        super().__init__(api_url, api_port, tls)
        protocol = 'http' if not tls else 'https'
        self.routes = f"{protocol}://{api_url}:{api_port}/{routes}"

    def update_hardware_info(self, cpu_name, gpu_name):
        data = {"cpu": cpu_name, "gpu": gpu_name}
        response = requests.patch(
            f"{self.routes}/info", 
            data=json.dumps(data),
            timeout=TIMEOUT
        )
        if response.status_code != 200:
            return False
        return True
    