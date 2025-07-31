# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

import os
import logging

from sqlalchemy import create_engine
from sqlalchemy.engine.url import URL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)


db_user = os.environ.get("POSTGRES_USER", "postgres")
db_password = os.environ.get("POSTGRES_PASSWORD", "postgres")
db_host = os.environ.get("POSTGRES_URI", "postgres")
db_name = os.environ.get("POSTGRES_DB", "postgres")
db_url = URL.create(
    drivername="postgresql",
    username=db_user,
    password=db_password,
    host=db_host,
    database=db_name,
)
engine = create_engine(db_url)
with engine.connect() as connection:
    logger.info("Database connection established successfully.")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    logger.info("Initializing Database ...")
    Base.metadata.create_all(bind=engine)


def run_migrations():
    logger.info("Running database migration ...")
    try:
        from alembic.config import Config
        from alembic import command

        alembic_cfg = Config("alembic.ini")
        section = alembic_cfg.config_ini_section
        alembic_cfg.set_section_option(
            section, "POSTGRES_USER", os.environ.get("POSTGRES_USER"))
        alembic_cfg.set_section_option(
            section, "POSTGRES_PASSWORD", os.environ.get("POSTGRES_PASSWORD"))
        alembic_cfg.set_section_option(
            section, "POSTGRES_URI", os.environ.get("POSTGRES_URI"))
        alembic_cfg.set_section_option(
            section, "POSTGRES_DB", os.environ.get("POSTGRES_DB"))
        command.upgrade(alembic_cfg, "head")

    except Exception as e:
        logger.error(f"Error: {e}")
