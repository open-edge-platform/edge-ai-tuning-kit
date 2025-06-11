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
    procps \
    ca-certificates \
    gpg-agent \
    software-properties-common \
    && addgroup --system intel --gid 1000 \
    && adduser --system --ingroup intel --uid 1000 --home /home/intel intel \
    && echo "intel ALL=(ALL:ALL) NOPASSWD:ALL" > /etc/sudoers.d/intel \
    && addgroup --system render --gid 110 \
    && usermod -aG render intel \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /usr/src \
    && chown -R intel:intel /usr/src

FROM base AS dependencies
USER intel
WORKDIR /usr/src/app
RUN python3 -m venv /usr/src/.venv 
ENV PATH="/usr/src/.venv/bin:$PATH"
ENV LD_LIBRARY_PATH=/usr/src/.venv/lib64/
COPY requirements.txt .
RUN python3 -m pip install --no-cache-dir -r requirements.txt \
    && huggingface-cli download BAAI/bge-large-en-v1.5 \
    && huggingface-cli download BAAI/bge-reranker-base
COPY --chown=intel:intel . .
HEALTHCHECK --interval=1m --timeout=30s --start-period=5s --retries=10 \
    CMD celery inspect ping || exit 1
COPY --chown=intel:intel entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
