#!/bin/bash
# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

set -e  # Exit immediately if a command exits with a non-zero status

# Function for error messages
log_error() {
    echo -e "\033[0;31mError: $1\033[0m" >&2
}

# Function for success messages
log_info() {
    echo -e "\033[0;32m$1\033[0m"
}

# Check for clinfo availability
if ! command -v clinfo &>/dev/null; then
    log_error "clinfo not found. Please install the required OpenCL tools."
    exit 2
fi

# Check for GPU availability - cache the output to avoid multiple executions
echo "Checking for hardware availability ..."
CLINFO_OUTPUT=$(clinfo)

if echo "$CLINFO_OUTPUT" | grep -q 'Device Type.*GPU'; then
    log_info "GPU detected."
else
    log_error "No GPU detected. Please check your hardware and drivers."
    exit 1
fi

echo "Checking for integrated GPU availability..."
mapfile -t lines < <(clinfo | awk '
    /Device Name/ { dn=$0 }
    /Device Type/ { dt=$0 }
    /Unified memory for Host and Device/ { um=$0; print dn "\n" dt "\n" um "\n" }
')
total_lines=${#lines[@]}
device_name=""
discrete_gpu_name=""

# Loop through lines in pairs (Device Type followed by Unified memory)
for ((i=0; i<total_lines; i++)); do
    line="${lines[$i]}"
    echo "Processing line $i: $line"
    if [[ "$line" =~ Device\ Name ]]; then
        device_name=$(echo "$line" | sed -E 's/.*Device Name[[:space:]]+//')
    elif [[ "$line" =~ Device\ Type ]]; then
        device_type=$(echo "$line" | sed -E 's/.*Device Type[[:space:]]+//')
        if [[ "$device_type" == "GPU" ]]; then
            unified_memory_line="${lines[$((i+1))]}"
            unified_memory=$(echo "$unified_memory_line" | sed -E 's/.*Unified memory for Host and Device[[:space:]]+//')
            if [[ "$unified_memory" == "No" ]]; then
                discrete_gpu_name="$device_name"
                break
            fi
        fi
    fi
done

if [[ -z "$discrete_gpu_name" ]]; then
    log_error "No discrete GPU detected. Please check your hardware and drivers."
    exit 1
else
    log_info "Discrete GPU detected: $discrete_gpu_name"
fi

# Check if sycl-ls is available
sycl_ls_path=/opt/intel/oneapi/compiler/latest/bin/sycl-ls
if ! command -v $sycl_ls_path &>/dev/null; then
    log_error "sycl-ls not found. Please install the required Intel OneAPI tools."
    exit 2
fi

mapfile -t level_zero_ids < <($sycl_ls_path | \
    awk -v name="$discrete_gpu_name" '
        index($0, name) {
            if (match($0, /level_zero:[0-9]+/)) {
                s = substr($0, RSTART, RLENGTH)
                sub(/.*:/, "", s)
                print s
            }
        }
    ')

if [[ ${#level_zero_ids[@]} -eq 0 ]]; then
    log_error "Could not find any level_zero id for $discrete_gpu_name"
    exit 1
else
    echo "level_zero ids for $discrete_gpu_name: ${level_zero_ids[*]}"
fi

# Set OneAPI environment variables based on the level_zero ids in format: level_zero:0,1,2
if [[ ${#level_zero_ids[@]} -gt 1 ]]; then
    ids_csv=$(IFS=, ; echo "${level_zero_ids[*]}")
    export ONEAPI_DEVICE_SELECTOR="level_zero:${ids_csv}"
else
    export ONEAPI_DEVICE_SELECTOR="level_zero:${level_zero_ids[0]}"
fi

log_info "Detected GPU devices: "
python -c "import torch; [print(f'[{i}]: {torch.xpu.get_device_properties(i)}') for i in range(torch.xpu.device_count())];"

# Source Intel OneAPI environment
ONEAPI_CCL_ENV="/opt/intel/oneapi/ccl/latest/env/vars.sh"
if [ -f "$ONEAPI_CCL_ENV" ]; then
    log_info "Loading Intel OneAPI environment from $ONEAPI_CCL_ENV"
    # shellcheck source=/dev/null
    source "$ONEAPI_CCL_ENV"
else
    log_error "Intel OneAPI environment file not found: $ONEAPI_CCL_ENV"
    exit 3
fi

log_info "Starting application..."
exec "$@"
