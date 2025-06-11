# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

FROM debian:12-slim AS base
ARG DEBIAN_FRONTEND=noninteractive
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
ENV LANG=C.UTF-8
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
        sudo \
        curl \
        git \
        procps \
        ca-certificates \
        gpg-agent \
        software-properties-common \
        python3-dev \
        python3-pip \
        python3-venv \
    && addgroup --system intel --gid 1000 \
    && adduser --system --ingroup intel --uid 1000 --home /home/intel intel \
    && echo "intel ALL=(ALL:ALL) NOPASSWD:ALL" > /etc/sudoers.d/intel \
    && curl -fsSL https://apt.repos.intel.com/intel-gpg-keys/GPG-PUB-KEY-INTEL-SW-PRODUCTS.PUB | gpg --dearmor | tee /usr/share/keyrings/oneapi-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/oneapi-archive-keyring.gpg] https://apt.repos.intel.com/oneapi all main" > /etc/apt/sources.list.d/oneAPI.list \
    && curl -fsSL https://repositories.intel.com/gpu/intel-graphics.key | gpg --dearmor | tee /usr/share/keyrings/intel-graphics.gpg \
    && echo "deb [arch=amd64,i386 signed-by=/usr/share/keyrings/intel-graphics.gpg] https://repositories.intel.com/gpu/ubuntu jammy client" > /etc/apt/sources.list.d/intel-graphics.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        intel-deep-learning-essentials-2025.0 \
        libze-intel-gpu1 \
        libze1 \
        intel-opencl-icd \
        clinfo \
        intel-gsc \
        libze-dev \
        intel-ocloc \
        level-zero-dev \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /usr/src \
    && chown -R intel:intel /usr/src

# Bump up the version for compute runtime
WORKDIR /tmp/neo
RUN curl -fsSLO https://github.com/intel/intel-graphics-compiler/releases/download/v2.10.8/intel-igc-core-2_2.10.8+18926_amd64.deb \
    && curl -fsSLO https://github.com/intel/intel-graphics-compiler/releases/download/v2.10.8/intel-igc-opencl-2_2.10.8+18926_amd64.deb \
    && curl -fsSLO https://github.com/intel/compute-runtime/releases/download/25.13.33276.16/intel-level-zero-gpu_1.6.33276.16_amd64.deb \
    && curl -fsSLO https://github.com/intel/compute-runtime/releases/download/25.13.33276.16/intel-opencl-icd_25.13.33276.16_amd64.deb \
    && curl -fsSLO https://github.com/intel/compute-runtime/releases/download/25.13.33276.16/libigdgmm12_22.7.0_amd64.deb \
    && dpkg -r intel-ocloc-dev intel-ocloc libze-intel-gpu1 \
    && dpkg -i *.deb

FROM base AS dependencies
USER intel
WORKDIR /usr/src/app
RUN python3 -m venv /usr/src/.venv 
ENV PATH="/usr/src/.venv/bin:$PATH"
ENV LD_LIBRARY_PATH="/usr/src/.venv/lib64/:$LD_LIBRARY_PATH"
COPY requirements.txt .
RUN python3 -m pip install --no-cache-dir --upgrade pip \
    && python3 -m pip install --no-cache-dir -r requirements.txt \
    && python3 -m pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/xpu \
        torch==2.7.0 \
        torchvision==0.22.0 \
        torchaudio==2.7.0 \
        torchao==0.10.0 \
        pytorch-triton-xpu==3.3.0 \
    && python3 -m pip install --no-cache-dir --extra-index-url https://pytorch-extension.intel.com/release-whl/stable/xpu/us \
        intel-extension-for-pytorch==2.7.10+xpu \
        oneccl_bind_pt==2.7.0+xpu \
    && opt_in_out --opt_out
COPY --chown=intel:intel . .
HEALTHCHECK --interval=1m --timeout=30s --start-period=5s --retries=10 \
CMD celery inspect ping || exit 1
COPY --chown=intel:intel entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
