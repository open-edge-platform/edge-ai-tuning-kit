# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import re
from celery.utils.log import get_task_logger

from datasets import load_dataset

logger = get_task_logger(__name__)


class DatasetHandler():
    def __init__(self, dataset_path, sythetic_val_path=None, synthetic_test_path=None) -> None:
        self.dataset_path = dataset_path
        self.sythetic_val_path = sythetic_val_path
        self.synthetic_test_path = synthetic_test_path

    def _dataset_splitting(self, dataset, seed=88):
        train_dataset = dataset['train']
        train_test_split_dataset = dataset['train'].train_test_split(
            test_size=0.4,
            shuffle=True,
            seed=seed
        )
        val_test_split_dataset = train_test_split_dataset['test'].train_test_split(
            test_size=0.5,
            shuffle=True,
            seed=seed
        )
        val_dataset = val_test_split_dataset['train']
        test_dataset = val_test_split_dataset['test']
        return train_dataset, val_dataset, test_dataset

    def _load_dataset(self, dataset_path):
        dataset = None
        dataset_type = self._get_file_extension(dataset_path)
        if dataset_type == ".json":
            try:
                dataset = load_dataset("json", data_files=dataset_path)
            except Exception as err:
                print(f"Failed to load the dataset. Error: {err}")
        return dataset

    def _get_file_extension(self, filename):
        _, file_extension = os.path.splitext(filename)
        return file_extension.lower()

    def _retrieve_key_in_prompt_template(self, prompt_template):
        pattern = r'\{([^{}]+)\}'
        matches = re.findall(pattern, prompt_template)
        return matches

    def _update_dict_with_missing_keys(self, data: dict, required_keys: list) -> dict:
        updated_data = data.copy()
        for key in required_keys:
            if key not in updated_data:
                updated_data[key] = ""
        return updated_data

    def create_train_test_val_dataset(self):
        dataset = self._load_dataset(self.dataset_path)
        if self.synthetic_test_path == None or self.sythetic_val_path == None:
            train_dataset, val_dataset, test_dataset = self._dataset_splitting(
                dataset=dataset
            )
        else:
            train_dataset = dataset['train']
            val_dataset = self._load_dataset(self.sythetic_val_path)['train']
            test_dataset = self._load_dataset(self.synthetic_test_path)['train']
        return train_dataset, val_dataset, test_dataset
    
    def generate_and_tokenize_prompt(self, tokenizer, prompt_template, data):
        prompt_key = self._retrieve_key_in_prompt_template(prompt_template=prompt_template)
        formatted_data = self._update_dict_with_missing_keys(data, prompt_key)
        prompt = prompt_template.format(**formatted_data)
        return tokenizer(prompt)
