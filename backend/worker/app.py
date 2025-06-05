# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import re
import ast
import subprocess
from dotenv import find_dotenv, load_dotenv

from celery import Celery, states
from celery.signals import worker_ready, worker_shutting_down
from celery.utils.log import get_task_logger
from celery.result import AsyncResult
from celery.contrib.abortable import AbortableTask

from common.config import GENERATION_MODEL, GENERATION_MODEL_DEVICE
from common.callbacks import on_training_failure, on_training_start, on_prepare_success, on_prepare_failure, on_model_download_failure
from common.utils import get_cpu_info, get_gpu_info
from clients.common import HardwareService
from clients.chroma import ChromaClient
from clients.tasks import TasksService
from dataset.generate_qa import PDFDataGeneratorPipeline
from models.model_download import HFModelDownloadPipeline
from trainer.download import PrepareDeploymentFile


logger = get_task_logger(__name__)
load_dotenv(find_dotenv())


class CeleryConfig:
    broker_url = os.environ.get(
        'CELERY_BROKER_URL', 
        f"redis://:{os.environ.get('REDIS_PASSWORD', '')}@redis:6379/0"
    )
    result_backend = os.environ.get(
        'CELERY_RESULT_BACKEND', 
        f"redis://:{os.environ.get('REDIS_PASSWORD', '')}@redis:6379/1"
    )
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
    "default_queue": {"exchange": "default_queue", "binding_key": "default_queue"},
    "trainer_queue": {"exchange": "trainer_queue", "binding_key": "trainer_queue"},
}


def validate_id(id_value):
    """Validate that an ID contains only safe characters to prevent path traversal."""
    if isinstance(id_value, int):
        return id_value
        
    SAFE_PATH_PATTERN = re.compile(r'^[a-zA-Z0-9_\-\.]+$')
    if not id_value or not SAFE_PATH_PATTERN.match(str(id_value)):
        raise ValueError(f"Invalid ID format: {id_value}")
    
    # Try to convert to integer if possible
    try:
        return int(id_value)
    except ValueError:
        # If it's not an integer, return the string
        return id_value

def verify_last_running_tasks():
    try:
        client = TasksService()
        response = client.get_running_task()
        last_running_task_id = response['data']['celery_task_id']
        if last_running_task_id == "":
            logger.info("No trainer task running in last session.")
        else:
            logger.info("Verifying state of the last running trainer task.")
            inspector = app.control.inspect()
            active_tasks = inspector.active()
            if active_tasks:
                for worker, tasks in active_tasks.items():
                    for task in tasks:
                        if task['id'] == last_running_task_id:
                            logger.info(
                                "Worker node is still executing the last running trainer task.")

            result = AsyncResult(last_running_task_id)
            if result.status not in [states.SUCCESS, states.FAILURE]:
                logger.error(
                    "Last task is exited due to OOM. Updating task results.")
                id = response['data']['id']
                sanitized_id = validate_id(id)
                tasks_client = TasksService()
                tasks_client.update_task(sanitized_id, {
                    "status": "FAILURE",
                    "results": {
                        "status": f"Training Error. Error: Training process failure due to OOM(out of memory). Please verify if you have sufficient CPU RAM or GPU RAM before training."
                    }
                })
    except Exception as error:
        logger.warning(f"Error while verifying last running tasks. Error: {error}")

def update_hardware_info():
    cpu = get_cpu_info()
    gpu = get_gpu_info()
    service = HardwareService()
    response = service.update_hardware_info(cpu, gpu)
    if response:
        logger.info("Updated node hardware info to server.")
        return True
    else:
        logger.info("Failed to update node hardware info to server.")
        return False

@worker_ready.connect
def init_worker(sender, **k):
    logger.info(f"{sender}: Worker is ready. Running init worker function.")
    verify_last_running_tasks()
    update_hardware_info()

@worker_shutting_down.connect
def worker_shutting_down_handler(sig, how, exitcode, ** kwargs):
    logger.info("Worker shutting down.")

@app.task(bind=True, name="celery_task:download_model", queue='default_queue', on_failure=on_model_download_failure)
def download_model(self, task_type: str, id: int, model_id: str, model_dir: str, model_revision: str):
    if task_type == "HF_Model_Download":
        HFModelDownloadPipeline(id, self.request.id, model_id, model_dir, model_revision)
    elif task_type == "Custom_Model_Download":
        raise NotImplementedError("Custom model upload not supported for now.")
    return True

# Text embedding related
@app.task(bind=True, name="celery_task:get_text_embeddings", queue='default_queue')
def get_text_embeddings(self, dataset_id, page, pageSize, source):
    try:
        client = ChromaClient(dataset_id)
        return client.get_all_collection_data(page, pageSize, source)
    except Exception as error:
        logger.error(f"Error while creating text embeddings for {dataset_id}. Error: {error}")
        return False

@app.task(bind=True, name="celery_task:get_text_embeddings_source", queue='default_queue')
def get_text_embeddings_source(self, dataset_id):
    try:
        client = ChromaClient(dataset_id)
        return client.get_all_sources()
    except Exception as error:
        logger.error(f"Error while get text embeddings source for {dataset_id}. Error: {error}")
        return False
    
@app.task(bind=True, name="celery_task:get_num_embeddings", queue='default_queue')
def get_num_text_embeddings(self, dataset_id):
    try:
        client = ChromaClient(dataset_id)
        return client.get_num_embeddings()
    except Exception as error:
        logger.error(f"Error while get text embeddings source for {dataset_id}. Error: {error}")
        return False
    
