#!/bin/bash
# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

echo -e "Verifying python3 venv is installed...\n"
python3 -m venv --help > /dev/null 2>&1
if ! python3 -m venv --help > /dev/null 2>&1; then
    echo "Error: python3 venv is not installed. Run 'sudo apt-get install python3-venv' to install it."
    exit 1
fi

echo -e "Setting up the environment...\n"
if [[ -d ".venv" ]]; then
    echo "Virtual environment already exists. Skipping creation."
else
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

echo -e "Activating the virtual environment...\n"
# shellcheck disable=SC1091
source .venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install pytest pytest-html requests

echo -e "Running the API tests...\n"
export no_proxy=localhost,127.0.0.1
pytest -xv ./.github/tests/api.py --html=report.html --self-contained-html
