# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import platform

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from services.common import HardwareService


router = APIRouter(prefix="/v1/server",
                   responses={404: {"description": "Unable to find routes"}})

# Function to retrieve system uptime
def get_system_uptime():
    try:
        uptime = os.popen('uptime -p').read().strip()
        return uptime
    except Exception as e:
        return str(e)

# Health check endpoint
@router.get("/health", status_code=200)
async def check_health():
    # Check status and return a detailed response
    system_info = {
        "message": "Service is running healthy",
        "data": {
            "platform": platform.system(),
            "platform-release": platform.release(),
            "cpu": platform.processor(),
            "uptime": get_system_uptime()
        }
    }
    return system_info

# Update hardware info
@router.patch("/info", status_code=200)
async def update_info(service: Annotated[HardwareService, Depends()], data: dict):
    try:
        if not "cpu" in data or not "gpu" in data:
            return {"status": False, "message": "Missing input"}
        return await service.update_hardware(data['cpu'], data['gpu'])
    except Exception as error:
        raise HTTPException(
            status_code=403, detail=error)


@router.get("/info", status_code=200)
async def check_info(service: Annotated[HardwareService, Depends()]):
    try:
        return await service.get_hardware()
    except Exception as error:
        raise HTTPException(
            status_code=403, detail=error)
