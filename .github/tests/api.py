import os
import time
import requests
import pytest


ENDPOINTS=os.environ.get("SERVER_URL", "http://localhost:5999")

# Common test
def test_healthcheck():
    response = requests.get(f'{ENDPOINTS}/healthcheck', headers={'accept': 'application/json'})
    assert response.status_code == 200
    assert response.text == '"OK"'

def test_system_info():
    response = requests.get(f'{ENDPOINTS}/v1/server/info', headers={'accept': 'application/json'})
    assert response.status_code == 200

# Model test
def test_download_default_model():
    url = f'{ENDPOINTS}/v1/models/download/1'
    headers = {'accept': 'application/json'}
    response = requests.post(url, headers=headers)
    assert response.status_code == 200

def test_default_model_downloaded():
    retry_count = 30
    is_test_pass = False
    while retry_count != 0:
        url = f'{ENDPOINTS}/v1/models/1'
        headers = {'accept': 'application/json'}
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            if response.json()['data']['download_metadata']['status'] == "SUCCESS":
                is_test_pass = True
                break
        time.sleep(60)
        retry_count -= 1

    assert is_test_pass == True

# Project test
@pytest.fixture(scope="module")
def test_create_project():
    url = f'{ENDPOINTS}/v1/projects'
    headers = {'accept': 'application/json', 'Content-Type': 'application/json'}
    data = {
      "name": "test-sample",
      "projectType": "CHAT_MODEL"
    }
    response = requests.post(url, headers=headers, json=data)
    assert response.status_code == 200
    assert response.json()['status'] == True
    yield response.json()

def test_get_project(test_create_project):
    url = f'{ENDPOINTS}/v1/projects/{test_create_project["data"]}'
    headers = {'accept': 'application/json'}
    response = requests.get(url, headers=headers)
    assert response.status_code == 200
    assert response.json()['data'] != None

# System prompt test
def test_update_system_prompt(test_create_project):
    url = f'{ENDPOINTS}/v1/datasets/{test_create_project["data"]}'
    headers = {'accept': 'application/json'}
    data = {
        "prompt_template":  "You are a helpful and truthful assistant. Answer the question."
    }
    response = requests.patch(url, headers=headers, json=data)
    assert response.status_code == 200
    assert response.json()['data'] != None

    response = requests.get(url, headers=headers)
    assert response.json()['data']['prompt_template'] == data['prompt_template']

# Document test
def test_upload_document(test_create_project):
    url = f'{ENDPOINTS}/v1/datasets/{test_create_project["data"]}/text_embedding'
    headers = {'accept': 'application/json'}
    params = {
        "id": test_create_project["data"],
        "chunk_size": 512,
        "chunk_overlap": 10
    }
    sample_data_dir = './.github/tests/sample_data/sample.pdf'
    isFile = os.path.exists(sample_data_dir)
    assert isFile == True, "Sample data not found"
    files = {'files': ('sample.pdf', open(sample_data_dir, 'rb'), 'application/pdf')}
    response = requests.post(url, headers=headers, params=params, files=files)
    assert response.status_code == 200

def test_get_text_embeddings(test_create_project):
    url = f'{ENDPOINTS}/v1/datasets/{test_create_project["data"]}/text_embedding'
    headers = {'accept': 'application/json'}
    params = {
        "id": test_create_project["data"],
        "page": 1,
        "pageSize": 5,
        "source": "sample.pdf"
    }
    time.sleep(5)
    response = requests.get(url, headers=headers, params=params)
    assert response.status_code == 200
    assert len(response.json()['data']['doc_chunks']) != 0

# Dataset test
def test_get_dataset(test_create_project):
    url = f'{ENDPOINTS}/v1/datasets/{test_create_project["data"]}'
    headers = {'accept': 'application/json'}
    response = requests.get(url, headers=headers)
    assert response.status_code == 200
    assert response.json()['data'] != None

