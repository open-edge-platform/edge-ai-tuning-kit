# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

from typing import List

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, Mapped

from utils.database_client import Base


class ProjectsModel(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String)
    description = Column(String)
    created_date = Column(DateTime(timezone=True), default=func.now())
    modified_date = Column(DateTime(timezone=True), onupdate=func.now())
    tasks: Mapped[List["TasksModel"]] = relationship(
        "TasksModel",
        back_populates="project"
    )
    dataset = relationship(
        "DatasetsModel",
        uselist=False,
        backref="projects",
        cascade="all, delete"
    )

    class Config:
        orm_mode = True
