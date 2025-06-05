# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import json
import docker
import psutil
from psutil._common import bytes2human
from typing import Annotated

from loguru import logger

from fastapi import Request
from fastapi.encoders import jsonable_encoder

from routes.utils import get_db
from models.deployments import DeploymentsModel
from utils.common import validate_model_filter
from services.tasks import RunningTaskService

class DeploymentService:
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
                if container_name in container.name:
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
    
    def _restart_container(self, id):
        try:
            container = self.docker_client.containers.get(
                f"edge-ai-tuning-kit.backend.serving-{id}")
            if container:
                container.restart()
            else:
                logger.warning(
                    f"Serving container not found for model id: {id}")
                pass
        except Exception as error:
            logger.error(
                f"Failed to stop the inference node container for id: {id}, error: {error}")
            raise
        
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

    def _verify_available_ram(self):
        try:
            min_training_ram = 50 #GB
            min_deployment_ram = 6 #GB
            self.totalRAM = min_deployment_ram + min_training_ram
            memory = psutil.virtual_memory()

            logger.info(f"Current available memory: {bytes2human(memory.available)}")
    
            if memory.available < (self.totalRAM * 1024**3):
                logger.error(
                f"Requires atleast {self.totalRAM} GB of availble server RAM"
                )
                return False

            else:
                return True

        except Exception as error:
            logger.error(
                f"Failed to verify for available RAM. Error: {error}"
            )
            return False
    
    def _verify_host_port(self, host_port):
        try:
            deployments = self.db.query(DeploymentsModel)

            #check if chosen port is already in use
            for deployment in deployments:
                if int(host_port) == int(deployment.settings['host_port']):
                    error = f"Current port {host_port} is being used. Please use another port number."
                    self.response["message"] = error
                    logger.error(error)
                    return False

            #check if chosen port is in range
            if int(host_port) < 1024 or int(host_port) > 65535:
                error = f"Current port {host_port} is not in range 1024 to 65535. Please use another port number."
                self.response["message"] = error
                logger.error(error)
                return False                
                
            return True
        
        except Exception as e:
            logger.error(
                f"Failed to verify host port. Error: {e}"
            )
            return False
        
    async def get_all_deployments(self, filter={}):
        results = []
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

    async def get_deployment(self, id: int):
        result = self.db.query(DeploymentsModel).filter(
            DeploymentsModel.id == id).first()
        if not result:
            return None

        return result

    async def create_deployment(self, data: dict):
        try:
            if data['device'] == "xpu":
                # Check if there is a training task in progress
                response = await self.running_task_service.get_running_task()
                _response = jsonable_encoder(response)
                if _response['status'] in ['STARTED', 'RETRY', 'PENDING']:
                    self.response['status'] = False
                    self.response['message'] = f"GPU is being used for training the model with id: {_response['id']}."
                    return self.response

            image_name = "edge-ai-tuning-kit.backend.serving"
            image_tag = os.getenv('APP_VER', 'latest')
            
            # if not self._verify_available_ram():
            #     self.response["message"] = f"Not enough RAM. Requires atleast {self.totalRAM} GB of available server RAM"
            #     return self.response
            
            if not os.path.isdir(f"./data/tasks/{data['model_id']}/models/models"):
                self.response["message"] = f"Model weight file not found for model id: {data['model_id']}"
                return self.response

            if not self._verify_image_existed(f"{image_name}:{image_tag}"):
                self.response["message"] = f"Serving service is not available. Please follow the installation guide to install the service first."
                return self.response

            if self._verify_container_existed(f"edge-ai-tuning-kit.backend.serving-{data['model_id']}"):
                if not self._verify_container_running(f"edge-ai-tuning-kit.backend.serving-{data['model_id']}"):
                    logger.info(f"Services for model id: {data['model_id']} not running. Recreating the service..")
                    await self.delete_deployment(data['model_id'])
                
                else:
                    self.response["message"] = f"Services for model id: {data['model_id']} already running."
                    return self.response
                
            if not self._verify_host_port(data['host_port']):
                return self.response
            
            try:
                logger.info(f"Starting inferencing service for model id: {data['model_id']}")
                if data['device'] == "xpu":
                    environment = {
                        'VLLM_OPENVINO_KVCACHE_SPACE': '0',
                        'VLLM_OPENVINO_DEVICE': 'GPU'
                    }
                else:
                    # use CPU
                    environment = {
                        'VLLM_OPENVINO_KVCACHE_SPACE': '0',
                        'VLLM_OPENVINO_DEVICE': 'CPU'
                    }
                
                ov_model_path = f"/llm-data/tasks/{data['model_id']}/models/ov_models"
                environment.update({
                    'DEFAULT_MODEL_ID': f"/llm-data/tasks/{data['model_id']}/models/models",
                    'MODEL_PATH': ov_model_path,
                    'SERVED_MODEL_NAME': ov_model_path,
                    'TASK': 'text-generation-with-past',
                    'MODEL_PRECISION': 'int4'
                })

                self.docker_client.containers.run(
                    image=f"{image_name}:{image_tag}",
                    name=f"edge-ai-tuning-kit.backend.serving-{data['model_id']}",
                    hostname=f"serving-node-{data['model_id']}",
                    environment=environment,
                    privileged=True,
                    shm_size="16G",
                    network="edge-ai-tuning-kit-network",
                    ports={
                        8000: f"{data['host_port']}/tcp"
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
                    f"Exception when starting inferencing service for model id: {data['model_id']}, error: {error}")
                self.response["message"] = error
                return self.response

            # Create record in database
            new_deployment = DeploymentsModel(
                model_id=data['model_id'],
                settings={
                    "host_address": data['host_address'],
                    "host_port": data['host_port'],
                    "device": data['device'],
                    "isEncryption": data['isEncryption']
                }
            )
            try:
                self.db.add(new_deployment)
                self.db.commit()
            except:
                self.db.rollback()
                return {
                    'status': False,
                    'data': None,
                    'message': "Fail to create deployment"
                }
            self.db.refresh(new_deployment)
            self.response["status"] = True
            self.response["data"] = new_deployment.id
            self.response['message'] = f"Inferencing service for model id: {data['model_id']} started successfully."
            return self.response
        except Exception as error:
            self.response["status"] = False
            self.response["data"] = None
            self.response["message"] = error
            return self.response

    async def update_deployment(self, id: int, data: dict):
        try:
            try:
                result = self.db.query(DeploymentsModel).filter(
                    DeploymentsModel.id == id).update(data)
                self.db.commit()
            except:
                self.db.rollback()
                return {
                    'status': False,
                    'data': None,
                    'message': "Fail to update deployment"
                }
            self.response["status"] = True
            self.response["data"] = result
            return self.response
        except Exception as error:
            self.response["status"] = False
            self.response["data"] = None
            self.response["message"] = error
            return self.response

    async def delete_deployment(self, id: int):
        try:
            try:
                container = self.docker_client.containers.get(
                    f"edge-ai-tuning-kit.backend.serving-{id}")
            except:
                container = None

            if container:
                container.remove(force=True)
            else:
                logger.warning(
                    f"Serving container not found for model id: {id}")
                pass
        except Exception as error:
            logger.error(
                f"Failed to stop the inference node container for id: {id}, error: {str(error)}")
            self.response[
                'message'] = f"Failed to stop the inference node container, error: {str(error)}."
            return self.response

        try:
            filter = {"model_id": id}
            deployment = self.db.query(
                DeploymentsModel).filter_by(**filter).all()
            deployment_data = jsonable_encoder(deployment)

            if len(deployment_data) == 0:
                self.response["status"] = False
                self.response[
                    'message'] = f"Failed to found deployment entries with model id: {id}."
                return self.response

            try:
                result = self.db.query(DeploymentsModel).filter(
                    DeploymentsModel.id == deployment_data[0]['id']).delete()
                self.db.commit()
            except:
                self.db.rollback()
                return {
                    'status': False,
                    'data': None,
                    'message': "Fail to delete deployment"
                }
            if result == 0:
                self.response["status"] = False
                self.response[
                    'message'] = f"Unable to find inference node container id: {id}."
                self.response["data"] = result
            else:
                self.response["status"] = True
                self.response[
                    'message'] = f"Successfully delete inference node container id: {id}."
                self.response["data"] = result
            return self.response
        except Exception as error:
            self.response["status"] = False
            self.response["data"] = None
            self.response["message"] = str(error)
            return self.response

    
    async def check_deployment(self, id):
        try:
            if self._verify_container_existed(f"edge-ai-tuning-kit.backend.serving-{id}"):
                if not self._verify_container_running(f"edge-ai-tuning-kit.backend.serving-{id}"):
                    try:
                        self._restart_container(id)
                        self.response['status'] = True
                        self.response['message'] = f"Inferencing service for model id: {id} started successfully."
                        return self.response
                    except:
                        error = f"Failed to restart the inference node container for id: {id}"
                        logger.error(error)
                        self.response["message"] = error
                        return self.response
                else:
                    self.response['status'] = True
                    self.response['message'] = f"Inferencing service for model id: {id} is up and running."
                    return self.response
            else:
                self.response['status'] = False
                self.response['message'] = f"Inferencing service is not created."
                return self.response
            
        except Exception as error:
            self.response["status"] = False
            self.response["data"] = None
            self.response["message"] = error
            return self.response

    
