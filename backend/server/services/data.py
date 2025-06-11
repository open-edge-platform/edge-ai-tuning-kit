# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import json
import uuid
import shutil
import pathlib
from typing import List
import logging

from fastapi import Request, UploadFile

from models.data import DataModel
from routes.utils import get_db
from .datasets import DatasetService
import urllib.parse
from utils.celery_app import celery_app, abort_celery_task

EXPORT_PATH = "./data/projects"
SUPPORTED_DOCUMENT_GEN_EXTENSIONS = [".pdf", ".txt"]
logger = logging.getLogger(__name__)

def has_valid_extension(filename, allowed_extensions):
    return any(filename.lower().endswith(ext) for ext in allowed_extensions)

class DataFileService:
    async def get_data_from_file(self, file_id):
        # TODO enhance this to read line by line
        file_path = f"data/{file_id}.json"
        if not os.path.exists(file_path):
            return {"error": True, "message": "File does not exist"}

        try:
            with open(file_path) as file:
                data = json.load(file)
            return {"error": False, "data": data, "file_id": file_id}
        except Exception as err:
            return {"error": True, "message": "Error loading file data"}

    async def create_datafile(self, file):
        file_id = str(uuid.uuid4())
        file_path = os.path.join("data", file_id + ".json")
        try:
            pathlib.Path("data").mkdir(parents=True, exist_ok=True)
            with open(file_path, "wb") as buf:
                shutil.copyfileobj(file.file, buf)

            return {"error": False, "file_id": file_id}
        except Exception as err:
            return {"error": True, "message": "Error creating file"}


