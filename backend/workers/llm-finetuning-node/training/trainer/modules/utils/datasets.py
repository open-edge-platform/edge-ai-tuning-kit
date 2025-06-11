# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import json
import random
from datasets import load_dataset


def create_subset_from_dataset(dataset_path, save_path, percentage=10):
    with open(dataset_path, "r") as fp:
        dataset = json.loads(fp.read())

    num_elements = max(1, int(len(dataset) * percentage))
    selected_dataset = random.sample(dataset, num_elements)
    with open(save_path, "w") as fp:
        json.dump(selected_dataset, fp)
    return save_path


class DatasetLoader:
    def get_dataset(dataset_path: str):
        dataset = load_dataset("json", data_files=dataset_path, split="train")
        return dataset

    def add_system_messsage(dataset, system_message: str):
        """
        Adds a system message to the beginning of each example's messages in the dataset.

        Args:
            dataset: Hugging Face dataset object
            system_message (str): The system message to insert at the beginning of messages.

        Returns:
            dataset: Modified dataset with system messages added
        """
        def add_system_message_to_example(example):
            # Check if there's already a system message
            if not any(msg.get("role") == "system" for msg in example["messages"]):
                example["messages"].insert(0, {"role": "system", "content": system_message})
            return example

        return dataset.map(add_system_message_to_example)
