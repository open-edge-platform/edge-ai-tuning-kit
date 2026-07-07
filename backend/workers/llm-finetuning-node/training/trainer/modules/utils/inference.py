# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import json

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from sentence_transformers import SentenceTransformer, util


class PTInference:
    """PyTorch inference with bitsandbytes 4-bit quantization."""

    def __init__(self, model_path: str, device: str = "xpu", model_precision: str = "int4"):
        self.model_path = model_path
        self.device = device
        self.model_precision = model_precision
        self.model, self.tokenizer = self._load_model_and_tokenizer()

    def _get_bnb_config(self):
        return BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_use_double_quant=True,
        )

    def _load_model_and_tokenizer(self):
        print(
            f"Loading model {self.model_path} on {self.device} with bitsandbytes "
            f"{self.model_precision} quantization..."
        )
        bnb_config = self._get_bnb_config()
        tokenizer = AutoTokenizer.from_pretrained(self.model_path, trust_remote_code=True)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        model = AutoModelForCausalLM.from_pretrained(
            self.model_path,
            quantization_config=bnb_config,
            device_map=self.device,
            trust_remote_code=True,
            torch_dtype=torch.bfloat16,
        )
        model.eval()
        return model, tokenizer

    def generate(self, system_message: str, user_message: str, max_new_tokens: int = 2048) -> str:
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ]
        tokenized_chat = self.tokenizer.apply_chat_template(
            messages,
            tokenize=True,
            add_generation_prompt=True,
            return_tensors="pt",
        )
        if not isinstance(tokenized_chat, torch.Tensor):
            tokenized_chat = tokenized_chat["input_ids"]
        tokenized_chat = tokenized_chat.to(self.device)
        input_length = tokenized_chat.shape[1]
        with torch.no_grad():
            outputs = self.model.generate(
                tokenized_chat,
                max_new_tokens=max_new_tokens,
            )
        results = self.tokenizer.batch_decode(
            outputs[:, input_length:], skip_special_tokens=True
        )[0]
        return results

    def _generate_augmented_sentence(self, sentence: str, debug: bool = True) -> str:
        SYNTHETIC_DATASET_GENERATION_TEMPLATE = (
            "Rewrite the sentence while preserving its original meaning: {sentence}\n"
            "Respond only with the revised sentence."
        )
        prompt = SYNTHETIC_DATASET_GENERATION_TEMPLATE.format(sentence=sentence)
        results = self.generate(
            system_message=(
                "Your task is to rewrite the sentence while preserving its original "
                "meaning. If the sentence has specific formatting, such as code blocks, "
                "lists, or special characters, ensure that the formatting is preserved "
                "in the rewritten sentence."
            ),
            user_message=prompt,
        )
        if debug:
            print("*" * 20)
            print(f"Prompt input: {prompt}\n")
            print(f"Results: {results}")
            print("*" * 20)
        return results

    def generate_synthetic_dataset(self, dataset_path: str, save_path: str, percentage: int = 10):
        """Generate synthetic user message data from the original dataset."""
        import json
        import random

        synthetic_data_list = []
        with open(dataset_path, "r") as f:
            data = f.read()

        json_data = json.loads(data)
        sample_size = max(1, len(json_data) * percentage // 100)
        sampled_data = random.sample(json_data, sample_size)  # nosec

        for item in sampled_data:
            synthetic_conversation = {"messages": []}
            for conversation in item["messages"]:
                message = ""
                if conversation["role"] == "user":
                    message = self._generate_augmented_sentence(conversation["content"])
                elif conversation["role"] == "assistant":
                    message = conversation["content"]
                else:
                    raise NotImplementedError(
                        "Only user and assistant messages are supported."
                    )
                synthetic_conversation["messages"].append(
                    {"role": conversation["role"], "content": message}
                )
            synthetic_data_list.append(synthetic_conversation)

        with open(save_path, "w") as f:
            json.dump(synthetic_data_list, f)

    def _load_sematic_textual_similarity_model(
        self, model_path_or_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    ):
        return SentenceTransformer(model_path_or_name)

    def evaluate_test_dataset(
        self,
        test_dataset_path: str,
        system_message: str,
        similarity_threshold: float = 0.75,
    ):
        test_result_list = []
        dataset_dir = os.path.dirname(test_dataset_path)
        result_path = f"{dataset_dir}/model_evaluation.json"
        if not os.path.exists(test_dataset_path):
            raise FileNotFoundError(
                f"Test dataset file {test_dataset_path} not found."
            )

        with open(test_dataset_path, "r") as f:
            test_dataset_list = json.load(f)

        test_result_list = [
            {
                "messages": [
                    {"role": "user", "content": conversation["content"]},
                    {
                        "role": "assistant",
                        "content": self.generate(
                            system_message, conversation["content"]
                        ),
                    },
                ]
            }
            for data in test_dataset_list
            for conversation in data["messages"]
            if conversation["role"] == "user"
        ]

        if len(test_result_list) == 0:
            raise RuntimeError("Failed to generate test results.")

        with open(result_path, "w") as f:
            json.dump(test_result_list, f)

        original_test_assistant_message = [
            data["messages"][1]["content"] for data in test_dataset_list
        ]
        finetuned_test_assistant_message = [
            data["messages"][1]["content"] for data in test_result_list
        ]
        evaluate_data = zip(
            original_test_assistant_message, finetuned_test_assistant_message
        )

        semantic_model = self._load_sematic_textual_similarity_model()
        similarity_result_list = []
        evaluate_result_list = []

        for ori_msg, finetuned_msg in evaluate_data:
            ori_embedding = semantic_model.encode(ori_msg, convert_to_tensor=True)
            finetuned_embedding = semantic_model.encode(
                finetuned_msg, convert_to_tensor=True
            )
            cosine_tensor = util.pytorch_cos_sim(ori_embedding, finetuned_embedding)
            cosine_score = round(float(cosine_tensor.cpu().numpy()[0][0]), 2)
            evaluate_result_list.append(
                {
                    "original": ori_msg,
                    "finetuned": finetuned_msg,
                    "similarity": cosine_score,
                }
            )
            if cosine_score >= similarity_threshold:
                similarity_result_list.append(True)
            else:
                similarity_result_list.append(False)

        mean_similarity = round(
            sum(similarity_result_list) / len(similarity_result_list), 2
        )
        return mean_similarity, evaluate_result_list
