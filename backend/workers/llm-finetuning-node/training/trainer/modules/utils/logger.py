# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 


import logging

def setup_logger(name, log_level="info"):
    """
    Sets up a logger with a specific name, formatting, and function name tracking.
    :param name: Name of the logger, typically __name__.
    :return: Configured logger instance.
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    if log_level == "debug":
        logger.setLevel(logging.DEBUG)

    if not logger.hasHandlers():
        formatter = logging.Formatter(
            '%(asctime)s | %(funcName)s | %(levelname)s | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
    return logger