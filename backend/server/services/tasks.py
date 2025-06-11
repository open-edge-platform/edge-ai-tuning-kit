# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import shutil
import logging
from fastapi import Request

from routes.utils import get_db
from models.tasks import TasksModel, RunningTaskModel, TasksStatus
from utils.common import validate_model_filter

logger = logging.getLogger(__name__)
PROJECT_PATH = "./data/tasks"


def task_helper(task: TasksModel):
    return {
        "id": task.id,
        "configs": task.configs,
        "created_date": task.created_date,
        "deployment": task.deployment,
        "download_progress": task.download_progress,
        "download_status": task.download_status,
        "modified_date": task.modified_date,
        "inference_configs": task.inference_configs,
        "project_id": task.project_id,
        "results": task.results,
        "celery_task_id": task.celery_task_id,
        "status": task.status,
        "type": task.type,
    }


class TaskService:
    def __init__(self, request: Request) -> None:
        self.db = get_db(request)
        self.request = request

    async def get_all_tasks(self, filter={}):
        results = []

        query = self.db.query(TasksModel)
        if filter:
            filter_result = validate_model_filter(TasksModel, filter)
            if not filter_result["status"]:
                return filter_result
            query = query.filter_by(**filter)
        tasks = query.all()
        for task in tasks:
            results.append(task_helper(task))

        return results

    async def get_task(self, id: int):
        result = self.db.query(TasksModel).filter(TasksModel.id == id).first()
        if not result:
            return None

        return result

    async def get_task_id(self, celery_task_id: str):
        result = self.db.query(TasksModel).filter(
            TasksModel.celery_task_id == celery_task_id).first()
        return result

    async def update_task(self, id: int, data: dict):
        try:
            task = await self.get_task(id)
            if not task:
                return {
                    'status': False,
                    'data': None,
                    'message': "No Task Found with given id"
                }
            if task.results and "results" in data:
                data["results"] = {**task.results, **data["results"]}

            try:
                result = self.db.query(TasksModel).filter(
                    TasksModel.id == id).update(data)
                self.db.commit()
            except:
                self.db.rollback()
                return {
                    'status': False,
                    'data': None,
                    'message': "Fail to update task"
                }
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

    async def create_task(self, data: dict):
        try:
            # Initialize the task in database
            new_task = TasksModel(
                type=str(data['type']).upper(),
                status=str(data['status']).upper(),
                configs=data['configs'],
                inference_configs=data['inference_configs'],
                results=data['results'],
                project_id=data['project_id']
            )
            try:
                self.db.add(new_task)
                self.db.commit()
            except:
                self.db.rollback()
                return {
                    'status': False,
                    'data': None,
                    'message': "Fail to create task"
                }
            self.db.refresh(new_task)
            return {
                'status': True,
                'data': new_task.id
            }
        except Exception as error:
            return {
                'status': False,
                'data': None,
                'message': error
            }

    async def delete_task(self, id):
        tasks = self.db.query(TasksModel).filter(
            TasksModel.id == id).all()

        for task in tasks:
            self.db.delete(task)

        if os.path.isdir(f"{PROJECT_PATH}/{id}"):
            logger.debug(f"Removing the model folder for id: {id}")
            shutil.rmtree(f"{PROJECT_PATH}/{id}")
        try:
            self.db.commit()
        except:
            self.db.rollback()
            return {
                'status': False,
                'data': None,
                'message': "Fail to delete task"
            }
        return {
            'status': True,
            'data': tasks
        }
