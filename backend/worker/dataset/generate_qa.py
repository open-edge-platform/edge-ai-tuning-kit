# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import gc
import time

import asyncio
from datetime import datetime
from pypdf import PdfReader
from loguru import logger

from dataset.generator import SyntheticModel, SyntheticDataGenerator
from clients.datasets import DatasetsService
from common.utils import is_aborted


async def update_dataset_metadata_cb(dataset_id, metadata):
    dataset_client = DatasetsService()
    dataset_client.update_dataset_generation_metadata(
        dataset_id=dataset_id,
        metadata=metadata
    )

class PDFDataGeneratorPipeline():
    def __init__(self) -> None:
        self.dataset_path = "/usr/src/app/data/projects"
        
    # TODO: add image content as well.
    def _read_file_content(self, file_path: str):
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
    
    def _remove_duplicate_dataset(self, dataset_list: list):
        seen = set()
        new_dict_list = []
        for d in dataset_list:
            identifier = tuple(sorted(d.items()))
            if identifier not in seen:
                seen.add(identifier)
                new_dict_list.append(d)
        return new_dict_list

    def generate_dataset_from_chunk(self, task_id, dataset_id, text_chunks, num_generations, processedFiles, totalFiles, model_path="mistralai/Mixtral-8x7B-Instruct-v0.1", device="cpu", max_new_tokens=2048):
        logger.info(f"Generating dataset for text chunk")
        filename = f"text_chunk_generation_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}"
        result_dir = f"./data/projects/{dataset_id}/data-generation"
        result_path = f"{result_dir}/{filename}.txt"
        if not os.path.exists(result_dir):
            os.makedirs(result_dir)
        metadata = {
            "total_page": totalFiles,
            "current_page": None,
            "status": None,
            "isCancel": False,
            "processed_files": processedFiles,
            "total_files": totalFiles,
            "celery_task_id": task_id,
        }
        metadata['current_page'] = 0

        # Check if task is aborted before updating the status
        if (is_aborted(task_id)):
            logger.info(f"Task {task_id} is aborted.")
            metadata = None
            asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))
            return
        metadata['status'] = "LOADING MODEL"
        asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))

        try:
            logger.info(f"Using model: {model_path} on device: {device}")
            llm_pipeline = SyntheticModel(
                model_path=model_path,
                device=device,
            )
            tokenizer, model = llm_pipeline.init_model()
            generator = SyntheticDataGenerator(
                tokenizer=tokenizer,
                model=model,
                device=device
            )

            # Check if task is aborted before updating the status
            if (is_aborted(task_id)):
                logger.info(f"Task {task_id} is aborted.")
                metadata = None
                asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))
                generator.cleanup()
                del llm_pipeline
                del generator
                return
            metadata['status'] = "GENERATING DATA"
            asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))
        except Exception as error:
            logger.error(f"Model loading failed. Error: {error}.")
            metadata = None
            asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))
            return

        num_page_skipped = 0
        num_failed_generations = 0
        start_time = time.time()
        for i, chunk in enumerate(text_chunks):
            metadata['current_page'] = i + 1
            metadata['processed_files'] = i + 1
            logger.info(f"Processing chunk: {metadata['current_page']}/{metadata['total_page']}")
            if len(chunk) <= 150:
                num_page_skipped += 1
                logger.warning(
                    f"Length of the chunk: {len(chunk)} is less than 150. Skipped generation.")
                continue
            asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))
            try:
                is_chunk_meaningful = generator.is_chunk_meaningful(
                    query=chunk
                )
                if not is_chunk_meaningful:
                    logger.warning(f"Skipping generation as the chunk is not meaningful. Chunk content: {chunk}")
                    num_failed_generations += 1
                    continue
                qa_pair_list, is_success = generator.generate_json_dataset(
                    task_id=task_id,
                    dataset_id=dataset_id,
                    query=chunk,
                    result_path=result_path,
                    num_generations=num_generations
                )
            except Exception as error:
                logger.warning(
                    f"Failed to generate json dataset for text chunk: {chunk}.\nError:{error}")
                num_failed_generations += 1
                continue
            
            # check if generate_json_data aborted
            if not is_success:
                break

            qa_pair_list = self._remove_duplicate_dataset(qa_pair_list)
            for qa_pair in qa_pair_list:
                dataset_client = DatasetsService()
                dataset_client.update_generated_data_to_dataset(
                    dataset_id=dataset_id,
                    data=qa_pair
                )

        elapsed_time = time.time() - start_time
        logger.info(
            f"\n{'-'*20}\n[JSON Dataset Generation Task Metrics]\nTime take for generation in this run: {elapsed_time} secs\nNumber of pages skipped: {num_page_skipped}\nNumber of generations failed: {num_failed_generations}\n{'-'*20}")

        # Reset state
        metadata = None
        asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))

        generator.cleanup()
        qa_pair_list.clear()
        del llm_pipeline
        del generator
        gc.collect()

    def create_json_dataset(self, task_id, dataset_id, file_name, num_generations, processedFiles, totalFiles, model_path="mistralai/Mixtral-8x7B-Instruct-v0.1", device="cpu", max_new_tokens=2048):
        logger.info(f"Generating QA dataset for {file_name}")
        metadata = {
            "total_page": None,
            "current_page": None,
            "status": None,
            "isCancel": False,
            "processed_files": processedFiles,
            "total_files": totalFiles,
            "celery_task_id": task_id,
        }
        file_path = f"{self.dataset_path}/{dataset_id}/data-generation/documents/{file_name}"
        filename = f"generation_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}"
        result_path = f"./data/projects/{dataset_id}/data-generation/{filename}.txt"
        
        file_content_list = self._read_file_content(file_path)
        metadata['current_page'] = 0
        metadata['total_page'] = len(file_content_list)
        # Check if task is aborted before updating the status
        if (is_aborted(task_id)):
            logger.info(f"Task {task_id} is aborted.")
            metadata = None
            asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))
            return
        metadata['status'] = "LOADING MODEL"
        asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))

        logger.info("Creating LLM pipeline ...")
        try:
            logger.info(f"Using model: {model_path} on device: {device}")
            llm_pipeline = SyntheticModel(
                model_path=model_path,
                device=device,
            )
            tokenizer, model = llm_pipeline.init_model()
            generator = SyntheticDataGenerator(
                tokenizer=tokenizer,
                model=model,
                device=device
            )
            
            # Check if task is aborted before updating the status
            if (is_aborted(task_id)):
                logger.info(f"Task {task_id} is aborted.")
                metadata = None
                asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))
                generator.cleanup()
                del llm_pipeline
                del generator
                return
            metadata['status'] = "GENERATING DATA"
        except Exception as error:
            logger.error(f"Model loading failed. Error: {error}.")
            metadata = None
            asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))
            return

        asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))

        logger.info("Starting dataset generation ...")
        num_page_skipped = 0
        num_failed_generations = 0
        start_time = time.time()
        for i, content in enumerate(file_content_list):
            metadata['current_page'] = i + 1
            logger.info(f"Processing page: {metadata['current_page']}/{metadata['total_page']}")
            if len(content['content']) <= 150:
                num_page_skipped += 1
                logger.warning(
                    f"Length of the content: {len(content['content'])} is less than 150. Skipped generation.")
                continue
            asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))
            try:
                is_chunk_meaningful = generator.is_chunk_meaningful(
                    query=content['content']
                )
                if not is_chunk_meaningful:
                    logger.warning(f"Skipping generation as the content is not meaningful. Doc content: {content['content']}")
                    num_failed_generations += 1
                    continue

                qa_pair_list, is_success = generator.generate_json_dataset(
                    task_id=task_id,
                    dataset_id=dataset_id,
                    query=content['content'],
                    result_path=result_path,
                    num_generations=num_generations
                )
            except Exception as error:
                logger.warning(
                    f"Failed to generate json dataset for content: {content}.\nError:{error}")
                num_failed_generations += 1
                continue
            
            # check if generate_json_data aborted
            if not is_success:
                break

            if len(qa_pair_list) > 0:
                qa_pair_list = self._remove_duplicate_dataset(qa_pair_list)
                for qa_pair in qa_pair_list:
                    dataset_client = DatasetsService()
                    dataset_client.update_generated_data_to_dataset(
                        dataset_id=dataset_id,
                        data=qa_pair
                    )

        elapsed_time = time.time() - start_time
        logger.info(
            f"\n{'-'*20}\n[JSON Dataset Generation Task Metrics]\nTime take for generation in this run: {elapsed_time} secs\nNumber of pages skipped: {num_page_skipped}\nNumber of generations failed: {num_failed_generations}\n{'-'*20}")

        # Reset state
        metadata = None
        asyncio.run(update_dataset_metadata_cb(dataset_id, metadata))

        generator.cleanup()
        del llm_pipeline
        del generator
        gc.collect()
