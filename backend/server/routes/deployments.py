# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

from typing import Annotated
from typing_extensions import TypedDict
from fastapi import APIRouter, Depends, Path

from services.deployments import DeploymentService
from utils.common import ID_MAX
import json

router = APIRouter(
    prefix="/v1/deployments",
    responses={404: {"description": "Unable to find routes for deployments"}}
)

class ICreateDeployment(TypedDict):
    model_id: int
    host_address: str
    host_port: int
    device: str
    isEncryption: bool

@router.get("", status_code=200)
async def get_all_deployments(service: Annotated[DeploymentService, Depends()], filter: str = ""):
    try:
        if filter:
            filter = json.loads(filter)
            if not isinstance(filter, dict):
                return {"status": False, "message": "Invalid filter"}
    except:
        return {"status": False, "message": "Invalid filter"}
        
    result = await service.get_all_deployments(filter=filter)
    return {"status": True, "data": result}

@router.get("/{id}", status_code=200)
async def get_deployment(service: Annotated[DeploymentService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
    result= await service.get_deployment(id)
    status = False
    if result:
        status = True
    return {"status": status, "data": result}

@router.get("/check_deployment/{id}", status_code=200)
async def check_deployment(service: Annotated[DeploymentService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
    return await service.check_deployment(id)

@router.post("", status_code=200)
async def start_deployment(service: Annotated[DeploymentService, Depends()], data: ICreateDeployment):
    return await service.create_deployment(data)

@router.delete("/{id}", status_code=200)
async def stop_deployment(service: Annotated[DeploymentService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
    return await service.delete_deployment(id)
