# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import gc
import os
import json
import shlex
import subprocess
import shutil
from celery.utils.log import get_task_logger

from sentence_transformers import SentenceTransformer, util
from typing import Union,List,Dict
from jinja2.exceptions import TemplateError

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from ipex_llm.transformers.qlora import PeftModel

logger = get_task_logger(__name__)


# Check chat_template allows system as role
def analyze_chat_template(tokenizer):
    try:
        message =[{"role": "system", "content":"testing"}]
        tokenizer.apply_chat_template(message)
        return True  
    except TemplateError as e:
        return False

# Model merging
def merge_model_with_adapter(model_path, adapter_path, output_path):
    logger.info(f"Merging adapter with model: {model_path}")
    tokenizer = AutoTokenizer.from_pretrained(
        model_path,
    )
    base_model = AutoModelForCausalLM.from_pretrained(
        model_path,
        torch_dtype=torch.float16,
        device_map={"": "cpu"},
    )
    lora_model = PeftModel.from_pretrained(
        base_model,
        adapter_path,
        device_map={"": "cpu"},
    )
    lora_model = lora_model.merge_and_unload(progressbar=True)

    lora_model_sd = lora_model.state_dict()
    del lora_model
    gc.collect()

    deloreanized_sd = {
        k.replace("base_model.model.", ""): v
        for k, v in lora_model_sd.items()
        if "lora" not in k
    }
    base_model.save_pretrained(output_path, state_dict=deloreanized_sd)
    tokenizer.save_pretrained(output_path)


def export_to_openvino(task_id, task="text-generation-with-past", weight_format="int4", framework="pt"):
    model_path = f"./data/tasks/{task_id}/models/models"
    export_path = f"./data/tasks/{task_id}/models/ov_models"
    logger.info(f"Exporting model in {model_path} to OpenVINO format")

    # Define the command as a string
    logger.info(
        f"Converting {model_path} to OpenVINO format with task: {task} and weight format: {weight_format}")
    command_str = f"optimum-cli export openvino --task {task} --model {model_path} --weight-format {weight_format} --framework {framework} {export_path}"

    # Split the command string into a list of arguments using shlex
    command_args = shlex.split(command_str)

    # Run the command using subprocess
    try:
        subprocess.run(command_args, check=True)
        logger.info("Model conversion run successfully.")
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to convert model to openvino format: {e}")
        return False

    if os.path.isdir(export_path):
        return True

# Model evaluation
def model_evaluation(model, tokenizer, dataset):
    logger.info("Starting model evaluation")
    model.eval()

    result_list = []
    with torch.no_grad():
        for data in dataset:
            answer = data['assistant_message']
            chat_messages = data['formatted_chat_message']
            formatted_chat_message = tokenizer.apply_chat_template(
                chat_messages,
                tokenize=False,
                add_generation_prompt=True
            )
            inputs = tokenizer(formatted_chat_message,
                               return_tensors="pt").input_ids
            outputs = model.generate(
                inputs,
                max_new_tokens=2048,
                temperature=0.01,
                do_sample=True,
                repetition_penalty=1.15
            )
            result = tokenizer.batch_decode(
                outputs[:, inputs.shape[1]:], skip_special_tokens=True
            )[0]
            result_list.append((result, answer))
    return result_list


def mode_accuracy_evaluation(eval_results: list, embedding_threshold: float = 0.75, result_dir=None):
    model = SentenceTransformer('all-MiniLM-L6-v2')
    similarity_threshold = embedding_threshold
    score_list = []
    result_list = []
    for result in eval_results:
        generated_result = result[0]
        original_result = result[1]
        generated_embeddings = model.encode(
            generated_result, convert_to_tensor=True)
        original_embeddings = model.encode(
            original_result, convert_to_tensor=True)
        similarity_score = util.cos_sim(
            generated_embeddings, original_embeddings)
        data = {
            'original': original_result,
            'generated': generated_result,
            'score': float(similarity_score)
        }
        result_list.append(data)

        if similarity_score < similarity_threshold:
            score_list.append(False)
        else:
            score_list.append(True)

    true_count = score_list.count(True)
    result_percentage = (true_count / len(score_list)) * 100
    logger.info(
        f"Model accuracy with cosine similarity: {result_percentage}%")

    if result_dir:
        logger.info(f"Saving the evaluation results in {result_dir}")
        with open(f"{result_dir}/evaluation_results.txt", 'w') as f:
            for result in result_list:
                f.write(json.dumps(result) + "\n")

    return result_percentage

# function-call-evaluation
def model_func_call_evaluation(eval_results: list, result_dir=None):
    # validate function call arguments
    def validate_tool_call(generated_args: dict, original_args: dict):
        for key,original_value in original_args.items():
            if generated_args.get(key) != original_value:
                return False
        return True
    
    # parse result into list of dicts.
    def parse_result(result: Union[str, Dict, List]) -> List[Dict]:
        if isinstance(result, str):
            result = json.loads(result.replace("'", '"'))
        return [result] if isinstance(result, dict) else result 
    
    correct_tool_calls = 0
    result_list = []
    
    for result in eval_results:
        generated_result = parse_result(result[0])
        original_result = parse_result(result[1])
        func_call_valid = False
        
        # Number of function call doesn't match in single response
        if len(generated_result) != len(original_result):
            func_call_valid = False
        else:
            original_tool_count = len(original_result)
            generated_tool_count = 0

            for original_tool in original_result:
                for generated_tool in generated_result:
                    if original_tool['name'] == generated_tool['name']:
                        result = validate_tool_call(generated_tool['arguments'],original_tool['arguments'])
                        if result:
                            generated_tool_count += 1

            if original_tool_count == generated_tool_count:
                correct_tool_calls += 1
                func_call_valid = True
        data = {
            'original': original_result,
            'generated': generated_result,
            'function_call': func_call_valid,
        }
        result_list.append(data)
            
    result_percentage = (correct_tool_calls / len(eval_results)) * 100
    logger.info(f"Model function calling accuracy :{result_percentage}%")

    if result_dir:
        logger.info(f"Saving the function call evaluation results in {result_dir}")
        with open(f"{result_dir}/evaluation_results.txt", 'a') as f:
            for result in result_list:
                f.write(json.dumps(result) + "\n")

    return result_percentage

def copy_phi_python_configs(model_name_or_path, output_dir) -> None:
    if "phi".lower() in model_name_or_path.lower():
        for filename in os.listdir(model_name_or_path):
            if filename.endswith('.py'):
                shutil.copy(os.path.join(model_name_or_path, filename), os.path.join(f"{output_dir}/models", filename))