class DataService:
    def __init__(self, request: Request) -> None:
        self.db = get_db(request)
        self.dataset_service = DatasetService(request)
        self.request = request

    def _convert_to_sharegpt_format(self, data):
        return {
            "conversations": [
                {
                    "from": "human",
                    "value": data.raw_data['user_message']
                },
                {
                    "from": "gpt",
                    "value": data.raw_data['assistant_message']
                }
            ]
        }
    
    def _convert_to_openai_format(self, data):
        return {
            "messages": [
                {
                    "role": "user",
                    "content": data.raw_data['user_message']
                },
                {
                    "role": "assistant",
                    "content": data.raw_data['assistant_message']
                }
            ]
        }

    async def get_all_data(self, page=None, pageSize=None, filter={}):
        try:
            results = []

            if page and pageSize:
                datasets = self.db.query(DataModel).filter_by(
                    **filter).order_by(DataModel.id).offset((page-1)*pageSize).limit(pageSize).all()
            else:
                datasets = self.db.query(DataModel).filter_by(
                    **filter).order_by(DataModel.id).all()

            for dataset in datasets:
                results.append(dataset)
            return results
        except Exception:
            return []

    async def get_data_count(self, filter):
        return self.db.query(DataModel).filter_by(**filter).count()

    async def export_to_json(self, dataset_id, export_path):
        data_list = await self.get_all_data(filter={"dataset_id": dataset_id})
        if len(data_list) < 1:
            return
        
        file_id = str(uuid.uuid4())
        file_path = export_path
        file_name = f"{file_id}.json"
        try:
            pathlib.Path(file_path).mkdir(parents=True, exist_ok=True)
            with open(f'{file_path}/{file_name}', "w") as buf:
                buf.write("[\n")
                for data in data_list:
                    json_data = json.dumps(data.raw_data, indent=4)
                    buf.write(json_data+",")
                buf.seek(buf.tell() - 1, 0)
                buf.write("\n]")
            return {"status": True, "data": file_name}
        except Exception as err:
            return {"status": False, "message": err}

    async def create_data(self, dataset_id, data):
        try:
            data.update({"dataset_id": dataset_id})
            new_data = DataModel(**data)
            try:
                self.db.add(new_data)
                self.db.commit()
            except:
                self.db.rollback()
                return {
                    'status': False,
                    'data': None,
                    'message': "Fail to create data"
                }

            self.db.refresh(new_data)
            return {
                'status': True,
                'data': new_data.id,
            }
        except Exception as error:
            return {
                'status': False,
                'data': None,
                'message': error
            }

    async def create_data_from_file_id(self, file_id, dataset_id):
        result = await DataFileService().get_data_from_file(file_id)
        if result["error"]:
            return result
        try:
            new_data = [DataModel(raw_data=data, dataset_id=dataset_id)
                        for data in result["data"]]
            try:
                self.db.bulk_save_objects(new_data)
                self.db.commit()
            except:
                self.db.rollback()
                return {
                    'status': False,
                    'data': None,
                    'message': "Fail to create data"
                }
            # TODO: find a way to remove data file that are stale for too long
            # remove file
            file_path = f"data/{file_id}.json"
            os.remove(file_path)
            return {
                'status': True,
                'data': dataset_id,
            }
        except Exception as error:
            return {
                'status': False,
                'data': None,
                'message': error
            }

    async def save_data(self, id: int, data_list: list):
        try:
            new_data = [DataModel(raw_data=data, dataset_id=id)
                        for data in data_list]
            try:
                self.db.add_all(new_data)
                self.db.commit()
            except:
                self.db.rollback()
                return {
                    'status': False,
                    'data': None,
                    'message': "Fail to save data"
                }

            return {
                'status': True,
                'data': None
            }
        except Exception as error:
            return {
                'status': False,
                'data': None,
                'message': error
            }

    async def update_data(self, id: int, data: dict):
        try:
            try:
                result = self.db.query(DataModel).filter(
                    DataModel.id == id).update(data)
                self.db.commit()
            except:
                self.db.rollback()
                return {
                    'status': False,
                    'data': None,
                    'message': "Fail to update data"
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

    async def drop_table(self):
        self.db.query(DataModel).delete()

    async def delete_data(self, id):
        result = self.db.query(DataModel).filter(DataModel.id == id).delete()
        return result
    
    async def generate_qa(self, dataset_id: int, project_type: str, num_generations: int = 5, files: List[UploadFile] = [UploadFile(...)],):
        dataset = await self.dataset_service.get_dataset(dataset_id)
        if not dataset:
            return {"status": False, "message": f"No dataset found with given dataset_id"}
        
        if dataset.generation_metadata is not None:
            return {"status": False, "message": f"There is already an ongoing dataset generation task."}

        file_names = []
        for file in files:
            try:
                filename = urllib.parse.unquote(file.filename)
                if not has_valid_extension(filename, SUPPORTED_DOCUMENT_GEN_EXTENSIONS):
                    return {"status": False, "message": f"Only support following file types: {SUPPORTED_DOCUMENT_GEN_EXTENSIONS}"}
            except:
                return {"status":False, "error": f"Invalid file: {file.filename}"}
            
        dataset_dir = f"{EXPORT_PATH}/{dataset_id}/data-generation/documents"
        if not os.path.isdir(dataset_dir):
            os.makedirs(dataset_dir, exist_ok=True)
        
        for file in files:
            filename = urllib.parse.unquote(file.filename)
            file_names.append(filename)
            with open(f"{dataset_dir}/{filename}", "wb") as f:
                f.write(file.file.read())

        if len(file_names) <1:
            return {
                'status': False,
                'data': None,
                'message': f'No files to perform data generation'
            }

        celery_task_id = celery_app.send_task(
            name="dataset_node:data_generation",
            args=[
                dataset_id, 
                str(file_names), 
                num_generations
            ],
            queue="dataset_queue"
        )

        formatted_dataset = {
            "name": dataset.name,
            "project_id": dataset.project_id,
            "prompt_template": dataset.prompt_template,
            "generation_metadata": {
                "total_page": 0,
                "current_page": 0,
                "total_files": 0,
                "processed_files": 0,
                "status": 'Waiting for task to start.',
                "isCancel": False,
                "celery_task_id": str(celery_task_id),
            },
        }

        update_dataset_result = await self.dataset_service.update_dataset(dataset_id, formatted_dataset)
        message = "Dataset generation task created successfully"
        if (not update_dataset_result['status']):
            message = f"{message}; Warning: Failed to update dataset."

        result = {
            "status": True,
            "message": message
        }

        return result
    
    async def generate_document_qa(self, dataset_id: int, source_filename: str, project_type: str, num_generations: int = 5):
        dataset = await self.dataset_service.get_dataset(dataset_id)
        if not dataset:
            return {"status": False, "message": f"No dataset found with given dataset_id"}
        
        if dataset.generation_metadata is not None:
            return {"status": False, "message": f"There is already an ongoing dataset generation task."}

        celery_task_id = celery_app.send_task(
            name="dataset_node:document_data_generation",
            args=[
                dataset_id, 
                source_filename,
                num_generations
            ],
            queue="dataset_queue"
        )

        formatted_dataset = {
            "name": dataset.name,
            "project_id": dataset.project_id,
            "prompt_template": dataset.prompt_template,
            "generation_metadata": {
                "total_page": 0,
                "current_page": 0,
                "total_files": 0,
                "processed_files": 0,
                "status": 'Waiting for task to start.',
                "isCancel": False,
                "celery_task_id": str(celery_task_id),
            },
        }

        update_dataset_result = await self.dataset_service.update_dataset(dataset_id, formatted_dataset)
        message = "Dataset generation task created successfully"
        if (not update_dataset_result['status']):
            message = f"{message}; Warning: Failed to update dataset."

        result = {
            "status": True,
            "message": message
        }
        
        return result
    
    async def stop_data_generation(self, dataset_id: int):
        try:
            dataset = await self.dataset_service.get_dataset(dataset_id)
            if not dataset:
                return {
                    'status': False, 
                    'data': None,
                    'message': f'No dataset found with id given dataset_id'
                }
            
            if not dataset.generation_metadata['celery_task_id']:
                return {
                    'status': False, 
                    'data': None,
                    'message': f'Celery task id not found'
                }

            abort_celery_task(dataset.generation_metadata['celery_task_id'])
            formatted_dataset = {
                "name": dataset.name,
                "project_id": dataset.project_id,
                "prompt_template": dataset.prompt_template,
                "generation_metadata": None,
            }

            await self.dataset_service.update_dataset(dataset_id, formatted_dataset)
            
            return {
                'status': True,
                'message': f"Stopping dataset generation for dataset {dataset_id}."
            }
        except Exception as error:
            return {
                'status': False,
                'message': str(error)
            }