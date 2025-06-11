# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import docker
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Annotated, Dict, List, Any

from fastapi import APIRouter, Depends, Request, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.encoders import jsonable_encoder
from utils.common import ID_MAX

from starlette.background import BackgroundTasks

from routes.utils import get_db
from utils.celery_app import celery_app
from services.tasks import TaskService

# Constants
logger = logging.getLogger(__name__)
CONTAINER_PREFIX = "edge-ai-tuning-kit.backend.llm-finetuning.evaluation-node"
DOCKER_OPERATION_TIMEOUT = 60  # seconds
DEFAULT_PORT = 5950
DEFAULT_MAX_TOKENS = 4096


class OpenAIInferenceService:
    """Service to manage OpenAI compatible inference containers."""

    def __init__(self, request: Request) -> None:
        """Initialize the inference service with database and Docker client.

        Args:
            request: The FastAPI request object
        """
        self.db = get_db(request)
        self.request = request
        self.response = {
            "status": False,
            "message": "",
            "data": None
        }
        self.docker_client = docker.from_env()
        self.executor = ThreadPoolExecutor()

    async def _run_docker_operation(self, operation, *args, **kwargs) -> Any:
        """Run a Docker operation in a thread pool with timeout.

        Args:
            operation: The function to execute
            *args: Arguments to pass to the operation
            **kwargs: Keyword arguments to pass to the operation

        Returns:
            The result of the operation

        Raises:
            asyncio.TimeoutError: If the operation takes longer than the timeout
            Exception: Any exception raised by the operation
        """
        try:
            return await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(
                    self.executor,
                    lambda: operation(*args, **kwargs)
                ),
                timeout=DOCKER_OPERATION_TIMEOUT
            )
        except asyncio.TimeoutError:
            logger.error(
                f"Docker operation timed out after {DOCKER_OPERATION_TIMEOUT} seconds")
            raise
        except Exception as e:
            logger.error(f"Docker operation failed: {str(e)}")
            raise

    async def _verify_image_existed(self, image_name: str) -> bool:
        """Check if a Docker image exists.

        Args:
            image_name: The name of the image to check

        Returns:
            True if the image exists, False otherwise
        """
        try:
            return await self._run_docker_operation(
                lambda: bool(self.docker_client.images.get(image_name))
            )
        except Exception as error:
            logger.error(
                f"Failed to verify if image {image_name} exists: {error}")
            return False

    async def _verify_container_existed(self, container_name: str) -> bool:
        """Check if a container exists.

        Args:
            container_name: The name of the container to check

        Returns:
            True if the container exists, False otherwise
        """
        try:
            containers = await self._run_docker_operation(
                lambda: self.docker_client.containers.list(all=True)
            )
            return any(container.name == container_name for container in containers)
        except Exception as error:
            logger.error(
                f"Failed to verify if container {container_name} exists: {error}")
            return False

    async def _verify_container_running(self, container_name: str) -> bool:
        """Check if a container is running.

        Args:
            container_name: The name of the container to check

        Returns:
            True if the container is running, False otherwise
        """
        try:
            container = await self._run_docker_operation(
                lambda: self.docker_client.containers.get(container_name)
            )
            return container.attrs['State']['Running']
        except Exception as error:
            logger.error(
                f"Failed to verify if container {container_name} is running: {error}")
            return False

    async def _build_image(self, context: str, dockerfile: str, tag: str, buildargs: Dict[str, str]) -> bool:
        """Build a Docker image.

        Args:
            context: The build context path
            dockerfile: The dockerfile path
            tag: The tag for the image
            buildargs: Build arguments for the image

        Returns:
            True if the build succeeded, False otherwise
        """
        try:
            logger.info(f"Building image with tag: {tag}")
            await self._run_docker_operation(
                lambda: self.docker_client.images.build(
                    path=context,
                    dockerfile=dockerfile,
                    tag=tag,
                    buildargs=buildargs,
                    rm=True
                )
            )
            return True
        except Exception as error:
            logger.error(f"Failed to build image {tag}: {error}")
            return False

    def _create_container(self, image_name: str, image_tag: str, id: int,
                          environment: Dict[str, str], port: int) -> bool:
        """Create and run a Docker container.

        Args:
            image_name: The image name
            image_tag: The image tag
            id: The model ID
            environment: Environment variables for the container
            port: The port to expose

        Returns:
            True if container created successfully, False otherwise

        Raises:
            Exception: If container creation fails
        """
        try:
            self.docker_client.containers.run(
                image=f"{image_name}:{image_tag}",
                name=f"{CONTAINER_PREFIX}-{id}",
                hostname="evaluation-node",
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
            return True
        except Exception as error:
            logger.error(f"Failed to create container for model {id}: {error}")
            raise

    def _remove_container(self, container_name: str) -> bool:
        """Remove a Docker container.

        Args:
            container_name: The name of the container to remove

        Returns:
            True if container removed successfully, False otherwise

        Raises:
            Exception: If container removal fails
        """
        try:
            container = self.docker_client.containers.get(container_name)
            if container:
                container.remove(force=True)
            return True
        except Exception as error:
            logger.error(
                f"Failed to remove container {container_name}: {error}")
            raise

    async def get_running_services(self) -> List[str]:
        """Get a list of running inference services.

        Returns:
            A list of container names for running inference services
        """
        try:
            containers = await self._run_docker_operation(
                lambda: self.docker_client.containers.list(all=True)
            )
            return [
                container.name for container in containers
                if CONTAINER_PREFIX in container.name
            ]
        except Exception as error:
            logger.error(f"Failed to get running services: {error}")
            return []

    async def create_inference_service(self, id: int, device: str = "cpu",
                                       port: int = DEFAULT_PORT,
                                       max_tokens: int = DEFAULT_MAX_TOKENS) -> Dict[str, Any]:
        """Create an inference service for a model.

        Args:
            id: The model ID
            device: The device to use (cpu, xpu)
            port: The port to expose
            max_tokens: Maximum tokens for inference

        Returns:
            A response dict with status, message, and data
        """
        image_name = "edge-ai-tuning-kit.backend.serving"
        image_tag = os.getenv('APP_VER', 'latest')
        model_path = f"data/tasks/{id}/models/checkpoints/ov_model"
        ov_model_path = model_path.replace("data", "/llm-data")
        container_name = f"{CONTAINER_PREFIX}-{id}"

        # Validate model path
        logger.info(f"Checking if model path {model_path} exists")
        if not os.path.exists(model_path):
            self.response['status'] = False
            self.response["message"] = f"Model weight file not found for model id: {id}"
            return self.response

        # Check if image exists
        logger.info(f"Checking if image {image_name}:{image_tag} exists")
        if not await self._verify_image_existed(f"{image_name}:{image_tag}"):
            self.response['status'] = False
            self.response["message"] = "Serving service is not available. Please follow the installation guide to install the service first."
            return self.response

        # Handle existing services
        logger.info(f"Checking for existing services for model id: {id}")
        running_services = await self.get_running_services()
        logger.info(f"Running services: {running_services}")
        if running_services:
            if await self._verify_container_existed(container_name):
                if not await self._verify_container_running(container_name):
                    logger.info(
                        f"Service for model id: {id} not running. Recreating the service.")
                    await self.stop_inference_node(id)
                else:
                    self.response['status'] = True
                    self.response["message"] = f"Service for model id: {id} is already running."
                    return self.response
            else:
                try:
                    other_container = running_services[0]
                    # Remove other running containers
                    await self._run_docker_operation(
                        lambda: self._remove_container(other_container)
                    )
                except Exception as error:
                    logger.error(f"Failed to remove container: {error}")
                    self.response["status"] = False
                    self.response[
                        "message"] = f"Failed to remove existing container: {str(error)}"
                    return self.response

        # Start new container
        try:
            logger.info(f"Starting inference service for model id: {id}")

            # Configure environment based on device
            if device == "xpu":
                environment = {
                    'VLLM_OPENVINO_KVCACHE_SPACE': '0',
                    'VLLM_OPENVINO_DEVICE': 'GPU',
                }
            elif device == "cpu":
                environment = {
                    'VLLM_OPENVINO_KVCACHE_SPACE': '0',
                    'VLLM_OPENVINO_CPU_KV_CACHE_PRECISION': 'None',
                }
            else:
                self.response["message"] = f"Device {device} is not supported."
                self.response["status"] = False
                return self.response

            # Add model path to environment
            environment.update({
                'MODEL_PATH': ov_model_path,
                'SERVED_MODEL_NAME': ov_model_path,
            })

            # Create container in thread pool
            logger.info(f"Creating container for model id: {id}")
            await self._run_docker_operation(
                lambda: self._create_container(
                    image_name, image_tag, id, environment, port)
            )

        except asyncio.TimeoutError:
            logger.error(
                f"Timeout when starting inference service for model id: {id}")
            self.response["status"] = False
            self.response["message"] = "Operation timed out while creating container"
            return self.response
        except Exception as error:
            logger.error(
                f"Failed to start inference service for model id: {id}: {error}")
            self.response["status"] = False
            self.response["message"] = str(error)
            return self.response

        self.response['status'] = True
        self.response['message'] = f"Inference service for model id: {id} started successfully."
        return self.response

    async def stop_inference_node(self, id: int) -> Dict[str, Any]:
        """Stop and remove an inference service.

        Args:
            id: The model ID

        Returns:
            A response dict with status and message
        """
        container_name = f"{CONTAINER_PREFIX}-{id}"
        try:
            # Check if container exists
            if not await self._verify_container_existed(container_name):
                self.response['status'] = False
                self.response['message'] = "Container not found. No inference service running for this model."
                return self.response

            # Remove container in thread pool
            await self._run_docker_operation(
                lambda: self._remove_container(container_name)
            )

            self.response['status'] = True
            self.response['message'] = f"Inference service for model id: {id} stopped successfully."
            return self.response

        except asyncio.TimeoutError:
            logger.error(
                f"Timeout when stopping inference service for model id: {id}")
            self.response['status'] = False
            self.response['message'] = f"Operation timed out while stopping inference service."
            return self.response
        except Exception as error:
            logger.error(
                f"Failed to stop inference service for model id: {id}: {error}")
            self.response['status'] = False
            self.response['message'] = f"Failed to stop inference service: {str(error)}"
            return self.response


# Router definition
router = APIRouter(
    prefix="/v1/services",
    tags=["inference"],
    responses={
        404: {"description": "Service not found"},
        500: {"description": "Internal server error"}
    }
)


@router.get("/inference", status_code=200)
async def get_running_inference_services(
    service: Annotated[OpenAIInferenceService, Depends()]
) -> List[str]:
    """Get a list of running inference services."""
    return await service.get_running_services()


@router.post("/start_inference_node", status_code=200)
async def start_inference_service(
    service: Annotated[OpenAIInferenceService, Depends()],
    id: int = Query(..., gt=0, le=ID_MAX),
    device: str = Query('cpu', min_length=1)
) -> Dict[str, Any]:
    """Start an inference service for a model."""
    response = await service.create_inference_service(id, device)
    if not response['status']:
        raise HTTPException(
            status_code=404,
            detail=f"Failed to start inference service for model id: {id} on {device}. Error: {response['message']}"
        )
    return response


@router.delete("/stop_inference_node", status_code=200)
async def stop_inference_service(
    service: Annotated[OpenAIInferenceService, Depends()],
    id: int = Query(..., gt=0, le=ID_MAX)
) -> Dict[str, Any]:
    """Stop an inference service for a model."""
    response = await service.stop_inference_node(id)
    if not response['status']:
        raise HTTPException(
            status_code=404,
            detail=f"Failed to stop inference service for model id: {id}. Error: {response['message']}"
        )
    return response


@router.post("/prepare_deployment_file", status_code=200)
async def prepare_deployment_file(
    service: Annotated[TaskService, Depends()],
    id: int = Query(..., gt=0, le=ID_MAX)
) -> Dict[str, Any]:
    """Prepare a deployment file for a model."""
    response = await service.get_task(id)
    if not response:
        return {"status": False, "message": f"No task with id: {id}"}

    _response = jsonable_encoder(response)
    project_id = _response['project_id']

    logger.debug("Creating the temporary zipfile...")
    zip_filename = f"./data/tasks/{id}/model_serving_{id}.zip"
    celery_task_id = celery_app.send_task(
        name="deployment_node:prepare_deployment_file",
        args=[project_id, id, zip_filename],
        queue='deployment_queue'
    )
    logger.info(f"Updating task with celery id: {celery_task_id}")

    return {
        "status": True,
        "message": "Preparing deployment file..."
    }


@router.get("/download_deployment_file", response_class=FileResponse)
async def download_deployment_file(
    service: Annotated[TaskService, Depends()],
    bg_task: BackgroundTasks,
    id: int = Query(..., gt=0, le=ID_MAX)
) -> FileResponse:
    """Download a prepared deployment file."""
    async def remove_file(zip_filename: str) -> None:
        """Clean up the zip file after download."""
        if os.path.exists(zip_filename):
            try:
                logger.debug("Removing the temporary zipfile...")
                os.remove(zip_filename)
                data = {
                    "download_status": "NOT_STARTED",
                    "download_progress": 0
                }
                await service.update_task(id, data)
            except Exception as e:
                logger.error(f"Failed to remove file {zip_filename}: {e}")

    # Check if zip file exists
    zip_filepath = f"./data/tasks/{id}/model_serving_{id}.zip"
    file_name = f"model_serving_{id}.zip"

    if not os.path.exists(zip_filepath):
        data = {
            "download_status": "NOT_STARTED",
            "download_progress": 0
        }
        await service.update_task(id, data)
        raise HTTPException(
            status_code=404,
            detail="Deployment file not found. Please prepare it first."
        )

    return FileResponse(
        path=zip_filepath,
        media_type='application/zip',
        filename=file_name,
        background=bg_task.add_task(remove_file, zip_filepath)
    )
