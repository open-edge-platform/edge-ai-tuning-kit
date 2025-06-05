# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import docker
from typing import Annotated
from loguru import logger

from fastapi import APIRouter, Depends, Request, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.encoders import jsonable_encoder
from utils.common import ID_MAX

from starlette.background import BackgroundTasks

from routes.utils import get_db
from utils.celery_app import celery_app
from services.tasks import TaskService, RunningTaskService

class OpenAIInferenceService:
    def __init__(self, request: Request) -> None:
        self.db = get_db(request)
        self.running_task_service = RunningTaskService(request)
        self.request = request
        self.response = {
            "status": False,
            "message": "",
            "data": None
        }
        self.docker_client = docker.from_env()

    def _verify_image_existed(self, image_name):
        try:
            image = self.docker_client.images.get(image_name)
            if not image:
                return False
            return True
        except Exception as error:
            logger.error(
                f"Failed to verify if image existed. Error: {error}")
            return False

    def _verify_container_existed(self, container_name):
        try:
            containers = self.docker_client.containers.list(all=True)
            isServiceExisted = False
            for container in containers:
                if container_name == container.name:
                    isServiceExisted = True
                    break
            return isServiceExisted

        except Exception as error:
            logger.error(
                f"Failed to verify if container existed. Error: {error}")
            return False

    def _verify_container_running(self, container_name):
        check_health = self.docker_client.containers.get(container_name)
        container_state = check_health.attrs['State']['Running']
        return container_state
    
    def _build_image(self, context, dockerfile, tag, buildargs):
        try:
            logger.info(f"Building image from with tag: {tag}")
            image, build_log = self.docker_client.images.build(
                path=context,
                dockerfile=dockerfile,
                tag=tag,
                buildargs=buildargs,
                rm=True,  # Removing the build container image
            )
            logger.debug(f"Build log for the image: {build_log}")
            return True

        except Exception as error:
            logger.error(
                f"Failed to build image. Error: {error}")
            return False

    def get_running_services(self, filter={}):
        containers = self.docker_client.containers.list(all=True)
        running_containers = [
            container.name for container in containers if "edge-ai-tuning-kit.backend.evaluation" in container.name]
        return running_containers

    async def create_inference_service(self, id, device="cpu", port=5950, max_tokens=4096):
        if device == "xpu":
            # Check if there is a training task in progress
            response = await self.running_task_service.get_running_task()
            _response = jsonable_encoder(response)
            if _response['status'] in ['STARTED', 'RETRY', 'PENDING']:
                self.response['status'] = False
                self.response['message'] = f"GPU is being used for training the model with id: {_response['id']}."
                return self.response
        
        # Sanity check if model file available.
        image_name = "edge-ai-tuning-kit.backend.serving"
        image_tag = os.getenv('APP_VER', 'latest')
        
        if not os.path.isdir(f"./data/tasks/{id}/models/models"):
            self.response["message"] = f"Model weight file not found for model id: {id}"
            return self.response

        if not self._verify_image_existed(f"{image_name}:{image_tag}"):
            self.response["message"] = f"Serving service is not available. Please follow the installation guide to install the service first."
            return self.response

        running_services = self.get_running_services()
        if len(running_services) > 0:
            if self._verify_container_existed(f"edge-ai-tuning-kit.backend.evaluation-{id}"):
                if not self._verify_container_running(f"edge-ai-tuning-kit.backend.evaluation-{id}"):
                    logger.info(f"Services for model id: {id} not running. Recreating the service..") 
                    self.stop_inference_node(id)

                else:
                    self.response['status'] = True
                    self.response["message"] = f"Services for model id: {id} already running."
                    return self.response
            else:
                container = self.docker_client.containers.get(running_services[0])
                if container:
                    container.remove(force=True)
        
        try:
            logger.info(f"Starting inferencing service for model id: {id}")
            if device == "xpu":
                environment = {
                    'VLLM_OPENVINO_KVCACHE_SPACE': '0',
                    'VLLM_OPENVINO_DEVICE': 'GPU',
                }
            else:
                # use CPU
                environment = {
                    'VLLM_OPENVINO_KVCACHE_SPACE': '0',
                    'VLLM_OPENVINO_DEVICE': 'CPU',
                }

            ov_model_path = f'/llm-data/tasks/{id}/models/ov_models'
            environment.update({
                'DEFAULT_MODEL_ID': f'/llm-data/tasks/{id}/models/models',
                'MODEL_PATH': ov_model_path,
                'SERVED_MODEL_NAME': ov_model_path,
                'TASK': 'text-generation-with-past',
                'MODEL_PRECISION': 'int4'
            })
            
            self.docker_client.containers.run(
                image=f"{image_name}:{image_tag}",
                name=f"edge-ai-tuning-kit.backend.evaluation-{id}",
                hostname=f"serving-node-{id}",
                environment=environment,
                privileged=True,
                network="edge-ai-tuning-kit-network",
                ports={
                    8000: f"{port}/tcp"
                },
                group_add=[os.environ.get('RENDER_GROUP_ID')],
                volumes=[
                    'edge-ai-tuning-kit-data-cache:/llm-data'
                ],
                devices=[
                    '/dev/dri:/dev/dri'
                ],
                detach=True
            )

        except Exception as error:
            logger.error(
                f"Exception when starting inferencing service for model id: {id}, error: {error}")
            self.response["message"] = error
            return self.response

        self.response['status'] = True
        self.response['message'] = f"Inferencing service for model id: {id} started successfully."
        return self.response

    def stop_inference_node(self, id):
        try:
            container = self.docker_client.containers.get(
                f"edge-ai-tuning-kit.backend.evaluation-{id}")
            if container:
                container.remove(force=True)
                self.response['status'] = True
                self.response['message'] = f"Evaluation node container id: {id} deleted."
                return self.response
            else:
                self.response['message'] = f"Container not found. Failed to stop evaluation node container."
                return self.response
        except Exception as error:
            logger.error(
                f"Failed to stop the evaluation node container for id: {id}, error: {error}")
            self.response['message'] = f"Unable to stop the container, error: {error}."
            return self.response


