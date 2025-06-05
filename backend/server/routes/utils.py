# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

from fastapi import Request

def get_db(request: Request):
    return request.app.state.database
