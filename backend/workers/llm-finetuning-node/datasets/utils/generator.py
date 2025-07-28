# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import gc
import ast
import time
import shlex
import asyncio
import outlines
import subprocess  # nosec
from pypdf import PdfReader

from celery.utils.log import get_task_logger

import torch
import openvino as ov
from datasets import Dataset
from transformers import AutoTokenizer
from optimum.intel import OVModelForCausalLM

from models.faq import FAQ
from models.dataset import SyntheticData
from utils.configs import (
    GENERATION_MODEL,
    GENERATION_OV_MODEL,
    FAQ_GENERATION_TEMPLATE,
    ANALYSE_DATA_MEANINGFUL_SYS_MESSAGE,
    DATASET_AUGMENT_SYS_MESSAGE
)
from utils.common import is_aborted
from clients.datasets import DatasetsService

logger = get_task_logger(__name__)


async def update_dataset_metadata_cb(dataset_id, metadata):
    dataset_client = DatasetsService()
    dataset_client.update_dataset_generation_metadata(
        dataset_id=dataset_id,
        metadata=metadata
    )


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


class SyntheticDataGenerator():
    def __init__(self, model_path_or_name: str, converted_model_path: str, device: str, model_precision: str = 'int8'):
        self.model_path_or_name = model_path_or_name
        self.converted_model_path = converted_model_path
        self.model_precision = model_precision
        self.device = device.upper()
        self._convert_model_to_ov_format()
        self.model, self.tokenizer = self._init_model()
        self.outlines_model = outlines.models.Transformers(
            self.model, self.tokenizer
        )

    def _convert_model_to_ov_format(self):
        if os.path.exists(f"{self.converted_model_path}/openvino_model.xml"):
            print("OV converted model is already available. Skipping conversion.")
            return
        try:
            OptimumCLI.run_export(
                model_name_or_path=self.model_path_or_name,
                output_dir=self.converted_model_path,
                model_precision=self.model_precision
            )
        except subprocess.CalledProcessError as e:
            raise RuntimeError(
                f"Model conversion to OpenVINO format failed: {e}")

    def _init_model(self):
        logger.info(
            f"Loading OV model: {self.converted_model_path} to device: {self.device}"
        )
        tokenizer = AutoTokenizer.from_pretrained(
            self.converted_model_path,
            trust_remote_code=True
        )
        model = OVModelForCausalLM.from_pretrained(self.converted_model_path)
        model.to(self.device)
        return model, tokenizer

    def is_chunk_meaningful(self, query):
        formatted_query = ANALYSE_DATA_MEANINGFUL_SYS_MESSAGE.format(
            context=query)
        chat_messages = [
            {"role": "user", "content": formatted_query}
        ]
        formatted_chat_messages = self.tokenizer.apply_chat_template(
            chat_messages,
            tokenize=False,
            add_generation_prompt=True
        )
        generator = outlines.generate.choice(
            self.outlines_model, ["YES", "NO"]
        )
        result = generator(formatted_chat_messages)
        if result == "YES":
            return True
        elif result == "NO":
            return False
        else:
            logger.warning(
                "Failed to analyze the meaningfulness of the chunk!"
            )
            return False

    def generate_synthetic_data(self, dataset):
        synthetic_data_list = []
        for data in dataset:
            messages = {"messages": []}
            synthetic_message = {"messages": []}
            random_bytes = os.urandom(4)
            seed = int.from_bytes(random_bytes, byteorder="big") % 1000001
            for conversation in data['conversations']:
                if conversation['from'] == 'user':
                    user_message = conversation['value']
                    messages["messages"].append(
                        {"role": "user", "content": user_message}
                    )
                else:
                    assistant_message = conversation['value']
                    messages["messages"].append(
                        {"role": "user", "content": assistant_message}
                    )

            # check if message contains user and assistant messages
            if len(messages["messages"]) == 0:
                logger.warning("No user or assistant message found.")
                continue

            for message in messages["messages"]:
                prompt = DATASET_AUGMENT_SYS_MESSAGE.format(
                    original_sentence=message['content'])
                generator = outlines.generate.json(
                    self.outlines_model, SyntheticData)
                responses = generator(prompt, seed=seed)
                synthetic_message["messages"].append(
                    {"role": message['role'], "content": responses.augment}
                )

            logger.info(f"Original message: {messages}")
            logger.info(f"Synthetic message: {synthetic_message}")
            synthetic_data_list.append(synthetic_message)

        dataset = Dataset.from_list(synthetic_data_list)
        return dataset

    def generate_chat_data(self, query, num_generations=5, language="english"):
        result_list = []
        retry_count = 5
        random_bytes = os.urandom(4)
        seed = int.from_bytes(random_bytes, byteorder="big") % 1000001

        prompt = FAQ_GENERATION_TEMPLATE.format(
            num_generation_per_page=num_generations,
            language=language,
            context=query
        )

        logger.info(f"Generate FAQ prompt: {prompt}")
        generator = outlines.generate.json(self.outlines_model, FAQ)
        responses = generator(prompt, seed=seed)

        if len(responses.faq) == 0:
            retry = 0
            while retry < retry_count:
                random_bytes = os.urandom(4)
                seed = int.from_bytes(random_bytes, byteorder="big") % 1000001
                responses = generator(prompt, seed=seed)
                if len(responses.faq) == num_generations:
                    break
                logger.warning(
                    f"[{retry+1}/{retry_count+1}] Failed to generate FAQ. Retrying ..."
                )
                logger.warning(
                    f"Generated FAQ: {responses.faq}"
                )
                retry += 1

        if len(responses.faq) == 0:
            logger.warning(
                f"Failed to generate FAQ. Exit dataset generation."
            )
            return [], False

        for faq in responses.faq:
            faq_data = {
                "user_message": faq.question,
                "assistant_message": faq.answer
            }
            result_list.append(faq_data)

        return result_list, True

    def cleanup(self):
        if self.device == "xpu":
            logger.info("Cleaning up GPU RAM for generation ...")
            torch.xpu.empty_cache()


