# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import json
import requests
import re

from clients.base import FastAPIService

TIMEOUT = 60


async def update_model_download_progress(id: int, data):
    model_client = ModelsService()
    model_client.update_status(id, data)


class ModelsService(FastAPIService):
    def __init__(self, api_url="backend", api_port=5999, tls=None, routes='v1/models') -> None:
        super().__init__(api_url, api_port, tls)
        protocol = 'http' if not tls else 'https'
        self.routes = f"{protocol}://{api_url}:{api_port}/{routes}"

    def update_status(self, id: int, data):
        response = requests.patch(
            f"{self.routes}/{id}",
            data=json.dumps(data),
            timeout=TIMEOUT
        )
        res_data = response.json()
        if not res_data['status']:
            return False
        return res_data
    