@app.task(bind=True, name="celery_task:query_data", queue='default_queue')
def query_text_embedding_data(self, dataset_id, query, vectorK=20, vectorP=3):
    try:
        client = ChromaClient(dataset_id)
        print(query)
        return client.query_data(query, vectorK, vectorP)
    except Exception as error:
        logger.error(f"Error while get text embeddings source for {dataset_id}. Error: {error}")
        return []
    
@app.task(bind=True, name="celery_task:create_text_embeddings", queue='default_queue')
def create_text_embeddings(self, dataset_id, file_list, chunk_size, chunk_overlap):
    try:
        client = ChromaClient(dataset_id)
        client.create_collection_data(file_list, chunk_size, chunk_overlap)
        return True
    except Exception as error:
        logger.error(f"Error while get text embeddings source for {dataset_id}. Error: {error}")
        return False
    
@app.task(bind=True, name="celery_task:delete_text_embedding", queue='default_queue')
def delete_text_embedding(self, dataset_id, data_uuid):
    try:
        client = ChromaClient(dataset_id)
        return client.delete_data(data_uuid)
    except Exception as error:
        logger.error(f"Error while delete text embeddings: {data_uuid} for {dataset_id}. Error: {error}")
        return False
    
@app.task(bind=True, name="celery_task:delete_text_embedding_disk", queue='default_queue')
def delete_text_embedding_disk(self, dataset_id):
    try:
        client = ChromaClient(dataset_id)
        return client.delete_collection()
    except Exception as error:
        logger.error(f"Error while delete text embedding disks for {dataset_id}. Error: {error}")
        return False
    
@app.task(bind=True, name="celery_task:delete_text_embedding_source", queue='default_queue')
def delete_text_embedding_source(self, dataset_id, source_filename):
    try:
        client = ChromaClient(dataset_id)
        return client.delete_data_by_source(source_filename)
    except Exception as error:
        logger.error(f"Error while delete text embedding source: {source_filename} for {dataset_id}. Error: {error}")
        return False

# Dataset related
@app.task(bind=True, name="celery_task:document_data_generation", queue='trainer_queue', base=AbortableTask)
def document_data_generation(self, dataset_id, source_filename, project_type, num_generations):
    try:
        client = ChromaClient(dataset_id)
        total_num_embeddings = client.get_num_embeddings()
        embedding_data = client.get_all_collection_data(1, total_num_embeddings, source_filename)
        embedding_chunks = [data['chunk'] for data in embedding_data['doc_chunks']]
        processed_chunks = 1
        generator = PDFDataGeneratorPipeline()
        generator.generate_dataset_from_chunk(
            self.request.id,
            dataset_id,
            embedding_chunks,
            num_generations,
            processed_chunks,
            total_num_embeddings,
            model_path=GENERATION_MODEL,
            device=GENERATION_MODEL_DEVICE,
            max_new_tokens=2048
        )
        return True
    except Exception as error:
        logger.error(f"Error while document data generation. Error: {error}")

@app.task(bind=True, name="celery_task:data_generation", queue='trainer_queue', base=AbortableTask)
def data_generation(self, dataset_id, file_names, project_type, num_generations):
    try:
        file_names = ast.literal_eval(file_names)
        totalFiles = len(file_names)
        processedFiles = 0
        generator = PDFDataGeneratorPipeline()
        for file_name in file_names:
            processedFiles += 1
            generator.create_json_dataset(
                self.request.id,
                dataset_id,
                file_name,
                num_generations,
                processedFiles,
                totalFiles,
                model_path=GENERATION_MODEL,
                device=GENERATION_MODEL_DEVICE,
                max_new_tokens=2048
            )
        return True
    except Exception as error:
        logger.error(f"Data generation task failed. Error: {error}")

# Training related
@app.task(bind=True, name="celery_task:training", before_start=on_training_start, on_failure=on_training_failure, queue='trainer_queue')
def training(self, task_id, num_gpus=1, enable_synthetic_generation=True, resume_from_checkpoint=False):
    train_config = f"./data/tasks/{task_id}/models/train.yml"
    train_log = f"./data/tasks/{task_id}/models/train.log"

    resume = 0
    if resume_from_checkpoint:
        resume = 1

    enable_generation = 1
    if not enable_synthetic_generation:
        enable_generation = 0

    tasks_client = TasksService()
    tasks_client.update_task(task_id, {"status": "STARTED"})

    if not os.path.isfile(train_config):
        raise FileNotFoundError(f"Unable to find train config at {train_config}")
    
    command = ["./scripts/train.sh", str(train_config), str(num_gpus), str(train_log), str(resume), str(enable_generation)]
    logger.info(f"Training starting. Check the training log at {train_log}")
    result = subprocess.run(command)
    
    # Wait for the process to complete and get the return code
    return_code = result.returncode
    if return_code != 0:
        logger.error(f"The script ended with a non-zero exit code: {return_code}")
        raise RuntimeError(f"Error during training. Please check training log in the {train_log}.")
    
    logger.info("Training completed")

@app.task(bind=True, name="celery_task:prepare_deployment_file", on_failure=on_prepare_failure, on_success=on_prepare_success, queue='default_queue')
def prepare_model(self, project_id, task_id, zip_filename):
    deployment = PrepareDeploymentFile()
    # sanity check if zip file is already created and all contents are available
    if not deployment._check_file_exists(zip_filename, task_id):
        tasks_client = TasksService()
        data = {
            "download_status": "STARTED",
            "download_progress": 0
        }
        tasks_client.update_task(task_id, data)
        deployment.create_zip_with_progress(zip_filename, project_id, task_id)
    return True
