#!/bin/bash
# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

WORKDIR=$PWD

echo -e "Compiling the app using cython ..."

echo -e "Installing software dependencies ..."
python3 -m pip install --upgrade pip
python3 -m pip install cython

echo -e "Cleaning up the environment ..."
rm -rf "$WORKDIR"/binary/bin

echo -e "Preparing the environment ..."
mkdir -p "$WORKDIR"/binary/bin
cp -r "$WORKDIR"/clients "$WORKDIR"/binary/bin/clients
cp -r "$WORKDIR"/common "$WORKDIR"/binary/bin/common
cp -r "$WORKDIR"/dataset "$WORKDIR"/binary/bin/dataset
cp -r "$WORKDIR"/hooks "$WORKDIR"/binary/bin/hooks
cp -r "$WORKDIR"/models "$WORKDIR"/binary/bin/models
cp -r "$WORKDIR"/scripts "$WORKDIR"/binary/bin/scripts
cp -r "$WORKDIR"/trainer "$WORKDIR"/binary/bin/trainer
cp "$WORKDIR"/binary/setup.py "$WORKDIR"/binary/bin/setup.py
cp "$WORKDIR"/app.py "$WORKDIR"/binary/bin/app.py

echo -e "Compiling application ..."
cd "$WORKDIR"/binary/bin || exit
python3 setup.py build_ext --inplace

echo -e "Cleaning up build environment ..."
find . -name "*.py" -type f -delete 
find . -name "*.o" -type f -delete
find . -name "*.cpp" -type f -delete
find . -name "*.c" -type f -delete
find . -name "__pycache__" -type d -exec rm -rf {} +
rm -rf "$WORKDIR"/binary/bin/build

echo -e "Postprocess the binary bundle"
cp -r "$WORKDIR"/trainer/cli.py "$WORKDIR"/binary/bin/trainer/cli.py

echo -e "Compilation process completed ..."
