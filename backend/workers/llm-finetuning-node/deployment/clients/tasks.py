# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import json
import requests
from json import JSONDecodeError
from urllib.parse import urljoin, urlparse

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
        
        # Validate id
        if not isinstance(id, (int, str)) or not str(id).isalnum():
            raise ValueError("Invalid ID")
        
        url = urljoin(f"{self.routes}/", str(id))
        response = requests.get(url)
        try:
            json_resp = response.json()
            data = json_resp.get('data')
            if not isinstance(data, dict):
                return None
        except (ValueError, JSONDecodeError, KeyError) as e:
            raise RuntimeError("Failed to parse or validate task data") from e

        try:
            if isinstance(data.get('configs'), str):
                data['configs'] = json.loads(data['configs'])
            if isinstance(data.get('results'), str):
                data['results'] = json.loads(data['results'])
        except JSONDecodeError:
            raise ValueError("Invalid JSON in configs or results")
        return data

    def update_task(self, id, data):
        if not str(id).isdigit():
            raise ValueError("Invalid ID")
        
        url = urljoin(f"{self.routes}/", str(id))
        response = requests.patch(url, data=json.dumps(data))
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
