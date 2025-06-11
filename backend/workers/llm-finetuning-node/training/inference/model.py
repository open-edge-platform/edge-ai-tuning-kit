# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import json
import shlex
import random
import subprocess  # nosec
from pydantic import BaseModel

from transformers import AutoTokenizer
from optimum.intel import OVModelForCausalLM
from sentence_transformers import SentenceTransformer, util


class OptimumCLI:
    def run_export(model_name_or_path, output_dir, model_precision=None, symmetrical=None, ratio=None, group_size=None, trust_remote_code=True):
        command = f"optimum-cli export openvino --model {model_name_or_path} --task text-generation-with-past --framework pt --library transformers"
        if model_precision:
            command += f" --weight-format {model_precision}"
        if symmetrical:
            command += " --sym"
        if ratio:
            command += f" --ratio {ratio}"
        if group_size:
            command += f" --group-size {group_size}"
        if trust_remote_code:
            command += " --trust-remote-code"
        command += f" {output_dir}"
        try:
            print(f"Model convertion command: {command}")
            result = subprocess.run(shlex.split(command), check=True)  # nosec
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"Export command failed with error: {e}")


class SyntheticData(BaseModel):
    results: str


class OVInference:
    def __init__(self, model_path: str, converted_model_path: str, device: str = "CPU", model_precision: str = "int8"):
        self.model_path = model_path
        self.converted_model_path = converted_model_path
        self.device = device.upper()
        self.model_precision = model_precision
        self._convert_model_to_ov_format()
        self.model, self.tokenizer = self._load_model_and_tokenizer()

    def _load_model_and_tokenizer(self):
        print(
            f"Loading model and tokenizer in {self.converted_model_path} on {self.device}...")
        model = OVModelForCausalLM.from_pretrained(self.converted_model_path)
        model.to(self.device)
        tokenizer = AutoTokenizer.from_pretrained(self.converted_model_path)
        return model, tokenizer

    def _convert_model_to_ov_format(self):
        if os.path.exists(f"{self.converted_model_path}/openvino_model.xml"):
            print("OV converted model is already available. Skipping conversion.")
            return
        try:
            OptimumCLI.run_export(
                model_name_or_path=self.model_path,
                output_dir=self.converted_model_path,
                model_precision=self.model_precision
            )
        except subprocess.CalledProcessError as e:
            raise RuntimeError(
                f"Model conversion to OpenVINO format failed: {e}")

    def generate(self, system_message, user_message, max_new_tokens=2048):
        messages = [
            {
                "role": "system",
                "content": system_message,
            },
            {
                "role": "user",
                "content": user_message
            }
        ]
        tokenized_chat = self.tokenizer.apply_chat_template(
            messages,
            tokenize=True,
            add_generation_prompt=True,
            return_tensors="pt"
        )
        input_length = tokenized_chat.shape[1]
        outputs = self.model.generate(
            tokenized_chat,
            max_new_tokens=max_new_tokens
        )
        results = self.tokenizer.batch_decode(
            outputs[:, input_length:], skip_special_tokens=True)[0]
        return results

    def _generate_augmented_sentence(self, sentence: str, debug=True):
        SYNTHETIC_DATASET_GENERATION_TEMPLATE = "Rewrite the sentence while preserving its original meaning: {sentence}\nRespond only with the revised sentence."
        prompt = SYNTHETIC_DATASET_GENERATION_TEMPLATE.format(
            sentence=sentence)
        results = self.generate(
            system_message="You are a helpful assistant.",
            user_message=prompt
        )

        if debug:
            print("*"*20)
            print(f"Prompt input: {prompt}\n")
            print(f"Results: {results}")
            print("*"*20)
        return results

    def generate_synthetic_dataset(self, dataset_path: str, save_path: str, percentage=10):
        synthetic_data_list = []
        with open(dataset_path, "r") as f:
            data = f.read()

        json_data = json.loads(data)
        sample_size = max(1, len(json_data) * percentage // 100)
        sampled_data = random.sample(json_data, sample_size)
        
        for item in sampled_data:
            synthetic_conversation = {"messages": []}
            for conversation in item['messages']:
                message = ""
                if conversation["role"] == "user":
                    message = conversation['content']
                elif conversation["role"] == "assistant":
                    message = self._generate_augmented_sentence(
                        conversation['content'])
                else:
                    raise NotImplementedError(
                        "Only user and assistant messages are supported."
                    )
                synthetic_conversation['messages'].append({
                    "role": conversation["role"],
                    "content": message
                })
            synthetic_data_list.append(synthetic_conversation)

        with open(save_path, 'w') as f:
            json.dump(synthetic_data_list, f)

    def evaluate(self):
        pass

    def _load_sematic_textual_similarity_model(self, model_path_or_name: str = 'sentence-transformers/all-MiniLM-L6-v2'):
        return SentenceTransformer(model_path_or_name)

    def evaluate_test_dataset(self, test_dataset_path: str, system_message: str):
        test_result_list = []
        dataset_dir = os.path.dirname(test_dataset_path)
        result_path = f"{dataset_dir}/model_evaluation.json"
        if not os.path.exists(test_dataset_path):
            raise FileNotFoundError(
                f"Test dataset file {test_dataset_path} not found.")

        with open(test_dataset_path, "r") as f:
            test_dataset_list = json.load(f)

        test_result_list = [
            {
                "messages": [
                    {
                        "role": "user",
                        "content": conversation['content']
                    },
                    {
                        "role": "assistant",
                        "content": self.generate(system_message, conversation['content'])
                    }
                ]
            }
            for data in test_dataset_list
            for conversation in data['messages']
            if conversation['role'] == "user"
        ]

        if len(test_result_list) == 0:
            raise RuntimeError("Failed to generate test results.")

        with open(result_path, 'w') as f:
            json.dump(test_result_list, f)

        original_test_assistant_message = [
            data['messages'][1]['content'] for data in test_dataset_list]
        finetuned_test_assistant_message = [
            data['messages'][1]['content'] for data in test_result_list]
        evaluate_data = zip(
            original_test_assistant_message,
            finetuned_test_assistant_message
        )

        semantic_model = self._load_sematic_textual_similarity_model(
            model_path_or_name='sentence-transformers/all-MiniLM-L6-v2'
        )
        similarity_result_list = []
        for ori_msg, finetuned_msg in evaluate_data:
            ori_embedding = semantic_model.encode(
                ori_msg, convert_to_tensor=True)
            finetuned_embedding = semantic_model.encode(
                finetuned_msg, convert_to_tensor=True)
            semantic_textual_similarity = util.pytorch_cos_sim(
                ori_embedding, finetuned_embedding)
            similarity_result_list.append(semantic_textual_similarity)

        mean_similarity = sum(similarity_result_list) / \
            len(similarity_result_list)

        mean_similarity = round(float(mean_similarity.cpu().numpy()[0][0]), 2)
        return mean_similarity
