# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import time
import requests
import pytest
from typing import Dict, Any, Optional, Callable


ENDPOINTS = os.environ.get("SERVER_URL", "http://localhost:5999")
HEADERS = {'accept': 'application/json'}
DEFAULT_RETRY_COUNT = 30
DEFAULT_RETRY_DELAY = 60  # seconds


def api_request(method: str, endpoint: str, headers: Optional[Dict] = None, 
                params: Optional[Dict] = None, json: Optional[Dict] = None, 
                files: Optional[Dict] = None) -> requests.Response:
    """Make an API request with the specified method and parameters."""
    url = f'{ENDPOINTS}{endpoint}'
    headers = headers or HEADERS
    
    method_map = {
        'get': requests.get,
        'post': requests.post,
        'patch': requests.patch,
        'delete': requests.delete
    }
    
    return method_map[method.lower()](url, headers=headers, params=params, json=json, files=files)


def wait_for_condition(endpoint: str, check_func: Callable, 
                       retry_count: int = DEFAULT_RETRY_COUNT, 
                       retry_delay: int = DEFAULT_RETRY_DELAY) -> bool:
    """
    Wait for a specific condition to be met by repeatedly checking an endpoint.
    
    Args:
        endpoint: API endpoint to check
        check_func: Function that takes the response and returns True if condition is met
        retry_count: Maximum number of retries
        retry_delay: Delay between retries in seconds
        
    Returns:
        True if condition was met within retry limit, False otherwise
    """
    while retry_count > 0:
        try:
            response = api_request('get', endpoint)
            if response.status_code == 200 and check_func(response):
                return True
        except Exception as error:
            print(f"Error checking condition: {error}")
        
        time.sleep(retry_delay)
        retry_count -= 1
    
    return False


# Common test
def test_healthcheck():
    """Test that the server is up and running."""
    response = api_request('get', '/healthcheck')
    assert response.status_code == 200
    assert response.text == '"OK"'


def test_system_info():
    """Test retrieval of system information."""
    response = api_request('get', '/v1/server/info')
    assert response.status_code == 200


# Model test
def test_download_default_model():
    """Test downloading the default model."""
    response = api_request('post', '/v1/models/download/1')
    assert response.status_code == 200


def test_default_model_downloaded():
    """Test that the default model was successfully downloaded."""
    def check_model_downloaded(response):
        return response.json()['data']['download_metadata']['status'] == "SUCCESS"
    
    is_test_pass = wait_for_condition('/v1/models/1', check_model_downloaded)
    assert is_test_pass == True


# Project test
@pytest.fixture(scope="module")
def test_create_project():
    """Create a test project and yield its data for other tests."""
    data = {"name": "test-sample", "description": "test-sample"}
    headers = {**HEADERS, 'Content-Type': 'application/json'}
    response = api_request('post', '/v1/projects', headers=headers, json=data)
    
    assert response.status_code == 200
    assert response.json()['status'] == True
    yield response.json()


def test_get_project(test_create_project):
    """Test retrieving a project by ID."""
    project_id = test_create_project["data"]
    response = api_request('get', f'/v1/projects/{project_id}')
    
    assert response.status_code == 200
    assert response.json()['data'] != None


# System prompt test
def test_update_system_prompt(test_create_project):
    """Test updating a system prompt."""
    project_id = test_create_project["data"]
    data = {
        "prompt_template": "You are a helpful and truthful assistant. Answer the question."
    }
    
    # Update the prompt
    response = api_request('patch', f'/v1/datasets/{project_id}', json=data)
    assert response.status_code == 200
    assert response.json()['data'] != None
    
    # Verify the prompt was updated
    response = api_request('get', f'/v1/datasets/{project_id}')
    assert response.json()['data']['prompt_template'] == data['prompt_template']


# Document test
def test_upload_document(test_create_project):
    """Test uploading a document for text embedding."""
    project_id = test_create_project["data"]
    params = {
        "id": project_id,
        "chunk_size": 512,
        "chunk_overlap": 10
    }
    
    # Check if sample data exists
    sample_data_dir = './.github/tests/sample_data/sample.pdf'
    assert os.path.exists(sample_data_dir) == True, "Sample data not found"
    
    # Upload the document
    with open(sample_data_dir, 'rb') as file:
        files = {'files': ('sample.pdf', file, 'application/pdf')}
        response = api_request('post', f'/v1/datasets/{project_id}/text_embedding', 
                              params=params, files=files)
    
    assert response.status_code == 200


