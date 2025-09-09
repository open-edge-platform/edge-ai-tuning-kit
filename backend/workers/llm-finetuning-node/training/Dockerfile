# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

FROM intel/intel-extension-for-pytorch:2.8.10-xpu AS base
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
    && addgroup --system intel --gid 1000 \
    && adduser --system --ingroup intel --uid 1000 --home /home/intel intel

RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    mv /root/.local/bin/uv /usr/local/bin/ && \
    mv /root/.local/bin/uvx /usr/local/bin/

# Install GPU drivers
RUN curl -fsSL https://repositories.intel.com/gpu/intel-graphics.key | gpg --dearmor | tee /usr/share/keyrings/intel-graphics.gpg \
    && echo "deb [arch=amd64,i386 signed-by=/usr/share/keyrings/intel-graphics.gpg] https://repositories.intel.com/gpu/ubuntu jammy unified" > /etc/apt/sources.list.d/intel-gpu-jammy.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        libze-intel-gpu1 \
        libze1 \
        intel-opencl-icd \
        clinfo \
        libze-dev \
        intel-ocloc

# Install OneAPI
RUN curl -fsSL https://apt.repos.intel.com/intel-gpg-keys/GPG-PUB-KEY-INTEL-SW-PRODUCTS.PUB | gpg --dearmor | tee /usr/share/keyrings/oneapi-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/oneapi-archive-keyring.gpg] https://apt.repos.intel.com/oneapi all main" > /etc/apt/sources.list.d/oneAPI.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        intel-deep-learning-essentials-2025.2 \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /usr/src \
    && chown -R intel:intel /usr/src

FROM base AS dependencies
USER intel
WORKDIR /usr/src/app
RUN uv venv --python 3.11 /usr/src/.venv 
ENV PATH="/usr/src/.venv/bin:$PATH"
ENV LD_LIBRARY_PATH="/usr/src/.venv/lib64/:$LD_LIBRARY_PATH"
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN uv pip install --no-cache-dir --upgrade pip \
    && uv pip install psutil packaging \
    && uv pip install --no-cache-dir torch==2.8.0 torchvision==0.23.0 torchaudio==2.8.0 --extra-index-url https://download.pytorch.org/whl/xpu \
    && uv pip install --no-cache-dir intel-extension-for-pytorch==2.8.10+xpu oneccl_bind_pt==2.8.0+xpu --extra-index-url https://pytorch-extension.intel.com/release-whl/stable/xpu/us/ \
    && uv pip install --no-cache-dir --index-strategy unsafe-best-match -r requirements.txt

COPY --chown=intel:intel . .
HEALTHCHECK --interval=1m --timeout=30s --start-period=5s --retries=10 \
CMD celery inspect ping || exit 1
COPY --chown=intel:intel entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
