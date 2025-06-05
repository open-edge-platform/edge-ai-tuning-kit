# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

from celery.utils.log import get_task_logger

import ipex_llm

logger = get_task_logger(__name__)


def dummy_optimize_post(model):
    logger.warning("Skipping _optimize_post in qlora")
    return

ipex_llm.transformers.qlora._optimize_post = dummy_optimize_post
