# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

FROM intel/deep-learning-essentials:2025.3.2-0-devel-ubuntu24.04 AS base
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
        clinfo \
    && rm -rf /var/lib/apt/lists/* 

RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    mv /root/.local/bin/uv /usr/local/bin/ && \
    mv /root/.local/bin/uvx /usr/local/bin/

FROM base AS dependencies
USER ubuntu
WORKDIR /usr/src/app
# RUN uv venv --python 3.11 /usr/src/.venv 
# ENV PATH="/usr/src/.venv/bin:$PATH"
# ENV LD_LIBRARY_PATH="/usr/src/.venv/lib64/:$LD_LIBRARY_PATH"
ENV PYTHONUNBUFFERED=1

# COPY requirements.txt .
# RUN uv pip install --no-cache-dir --upgrade pip \
#     && uv pip install psutil packaging \
#     && uv pip install --no-cache-dir torch==2.8.0 torchvision==0.23.0 torchaudio==2.8.0 --extra-index-url https://download.pytorch.org/whl/xpu \
#     && uv pip install --no-cache-dir intel-extension-for-pytorch==2.8.10+xpu oneccl_bind_pt==2.8.0+xpu --extra-index-url https://pytorch-extension.intel.com/release-whl/stable/xpu/us/ \
#     && uv pip install --no-cache-dir --index-strategy unsafe-best-match -r requirements.txt

COPY --chown=ubuntu:ubuntu . .
RUN uv sync

HEALTHCHECK --interval=1m --timeout=30s --start-period=5s --retries=10 \
CMD celery inspect ping || exit 1
COPY --chown=ubuntu:ubuntu entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
