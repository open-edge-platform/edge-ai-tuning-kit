// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import axios from 'axios';

const apiClient = axios.create({
  baseURL: `/v1`,
  headers: {
    'Content-type': 'application/json',
    'Accept': 'application/json'
  },
});

export default apiClient;