router = APIRouter(prefix="/v1/services",
                   responses={404: {"description": "Unable to find routes for inference service"}})


@router.get("/inference", status_code=200)
async def get_running_inference_services(service: Annotated[OpenAIInferenceService, Depends()]):
    result = service.get_running_services()
    return result


@router.post("/start_inference_node", status_code=200)
async def start_inference(service: Annotated[OpenAIInferenceService, Depends()], id: int = Query(..., gt=0 , le=ID_MAX), device: str = Query('cpu', min_length=1)):
    response = await service.create_inference_service(id, device)
    if not response['status']:
        raise HTTPException(
            status_code=404, detail=f"Failed to start inference node with id: {id} on {device}. Error: {response['message']}")

    return response


@router.delete("/stop_inference_node", status_code=200)
async def start_inference(service: Annotated[OpenAIInferenceService, Depends()], id: int = Query(..., gt=0 , le=ID_MAX)):
    response = service.stop_inference_node(id)
    if not response['status']:
        raise HTTPException(
            status_code=404, detail=f"Failed to stop inference node with id: {id}. Error: {response['message']}")

    return response


@router.post("/prepare_deployment_file", status_code = 200)
async def download_model_weights(service: Annotated[TaskService, Depends()], id: int = Query(..., gt=0, le=ID_MAX)):
    response = await service.get_task(id)
    if not response:
        return {"status": False, "message": f"No task with id: {id}"}
    _response = jsonable_encoder(response)
    project_id = _response['project_id']

    logger.debug("Creating the temporary zipfile ...")
    zip_filename = f"./data/tasks/{id}/model_serving_{id}.zip"
    celery_task_id = celery_app.send_task(
        name="celery_task:prepare_deployment_file",
        args=[project_id, id, zip_filename],
        queue='default_queue'
    )
    logger.info(f"Updating task with celery id: {celery_task_id}")

    data= {
        "status": True,
        "message": "Preparing deployment file..."
    }
    return data

@router.get("/download_deployment_file", response_class=FileResponse)
async def download_deployment_file(service: Annotated[TaskService, Depends()],bg_task: BackgroundTasks, id: int = Query(..., gt=0, le=ID_MAX)):
    async def remove_file(zip_filename):
        if os.path.exists(zip_filename):
            try:
                logger.debug("Removing the temporary zipfile ...")
                os.remove(zip_filename)
                data = {
                    "download_status": "NOT_STARTED",
                    "download_progress": 0
                }
                await service.update_task(id, data)
            except:
                logger.error(f"Failed to remove the file: {zip_filename}")
    
    # sanity check if zip file available to download
    zip_filepath = f"./data/tasks/{id}/model_serving_{id}.zip"
    file_name = f"model_serving_{id}.zip"
    if not os.path.exists(zip_filepath):
        data = {
            "download_status": "NOT_STARTED",
            "download_progress": 0
        }
        await service.update_task(id, data)
        raise HTTPException(
            status_code=404, detail=f"Failed to find model serving file.")
    
    return FileResponse(zip_filepath, media_type='application/zip', filename=file_name, background=bg_task.add_task(remove_file, zip_filepath))