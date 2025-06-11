# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 


from celery.contrib.abortable import AbortableAsyncResult


def is_aborted(task_id):
    abortable_result = AbortableAsyncResult(task_id)
    return abortable_result.is_aborted()
