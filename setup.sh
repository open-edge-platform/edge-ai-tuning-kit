#!/bin/bash
# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

set -e

APP_VERSION=2025.1
SERVER_IP=backend
COMMIT_ID=3b2f340
RENDER_GROUP_ID=$(getent group render | cut -d: -f3)
export RENDER_GROUP_ID
DOCKER_GROUP_ID=$(getent group docker | cut -d: -f3)
export DOCKER_GROUP_ID

WORKDIR=$PWD

# verify platform
verify_platform() {
    echo -e "\n# Verifying platform"
    cpu_model=$(< /proc/cpuinfo grep -m1 "model name" | cut -d: -f2 | sed 's/^[ \t]*//')
    echo "- CPU model: ${cpu_model}"
}

verify_ram() {
    echo -e "\n# Verifying RAM"
    total_ram_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    total_ram_gb=$((total_ram_kb/1000**2))

    if (( $(echo "$total_ram_gb >= 64" | bc -l) )); then
        echo "- RAM: ${total_ram_gb} GB"
    else
        echo "Minimum RAM required is 64 GB."
        exit 1
    fi
}

verify_gpu_available() {
    gpu_list=(
        "Intel(R) Arc(TM) A770 Graphics"
        "Intel(R) Arc(TM) A770M Graphics"
        "Intel(R) Data Center GPU Flex 170"
        "Intel(R) Graphics \[0xe20b\]"
        "Intel(R) Arc(TM) B580 Graphics"
    )

    echo -e "\n# Identifying GPU"

    if ! command -v clinfo &> /dev/null; then
        echo -e "- clinfo command not found. Please install clinfo to proceed"
        exit 1
    fi
    
    found=false
    for gpu in "${gpu_list[@]}"; do
        if clinfo -l | grep -q "$gpu"; then
            found=true
            gpu_model=$gpu
            break
        fi
    done
    if $found; then
        echo -e "- GPU: ${gpu_model}"
    else
        echo -e "- The GPU used in the system doesn't meet the requirement."
        echo -e "Supported GPU devices:"
        echo -e "- Intel(R) Arc(TM) A770 Graphics"
        echo -e "- Intel(R) Arc(TM) A770M Graphics"
        echo -e "- Intel(R) Data Center GPU Flex 170"
        echo -e "- Intel(R) Graphics \[0xe20b\]"
        exit 1
    fi
}

install_packages(){
    local PACKAGES=("$@")
    local INSTALL_REQUIRED=0
    for PACKAGE in "${PACKAGES[@]}"; do
        INSTALLED_VERSION=$(dpkg-query -W -f='${Version}' "$PACKAGE" 2>/dev/null || true)
        LATEST_VERSION=$(apt-cache policy "$PACKAGE" | grep Candidate | awk '{print $2}')
        
        if [ -z "$INSTALLED_VERSION" ] || [ "$INSTALLED_VERSION" != "$LATEST_VERSION" ]; then
            echo "$PACKAGE is not installed or not the latest version."
            INSTALL_REQUIRED=1
        fi
    done
    if [ $INSTALL_REQUIRED -eq 1 ]; then
        sudo -E apt update
        sudo -E apt install -y "${PACKAGES[@]}"
    fi
}

install_python_packages() {
    local packages=("$@")  # Capture all arguments into an array
    for PACKAGE_NAME in "${packages[@]}"; do
        if pip show "$PACKAGE_NAME" &> /dev/null; then
            echo "Package '$PACKAGE_NAME' is installed. Skipping installation"
        else
            echo "Package '$PACKAGE_NAME' is not installed. Installing ..."
            python3 -m pip install "$PACKAGE_NAME"
        fi
    done
}

verify_docker() {
    echo -e "\n# Verifying Docker"
    if command -v "docker" > /dev/null 2>&1; then
        echo "- Docker version: $(docker --version)"
    else
        echo "- Docker is not installed. Please browse to the following link to install Docker: https://docs.docker.com/engine/install/ubuntu/"
        exit 1
    fi
}

