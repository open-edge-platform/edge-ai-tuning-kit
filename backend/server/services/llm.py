# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import shutil
import logging
from fastapi import Request, HTTPException

from routes.utils import get_db
from models.llm import LLMModel
from services.model_download import start_download, stop_download

logger = logging.getLogger(__name__)
EXPORT_PATH = "./data/cache/hub"
MODEL_PATH = "./data/models/hf"


def sync_model_state(db):
    """Sync model download state between disk and database on startup.
    
    If model files exist on disk but the DB says not downloaded, update the DB.
    If the DB says downloaded but files are missing on disk, correct the DB.
    This fixes the 'models stuck at 0%' issue after container restart.
    """
    models = db.query(LLMModel).all()
    for model in models:
        model_exists_on_disk = os.path.isdir(model.model_dir)
        is_downloaded = model.is_downloaded
        
        if model_exists_on_disk and not is_downloaded:
            logger.info(
                f"Model {model.model_id} exists on disk but marked as not downloaded. "
                f"Syncing state to DB..."
            )
            db.query(LLMModel).filter(LLMModel.id == model.id).update({
                "is_downloaded": True,
                "download_metadata": {
                    "download_task_id": None,
                    "status": "SUCCESS",
                    "progress": 100,
                }
            })
        elif not model_exists_on_disk and is_downloaded:
            logger.warning(
                f"Model {model.model_id} marked as downloaded but files missing on disk. "
                f"Correcting DB state..."
            )
            db.query(LLMModel).filter(LLMModel.id == model.id).update({
                "is_downloaded": False,
                "download_metadata": {
                    "download_task_id": None,
                    "status": "UNAVAILABLE",
                    "progress": -1,
                }
            })
    db.commit()


class LLMService:
    def __init__(self, request: Request) -> None:
        self.db = get_db(request)
        self.request = request

    async def get_all_llm_models(self, filter={}) -> list():
        self.db.expire_all()
        results = []
        models = self.db.query(LLMModel).filter_by(**filter).all()

        for model in models:
            results.append(model)

        return results

    async def get_model(self, id):
        self.db.expire_all()
        result = self.db.query(LLMModel).filter(LLMModel.id == id).first()
        if not result:
            return None

        return result

    async def get_model_dir(self, model_id):
        result = self.db.query(LLMModel).filter(
            LLMModel.model_id == model_id).first()
        if not result:
            return None

        return result

    async def create_model(self, model: LLMModel):
        try:
            logger.info(f"Creating model: {model}")
            if "/" in model['model_id']:
                model_name = model['model_id'].split("/")[-1]
            else:
                model_name = model['model_id']

            new_model = LLMModel(
                model_id=model['model_id'],
                model_dir=f"{MODEL_PATH}/{model_name}",
                description=model['model_description'],
                is_downloaded=False,
                model_metadata={
                    "model_type": model['model_type'],
                    "model_revision": model['model_revision'],
                    "is_custom_model": False,
                },
                download_metadata={
                    "download_task_id": None,
                    "progress": -1,
                    "status": "UNAVAILABLE"
                }
            )
            try:
                self.db.add(new_model)
                self.db.commit()
            except:
                self.db.rollback()
                return {
                    'status': False,
                    'data': None,
                    'message': "Fail to create model"
                }
            self.db.refresh(new_model)
            return {
                'status': True,
                'data': new_model.id
            }
        except Exception as error:
            return {
                'status': False,
                'data': None,
                'message': str(error)
            }

    async def update_model(self, id: int, data: dict):
        try:
            result = self.db.query(LLMModel).filter(
                LLMModel.id == id).update(data)
            self.db.commit()
            return {
                'status': True,
                'data': result
            }
        except Exception as error:
            self.db.rollback()
            return {
                'status': False,
                'data': None,
                'message': str(error)
            }

    async def download_model(self, id: int):
        try:
            model = self.db.query(LLMModel).filter(LLMModel.id == id).first()
            if model is None:
                raise HTTPException(
                    status_code=404, detail=f"Model with id: {id} not found")
            model_id = model.model_id
            model_dir = model.model_dir
            model_revision = model.model_metadata['model_revision']
            logger.info(
                f"Creating background task to download {model_id}, revision: {model_revision}")

            # Updating download status to pending
            data = {
                "download_metadata": {
                    "download_task_id": None,
                    "status": "PENDING",
                    "progress": -1,
                }
            }
            await self.update_model(id, data)

            start_download(id, model_id, model_dir, model_revision)

            return {
                "status": True,
                "message": f"{model_id} starts downloading successfully"
            }
        except Exception as error:
            return {
                'status': False,
                'message': str(error)
            }

    async def stop_download_model(self, id: int):
        try:
            model = self.db.query(LLMModel).filter(LLMModel.id == id).first()
            if model is None:
                return {
                    'status': False,
                    'message': f"Model {id} not found in database."
                }
            stop_download(id)
            data = {
                "is_downloaded": False,
                "download_metadata": {
                    "download_task_id": None,
                    "status": "FAILURE",
                    "progress": -1,
                }
            }
            await self.update_model(id, data)
            return {
                'status': True,
                'message': f"Model download for {id} stopped"
            }

        except Exception as error:
            return {
                'status': False,
                'message': str(error)
            }

    async def delete_model(self, id: int):
        try:
            model = self.db.query(LLMModel).filter(LLMModel.id == id).first()
            if model is None:
                return {
                    'status': False,
                    'message': f"Model {id} not found in database."
                }

            if os.path.exists(model.model_dir):
                logger.info(
                    "Model cache file is available. Deleting the cache files")
                shutil.rmtree(model.model_dir)

            try:
                self.db.delete(model)
                self.db.commit()
            except:
                self.db.rollback()
                return {
                    'status': False,
                    'data': None,
                    'message': "Fail to delete model"
                }
            return {
                'status': True,
                'model': model
            }
        except Exception as error:
            return {
                'status': False,
                'model': None,
                'message': str(error)
            }

    async def drop_table(self):
        try:
            logger.info(f"Deleting all model in the database")
            try:
                self.db.query(LLMModel).delete()
                self.db.commit()
            except:
                self.db.rollback()
                return {
                    'status': False,
                    'data': None,
                    'message': "Fail to delete model"
                }

            if os.path.exists(MODEL_PATH):
                logger.info(
                    "Model cache dir is available. Deleting all the model cache in the dir")
                shutil.rmtree(MODEL_PATH)

            return {
                'status': True,
                'message': "All model in the database has been removed."
            }

        except Exception as error:
            logger.error(f"Failed to drop LLM model data, error: {error}")
            return {
                'status': True,
                'message': str(error)
            }