# Dataset Generation test
def test_generate_dataset(test_create_project):
    url = f'{ENDPOINTS}/v1/data/generate_qa?dataset_id={test_create_project["data"]}&project_type=CHAT_MODEL&num_generations=5'
    headers = {'accept': 'application/json'}
    sample_data_dir = './.github/tests/sample_data/sample.pdf'
    isFile = os.path.exists(sample_data_dir)
    assert isFile == True, "Sample data not found"
    files = {'files': ('sample.pdf', open(sample_data_dir, 'rb'), 'application/pdf')}
    response = requests.post(url, headers=headers, files=files)
    assert response.status_code == 200

def test_get_generated_dataset(test_create_project):
    retry_count = 10
    is_test_pass = False
    while retry_count != 0:
        url = f'{ENDPOINTS}/v1/datasets/{test_create_project["data"]}/data'
        headers = {'accept': 'application/json'}
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            if len(response.json()['data']) > 0:
                is_test_pass = True
                break
        time.sleep(60)
        retry_count -= 1

    assert is_test_pass == True

# Training tests
@pytest.fixture(scope="module")
def test_create_task(test_create_project):
    url = f'{ENDPOINTS}/v1/tasks'
    headers = {'accept': 'application/json'}
    params = {
        "project_id": test_create_project["data"],
        "dataset_id": test_create_project["data"],
        "task_type": "QLORA",
        "num_gpus": "-1",
        "model_path": "mistralai/Mistral-7B-Instruct-v0.3",
        "device": "xpu",
        "per_device_train_batch_size": "2",
        "per_device_eval_batch_size": "1",
        "gradient_accumulation_steps": "1",
        "learning_rate": "0.0001",
        "num_train_epochs": "3",
        "lr_scheduler_type": "cosine",
        "optim": "adamw_hf",
        "enabled_synthetic_generation": True
    }
    response = requests.post(url, headers=headers, json=params)
    time.sleep(5)
    assert response.status_code == 200
    assert response.json()["status"] == True
    yield response.json()

def test_training_success(test_create_task):
    retry_count = 30
    is_test_pass = False

    url = f'{ENDPOINTS}/v1/tasks/{test_create_task["data"]}'
    headers = {'accept': 'application/json'}
    while retry_count != 0:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            if response.json()['data']['status'] == "SUCCESS":
                is_test_pass = True
                break
        time.sleep(60)
        retry_count -= 1
    
    assert is_test_pass == True

# Evaluation tests
def test_start_evaluation(test_create_task):
    url = f'{ENDPOINTS}/v1/services/start_inference_node'
    headers = {'accept': 'application/json'}
    params = {
        "id": test_create_task["data"]
    }
    response = requests.post(url, headers=headers, params=params)
    assert response.status_code == 200
    assert response.json()["status"] == True

def test_run_evaluation():
    url = f'{ENDPOINTS}/v1/completions/models'
    headers = {'accept': 'application/json'}
    retry_count = 30
    is_test_pass = False
    while retry_count != 0:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            is_test_pass = True
            break
        time.sleep(60)
        retry_count -= 1
    
    assert is_test_pass == True

def test_stop_evaluation(test_create_task):
    url = f'{ENDPOINTS}/v1/services/stop_inference_node'
    headers = {'accept': 'application/json'}
    params = {
        "id": test_create_task["data"]
    }
    response = requests.delete(url, headers=headers, params=params)
    assert response.status_code == 200
    assert response.json()["status"] == True

# Deployment bundle tests
def test_prepare_deployment_bundle(test_create_task):
    url = f'{ENDPOINTS}/v1/services/prepare_deployment_file'
    headers = {'accept': 'application/json'}
    params = {
        "id": test_create_task["data"]
    }
    response = requests.post(url, headers=headers, params=params)
    assert response.status_code == 200
    assert response.json()['status'] == True

def test_download_deployment_bundle(test_create_task):
    retry_count = 30
    is_test_pass = False
    task_url = f'{ENDPOINTS}/v1/tasks/{test_create_task["data"]}'
    headers = {'accept': 'application/json'}

    # Test deployment bundle created successfully
    while retry_count != 0:
        try:
            response = requests.get(task_url, headers=headers)
            if response.status_code == 200:
                if response.json()['data']['download_status'] == "SUCCESS":
                    is_test_pass = True
                    break
        except Exception as error:
            time.sleep(60)
            retry_count -= 1
    
    # TODO: Test download deployment bundle (unable to do this from requests)
    assert is_test_pass == True
