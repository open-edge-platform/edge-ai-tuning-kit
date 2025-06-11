# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import shutil
import logging

from fastapi import Request, HTTPException

from routes.utils import get_db
from models.projects import ProjectsModel
from models.datasets import DatasetsModel
from models.tasks import TasksModel
from utils.prompt import DEFAULT_SYSTEM_MESSAGE
from services.tasks import TaskService

PROJECT_PATH = "./data/tasks"

logger = logging.getLogger(__name__)


class ProjectsService:
    def __init__(self, request: Request) -> None:
        self.db = get_db(request)
        self.request = request

    async def get_all_projects(self, filter={}) -> list():
        results = []
        projects = self.db.query(ProjectsModel).filter_by(**filter).all()

        for project in projects:
            results.append(project)

        return results

    async def get_project(self, id):
        result = self.db.query(ProjectsModel).filter(
            ProjectsModel.id == id).first()
        if not result:
            return None

        return result

    async def create_project(self, project: ProjectsModel):
        try:
            # Create project
            new_project = ProjectsModel(**project)
            try:
                self.db.add(new_project)
                self.db.commit()
            except:
                self.db.rollback()
                return {
                    'status': False,
                    'data': None,
                    'message': "Fail to create project"
                }

            if not new_project.id:
                raise RuntimeError("No id created.")

            # Create a dataset for project
            new_dataset = DatasetsModel(
                id=new_project.id,
                name=project['name'],
                prompt_template=DEFAULT_SYSTEM_MESSAGE,
                project_id=new_project.id
            )
            try:
                self.db.add(new_dataset)
                self.db.commit()
            except:
                self.db.rollback()
                return {
                    'status': False,
                    'data': None,
                    'message': "Fail to create dataset"
                }
            self.db.refresh(new_project)
            self.db.refresh(new_dataset)

            return {
                'status': True,
                'data': new_project.id
            }

        except Exception as error:
            return {
                'status': False,
                'data': None,
                'message': error
            }

    async def update_project(self, id, data):
        try:
            updated_data = {
                "name": data['name'],
                "description": data['description']
            }
            result = self.db.query(ProjectsModel).filter(
                ProjectsModel.id == id).update(updated_data)
            return {
                'status': True,
                'data': result
            }

        except Exception as error:
            return {
                'status': False,
                'data': None,
                'message': error
            }

    async def delete_project(self, id):
        try:
            logger.debug("Deleting tasks database related to the project ...")
            task_service = TaskService(self.request)
            try:
                await task_service.delete_task(id)
            except Exception as error:
                logger.warning(
                    f"Error when deleting task for id {id}: {error}")

            if os.path.isdir(f"{PROJECT_PATH}/{id}/models"):
                logger.debug(f"Removing the model folder for id: {id}")
                shutil.rmtree(f"{PROJECT_PATH}/{id}/models")
            try:
                self.db.commit()
            except:
                self.db.rollback()
                return {
                    'status': False,
                    'data': None,
                    'message': "Fail to delete models"
                }

            logger.debug(
                "Deleting datasets database related to the project ...")
            datasets = self.db.query(DatasetsModel).filter(
                DatasetsModel.project_id == id).all()
            for dataset in datasets:
                self.db.delete(dataset)
            if os.path.isdir(f"{PROJECT_PATH}/{id}/datasets"):
                logger.debug(f"Removing the dataset folder for id: {id}")
                shutil.rmtree(f"{PROJECT_PATH}/{id}/datasets")
            try:
                self.db.commit()
            except:
                self.db.rollback()
                return {
                    'status': False,
                    'data': None,
                    'message': "Fail to delete datasets"
                }

            logger.debug("Deleting project database ...")
            project = self.db.query(ProjectsModel).filter(
                ProjectsModel.id == id).first()
            if project is None:
                raise HTTPException(
                    status_code=404, detail=f"Project with id {id} not found")
            try:
                self.db.delete(project)
                self.db.commit()
            except:
                self.db.rollback()
                return {
                    'status': False,
                    'data': None,
                    'message': "Fail to delete project"
                }
            return project

        except Exception as error:
            return {
                'status': False,
                'data': None,
                'message': error
            }
