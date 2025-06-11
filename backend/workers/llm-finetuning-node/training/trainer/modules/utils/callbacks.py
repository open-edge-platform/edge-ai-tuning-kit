# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import time
import requests
from datetime import datetime

import torch
from transformers import TrainerCallback

from utils.logger import setup_logger

logger = setup_logger(__name__)


class TaskCallback:
    def update_task_data(task_id: int, data: dict, server_uri: str = "backend:5999"):
        """
        Update the task data in the server.
        """
        server_url = f"http://{server_uri}/v1/tasks/{task_id}"
        response = requests.patch(server_url, json=data)
        if response.status_code == 200:
            logger.info("Task data updated successfully.")
        else:
            logger.error(f"Failed to update task data: {response.text}")


class CustomCallback(TrainerCallback):
    def __init__(self, cutoff_len=512, micro_batch_size=1, gradient_accumulation_steps=1, task_id=None):
        self.start_time = datetime.now()
        self.start_step_time = 0
        self.last_num_token = 0
        self.num_token_per_step = 0
        self.is_update_metric = False

        self.cutoff_len = cutoff_len
        self.micro_batch_size = micro_batch_size
        self.gradient_accumulation_steps = gradient_accumulation_steps
        self.task_id = task_id
        self.data = {
            "results": {
                "stage": "Training Model",
                "start_time": self.start_time.strftime('%Y-%m-%d %H:%M:%S'),
                "train_history": {
                    "0": {
                        "lr": 0.0,
                        "loss": 0.0,
                        "num_tokens": 0.0,
                        "peak_memory_alloc": 0.0,
                        "mean_token_accuracy": 0.0,
                        "peak_memory_reserved": 0.0,
                        "tokens_per_second_per_gpu": 0.0
                    }
                },
                "eval_history": {
                    "0": {
                        "eval_loss": 0.0,
                        "eval_mean_token_accuracy": 0.0
                    }
                }
            }
        }

        self._verify_update_metric()
        self._update_metric(self.data)

    def _verify_update_metric(self):
        if self.task_id:
            logger.info("Enabling metric update to server ...")
            self.is_update_metric = True

    def _update_metric(self, data: dict, server_uri: str = "backend:5999"):
        if self.is_update_metric:
            self.server_url = f"http://{server_uri}/v1/tasks/{self.task_id}"
            response = requests.patch(self.server_url, json=data)
            response.raise_for_status()

    def on_step_begin(self, args, state, control, **kwargs):
        if state.is_local_process_zero:
            self.start_step_time = time.time()

    def on_step_end(self, args, state, control, **kwargs):
        if state.is_local_process_zero:
            elapsed_step_time = time.time() - self.start_step_time
            num_train_token_per_sec = self.num_token_per_step/elapsed_step_time
            self.data["results"]["train_history"].setdefault(
                state.global_step, {})
            self.data["results"]["train_history"][state.global_step].update({
                "tokens_per_second_per_gpu": num_train_token_per_sec,
                "peak_memory_alloc": torch.xpu.max_memory_allocated(),
                "peak_memory_reserved": torch.xpu.memory_reserved()
            })
            logger.info(f"\nGlobal Step: {state.global_step}/{state.max_steps} | Time taken for step: {elapsed_step_time:2} secs | Avg TPS per GPU (t/s): {num_train_token_per_sec:.4} | GPU memory allocated: {torch.xpu.max_memory_allocated() / (1024 ** 3):.4} GB | GPU memory reserved: {torch.xpu.memory_reserved() / (1024 ** 3):.4} GB")
            self._update_metric(self.data)

    def on_train_begin(self, args, state, control, **kwargs):
        if state.is_local_process_zero:
            self.data["results"]["max_steps"] = state.max_steps
            self._update_metric(self.data)

    def on_train_end(self, args, state, control, **kwargs):
        if state.is_local_process_zero:
            self._update_metric(self.data)

    def on_log(self, args, state, control, logs=None, **kwargs):
        if state.is_local_process_zero:
            if logs and "loss" in logs:
                if not "num_tokens" in logs:
                    logs["num_tokens"] = 0

                if not "mean_token_accuracy" in logs:
                    logs["mean_token_accuracy"] = 0

                self.data["results"]["train_history"][state.global_step].update({
                    "loss": logs["loss"],
                    "lr": logs["learning_rate"],
                    "num_tokens": logs["num_tokens"],
                    "mean_token_accuracy": logs["mean_token_accuracy"]
                })
                if self.last_num_token == 0:
                    self.last_num_token = logs["num_tokens"]
                    self.num_token_per_step = logs["num_tokens"]
                else:
                    self.num_token_per_step = logs["num_tokens"] - \
                        self.last_num_token
                    self.last_num_token = logs["num_tokens"]

            elif logs and "eval_loss" in logs:
                if not "eval_mean_token_accuracy" in logs:
                    logs["eval_mean_token_accuracy"] = 0
                    
                self.data["results"]["eval_history"][state.global_step] = {
                    "eval_loss": logs["eval_loss"],
                    "eval_mean_token_accuracy": logs["eval_mean_token_accuracy"]
                }
            else:
                logger.error(f"Not supported logging: {logs}")
