# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import sys
import docker
import logging
import asyncio
import multiprocessing
from dotenv import find_dotenv, load_dotenv

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from fastapi.exceptions import HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routes import common, tasks, projects, datasets, data, llm, inference, deployments, completions
from models.tasks import create_default_running_task
from models.llm import inject_default_model_data
from models.common import inject_default_hardware_data
from utils.database_client import SessionLocal, init_db, run_migrations
from utils.docker_client import verify_serving_image_available
import traceback
from starlette.concurrency import iterate_in_threadpool
import json

load_dotenv(find_dotenv())
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("--- Initializing backend service ---")
    isImage = verify_serving_image_available()
    if not isImage:
        logger.error("Unable to find serving image. Please refer to the README.md to build the image first.")
        sys.exit(1)

    init_db()
    app.state.database = SessionLocal()
    inject_default_hardware_data(app.state.database)
    inject_default_model_data(app.state.database)
    create_default_running_task(app.state.database)
    # run_migrations()
    yield
    logger.info("--- Cleaning up before ending service ---")
    await remove_services()


async def remove_services():
    logger.info("Removing all the evaluation and serving services.")
    docker_client = docker.from_env()
    containers = docker_client.containers.list(all=True)
    tasks = []
    for container in containers:
        if "edge-ai-tuning-kit.backend.serving" in container.name:
            tasks.append(container.remove(force=True))
            logger.info(f"Services: {container.name} deleted.")
        elif "edge-ai-tuning-kit.backend.evaluation" in container.name:
            tasks.append(container.remove(force=True))
            logger.info(f"Services: {container.name} deleted.")
    await asyncio.gather(*tasks)

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.get('/healthcheck')
def get_healthcheck():
    return 'OK'

app.include_router(common.router)
app.include_router(tasks.router)
app.include_router(projects.router)
app.include_router(datasets.router)
app.include_router(data.router)
app.include_router(llm.router)
app.include_router(inference.router)
app.include_router(deployments.router)
app.include_router(completions.router)

@app.middleware("http")
async def dispatch(request: Request, call_next):
    try:
        response = await call_next(request)

        if request.url.path.startswith("/v1/"): # Ensure that it does not affect default routes such as docs
            if response.headers.get("content-type") == "application/json":
                response_body = [chunk async for chunk in response.body_iterator]
                response.body_iterator = iterate_in_threadpool(iter(response_body))
                body = json.loads(response_body[0].decode())
                if body and not "status" in body:
                    data = {"status": True, "data": body} # Assume all response that goes through are valid response
                    return JSONResponse(content=jsonable_encoder(data))
        
        return response

    except HTTPException as http_exc:
        return JSONResponse(status_code=http_exc.status_code, content={"detail": http_exc.detail})
    except:
        return JSONResponse(
            status_code=500,
            content={"status": False,"message": "An unexpected error occurred",}
        )

if __name__ == "__main__":
    multiprocessing.freeze_support()
    uvicorn.run(
        app,
        host=os.environ.get('SERVER_HOST'),
        port=int(os.environ.get('SERVER_PORT')),
        log_config=f"./logger.yaml"
    )
