# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
from dotenv import find_dotenv, load_dotenv

from celery import Celery
from celery.signals import worker_ready, worker_shutting_down
from celery.utils.log import get_task_logger

from clients.chroma import ChromaClient

logger = get_task_logger(__name__)
load_dotenv(find_dotenv())


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
    "document_queue": {"exchange": "document_queue", "binding_key": "document_queue"},
}

@worker_ready.connect
def init_worker(sender, **k):
    logger.info(f"{sender}: Worker is ready. Running init worker function.")


@worker_shutting_down.connect
def worker_shutting_down_handler(sig, how, exitcode, ** kwargs):
    logger.info("Worker shutting down.")


@app.task(bind=True, name="document_node:get_text_embeddings", queue="document_queue")
def get_text_embeddings(self, dataset_id, page, pageSize, source):
    try:
        client = ChromaClient(dataset_id)
        return client.get_all_collection_data(page, pageSize, source)
    except Exception as error:
        logger.error(
            f"Error while creating text embeddings for {dataset_id}. Error: {error}")
        return False


@app.task(bind=True, name="document_node:get_text_embeddings_source", queue="document_queue")
def get_text_embeddings_source(self, dataset_id):
    try:
        client = ChromaClient(dataset_id)
        return client.get_all_sources()
    except Exception as error:
        logger.error(
            f"Error while get text embeddings source for {dataset_id}. Error: {error}")
        return False


@app.task(bind=True, name="document_node:get_num_embeddings", queue="document_queue")
def get_num_text_embeddings(self, dataset_id):
    try:
        client = ChromaClient(dataset_id)
        return client.get_num_embeddings()
    except Exception as error:
        logger.error(
            f"Error while get text embeddings source for {dataset_id}. Error: {error}")
        return False


@app.task(bind=True, name="document_node:query_data", queue="document_queue")
def query_text_embedding_data(self, dataset_id, query, vectorK=20, vectorP=3):
    try:
        client = ChromaClient(dataset_id)
        print(query)
        return client.query_data(query, vectorK, vectorP)
    except Exception as error:
        logger.error(
            f"Error while get text embeddings source for {dataset_id}. Error: {error}")
        return []


@app.task(bind=True, name="document_node:create_text_embeddings", queue="document_queue")
def create_text_embeddings(self, dataset_id, file_list, chunk_size, chunk_overlap):
    try:
        client = ChromaClient(dataset_id)
        client.create_collection_data(file_list, chunk_size, chunk_overlap)
        return True
    except Exception as error:
        logger.error(
            f"Error while get text embeddings source for {dataset_id}. Error: {error}")
        return False


@app.task(bind=True, name="document_node:delete_text_embedding", queue="document_queue")
def delete_text_embedding(self, dataset_id, data_uuid):
    try:
        client = ChromaClient(dataset_id)
        return client.delete_data(data_uuid)
    except Exception as error:
        logger.error(
            f"Error while delete text embeddings: {data_uuid} for {dataset_id}. Error: {error}")
        return False


@app.task(bind=True, name="document_node:delete_text_embedding_disk", queue="document_queue")
def delete_text_embedding_disk(self, dataset_id):
    try:
        client = ChromaClient(dataset_id)
        return client.delete_collection()
    except Exception as error:
        logger.error(
            f"Error while delete text embedding disks for {dataset_id}. Error: {error}")
        return False


@app.task(bind=True, name="document_node:delete_text_embedding_source", queue="document_queue")
def delete_text_embedding_source(self, dataset_id, source_filename):
    try:
        client = ChromaClient(dataset_id)
        return client.delete_data_by_source(source_filename)
    except Exception as error:
        logger.error(
            f"Error while delete text embedding source: {source_filename} for {dataset_id}. Error: {error}")
        return False
