# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import docker
import psutil
import logging
from typing import Dict, List, Optional, Any
from psutil._common import bytes2human

from fastapi import Request
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from routes.utils import get_db
from models.deployments import DeploymentsModel
from utils.common import validate_model_filter

logger = logging.getLogger(__name__)

# Constants
DEFAULT_IMAGE_TAG = 'latest'
MIN_TRAINING_RAM_GB = 50
MIN_DEPLOYMENT_RAM_GB = 6
MIN_PORT = 1024
MAX_PORT = 65535
CONTAINER_PREFIX = "edge-ai-tuning-kit.backend.serving-"
IMAGE_NAME = "edge-ai-tuning-kit.backend.serving"
DOCKER_NETWORK = "edge-ai-tuning-kit-network"
DOCKER_VOLUME = "edge-ai-tuning-kit-data-cache:/llm-data"
DEVICE_MOUNT = "/dev/dri:/dev/dri"
DEFAULT_SHM_SIZE = "16G"


class DeploymentService:
    """
    Service to manage model deployments for inference.

    This class handles the creation, updating, deletion, and monitoring of
    deployments that serve machine learning models for inference.
    """

    def __init__(self, request: Request) -> None:
        """
        Initialize the DeploymentService.

        Args:
            request (Request): The FastAPI request object
        """
        self.db: Session = get_db(request)
        self.request: Request = request
        self.response: Dict[str, Any] = {
            "status": False,
            "message": "",
            "data": None
        }
        self.docker_client: docker.DockerClient = docker.from_env()

    def _verify_image_existed(self, image_name: str) -> bool:
        """
        Verify if a Docker image exists.

        Args:
            image_name (str): Name of the Docker image to verify

        Returns:
            bool: True if the image exists, False otherwise
        """
        try:
            image = self.docker_client.images.get(image_name)
            return image is not None
        except Exception as error:
            logger.error(f"Failed to verify if image existed. Error: {error}")
            return False

    def _verify_container_existed(self, container_name: str) -> bool:
        """
        Verify if a Docker container exists.

        Args:
            container_name (str): Name of the Docker container to verify

        Returns:
            bool: True if the container exists, False otherwise
        """
        try:
            containers = self.docker_client.containers.list(all=True)
            for container in containers:
                if container_name in container.name:
                    return True
            return False
        except Exception as error:
            logger.error(
                f"Failed to verify if container existed. Error: {error}")
            return False

    def _verify_container_running(self, container_name: str) -> bool:
        """
        Verify if a Docker container is running.

        Args:
            container_name (str): Name of the Docker container to check

        Returns:
            bool: True if the container is running, False otherwise
        """
        try:
            check_health = self.docker_client.containers.get(container_name)
            container_state = check_health.attrs['State']['Running']
            return container_state
        except Exception as error:
            logger.error(f"Failed to verify container status. Error: {error}")
            return False

    def _restart_container(self, id: int) -> None:
        """
        Restart a Docker container for a specific model.

        Args:
            id (int): The model ID associated with the container

        Raises:
            Exception: If the container cannot be restarted
        """
        container_name = f"{CONTAINER_PREFIX}{id}"
        try:
            container = self.docker_client.containers.get(container_name)
            if container:
                container.restart()
                logger.info(f"Container for model {id} restarted successfully")
            else:
                logger.warning(
                    f"Serving container not found for model id: {id}")
        except Exception as error:
            logger.error(
                f"Failed to restart the inference node container for id: {id}, error: {error}")
            raise

    def _build_image(self, context: str, dockerfile: str, tag: str, buildargs: Dict[str, str]) -> bool:
        """
        Build a Docker image.

        Args:
            context (str): The build context path
            dockerfile (str): Path to the Dockerfile
            tag (str): Tag for the new image
            buildargs (Dict[str, str]): Build arguments for Docker

        Returns:
            bool: True if the build was successful, False otherwise
        """
        try:
            logger.info(f"Building image with tag: {tag}")
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
            logger.error(f"Failed to build image. Error: {error}")
            return False

    def _verify_available_ram(self) -> bool:
        """
        Verify if there's enough available RAM for deployments.

        Returns:
            bool: True if there's enough RAM, False otherwise
        """
        try:
            total_required_ram = MIN_DEPLOYMENT_RAM_GB + MIN_TRAINING_RAM_GB
            memory = psutil.virtual_memory()

            logger.info(
                f"Current available memory: {bytes2human(memory.available)}")

            if memory.available < (total_required_ram * 1024**3):
                logger.error(
                    f"Requires at least {total_required_ram} GB of available server RAM")
                return False

            return True
        except Exception as error:
            logger.error(f"Failed to verify available RAM. Error: {error}")
            return False

    def _verify_host_port(self, host_port: int) -> bool:
        """
        Verify if a host port is valid and available.

        Args:
            host_port (int): The port to verify

        Returns:
            bool: True if the port is valid and available, False otherwise
        """
        try:
            # Convert to int if it's a string
            host_port = int(host_port)

            # Check if the port is in range
            if host_port < MIN_PORT or host_port > MAX_PORT:
                error_msg = f"Port {host_port} is not in range {MIN_PORT} to {MAX_PORT}. Please use another port number."
                self.response["message"] = error_msg
                logger.error(error_msg)
                return False

            # Check if the port is already in use by another deployment
            deployments = self.db.query(DeploymentsModel)
            for deployment in deployments:
                if host_port == int(deployment.settings['host_port']):
                    error_msg = f"Port {host_port} is already in use. Please use another port number."
                    self.response["message"] = error_msg
                    logger.error(error_msg)
                    return False

            return True
        except Exception as error:
            logger.error(f"Failed to verify host port. Error: {error}")
            return False

    async def get_all_deployments(self, filter: Dict[str, Any] = {}) -> List[DeploymentsModel]:
        """
        Get all deployments, optionally filtered.

        Args:
            filter (Dict[str, Any], optional): Filter criteria. Defaults to {}.

        Returns:
            List[DeploymentsModel]: List of deployment models
        """
        try:
            results: List[DeploymentsModel] = []
            query = self.db.query(DeploymentsModel)

            if filter:
                filter_result = validate_model_filter(DeploymentsModel, filter)
                if not filter_result["status"]:
                    return filter_result
                query = query.filter_by(**filter)

            deployments = query.all()
            for deployment in deployments:
                results.append(deployment)

            return results
        except Exception as error:
            logger.error(f"Failed to get deployments: {error}")
            return []

    async def get_deployment(self, id: int) -> Optional[DeploymentsModel]:
        """
        Get a specific deployment by ID.

        Args:
            id (int): The deployment ID

        Returns:
            Optional[DeploymentsModel]: The deployment if found, None otherwise
        """
        try:
            result = self.db.query(DeploymentsModel).filter(
                DeploymentsModel.id == id).first()
            return result
        except Exception as error:
            logger.error(f"Failed to get deployment {id}: {error}")
            return None

    async def create_deployment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new model deployment.

        Args:
            data (Dict[str, Any]): Deployment configuration data

        Returns:
            Dict[str, Any]: Response with status, message, and data
        """
        model_id = data.get('model_id')
        host_port = data.get('host_port')
        device = data.get('device')

        if not all([model_id, host_port, device]):
            self.response["message"] = "Missing required deployment parameters"
            return self.response

        image_tag = os.getenv('APP_VER', DEFAULT_IMAGE_TAG)
        model_path = f"data/tasks/{model_id}/models/checkpoints/ov_model"
        ov_model_path = model_path.replace("data", "/llm-data")
        container_name = f"{CONTAINER_PREFIX}{model_id}"

        # Validate model path exists
        if not os.path.exists(model_path):
            self.response["message"] = f"Model weight file not found for model id: {model_id}"
            return self.response

        # Verify Docker image exists
        if not self._verify_image_existed(f"{IMAGE_NAME}:{image_tag}"):
            self.response["message"] = f"Serving service is not available. Please follow the installation guide to install the service first."
            return self.response

        # Check if container already exists
        if self._verify_container_existed(container_name):
            if not self._verify_container_running(container_name):
                logger.info(
                    f"Services for model id: {model_id} not running. Recreating the service...")
                await self.delete_deployment(model_id)
            else:
                self.response["message"] = f"Services for model id: {model_id} already running."
                return self.response

        # Verify port is available
        if not self._verify_host_port(host_port):
            return self.response  # Message is set in _verify_host_port method

        # Start docker container
        try:
            logger.info(
                f"Starting inferencing service for model id: {model_id}")

            # Configure environment based on device
            environment: Dict[str, str] = {}
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

            # Run docker container
            self.docker_client.containers.run(
                image=f"{IMAGE_NAME}:{image_tag}",
                name=container_name,
                hostname=f"serving-node-{model_id}",
                environment=environment,
                privileged=True,
                shm_size=DEFAULT_SHM_SIZE,
                network=DOCKER_NETWORK,
                ports={
                    8000: f"{host_port}/tcp"
                },
                group_add=[os.environ.get('RENDER_GROUP_ID')],
                volumes=[DOCKER_VOLUME],
                devices=[DEVICE_MOUNT],
                detach=True
            )
        except Exception as error:
            logger.error(
                f"Exception when starting inferencing service for model id: {model_id}, error: {error}")
            self.response["message"] = str(error)
            return self.response

        # Create database record
        try:
            new_deployment = DeploymentsModel(
                model_id=model_id,
                settings={
                    "host_address": data['host_address'],
                    "host_port": host_port,
                    "device": device,
                    "isEncryption": data.get('isEncryption', False)
                }
            )

            self.db.add(new_deployment)
            self.db.commit()
            self.db.refresh(new_deployment)

            self.response["status"] = True
            self.response["data"] = new_deployment.id
            self.response['message'] = f"Inferencing service for model id: {model_id} started successfully."
        except Exception as error:
            self.db.rollback()
            logger.error(f"Failed to create deployment record: {error}")
            self.response["status"] = False
            self.response["data"] = None
            self.response["message"] = "Failed to create deployment record"

        return self.response

    async def update_deployment(self, id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update an existing deployment.

        Args:
            id (int): The deployment ID
            data (Dict[str, Any]): Updated deployment data

        Returns:
            Dict[str, Any]: Response with status, message, and data
        """
        try:
            # Verify deployment exists
            deployment = await self.get_deployment(id)
            if not deployment:
                self.response["status"] = False
                self.response["message"] = f"Deployment with id {id} not found"
                return self.response

            # Update deployment record
            try:
                result = self.db.query(DeploymentsModel).filter(
                    DeploymentsModel.id == id).update(data)
                self.db.commit()

                self.response["status"] = True
                self.response["data"] = result
                self.response["message"] = "Deployment updated successfully"
            except Exception as db_error:
                self.db.rollback()
                logger.error(
                    f"Database error updating deployment {id}: {db_error}")
                self.response["status"] = False
                self.response["message"] = "Failed to update deployment"

            return self.response
        except Exception as error:
            logger.error(f"Failed to update deployment {id}: {error}")
            self.response["status"] = False
            self.response["data"] = None
            self.response["message"] = str(error)
            return self.response

    async def delete_deployment(self, id: int) -> Dict[str, Any]:
        """
        Delete a deployment and stop its container.

        Args:
            id (int): The model ID (task ID) associated with the deployment 

        Returns:
            Dict[str, Any]: Response with status, message, and data
        """
        container_name = f"{CONTAINER_PREFIX}{id}"
        try:
            try:
                container = self.docker_client.containers.get(container_name)
                if container:
                    container.remove(force=True)
                    logger.info(
                        f"Container for model {id} removed successfully")
            except docker.errors.NotFound:
                logger.warning(
                    f"Serving container not found for model id: {id}")
        except Exception as error:
            logger.error(
                f"Failed to stop the inference node container for id: {id}, error: {str(error)}")
            self.response[
                'message'] = f"Failed to stop the inference node container, error: {str(error)}."
            return self.response

        # Delete deployment record
        try:
            # Find deployment by model_id
            filter = {"model_id": id}
            deployments = self.db.query(
                DeploymentsModel).filter_by(**filter).all()

            if not deployments:
                self.response["status"] = False
                self.response[
                    'message'] = f"Failed to find deployment entries with model id: {id}."
                return self.response

            deployment_data = jsonable_encoder(deployments)
            deployment_id = deployment_data[0]['id']

            # Delete deployment record
            try:
                result = self.db.query(DeploymentsModel).filter(
                    DeploymentsModel.id == deployment_id).delete()
                self.db.commit()

                if result == 0:
                    self.response["status"] = False
                    self.response[
                        'message'] = f"Unable to find inference node container id: {id}."
                else:
                    self.response["status"] = True
                    self.response[
                        "message"] = f"Successfully deleted inference node container id: {id}."

                self.response["data"] = result
            except Exception as db_error:
                self.db.rollback()
                logger.error(
                    f"Database error deleting deployment {id}: {db_error}")
                self.response["status"] = False
                self.response["message"] = "Failed to delete deployment record"

            return self.response
        except Exception as error:
            logger.error(f"Failed to delete deployment {id}: {error}")
            self.response["status"] = False
            self.response["data"] = None
            self.response["message"] = str(error)
            return self.response

    async def check_deployment(self, id: int) -> Dict[str, Any]:
        """
        Check the status of a deployment and restart it if needed.

        Args:
            id (int): The model ID associated with the deployment

        Returns:
            Dict[str, Any]: Response with status and message
        """
        container_name = f"{CONTAINER_PREFIX}{id}"

        try:
            # Check if container exists
            if self._verify_container_existed(container_name):
                # Check if container is running
                if not self._verify_container_running(container_name):
                    # Restart container if not running
                    try:
                        self._restart_container(id)
                        self.response['status'] = True
                        self.response[
                            'message'] = f"Inferencing service for model id: {id} started successfully."
                    except Exception as error:
                        error_msg = f"Failed to restart the inference node container for id: {id}"
                        logger.error(f"{error_msg}: {error}")
                        self.response["status"] = False
                        self.response["message"] = error_msg
                else:
                    # Container is running
                    self.response['status'] = True
                    self.response[
                        'message'] = f"Inferencing service for model id: {id} is up and running."
            else:
                # Container does not exist
                self.response['status'] = False
                self.response[
                    'message'] = f"Inferencing service is not created for model id: {id}."

            return self.response
        except Exception as error:
            logger.error(f"Failed to check deployment {id}: {error}")
            self.response["status"] = False
            self.response["data"] = None
            self.response["message"] = str(error)
            return self.response
