# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import json
import random
import secrets
import outlines
from loguru import logger
from datasets import Dataset
from celery.utils.log import get_task_logger

import torch
from transformers import AutoTokenizer
from ipex_llm.transformers import AutoModelForCausalLM

from common.system_message import *
from common.utils import is_aborted

logger = get_task_logger(__name__)

class SyntheticModel():
    def __init__(self, model_path="mistralai/Mixtral-8x7B-Instruct-v0.1", device="cpu") -> None:
        self.model_path = model_path
        self.device = device

    def init_model(self):
        tokenizer = AutoTokenizer.from_pretrained(
            self.model_path, 
            trust_remote_code=True
        )
        model = AutoModelForCausalLM.from_pretrained(
            self.model_path,
            load_in_4bit=True,
            optimize_model=False,
            trust_remote_code=True
        )

        logger.info(f"Loading model to device: {self.device}")
        model.to(self.device)

        return tokenizer, model


class SyntheticDataGenerator():
    def __init__(self, tokenizer, model, device):
        self.tokenizer = tokenizer
        self.model = model
        self.device = device
        self.outlines_model = outlines.models.Transformers(model, tokenizer)

    def _create_json_schema(self, prompt_key_pair):
        schema = {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "properties": {},
            "required": prompt_key_pair,
            "additionalProperties": False
        }
        
        for key in prompt_key_pair:
            schema["properties"][key] = {"type": "string"}

        return json.dumps(schema, indent=4)

    def _format_model_output(self, output):
        formatted_output = ""
        error = ""
        try:
            formatted_output = json.loads(output, strict=False) if isinstance(output, str) else output
        except Exception as err:
            logger.error(f"Error: {err}")
            error = f"Output of last result: {output}, error message: {err}"
        return formatted_output, error

    def _model_generation(self, query, prompt_key_pair, max_new_tokens=512, file_path=None):
        random_temperature = round(0.01 + secrets.randbelow(100) / 100, 2)
        
        schema = self._create_json_schema(prompt_key_pair)
        sampler = outlines.samplers.multinomial(temperature=random_temperature)
        generator = outlines.generate.json(self.outlines_model, str(schema), sampler=sampler)
        _output = generator(query, max_tokens=max_new_tokens)

        if self.model.device == "xpu":
            torch.xpu.synchronize()
        
        # Write result to a file
        with open(file_path, 'a') as f:
            f.write(str(_output))
            f.write('\n')

        formatted_output, _ = self._format_model_output(
            output=_output
        )

        return formatted_output
    
    def is_chunk_meaningful(self, query):
        formatted_query = ANALYSE_DATA_MEANINGFUL_SYS_MESSAGE.format(context=query)
        chat_messages = [
            {"role": "user", "content": formatted_query}
        ]
        formatted_chat_messages = self.tokenizer.apply_chat_template(
            chat_messages,
            tokenize=False,
            add_generation_prompt=True
        )
        generator = outlines.generate.choice(self.outlines_model, ["YES", "NO"])
        result = generator(formatted_chat_messages)
        if result == "YES":
            return True
        elif result == "NO":
            return False
        else:
            logger.warning("Failed to analyze the meaningfulness of the chunk!")
            return False


    def create_synthetic_dataset(self, dataset, task_id, dataset_type="val"):
        logger.info(f"Creating the synthetic dataset for {dataset_type}")
        data_list = []
        synthetic_key_list = ['user_message']
        result_key = 'assistant_message'
        file_path = f"./data/tasks/{task_id}/datasets/synthetic-{dataset_type}.txt"
        required_key = ['original', 'augmented']

        for data in dataset:
            generated_query_list = []
            query_list = [data.get(key, None) for key in synthetic_key_list]
            for query in query_list:
                if query == None:
                    synthetic_question_answer = ""
                else:
                    formatted_query = DATASET_AUGMENT_SYS_MESSAGE + f"\nContext: {query}"
                    chat_messages = [
                        {"role": "user", "content": formatted_query}
                    ]
                    formatted_chat_messages = self.tokenizer.apply_chat_template(
                        chat_messages,
                        tokenize=False,
                        add_generation_prompt=True
                    )
                    reply = self._model_generation(
                        query=formatted_chat_messages,
                        prompt_key_pair=required_key,
                        max_new_tokens=2048,
                        file_path=file_path
                    )
                    try:
                        synthetic_question_answer = str(reply['augmented'])
                    except Exception as err:
                        logger.warning(
                            f"Error in generation for query: {formatted_query}, error: {err}.")
                        continue
                generated_query_list.append(synthetic_question_answer)
            
            query_dict = dict(zip(synthetic_key_list, generated_query_list))
            query_dict.update({result_key: data[result_key]})

            if query_dict:
                data_list.append(query_dict)

        if len(data_list) == 0:
            logger.warning("No dataset is generated.")
            return None

        dataset = Dataset.from_list(data_list)
        return dataset

    def generate_json_dataset(self, task_id, dataset_id, query, result_path, num_generations=5):
        result_list = []

        for i in range(num_generations):
            if (is_aborted(task_id)):
                logger.info(f"Task {task_id} is aborted.")
                return [], False

            prompt_key_pair = ['user_message', 'assistant_message']
            formatted_query = CHAT_MODEL_JSON_LIST_GENERATION_SYS_MESSAGE + f"\nContext: {query.rstrip()}"
            chat_messages = [
                {"role": "user", "content": formatted_query}
            ]
            formatted_chat_messages = self.tokenizer.apply_chat_template(
                chat_messages,
                tokenize=False,
                add_generation_prompt=True
            )
            results = self._model_generation(
                query=formatted_chat_messages,
                max_new_tokens=2048,
                prompt_key_pair=prompt_key_pair,
                file_path=result_path
            )
            logger.info(f"Results: {results}")
            result_list.append(results)
        return result_list, True

    def cleanup(self):
        if self.device == "xpu":
            logger.info("Cleaning up GPU RAM for generation ...")
            torch.xpu.empty_cache()
        