verify_os() {
    echo -e "\n# Verifying Operating System"
    # shellcheck source=/dev/null
    if grep -q 'Ubuntu 22.04' /etc/os-release; then
        echo "- Operating System: Ubuntu 22.04 LTS"
    elif grep -q 'Ubuntu 24.04' /etc/os-release; then
        echo "- Operating System: Ubuntu 24.04 LTS"
    elif grep -q 'Ubuntu 24.10' /etc/os-release; then
        echo "- Operating System: Ubuntu 24.10"
    else
        echo "- Operating System: Unsupported OS. Please use Ubuntu 22.04, 24.04 LTS or Ubuntu 22.10"
        exit 1
    fi
}

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

verify_docker_group_permission() {
    echo -e "\n# Verifying user permission in docker group"
    if groups "$USER" | grep -qw "docker"; then
        echo -e "- User permission available"
    else
        echo -e "- User permission is not available in docker group. You can add the user to the docker group using the following command"
        echo -e "- Command: sudo usermod -aG docker $USER"
        exit 1
    fi
}

setup_app() {
    echo -e "\n# Building the docker images for application."
    if [ ! -d "./thirdparty" ]; then
        mkdir -p thirdparty
    fi

    if [ ! -d "./thirdparty/edge-developer-kit-reference-scripts" ]; then
        echo -e "- Downloading the thirdparty folder from the repository."
        if ! git clone https://github.com/intel/edge-developer-kit-reference-scripts.git thirdparty/edge-developer-kit-reference-scripts; then
            echo -e "- Unable to clone the repository. Please check your internet connection."
            exit 1
        fi
        cd thirdparty/edge-developer-kit-reference-scripts || exit 1
        git checkout $COMMIT_ID
        cd ../.. || exit 1
    fi

    if [ -d "./thirdparty/edge-developer-kit-reference-scripts/usecases/ai/microservices/text-generation/vllm" ]; then
        docker build -t edge-ai-tuning-kit.backend.serving:"$APP_VERSION"-BINARY ./thirdparty/edge-developer-kit-reference-scripts/usecases/ai/microservices/text-generation/vllm
    else
        echo -e "- Unable to build docker images. Please ensure thirdparty folder is available."
        exit 1
    fi
    APP_VER=$APP_VERSION docker compose -f docker-compose.yml build --build-arg SERVER_IP="$SERVER_IP"
}

build() {
    verify_os
    verify_platform
    verify_ram
    verify_gpu_available
    verify_docker
    verify_docker_group_permission
    setup_app
    echo -e "\n# App built successfully. Please reboot your system before running the start command."
}

run() {
    verify_env_template
    verify_huggingface_token
    echo -e "\n# Starting the apps in docker containers."
    RENDER_GROUP_ID="$RENDER_GROUP_ID" docker compose -f docker-compose.yml up -d
}

stop() {
    echo -e "\n# Stopping the apps in docker containers."
    docker compose -f docker-compose.yml down
    docker compose -f docker-compose.yml rm
}

echo -e "#################################"
echo -e "#      Edge AI Tuning Kit       #"
echo -e "#################################"

show_help() {
    echo -e "Usage: $0 [-b] [-r] [-s] [-h]"
    echo -e "  -b  Build app"
    echo -e "  -r  Run app"
    echo -e "  -s  Stop app"
    echo -e "  -h  Show this help message"
}

if (( $# < 1 | $# > 1)); then
    echo "Please provide exactly 1 argument"
    show_help
    exit 1
fi

while getopts ":brsh" opt; do
    case ${opt} in
        b )
            build
            ;;
        r )
            run
            ;;
        s )
            stop
            ;;
        h )
            show_help
            ;;
        \? )
            echo "Invalid option: -${OPTARG}" >&2
            show_help
            exit 1
            ;;
    esac
done

shift $((OPTIND -1))
