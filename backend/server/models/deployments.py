# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from utils.database_client import Base

class DeploymentsModel(Base):
    __tablename__ = "deployments"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    settings = Column(JSONB)
    created_date = Column(DateTime(timezone=True), default=func.now())
    modified_date = Column(DateTime(timezone=True), onupdate=func.now())
    model_id = Column(Integer, ForeignKey('tasks.id'))

    class Config:
        orm_mode = True