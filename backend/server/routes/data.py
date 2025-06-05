# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 


import json
from typing import Annotated, List
from typing_extensions import TypedDict

from fastapi import APIRouter, Depends, UploadFile, HTTPException, Path
from services.data import DataService
from utils.common import ID_MAX

EXPORT_PATH = "./data/projects"
SUPPORTED_DOCUMENT_GEN_EXTENSIONS = [".pdf", ".txt"]

router = APIRouter(prefix="/v1/data",
                   responses={404: {"description": "Unable to find routes for datasets"}})


def has_valid_extension(filename, allowed_extensions):
    return any(filename.lower().endswith(ext) for ext in allowed_extensions)

class ICreateDataset(TypedDict):
    name: str
    prompt_template: str


@router.get("", status_code=200)
async def get_all_data(service: Annotated[DataService, Depends()]):
    return await service.get_all_data()


@router.post("/create_from_file_id", status_code=200)
async def create_data_from_file_id(service: Annotated[DataService, Depends()], data: dict):
    if "file_id" in data and data["file_id"] and "dataset_id" in data and data["dataset_id"]:
        result = await service.create_data_from_file_id(data["file_id"], data["dataset_id"])
    else:
        result = {"status": False, "message": "Missing data"}
    return result


@router.post("/upload_file/{id}", status_code=200)
async def upload_data_from_file(service: Annotated[DataService, Depends()], id: int = Path(..., gt=0, le=ID_MAX), files: List[UploadFile] = [UploadFile(...)]):
    data_list = []
    for file in files:
        if not file or not file.filename:
            return {"status": False, "message": "Invalid File"}
        if not file.filename.endswith('.json'):
            return {"status": False, "message": "Uploaded file must be a json"}
        contents = await file.read()
        json_data = json.loads(contents)
        for data in json_data:
            data_list.append(data)

    response = await service.save_data(id, data_list)
    return response


@router.post("/generate_qa", status_code=200)
async def generate_qa_from_pdf(service: Annotated[DataService, Depends()], dataset_id: int, project_type: str, num_generations: int = 5, files: List[UploadFile] = [UploadFile(...)]):
    return await service.generate_qa(dataset_id, project_type, num_generations, files)

@router.post("/generate_document_qa", status_code=200)
async def generate_qa_from_pdf(service: Annotated[DataService, Depends()], dataset_id: int, source_filename: str, project_type: str, num_generations: int = 5):
    return await service.generate_document_qa(dataset_id, source_filename, project_type, num_generations)

@router.post("/stop_data_generation/{id}", status_code=200)
async def stop_data_generation(service: Annotated[DataService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
    result = await service.stop_data_generation(id)
    return result

@router.patch("/{id}", status_code=200)
async def edit_raw_data(service: Annotated[DataService, Depends()], data: dict, id: int = Path(..., gt=0, le=ID_MAX)):
    result = {
        'status': False,
        'data': None,
        'message': "No Data Found"
    }
    if "raw_data" in data:
        result = await service.update_data(id, data)
    elif "isGenerated" in data:
        result = await service.update_data(id, data)

    return result


@router.delete("/delete_all", status_code=200)
async def delete_all_data(service: Annotated[DataService, Depends()]):
    await service.drop_table()


@router.delete("/{id}", status_code=200)
async def delete_data(service: Annotated[DataService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
    result = await service.delete_data(id)
    if result == 0:
        raise HTTPException(
            status_code=404, detail=f"dataset not found. Failed to delete dataset with id: {id}.")
    elif result == 1:
        response = {
            "status": True,
            "message": f"dataset {id} deleted successfully."
        }
        return response
    elif result == 2:
        response = {
            "status": False,
            "message": f"Failed to delete dataset, error while deleting in chromaDB."
        }
        return response
    else:
        raise HTTPException(
            status_code=404, detail=f"Unknown error while deleting dataset with id: {id}.")
