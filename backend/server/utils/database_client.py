# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import re
import sys
import logging
from dotenv import find_dotenv, load_dotenv

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv(find_dotenv())
logger = logging.getLogger(__name__)


def validate_db_components(user, password, host, db_name):
    """Validate database connection components for security issues."""
    # Check for basic input validation
    if not all([isinstance(param, str) for param in [user, password, host, db_name]]):
        logger.error("Database parameters must be strings")
        return False

    # Host validation - only allow alphanumeric chars, dots, and hyphens for hostnames
    # Or IPv4/IPv6 addresses
    if not re.match(r'^[a-zA-Z0-9.-]+$', host):
        logger.error(f"Invalid hostname format: {host}")
        return False

    # Database name validation - typically alphanumeric with underscores
    if not re.match(r'^[a-zA-Z0-9_]+$', db_name):
        logger.error(f"Invalid database name format: {db_name}")
        return False

    return True


# Get database parameters from environment with defaults
db_user = os.environ.get("POSTGRES_USER", "postgres")
db_password = os.environ.get("POSTGRES_PASSWORD", "postgres")
db_host = os.environ.get("POSTGRES_URI", "postgres")
db_name = os.environ.get("POSTGRES_DB", "postgres")

# Validate components before building the connection string
if validate_db_components(db_user, db_password, db_host, db_name):
    DATABASE_URI = f'postgresql://{db_user}:{db_password}@{db_host}/{db_name}'
    logger.info(
        f"Database connection configured to host: {db_host}, database: {db_name}")
else:
    # Fallback to a safe default or terminate
    logger.critical(
        "Invalid database parameters detected. Using safe defaults or terminating.")
    sys.exit(1)

engine = create_engine(DATABASE_URI)
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
