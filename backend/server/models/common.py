# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import logging
from sqlalchemy import Column, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from utils.database_client import Base

logger = logging.getLogger(__name__)

default_hardware = {
    "cpu": "",
    "gpu": []
}


class HardwareModel(Base):
    __tablename__ = "hardware"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    cpu = Column(String)
    gpu = Column(JSONB)

    class Config:
        orm_mode = True


def inject_default_hardware_data(db):
    if db.query(HardwareModel).first() is None:
        logger.info("No hardware data available ...")
        db.add(HardwareModel(**default_hardware))
        db.commit()
        logger.info("Default hardware inject successfully ...")
