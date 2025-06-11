# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import logging
import urllib.parse
from typing import Annotated, Optional, List, Union
from typing_extensions import TypedDict

from fastapi import APIRouter, UploadFile, Depends, HTTPException, Path, Query
from routes.data import DataService
from utils.celery_app import celery_app
from utils.common import ID_MAX
from services.datasets import DatasetService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/datasets",
                   responses={404: {"description": "Unable to find routes for datasets"}})
ALLOWED_EXTENSIONS = ['.pdf', '.txt']


class ICreateDataset(TypedDict):
    name: str
    prompt_template: str
    project_id: str
    tools: Union[list, None] = None


@router.get("", status_code=200)
async def get_all_datasets(service: Annotated[DatasetService, Depends()]):
    result = await service.get_all_datasets()
    status = False
    if result:
        status = True
    return {"status": status, "data": result}


@router.get("/{id}", status_code=200)
async def get_dataset(service: Annotated[DatasetService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
    result = await service.get_dataset(id)
    status = False
    if result:
        status = True
    return {"status": status, "data": result}


@router.get("/{id}/generation_metadata", status_code=200)
async def get_dataset_generation_metadata(service: Annotated[DatasetService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
    dataset = await service.get_dataset(id)
    result = None
    if dataset:
        result = dataset.generation_metadata

    return {"status": True, "data": result}


@router.get("/{id}/data", status_code=200)
async def get_dataset_data(data_service: Annotated[DataService, Depends()], id: int = Path(..., gt=0, le=ID_MAX), page: Optional[int] = Query(None, gt=0, le=ID_MAX), pageSize: Optional[int] = Query(None, gt=0)):
    data = await data_service.get_all_data(page, pageSize, {"dataset_id": id})
    return {"status": True, "data": data}


@router.get("/{id}/data/count", status_code=200)
async def get_dataset_data(data_service: Annotated[DataService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
    count = await data_service.get_data_count({"dataset_id": id})
    return {"status": True, "data": count}


@router.get("/{id}/data/acknowledge_count", status_code=200)
async def get_acknowledge_dataset_data(data_service: Annotated[DataService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
    count = await data_service.get_data_count({
        "isGenerated": False,
        "dataset_id": id
    })
    return {"status": True, "data": count}


@router.get("/{id}/text_embedding", status_code=200)
async def get_text_embedding(id: int = Path(..., gt=0, le=ID_MAX), page: Optional[int] = Query(None, gt=0, le=ID_MAX), pageSize: Optional[int] = Query(None, gt=0, le=ID_MAX), source: Optional[str] = None):
    if source:
        if not any(source.endswith(ext) for ext in ALLOWED_EXTENSIONS):
            raise HTTPException(
                status_code=400, detail="The source parameter must be a pdf or txt file.")

    try:
        result = celery_app.send_task(
            name="document_node:get_text_embeddings",
            args=[id, page, pageSize, source],
            queue="document_queue"
        )
        data = result.get()
        return {"status": True, "data": data}
    except FileNotFoundError:
        result = {"status": True, "data": {
            "num_embeddings": 0,
            "sources": None,
            "doc_chunks": []
        }}
        return result
    except Exception as error:
        raise HTTPException(
            500, f"Error when getting document collections. Error: {error}")


@router.get("/{id}/text_embedding_sources", status_code=200)
async def get_text_embedding_sources(id: int = Path(..., gt=0, le=ID_MAX)):
    try:
        logger.info("Starting")
        result = celery_app.send_task(
            name="document_node:get_text_embeddings_source",
            args=[id],
            queue="document_queue"
        )
        logger.info(f"Sent task: {result}")
        
        data = result.get()
        logger.info("Got result")
        result = {"status": True, "data": data}
        return result
    except FileNotFoundError:
        result = {"status": True, "data": []}
        return result
    except Exception as error:
        raise HTTPException(
            500, f"Error when getting document source collections. Error: {error}")


@router.post("", status_code=200)
async def create_dataset(service: Annotated[DatasetService, Depends()], dataset: ICreateDataset):
    return await service.create_dataset(dataset)


@router.post("/{id}/text_embedding", status_code=200)
async def create_text_embedding(chunk_size: int, chunk_overlap: int, id: int = Path(..., gt=0, le=ID_MAX),  files: List[UploadFile] = [UploadFile(...)]):
    DATASET_PATH = f"./data/projects/{id}/chroma/documents"
    file_list = []
    processed_list = []
    for file in files:
        try:
            filename = urllib.parse.unquote(file.filename)
            if not file.filename.endswith(tuple(ALLOWED_EXTENSIONS)):
                logger.warning(f"{filename} is not the supported type.")
                continue
            else:
                file_list.append(file)

        except:
            logger.warning(f"{file.filename} is not a valid file")

    if len(file_list) == 0:
        logger.error("No file is able to use to create text embeddings.")
        raise HTTPException(
            status_code=400, detail="No file is able to use to create text embeddings.")

    if not os.path.isdir(DATASET_PATH):
        os.makedirs(DATASET_PATH, exist_ok=True)
    for file in file_list:
        filename = urllib.parse.unquote(file.filename)
        with open(f"{DATASET_PATH}/{filename}", "wb") as f:
            processed_list.append(filename)
            f.write(file.file.read())

    logger.info("Sending background task for creating text embeddings")
    celery_app.send_task(
        name="document_node:create_text_embeddings",
        args=[
            id,
            str(processed_list),
            int(chunk_size),
            int(chunk_overlap)
        ],
        queue="document_queue"
    )
    result = {"status": True, "data": processed_list}
    return result


@router.post("/{id}/data", status_code=200)
async def create_dataset_data(data_service: Annotated[DataService, Depends()], data: dict, id: int = Path(..., gt=0, le=ID_MAX)):
    result = await data_service.create_data(id, data)
    return result


@router.patch("/{id}", status_code=200)
async def update_dataset(service: Annotated[DatasetService, Depends()], data: dict, id: int = Path(..., gt=0, le=ID_MAX)):
    result = await service.update_dataset(id, data)
    return result


@router.delete("/{id}", status_code=200)
async def delete_dataset(service: Annotated[DatasetService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
    result = celery_app.send_task(
        name="document_node:delete_text_embedding_disk",
        args=[id],
        queue="document_queue"
    )
    result = await service.delete_dataset(id)
    return result


@router.delete("/{id}/text_embeddings/{uuid}", status_code=200)
async def delete_text_embedding_by_uuid(uuid: str, id: int = Path(..., gt=0, le=ID_MAX)):
    try:
        result = celery_app.send_task(
            name="document_node:delete_text_embedding",
            args=[
                id,
                uuid
            ],
            queue="document_queue"
        )
        isDeleted = result.get()
        if not isDeleted:
            raise HTTPException(
                status_code=400, detail=f"Failed to get text embeddings for {uuid}.")
        return {"status": True, "data": uuid}

    except Exception as error:
        raise HTTPException(
            status_code=400, detail=f"Failed to delete text embeddings for {uuid}. Error: {error}.")


@router.delete("/{id}/text_embeddings/source/{source}", status_code=200)
async def delete_text_embeddings_by_source(source: str, id: int = Path(..., gt=0, le=ID_MAX)):
    source_path = f"./data/projects/{id}/chroma/documents/{source}"
    try:
        if os.path.isfile(source_path):
            logger.info(f"Removing the source file: {source_path}")
            os.remove(source_path)

        result = celery_app.send_task(
            name="document_node:delete_text_embedding_source",
            args=[
                id,
                source
            ],
            queue="document_queue"
        )
        if not result:
            raise HTTPException(
                status_code=400, detail=f"Failed to delete all text embeddings for {source}.")
        return {"status": True, "data": source}
    except Exception as error:
        raise HTTPException(
            status_code=400, detail=f"Failed to delete all text embeddings by source: {source}. Error: {error}.")