def test_get_text_embeddings(test_create_project):
    """Test retrieving text embeddings for a document."""
    project_id = test_create_project["data"]
    params = {
        "id": project_id,
        "page": 1,
        "pageSize": 5,
        "source": "sample.pdf"
    }
    
    # Wait briefly for text embedding processing
    time.sleep(5)
    
    response = api_request('get', f'/v1/datasets/{project_id}/text_embedding', params=params)
    assert response.status_code == 200
    assert len(response.json()['data']['doc_chunks']) != 0


# Dataset test
def test_get_dataset(test_create_project):
    """Test retrieving a dataset by ID."""
    project_id = test_create_project["data"]
    response = api_request('get', f'/v1/datasets/{project_id}')
    
    assert response.status_code == 200
    assert response.json()['data'] != None


# Dataset Generation test
def test_generate_dataset(test_create_project):
    """Test generating a dataset from a document."""
    project_id = test_create_project["data"]
    endpoint = f'/v1/data/generate_qa?dataset_id={project_id}&project_type=CHAT_MODEL&num_generations=5'
    
    # Check if sample data exists
    sample_data_dir = './.github/tests/sample_data/sample.pdf'
    assert os.path.exists(sample_data_dir) == True, "Sample data not found"
    
    # Generate the dataset
    with open(sample_data_dir, 'rb') as file:
        files = {'files': ('sample.pdf', file, 'application/pdf')}
        response = api_request('post', endpoint, files=files)
    
    assert response.status_code == 200


def test_get_generated_dataset(test_create_project):
    """Test retrieving the generated dataset."""
    project_id = test_create_project["data"]
    
    def check_dataset_generated(response):
        return len(response.json()['data']) > 0
    
    is_test_pass = wait_for_condition(
        f'/v1/datasets/{project_id}/data', 
        check_dataset_generated,
        retry_count=10
    )
    
    assert is_test_pass == True


# Training tests
@pytest.fixture(scope="module")
def test_create_task(test_create_project):
    """Create a training task and yield its data for other tests."""
    project_id = test_create_project["data"]
    params = {
        "project_id": project_id,
        "dataset_id": project_id,
        "task_type": "QLORA",
        "num_gpus": "1",
        "model_path": "mistralai/Mistral-7B-Instruct-v0.3",
        "device": "xpu",
        "max_length": "2048",
        "per_device_train_batch_size": "1",
        "per_device_eval_batch_size": "1",
        "gradient_accumulation_steps": "1",
        "learning_rate": "0.0001",
        "num_train_epochs": "3",
        "lr_scheduler_type": "cosine",
        "optim": "adamw_torch",
        "enabled_synthetic_generation": True
    }
    
    response = api_request('post', '/v1/tasks', json=params)
    time.sleep(5)  # Wait briefly for task creation
    
    assert response.status_code == 200
    assert response.json()["status"] == True
    yield response.json()


def test_training_success(test_create_task):
    """Test that training completes successfully."""
    task_id = test_create_task["data"]
    
    def check_training_success(response):
        return response.json()['data']['status'] == "SUCCESS"
    
    is_test_pass = wait_for_condition(f'/v1/tasks/{task_id}', check_training_success)
    assert is_test_pass == True


# Evaluation tests
def test_start_evaluation(test_create_task):
    """Test starting the model evaluation."""
    task_id = test_create_task["data"]
    params = {"id": task_id}
    
    response = api_request('post', '/v1/services/start_inference_node', params=params)
    assert response.status_code == 200
    assert response.json()["status"] == True


def test_run_evaluation():
    """Test that the evaluation service is running."""
    def check_evaluation_running(response):
        return response.status_code == 200
    
    is_test_pass = wait_for_condition('/v1/completions/models', check_evaluation_running)
    assert is_test_pass == True


def test_stop_evaluation(test_create_task):
    """Test stopping the model evaluation."""
    task_id = test_create_task["data"]
    params = {"id": task_id}
    
    response = api_request('delete', '/v1/services/stop_inference_node', params=params)
    assert response.status_code == 200
    assert response.json()["status"] == True


# Deployment bundle tests
def test_prepare_deployment_bundle(test_create_task):
    """Test preparing a deployment bundle."""
    task_id = test_create_task["data"]
    params = {"id": task_id}
    
    response = api_request('post', '/v1/services/prepare_deployment_file', params=params)
    assert response.status_code == 200
    assert response.json()['status'] == True


def test_download_deployment_bundle(test_create_task):
    """Test that the deployment bundle is successfully created and ready for download."""
    task_id = test_create_task["data"]
    
    def check_bundle_ready(response):
        return response.json()['data']['download_status'] == "SUCCESS"
    
    is_test_pass = wait_for_condition(f'/v1/tasks/{task_id}', check_bundle_ready)
    assert is_test_pass == True
