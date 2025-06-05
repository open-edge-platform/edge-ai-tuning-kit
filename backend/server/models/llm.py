# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import logging

from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from utils.database_client import Base


logger = logging.getLogger(__name__)

default_models = [
    {
        "model_id": "mistralai/Mistral-7B-Instruct-v0.3",
        "model_dir": "./data/models/hf/Mistral-7B-Instruct-v0.3",
        "description": "The Mistral-7B-Instruct-v0.3 Large Language Model (LLM) is an instruct fine-tuned version of the Mistral-7B-v0.3.",
        "is_downloaded": False,
        "model_metadata": {
            "model_type": "TEXT_GENERATION",
            "model_revision": "3990259826cbb8da3eed2afa1d015b421906a750",
            "is_custom_model": False
        },
        "download_metadata": {
            "download_task_id": None,
            "progress": -1,
            "status": "UNAVAILABLE" # "UNAVAILABLE", "PENDING", "DOWNLOADING", "SUCCESS", "FAILURE"
        }
    }
]


class LLMModel(Base):
    __tablename__ = "llm"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_id = Column(String)
    model_dir = Column(String)
    description = Column(String)
    is_downloaded = Column(Boolean)
    model_metadata = Column(JSONB)
    download_metadata = Column(JSONB)
    created_date = Column(DateTime(timezone=True), default=func.now())
    modified_date = Column(DateTime(timezone=True),
                           default=func.now(), onupdate=func.now())

    class Config:
        orm_mode = True


def inject_default_model_data(db):
    if db.query(LLMModel).first() is None:
        logger.warning("No model data available ...")
        for model in default_models:
            db.add(LLMModel(**model))
        db.commit()
        logger.info("Default model inject successfully ...")
