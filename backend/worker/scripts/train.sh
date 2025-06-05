#!/bin/bash
# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

CONFIG_PATH=$1
NUM_GPUS=$2
LOG_PATH=$3
RESUME_TRAINING=$4
GENERATE_SYNTHETIC=$5
# CONVERT_OV=1

NUM_CPU=$(lscpu | grep "^CPU(s):" | awk '{print $2}')

count_gpu_devices() {
    local search_patterns=(
        "Intel(R) Level-Zero, Intel(R) Arc(TM) A770 Graphics 1.3"
        "Intel(R) Level-Zero, Intel(R) Arc(TM) A770M Graphics 1.3"
        "Intel(R) Level-Zero, Intel(R) Data Center GPU Flex 170 1.3"
    )
    local count=0
    # Loop through each line of sycl-ls command output
    while IFS= read -r line; do
        for pattern in "${search_patterns[@]}"; do
            if [[ "$line" == *"$pattern"* ]]; then
                ((count++))
                break  # Exit the inner loop if a match is found
            fi
        done
    done < <(sycl-ls)
    # Return the count
    echo "$count"
}

if [ -z "$1" ]; then
    echo -e "Config path is not provided. Please set it first."
    echo -e "Example: ./scripts/train.sh <config_path> <num_gpus> <log_path> <resume_from_checkpoint> <generate_synthetic>"
    exit 1
fi

if [ -z "$2" ]; then
    echo -e "Number of GPU is not provided. Please set it first."
    echo -e "Example: ./scripts/train.sh <config_path> <num_gpus> <log_path> <resume_from_checkpoint> <generate_synthetic>"
    exit 1
fi

if [ -z "$3" ]; then
    echo -e "Log path is not provided. Please set it first."
    echo -e "Example: ./scripts/train.sh <config_path> <num_gpus> <log_path> <resume_from_checkpoint> <generate_synthetic>"
    exit 1
fi

if [ -z "$4" ]; then
    echo -e "Resume setting is not provided. Default to train from scratch"
    RESUME_TRAINING=0
fi

if [ -z "$5" ]; then
    echo -e "Generate synthetic is not provided. Default to generate synthetic val test set"
    GENERATE_SYNTHETIC=1
fi

if [[ "$2" == "-1" ]]; then
    echo -e "Verifying number of GPUs available in the system"
    NUM_GPUS=$(count_gpu_devices)
else
    NUM_GPUS=$2
fi

if [[ "$4" == "1" ]]; then
    RESUME_TRAINING=1
else
    RESUME_TRAINING=0
fi

echo -e "Exporting environment"
export OMP_NUM_THREADS=$NUM_CPU
export MASTER_ADDR=127.0.0.1
export FI_PROVIDER=tcp
export CCL_ATL_TRANSPORT=ofi
export CCL_LOG_LEVEL=error

echo -e "Exporting env that is optimized for ARC"
export USE_XETLA=OFF
export SYCL_PI_LEVEL_ZERO_USE_IMMEDIATE_COMMANDLISTS=1
export SYCL_CACHE_PERSISTENT=1

echo -e "Sourcing Intel OneAPI environment"
# shellcheck source=/dev/null
source /opt/intel/oneapi/"$ONEAPI_VERSION"/oneapi-vars.sh --force

echo -e "Generating the synthetic validation and test set for training"
if [[ $GENERATE_SYNTHETIC == "1" ]]; then
    python3 -u trainer/cli.py --config_file "$CONFIG_PATH" --do_test_generation
fi

echo -e "Running training on $NUM_CPU CPU cores and number of GPUs: $NUM_GPUS. Using config: $CONFIG_PATH"
if [[ $RESUME_TRAINING == "1" ]]; then
    echo -e "Resume training with $NUM_GPUS GPUs"
    mpirun -n "$NUM_GPUS" \
        python3 -u trainer/cli.py --config_file "$CONFIG_PATH" --do_train --resume_from_checkpoint > "$LOG_PATH" 2>&1
else
    echo -e "Training from scratch with $NUM_GPUS GPUs"
    mpirun -n "$NUM_GPUS" \
        python3 -u trainer/cli.py --config_file "$CONFIG_PATH" --do_train > "$LOG_PATH" 2>&1
fi

# TODO: this should be enable once the torch is able to upgrade to >= 2.1.1
# if [[ $CONVERT_OV == "1" ]]; then
#     echo -e "Converting model to OV format"
#     python3 -u trainer/cli.py --config_file $CONFIG_PATH --export_ov
# fi
