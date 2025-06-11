# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import json
import requests
from urllib.parse import urlparse

from clients.base import FastAPIService
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


class TasksService(FastAPIService):
    def __init__(self, api_url="backend", api_port=5999, tls=None, routes='v1/tasks') -> None:
        super().__init__(api_url, api_port, tls)
        protocol = 'http' if not tls else 'https'
        self.routes = f"{protocol}://{api_url}:{api_port}/{routes}"

    def _is_valid_url(self, url):
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except ValueError:
            return False

    def get_task(self, id):
        # Validate the self.routes to ensure it is a valid URL
        if not self._is_valid_url(self.routes):
            raise ValueError("Invalid URL for routes")
        
        # Validate the id to ensure it is a valid alphanumeric string
        if not isinstance(id, int) and (not isinstance(id, str) or not id.isalnum()):
            raise ValueError("Invalid ID")

        response = requests.get(f"{self.routes}/{id}")
        data = response.json()['data']
        if not data:
            return None

        data = data
        if type(data['configs']) == str:
            data['configs'] = json.loads(data['configs'])
        if type(data['results']) == str:
            data['results'] = json.loads(data['results'])
        print(data, flush=True)
        print("-"*50, flush=True)
        return data

    def update_task(self, id, data):
        response = requests.patch(f"{self.routes}/{id}", data=json.dumps(data))
        return response

    def get_task_id(self, celery_task_id):
        params = {'celery_task_id': celery_task_id}
        response = requests.get(f"{self.routes}/{id}/celery_id", params)
        data = response.json()['data']
        return data

    def create_task(self, type: str, project_id: int, configs: dict):
        configs = json.dumps(configs)
        params = {
            "type": type.upper(),
            "project_id": project_id,
            "configs": configs
        }
        headers = {'Content-type': 'application/json'}
        response = requests.post(
            f"{self.routes}", params=params, headers=headers)
        data = response.json()
        return data, response.status_code

    def delete_task(self, id):
        response = requests.delete(f"{self.routes}/{id}")
        data = response.json()
        return data

    def get_running_task(self):
        response = requests.get(f"{self.routes}/celery/running_task")
        try:
            data = response.json()
            return data
        except Exception as error:
            logger.error(f"Failed to get running task: {error}")
            return False

    def update_running_task(self, data):
        try:
            response = requests.patch(
                f"{self.routes}/celery/running_task", data=json.dumps(data))
            data = response.json()
            if data['status']:
                return True
            else:
                return False
        except Exception as error:
            logger.error(f"Failed to get running task: {error}")
            return False
