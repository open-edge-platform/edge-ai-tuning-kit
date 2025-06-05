# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

from typing import Annotated
from typing_extensions import TypedDict

from fastapi import APIRouter, Depends, Path
from utils.common import ID_MAX
from services.llm import LLMService


class ICreateModel(TypedDict):
    model_id: str
    model_revision: str
    model_description: str
    model_type: str


router = APIRouter(prefix="/v1/models",
                   responses={404: {"description": "Unable to find routes for models"}})


@router.get("", status_code=200)
async def get_all_llm_models(service: Annotated[LLMService, Depends()]):
    result = await service.get_all_llm_models()
    return result


@router.get("/{id}", status_code=200)
async def get_llm_model(service: Annotated[LLMService, Depends()],id: int = Path(..., gt=0, le=ID_MAX)):
    result = await service.get_model(id)
    return result


@router.post("", status_code=200)
async def create_llm_model(service: Annotated[LLMService, Depends()], model: ICreateModel):
    result = await service.create_model(dict(model))
    return result


@router.post("/download/{id}", status_code=200)
async def download_llm_model(service: Annotated[LLMService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
    result = await service.download_model(id)
    return result

@router.post("/stop_download/{id}", status_code=200)
async def download_llm_model(service: Annotated[LLMService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
    result = await service.stop_download_model(id)
    return result

@router.patch("/{id}", status_code=200)
async def update_llm_model(service: Annotated[LLMService, Depends()],  data: dict, id: int = Path(..., gt=0, le=ID_MAX)):
    result = await service.update_model(id, data)
    return result


@router.delete("/{id}", status_code=200)
async def delete_llm_model(service: Annotated[LLMService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
    result = await service.delete_model(id)
    return result
