# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import json
import requests

from clients.base import FastAPIService

TIMEOUT = 60

class DatasetsService(FastAPIService):
    def __init__(self, api_url="backend", api_port=5999, tls=None, routes='v1/datasets') -> None:
        super().__init__(api_url, api_port, tls)
        protocol = 'http' if not tls else 'https'
        self.routes = f"{protocol}://{api_url}:{api_port}/{routes}"

    def generate_dataset(self, dataset_id):
        response = requests.get(
            f"{self.routes}/{dataset_id}/data/get_json_file",
            timeout=TIMEOUT
        )
        res_data = response.json()
        if not res_data['status']:
            return False

        return res_data
    
    def get_dataset(self, dataset_id):
        response = requests.get(
            f"{self.routes}/{dataset_id}",
            timeout=TIMEOUT
        )
        res_data = response.json()['data']

        return res_data
    
    def update_generated_faq_data_list(self, dataset_id: int, data_list: list):
        """
        Updates the generated FAQ data list for a given dataset.

        This method takes a dataset ID and a list of data dictionaries, each containing
        a "question" and an "answer". It formats the data and sends it to a specified
        endpoint to update the dataset.

        Args:
            dataset_id (int): The ID of the dataset to update.
            data_list (list): A list of dictionaries, each containing "question" and "answer" keys.

        Returns:
            bool: True if all data was successfully updated, False otherwise.

        Raises:
            AssertionError: If any dictionary in data_list is missing the "question" or "answer" key.
        """
        for data in data_list:
            generated_data = {
                "raw_data": {
                    "user_message": data.question,
                    "assistant_message": data.answer
                },
                "isGenerated": True
            }

            response = requests.post(
                f"{self.routes}/{dataset_id}/data",
                data=json.dumps(generated_data),
                timeout=self.timeout
            )
            res_data = response.json()
            if not res_data['status']:
                return False

        return True
    
    def update_generated_data_to_dataset(self, dataset_id, data):
        generated_data = {
            "raw_data": data,
            "isGenerated": True
        }
        response = requests.post(
            f"{self.routes}/{dataset_id}/data", 
            data=json.dumps(generated_data),
            timeout=TIMEOUT
        )
        res_data = response.json()
        if not res_data['status']:
            return False

        return res_data

    def update_dataset_generation_metadata(self, dataset_id, metadata):
        data = {
            "generation_metadata": metadata
        }
        response = requests.patch(
            f"{self.routes}/{dataset_id}", 
            data=json.dumps(data),
            timeout=TIMEOUT
        )
        res_data = response.json()
        if not res_data['status']:
            return False
        return response
    
    def update_dataset_tools(self, dataset_id, tools: list):
        '''
        Args: 
            tools (list): List of tools containing dicts with keys of "tool_id","tool_name","description","input","output"
            Example:
            [
                {"tool_id": 1, "tool_name": "name1", "description": "des1", "input": "in1", "output": "out1"},
                {"tool_id": 2, "tool_name": "name2", "description": "des2", "input": "in2", "output": "out2"}
            ]
        '''
        data = {
            "tools": tools
        }
        response = requests.patch(
            f"{self.routes}/{dataset_id}", 
            data=json.dumps(data),
            timeout=TIMEOUT
        )
        res_data = response.json()
        if not res_data['status']:
            return False
        return response