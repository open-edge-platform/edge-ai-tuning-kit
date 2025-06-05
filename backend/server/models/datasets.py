# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

from typing import List

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, Mapped
from sqlalchemy.dialects.postgresql import JSONB

from utils.database_client import Base

class DatasetsModel(Base):
    __tablename__ = "datasets"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String)
    prompt_template = Column(String)
    generation_metadata = Column(JSONB)
    created_date = Column(DateTime(timezone=True), default=func.now())
    modified_date = Column(DateTime(timezone=True), onupdate=func.now())
    data : Mapped[List["DataModel"]] = relationship("DataModel", back_populates="dataset", cascade="all, delete")
    tools = Column(JSONB)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete="CASCADE"))

    class Config:
        orm_mode = True
