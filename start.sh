#!/bin/bash
# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

set -e

RENDER_GROUP_ID=$(getent group render | cut -d: -f3)
export RENDER_GROUP_ID
DOCKER_GROUP_ID=$(getent group docker | cut -d: -f3)
export DOCKER_GROUP_ID

WORKDIR=$PWD

verify_huggingface_token() {
    echo -e "\n# Verifying Hugging Face token is available ..."
    if [[ -z "$HF_TOKEN" ]]; then
        echo -e "Input your Hugging Face token"
        read -rsp 'Hugging Face token: ' HUGGINGFACE_TOKEN
        export HF_TOKEN="$HUGGINGFACE_TOKEN"
    else
        echo -e "Login in using the token set on environment variable"
    fi
}

update_password_for_services() {
    echo -e "\n# Updating password for the services."
    echo -e "- Creating a random password for redis service."
    random_data=$(openssl rand -base64 8)
    redis_password=$(echo "$random_data" | tr '+/' 'AB')
    sed -i -e "s/REDIS_PASSWORD=redis/REDIS_PASSWORD=$(echo "$redis_password" | sed -e 's/[\/&]/\\&/g')/" "$WORKDIR"/.env

    echo -e "- Creating a random user for postgres service."
    random_data=$(openssl rand -base64 8)
    postgres_user=$(echo "$random_data" | tr '+/' 'AB')
    sed -i -e "s/POSTGRES_USER=postgres/POSTGRES_USER=$(echo "$postgres_user" | sed -e 's/[\/&]/\\&/g')/" "$WORKDIR"/.env

    echo -e "- Creating a random password for postgres service."
    random_data=$(openssl rand -base64 8)
    postgres_password=$(echo "$random_data" | tr '+/' 'AB')
    sed -i -e "s/POSTGRES_PASSWORD=postgres/POSTGRES_PASSWORD=$(echo "$postgres_password" | sed -e 's/[\/&]/\\&/g')/" "$WORKDIR"/.env
}

verify_env_template() {
    echo -e "\n# Verifying the .env file is available."
    FOUND_ENV=0
    if [ -f "$WORKDIR/.env" ]; then
        echo -e "- .env file available."
        FOUND_ENV=1
    fi

    if [ ! $FOUND_ENV -eq 1 ]; then
        if [ ! -f "/home/$USER/.cache/intel-eadat/.env" ]; then
            echo -e "- Caching the .env file in /home/$USER/.cache/intel-eadat/"
            mkdir -p "/home/$USER/.cache/intel-eadat/"
            cp "$WORKDIR/.env.template" "$WORKDIR/.env"
            update_password_for_services
            cp "$WORKDIR"/.env "/home/$USER/.cache/intel-eadat/.env"
        else
            echo -e "- Reusing the .env from /home/$USER/.cache/intel-eadat/.env"
            cp "/home/$USER/.cache/intel-eadat/.env" .env
        fi
    fi
}

verify_docker_group_id() {
    echo -e "\n# Verifying docker group ID"
    if [[ -z "$DOCKER_GROUP_ID" ]]; then
        echo -e "- Docker group not found. Please ensure the docker is installed and the docker group exists."
        exit 1
    else
        echo -e "- Docker group ID: ${DOCKER_GROUP_ID}"
    fi
}

run() {
    verify_docker_group_id
    verify_env_template
    verify_huggingface_token
    echo -e "\n# Starting the apps in docker containers."
    RENDER_GROUP_ID="$RENDER_GROUP_ID" DOCKER_GROUP_ID="$DOCKER_GROUP_ID" docker compose -f docker-compose.yml up -d
}

echo -e "#################################"
echo -e "#      Edge AI Tuning Kit       #"
echo -e "#################################"

run
