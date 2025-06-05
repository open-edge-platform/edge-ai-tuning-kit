# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import enum
from typing import List

from sqlalchemy import Column, Integer, Enum, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, Mapped

from utils.database_client import Base


class ProjectType(enum.Enum):
    CHAT_MODEL = "CHAT_MODEL"
    BASE_MODEL = "BASE_MODEL"
    CUSTOM_MODEL = "CUSTOM_MODEL"


class ProjectsModel(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String)
    projectType = Column(Enum(ProjectType), default="CHAT_MODEL")
    created_date = Column(DateTime(timezone=True), default=func.now())
    modified_date = Column(DateTime(timezone=True), onupdate=func.now())
    tasks: Mapped[List["TasksModel"]] = relationship(
        "TasksModel", back_populates="project")
    dataset = relationship("DatasetsModel", uselist=False, backref="projects", cascade="all, delete")

    class Config:
        orm_mode = True
