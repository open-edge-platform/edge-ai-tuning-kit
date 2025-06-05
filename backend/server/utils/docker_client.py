# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import logging

import docker
from docker.errors import NotFound

logger = logging.getLogger(__name__)


def verify_serving_image_available():
    image_name = "edge-ai-tuning-kit.backend.serving"
    image_tag = os.getenv('APP_VER', 'latest')
    tag = f"{image_name}:{image_tag}"

    logger.info(f"Verifying if {tag} image available.")
    client = DockerClient()
    isImage = client.verify_image_exist(tag)
    if isImage:
        return True
    else:
        return False


class DockerClient:
    def __init__(self):
        self.docker_client = docker.from_env()

    def build_image(self, context, dockerfile, tag, buildargs):
        try:
            image, logs = self.docker_client.images.build(
                path=context,
                dockerfile=dockerfile,
                tag=tag,
                buildargs=buildargs,
                rm=True,  # Removing the build container image
            )
            return image
        except Exception as error:
            logger.error(f"Failed to build {tag} image: {error}")
            return None

    def verify_image_exist(self, image_name):
        try:
            self.docker_client.images.get(image_name)
            return True
        except NotFound:
            logger.error(f"Unable to find {image_name} in registry.")
            return False
        except Exception as error:
            logger.error(
                f"Failed to verify {image_name} image existence: {error}.")
            return False

    def remove_all_running_evaluation_container(self):
        containers = self.docker_client.containers.list(all=True)
        running_containers = [container.name for container in containers if "edge-ai-tuning-kit.backend.evaluation" in container.name]
        if len(running_containers) > 0:
            logger.info("Removing the evaluation container to ensure enough RAM for training ...")
            for container in running_containers:
                _container = self.docker_client.containers.get(container)
                _container.remove(force=True)
