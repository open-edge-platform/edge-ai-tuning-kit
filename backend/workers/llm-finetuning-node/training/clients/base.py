# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

class FastAPIService():
    def __init__(self, api_url="backend", api_port=5999, tls=None) -> None:
        self.api_url = api_url
        self.api_port = api_port
        self.tls = None