class DocumentLoader:
    def __init__(self):
        pass

    def read_file_content(self, file_path: str):
        if not os.path.isfile(file_path):
            raise FileNotFoundError(
                f"Unable to find file at path: {file_path}")

        reader = PdfReader(file_path)
        number_of_pages = len(reader.pages)
        data_list = []
        for i in range(number_of_pages):
            page = reader.pages[i]
            text = page.extract_text()
            data = {
                "page": i,
                "content": text.strip()
            }
            data_list.append(data)
        return data_list


class ChatDatasetGenerator:
    def __init__(self) -> None:
        self.dataset_path = "/usr/src/app/data/projects"
        self.document_loader = DocumentLoader()

    def _get_inference_device(self) -> str:
        """
        Select the appropriate inference device from the available devices.

        Returns:
            str: The selected inference device.
        """
        core = ov.Core()
        try:
            device_list = core.available_devices
            inference_device = "CPU"
            integrated_gpu = None
            for device in device_list:
                if 'GPU' in device:
                    gpu_device_type = str(core.get_property(device, 'DEVICE_TYPE'))
                    if gpu_device_type == "Type.DISCRETE":
                        return device
                    elif gpu_device_type == "Type.INTEGRATED":
                        integrated_gpu = device

            if integrated_gpu:
                return integrated_gpu

            return inference_device
        except Exception as e:
            print(f"An error occurred while selecting the inference device: {e}")
            return "CPU"
        
    def _convert_data_to_openai_format(self, data_list: list):
        openai_data_list = []
        for data in data_list:
            conversation = {"messages": []}
            conversation["messages"].append({"role": "user", "content": data['user_message']})
            conversation["messages"].append({"role": "assistant", "content": data['assistant_message']})
            openai_data_list.append(conversation)
        return openai_data_list

    def generate_sft_dataset_from_chunks(self, celery_task_id, dataset_id, text_chunks, total_chunks, num_generations, language="english", abort_check=None):
        processed_chunks = 1
        metadata = {
            "total_page": total_chunks,
            "current_page": None,
            "status": None,
            "isCancel": False,
            "processed_files": processed_chunks,
            "total_files": total_chunks,
            "celery_task_id": celery_task_id,
        }
        metadata['current_page'] = 0
        
        # Use abort_check if provided, otherwise fall back to is_aborted
        check_abort = abort_check if abort_check else lambda: is_aborted(celery_task_id)

        # Check if task is aborted before updating the status
        if check_abort():
            logger.info(f"Task {celery_task_id} is aborted.")
            metadata = None
            asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))
            return

        logger.info("Creating LLM pipeline ...")
        logger.info(
            f"Using model: {GENERATION_MODEL} on device: {self._get_inference_device()}")
        metadata['status'] = "LOADING MODEL"
        asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))
        
        # Check abort before model loading (expensive operation)
        if check_abort():
            logger.info(f"Task {celery_task_id} is aborted before model loading.")
            metadata = None
            asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))
            return
            
        generator = SyntheticDataGenerator(
            model_path_or_name=GENERATION_MODEL,
            converted_model_path=GENERATION_OV_MODEL,
            device=self._get_inference_device()
        )

        num_page_skipped = 0
        num_failed_generations = 0
        start_time = time.time()
        qa_pair_list = []
        
        try:
            for i, chunk in enumerate(text_chunks):
                # Check abort before processing each chunk
                if check_abort():
                    logger.info(f"Task {celery_task_id} is aborted during chunk processing at chunk {i+1}/{total_chunks}.")
                    break
                    
                metadata['current_page'] = i + 1
                metadata['processed_files'] = i + 1
                metadata['status'] = "GENERATING DATA"
                logger.info(
                    f"Processing chunk: {metadata['current_page']}/{metadata['total_page']}")
                if len(chunk) <= 150:
                    num_page_skipped += 1
                    logger.warning(
                        f"Length of the chunk: {len(chunk)} is less than 150. Skipped generation.")
                    continue
                asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))
                
                try:
                    # Check abort before meaningfulness check
                    if check_abort():
                        logger.info(f"Task {celery_task_id} is aborted before chunk evaluation.")
                        break
                        
                    is_chunk_meaningful = generator.is_chunk_meaningful(
                        query=chunk
                    )
                    if not is_chunk_meaningful:
                        logger.warning(
                            f"Skipping generation as the chunk is not meaningful. Chunk content: {chunk}")
                        num_failed_generations += 1
                        continue

                    # Check abort before generation (most expensive operation)
                    if check_abort():
                        logger.info(f"Task {celery_task_id} is aborted before data generation.")
                        break
                        
                    qa_pair_list, is_success = generator.generate_chat_data(
                        query=chunk,
                        num_generations=num_generations,
                        language=language
                    )
                except Exception as error:
                    logger.warning(
                        f"Failed to generate json dataset for text chunk: {chunk}.\nError:{error}")
                    num_failed_generations += 1
                    continue

                # check if generate_json_data aborted
                if not is_success:
                    break

                # Check abort before saving data
                if check_abort():
                    logger.info(f"Task {celery_task_id} is aborted before saving generated data.")
                    break

                if len(qa_pair_list) > 0:
                    formatted_conversation_list = self._convert_data_to_openai_format(qa_pair_list)
                    for qa_pair in formatted_conversation_list:
                        # Check abort before each data update
                        if check_abort():
                            logger.info(f"Task {celery_task_id} is aborted during data saving.")
                            break
                            
                        dataset_client = DatasetsService()
                        dataset_client.update_generated_data_to_dataset(
                            dataset_id=dataset_id,
                            data=qa_pair
                        )
                        time.sleep(1)
                    
                    # Reset the list after processing
                    qa_pair_list = []
                
                # Break out of outer loop if inner loop was broken due to abort
                if check_abort():
                    break
        finally:
            # Always execute these cleanup steps, whether aborted or completed normally
            elapsed_time = time.time() - start_time
            logger.info(
                f"\n{'-'*20}\n[Chunk Dataset Generation Task Metrics]\nTime take for generation in this run: {elapsed_time} secs\nNumber of pages skipped: {num_page_skipped}\nNumber of generations failed: {num_failed_generations}\n{'-'*20}")

            # Add abort status to log if applicable
            if check_abort():
                logger.info(f"Task {celery_task_id} was aborted during execution.")

            # Reset state
            metadata = None
            asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))

            # Clean up resources
            generator.cleanup()
            if qa_pair_list:
                qa_pair_list.clear()
            del generator
            gc.collect()

    def generate_sft_dataset_from_documents(self, celery_task_id, dataset_id, document_list, num_generations, language="english", abort_check=None):
        num_completed_docs = 0
        document_list = ast.literal_eval(document_list)
        num_docs = len(document_list)
        metadata = {
            "total_page": None,
            "current_page": None,
            "status": None,
            "isCancel": False,
            "processed_files": num_completed_docs,
            "total_files": num_docs,
            "celery_task_id": celery_task_id,
        }

        # Use abort_check if provided, otherwise fall back to is_aborted
        check_abort = abort_check if abort_check else lambda: is_aborted(celery_task_id)
        
        # Check if task is aborted before starting
        if check_abort():
            logger.info(f"Task {celery_task_id} is aborted before starting.")
            metadata = None
            asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))
            return False

        logger.info("Creating LLM pipeline ...")
        logger.info(
            f"Using model: {GENERATION_MODEL} on device: {self._get_inference_device()}")
        metadata['status'] = "LOADING MODEL"
        asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))
        
        # Check abort before model loading (expensive operation)
        if check_abort():
            logger.info(f"Task {celery_task_id} is aborted before model loading.")
            metadata = None
            asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))
            return False
            
        generator = SyntheticDataGenerator(
            model_path_or_name=GENERATION_MODEL,
            converted_model_path=GENERATION_OV_MODEL,
            device=self._get_inference_device()
        )

        qa_pair_list = []
        
        try:
            for doc_index, doc in enumerate(document_list):
                # Check abort before processing each document
                if check_abort():
                    logger.info(f"Task {celery_task_id} is aborted during document processing at doc {doc_index+1}/{num_docs}.")
                    break
                
                file_path = f"{self.dataset_path}/{dataset_id}/data-generation/documents/{doc}"
                
                # Check abort before file loading
                if check_abort():
                    logger.info(f"Task {celery_task_id} is aborted before file loading.")
                    break
                    
                file_content_list = self.document_loader.read_file_content(
                    file_path)
                metadata['current_page'] = 0
                metadata['total_page'] = len(file_content_list)
                metadata['processed_files'] = doc_index
                metadata['status'] = "GENERATING DATA"
                asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))

                num_page_skipped = 0
                num_failed_generations = 0
                start_time = time.time()
                
                for i, content in enumerate(file_content_list):
                    # Check abort before processing each page
                    if check_abort():
                        logger.info(f"Task {celery_task_id} is aborted during page processing at page {i+1}/{len(file_content_list)}.")
                        break
                        
                    metadata['current_page'] = i + 1
                    logger.info(
                        f"Processing page: {metadata['current_page']}/{metadata['total_page']}")
                    if len(content['content']) <= 150:
                        num_page_skipped += 1
                        logger.warning(
                            f"Length of the content: {len(content['content'])} is less than 150. Skipped generation.")
                        continue
                    asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))

                    try:
                        # Check abort before meaningfulness check
                        if check_abort():
                            logger.info(f"Task {celery_task_id} is aborted before page evaluation.")
                            break
                            
                        is_chunk_meaningful = generator.is_chunk_meaningful(
                            query=content['content']
                        )
                        if not is_chunk_meaningful:
                            logger.warning(
                                f"Skipping generation as the content is not meaningful. Doc content: {content['content']}")
                            num_failed_generations += 1
                            continue

                        # Check abort before generation (most expensive operation)
                        if check_abort():
                            logger.info(f"Task {celery_task_id} is aborted before data generation.")
                            break
                            
                        qa_pair_list, is_success = generator.generate_chat_data(
                            query=content['content'],
                            num_generations=num_generations,
                            language=language
                        )
                    except Exception as error:
                        logger.warning(
                            f"Failed to generate json dataset for content: {content}.\nError:{error}")
                        num_failed_generations += 1
                        continue

                    # check if generate_json_data aborted
                    if not is_success:
                        break

                    # Check abort before saving data
                    if check_abort():
                        logger.info(f"Task {celery_task_id} is aborted before saving generated data.")
                        break

                    if len(qa_pair_list) > 0:
                        formatted_conversation_list = self._convert_data_to_openai_format(qa_pair_list)
                        for qa_pair in formatted_conversation_list:
                            # Check abort before each data update
                            if check_abort():
                                logger.info(f"Task {celery_task_id} is aborted during data saving.")
                                break
                                
                            dataset_client = DatasetsService()
                            dataset_client.update_generated_data_to_dataset(
                                dataset_id=dataset_id,
                                data=qa_pair
                            )
                            time.sleep(1)
                        
                        # Reset the list after processing
                        qa_pair_list = []
                    
                    # Break out of inner loop if abort check returns true
                    if check_abort():
                        break

                # Log metrics for this document
                elapsed_time = time.time() - start_time
                logger.info(
                    f"\n{'-'*20}\n[Document Dataset Generation Task Metrics]\nTime take for generation in this run: {elapsed_time} secs\nNumber of pages skipped: {num_page_skipped}\nNumber of generations failed: {num_failed_generations}\n{'-'*20}")
                
                # Increment completed docs counter
                num_completed_docs += 1
                metadata['processed_files'] = num_completed_docs
                asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))
                
                # Break out of outer loop if inner loop was broken due to abort
                if check_abort():
                    break
                
            # Return success if completed all documents without abortion
            return not check_abort()
            
        finally:
            # Add abort status to log if applicable
            if check_abort():
                logger.info(f"Task {celery_task_id} was aborted during execution.")

            # Reset state
            metadata = None
            asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))

            # Clean up resources
            generator.cleanup()
            if qa_pair_list:
                qa_pair_list.clear()
            del generator
            gc.collect()