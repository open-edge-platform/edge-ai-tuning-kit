# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

from typing import Annotated
from typing_extensions import TypedDict

from fastapi import APIRouter, Depends, HTTPException, Path
from services.projects import ProjectsService
from services.tasks import TaskService
from services.deployments import DeploymentService
from utils.common import remove_dir, ID_MAX

router = APIRouter(
    prefix="/v1/projects",
    tags=["projects"],
    responses={404: {"description": "Unable to find routes for projects"}}
)


class ICreateProject(TypedDict):
    name: str
    description: str


class IUpdateProject(TypedDict):
    name: str
    description: str


@router.get("", status_code=200)
async def get_all_projects(service: Annotated[ProjectsService, Depends()]):
    result = await service.get_all_projects()
    return {"status": True, "data": result}


@router.get("/{id}", status_code=200)
async def get_project(service: Annotated[ProjectsService, Depends()], id: int = Path(..., gt=0)):
    result = await service.get_project(id)
    status = False
    if result:
        status = True
    return {"status": status, "data": result}


@router.post("", status_code=200)
async def create_project(service: Annotated[ProjectsService, Depends()], data: ICreateProject):
    response = await service.create_project(data)

    return response


@router.patch("/{id}", status_code=200)
async def update_project(service: Annotated[ProjectsService, Depends()], data: IUpdateProject, id: int = Path(..., gt=0, le=ID_MAX)):
    result = await service.get_project(id)
    if not result:
        raise HTTPException(
            status_code=404, detail=f"Project with id: {id} not found.")

    updated_response = await service.update_project(id, data)
    if not updated_response['status']:
        raise HTTPException(
            status_code=404, detail=f"Failed to update project with id: {id}.")

    return updated_response


@router.delete("/{id}", status_code=200)
async def delete_project(service: Annotated[ProjectsService, Depends()], taskService: Annotated[TaskService, Depends()], deploymentService: Annotated[DeploymentService, Depends()], id: int = Path(..., gt=0, le=ID_MAX)):
    tasks = await taskService.get_all_tasks({"project_id": id})
    if "status" in tasks and not tasks["status"]:
        return tasks

    if len(tasks) > 0:
        task_ids_to_remove = [data['id'] for data in tasks]
        for task_id in task_ids_to_remove:
            await deploymentService.delete_deployment(task_id)
            await taskService.delete_task(task_id)

    result = await service.delete_project(id)
    if not result:
        raise HTTPException(
            status_code=404, detail=f"Project not found. Failed to delete project with id: {id}.")

    project_dir = f"./data/projects/{id}"
    remove_dir(project_dir)

    response = {
        "status": True,
        "message": f"Project {id} deleted successfully."
    }
    return response
