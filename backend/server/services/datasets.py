# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import logging
from fastapi import Request
from routes.utils import get_db
from models.datasets import DatasetsModel

logger = logging.getLogger(__name__)


class DatasetService:
    def __init__(self, request: Request) -> None:
        self.db = get_db(request)
        self.request = request

    async def get_all_datasets(self, filter={}) -> list():
        results = []
        datasets = self.db.query(DatasetsModel).filter_by(**filter).all()

        for dataset in datasets:
            results.append(dataset)

        return results

    async def get_dataset(self, id):
        result = self.db.query(DatasetsModel).filter(
            DatasetsModel.id == id).first()
        if not result:
            return None

        return result

    async def create_dataset(self, dataset: DatasetsModel):
        try:
            new_dataset = DatasetsModel(
                name=dataset['name'],
                prompt_template=dataset['prompt_template'],
                project_id=int(dataset['project_id']),
                generation_metadata=None,
                tools=dataset['tools'],
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
            self.db.refresh(new_dataset)
            return {
                'status': True,
                'data': new_dataset.id,
            }
        except Exception as error:
            return {
                'status': False,
                'data': None,
                'message': error
            }

    async def update_dataset(self, id: int, data: dict):
        try:
            try:
                result = self.db.query(DatasetsModel).filter(
                    DatasetsModel.id == id).update(data)
                self.db.commit()
            except:
                self.db.rollback()
                return {
                    'status': False,
                    'data': None,
                    'message': "Fail to update dataset"
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

    async def delete_dataset(self, id):
        try:
            logger.debug("Deleting SQL database")
            dataset = self.db.query(DatasetsModel).filter(
                DatasetsModel.id == id).first()
            try:
                self.db.delete(dataset)
                self.db.commit()
            except:
                self.db.rollback()
                return {
                    'status': False,
                    'data': None,
                    'message': "Fail to delete dataset"
                }
            return {"status": True, "message": "Dataset deleted"}
        except Exception as err:
            return {"status": False, "message": "Error deleting dataset"}
