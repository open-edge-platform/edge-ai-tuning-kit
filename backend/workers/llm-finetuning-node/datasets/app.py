# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os

from celery import Celery
from celery.signals import worker_ready, worker_shutting_down
from celery.utils.log import get_task_logger
from celery.contrib.abortable import AbortableTask

from clients.chroma import ChromaClient
from utils.generator import ChatDatasetGenerator

logger = get_task_logger(__name__)


class CeleryConfig:
    broker_url = os.environ.get(
        'CELERY_BROKER_URL', "redis://redis:6379/0")
    result_backend = os.environ.get(
        'CELERY_RESULT_BACKEND', "redis://redis:6379/1")
    accept_content = ["json"]
    result_serializer = "json"
    task_serializer = "json"
    task_track_started = True
    result_persistent = True
    worker_send_task_events = False
    worker_prefetch_multiplier = 1
    broker_connection_retry_on_startup = True


app = Celery(__name__)
app.config_from_object(CeleryConfig)
app.conf.task_queues = {
    "dataset_queue": {"exchange": "dataset_queue", "binding_key": "dataset_queue"},
}


@worker_ready.connect
def init_worker(sender, **k):
    logger.info(f"{sender}: Worker is ready. Running init worker function.")


@worker_shutting_down.connect
def worker_shutting_down_handler(sig, how, exitcode, ** kwargs):
    logger.info("Worker shutting down.")


@app.task(bind=True, name="dataset_node:document_data_generation", queue='dataset_queue', base=AbortableTask)
def document_data_generation(self, dataset_id, source_filename, num_generations=5, language="english"):
    def check_abort():
        return self.is_aborted()
    
    try:
        if check_abort():
            logger.info(f"Task {self.request.id} was aborted before starting.")
            return False
        
        client = ChromaClient(dataset_id)
        total_num_embeddings = client.get_num_embeddings()

        if check_abort():
            logger.info(f"Task {self.request.id} was aborted during initialization.")
            return False
        
        embedding_data = client.get_all_collection_data(
            1,
            total_num_embeddings,
            source_filename
        )
        embedding_chunks_list = [
            data['chunk'] for data in embedding_data['doc_chunks']
        ]
        
        generator = ChatDatasetGenerator()
        generator.generate_sft_dataset_from_chunks(
            self.request.id,
            dataset_id,
            embedding_chunks_list,
            total_num_embeddings,
            num_generations,
            language=language,
            abort_check=check_abort
        )
        return True
    except Exception as error:
        logger.error(f"Error while document data generation. Error: {error}")
        return False


@app.task(bind=True, name="dataset_node:data_generation", queue='dataset_queue', base=AbortableTask)
def data_generation(self, dataset_id, document_list, num_generations=5, language="english"):
    def check_abort():
        return self.is_aborted()
    
    try:
        generator = ChatDatasetGenerator()
        generator.generate_sft_dataset_from_documents(
            self.request.id,
            dataset_id,
            document_list,
            num_generations,
            language=language,
            abort_check=check_abort
        )
        return True
    except Exception as error:
        logger.error(f"Data generation task failed. Error: {error}")
        return False
