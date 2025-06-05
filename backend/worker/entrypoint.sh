#!/bin/bash
# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

echo -e "Exporting Intel OneAPI environment"
# shellcheck source=/dev/null
source /opt/intel/oneapi/"$ONEAPI_VERSION"/oneapi-vars.sh --force

echo "Starting app ..."
exec "$@"
