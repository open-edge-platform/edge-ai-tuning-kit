# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import enum
import logging

from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from utils.database_client import Base

logger = logging.getLogger(__name__)


class TasksType(enum.Enum):
    QLORA = "QLORA"
    LORA = "LORA"


class TasksStatus(enum.Enum):
    PENDING = "PENDING"
    STARTED = "STARTED"
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    RETRY = "RETRY"
    REVOKED = "REVOKED"

class DownloadStatus(enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    STARTED = "STARTED"
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"


class TasksModel(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    type = Column(Enum(TasksType), default="QLORA")
    status = Column(Enum(TasksStatus))
    configs = Column(JSONB)
    inference_configs = Column(JSONB)
    results = Column(JSONB)
    created_date = Column(DateTime(timezone=True), default=func.now())
    modified_date = Column(DateTime(timezone=True), onupdate=func.now())
    celery_task_id = Column(String)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete="CASCADE"))
    project = relationship("ProjectsModel", back_populates="tasks")
    deployment = relationship(
        "DeploymentsModel", uselist=False, backref="tasks")
    download_status = Column(Enum(DownloadStatus), default="NOT_STARTED")
    download_progress = Column(Integer, default=0)

    class Config:
        orm_mode = True


class RunningTaskModel(Base):
    __tablename__ = "running_task"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(Integer)
    celery_task_id = Column(String)
    created_date = Column(DateTime(timezone=True), default=func.now())
    modified_date = Column(DateTime(timezone=True),
                           default=func.now(), onupdate=func.now())

    class Config:
        orm_mode = True


default_running_tasks = {
    'celery_task_id':  "",
    'task_id': 0
}


def create_default_running_task(db):
    if db.query(RunningTaskModel).first() is None:
        logger.info("Initializing default trainer task.")
        db.add(RunningTaskModel(**default_running_tasks))
        db.commit()
    else:
        logger.info("Default trainer task available.")
