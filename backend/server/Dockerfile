# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

FROM debian:12-slim
ARG DEBIAN_FRONTEND=noninteractive
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install --no-install-recommends -y \
    sudo \
    wget \
    python3.11 \
    python3.11-venv \
    && addgroup --system intel --gid 1000 \
    && adduser --system --ingroup intel --uid 1000 --home /home/intel intel \
    && echo "intel ALL=(ALL:ALL) NOPASSWD:ALL" > /etc/sudoers.d/intel \
    && addgroup --system docker --gid 999 \
    && usermod -aG docker intel \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /usr/src \
    && chown -R intel:intel /usr/src

USER intel
WORKDIR /usr/src/app
RUN python3 -m venv /usr/src/.venv
ENV PATH="/usr/src/.venv/bin:$PATH"
COPY requirements.txt .
RUN python3 -m pip install --no-cache-dir --upgrade pip \
    && python3 -m pip install --no-cache-dir -r requirements.txt
COPY . .
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose -O /dev/null --tries=1 http://localhost:$SERVER_PORT/healthcheck || exit 1

CMD ["/usr/src/.venv/bin/python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5999", "--reload", "--log-config", "logger.yaml"]
