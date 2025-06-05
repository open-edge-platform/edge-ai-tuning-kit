# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

from typing import List

from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from utils.database_client import Base

class DataModel(Base):
    __tablename__ = "data"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    raw_data = Column(JSONB)
    isGenerated = Column(Boolean, default=False)
    created_date = Column(DateTime(timezone=True), default=func.now())
    modified_date = Column(DateTime(timezone=True), onupdate=func.now())
    dataset_id = Column(Integer, ForeignKey('datasets.id', ondelete="CASCADE"))
    dataset = relationship("DatasetsModel", back_populates="data")
    
    class Config:
        orm_mode = True
