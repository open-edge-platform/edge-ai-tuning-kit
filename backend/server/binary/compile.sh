#!/bin/bash
# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

WORKDIR=$PWD

if [ -z "$1" ]; then
  echo "Please provide an argument for validity date in integer format."
  exit 1
fi

if [[ ! $1 =~ ^[0-9]+$ ]]; then
  echo "The argument is not in integer format."
  exit 1
fi

echo -e "Compiling the app using pyinstaller ..."

echo -e "Cleaning up the environment ..."
rm -rf "$WORKDIR"/binary/bin

echo -e "Preparing the environment ..."
mkdir -p "$WORKDIR"/binary/bin
cp -r "$WORKDIR"/models "$WORKDIR"/binary/bin/models
cp -r "$WORKDIR"/routes "$WORKDIR"/binary/bin/routes
cp -r "$WORKDIR"/services "$WORKDIR"/binary/bin/services
cp -r "$WORKDIR"/utils "$WORKDIR"/binary/bin/utils
cp "$WORKDIR"/main.py "$WORKDIR"/binary/bin/main.py

cd "$WORKDIR"/binary/bin || exit
if [ "$1" -eq 0 ]
then
  echo -e "Skipping license validity patching."
else
  echo -e "Configuring the license validity ..."
  datetime=$(python3 -c 'from datetime import datetime; print(datetime.now())')
  echo -e "Setting current app compilation time to: $datetime"
  sed -i "s/creation_datetime = None/creation_datetime = '$datetime'/" "$WORKDIR"/binary/bin/routes/common.py
  echo -e "Setting validity days to $1"
  sed -i "s/validity_period = None/validity_period = $1/" "$WORKDIR"/binary/bin/routes/common.py
fi

echo -e "Compiling application ..."
pyinstaller -F main.py --clean \
  --collect-all celery \
  --collect-all alembic \
  --collect-all pysqlite3 \
  --collect-all pysqlite3-binary

echo -e "Setting up the necessary files for the binary ..."
cp -r "$WORKDIR"/migrations "$WORKDIR"/binary/bin/dist/migrations
cp "$WORKDIR"/logger.yaml "$WORKDIR"/binary/bin/dist/logger.yaml
cp "$WORKDIR"/alembic.ini "$WORKDIR"/binary/bin/dist/alembic.ini

echo -e "Compilation process completed ..."
