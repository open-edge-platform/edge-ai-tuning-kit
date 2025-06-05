#!/bin/bash
# Copyright (C) 2024 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

set -euo pipefail

# BKC
OV_VLLM_COMMIT=80cbe10
OLLAMA_MODELS="./data/model/ollama/cache"
export OLLAMA_MODELS

if [ "$EUID" -eq 0 ]; then
    echo "Must not run with sudo or root user"
    exit 1
fi

# Common
print_info(){
    local info="$1"
    echo -e "\n# $info"
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
    local packages=("$@")
    for PACKAGE_NAME in "${packages[@]}"; do
        if pip show "$PACKAGE_NAME" &> /dev/null; then
            echo "Package '$PACKAGE_NAME' is installed. Skipping installation"
        else
            echo "Package '$PACKAGE_NAME' is not installed. Installing ..."
            python3 -m pip install --extra-index-url https://download.pytorch.org/whl/cpu "$PACKAGE_NAME"
        fi
    done
}

activate_python_venv(){
    if ! command -v python3.11 &> /dev/null; then
        print_info "Installing Python 3.11"
        PYTHON_PACKAGES=(
            python3.11
            python3.11-venv
        )
        install_packages "${PYTHON_PACKAGES[@]}"
    fi

    [ ! -d "./.venv" ] && python3.11 -m venv ./.venv

    print_info "Activating Python 3.11 environment"
    # shellcheck source=/dev/null
    source "./.venv/bin/activate"
}

# Steps
install_inference_backend(){
    local backend="$1"
    print_info "Setting up dependencies for $backend"
    if [[  "$backend" ==  "OLLAMA" ]]; then
        install_ollama_deps
    elif [[  "$backend" ==  "OV_VLLM" ]]; then
        install_ov_vllm_deps
    fi
}

install_ov_vllm_deps(){
    print_info "Installing dependencies for Intel OpenVINO VLLM"
    dependencies=(
        git
    )
    install_packages "${dependencies[@]}"
    activate_python_venv
    if [ ! -d "./thirdparty/vllm" ]; then
        echo -e "- Cloning VLLM, branch: $OV_VLLM_COMMIT"
        mkdir -p ./thirdparty
        git clone https://github.com/vllm-project/vllm.git ./thirdparty/vllm
        cd ./thirdparty/vllm || exit
        git checkout $OV_VLLM_COMMIT 
        cd ../.. || exit
    fi
    cd ./thirdparty/vllm || exit
    python3 -m pip install --upgrade pip
    echo -e "- Building VLLM with Intel OpenVINO backend"
    python3 -m pip install -r requirements-build.txt --extra-index-url https://download.pytorch.org/whl/cpu
    PIP_PRE=1 PIP_EXTRA_INDEX_URL="https://download.pytorch.org/whl/cpu https://storage.openvinotoolkit.org/simple/wheels/nightly/" VLLM_TARGET_DEVICE=openvino python3 -m pip install -v .
    python3 -m pip install pynvml
    cd ../.. || exit
}

install_ollama_deps(){
    print_info "Installing dependencies for OLLAMA"
    install_ollama_binary
}

install_ollama_binary(){
    print_info "Verify Ollama installation"
    if [ ! -f "./thirdparty/ollama_bin/ollama" ]; then
        echo -e "- Ollama binary not found. Installing ..."
        mkdir -p ./thirdparty/ollama_bin
        activate_python_venv
        if install_packages "curl"
        then
            cd ./thirdparty || exit
            if [[ -f ./ollama_bin/ollama ]]; then
                echo "- Ollama binary is already installed. Skipping installation"
            else
                echo "- Downloading Ollama binary"
                curl -L -o ollama-ipex-llm-2.2.0-ubuntu.tgz https://github.com/ipex-llm/ipex-llm/releases/download/v2.2.0/ollama-ipex-llm-2.2.0-ubuntu.tgz
                tar -xvzf ollama-ipex-llm-2.2.0-ubuntu.tgz
                mkdir -p ollama_bin
                mv ollama-ipex-llm-2.2.0-ubuntu/* ollama_bin/
                rm -rf ollama-ipex-llm-2.2.0-ubuntu
                rm -rf ollama-ipex-llm-2.2.0-ubuntu.tgz
            fi

            if [ ! -f "./ollama_bin/ollama" ]; then
                echo "- Ollama binary is not download correctly. Exiting ..."
                exit 1
            fi

            echo "- Ollama binary installed successfully"
            cd .. || exit
        else
            echo "- Failed to install Ollama binary"
            exit 1 
        fi
    else
        echo -e "- Ollama binary is available. Skipping installation"
    fi
}

install_tts_deps(){
    print_info "Verify MeloTTS installation"
    dependencies=(
        build-essential
        libsndfile1
        git
    )
    install_packages "${dependencies[@]}"
    activate_python_venv
    if [ ! -d "./thirdparty/MeloTTS" ]; then
        echo -e "- Cloning MeloTTS, branch: main"
        git clone https://github.com/myshell-ai/MeloTTS.git ./thirdparty/MeloTTS
    fi

    cd ./thirdparty/MeloTTS || exit
    echo -e "- Installing MeloTTS dependencies"
    python3 -m pip install --extra-index-url https://download.pytorch.org/whl/cpu -e .
    python3 -m unidic download
    cd ../.. || exit
}

install_backend_api_deps(){
    print_info "Verify backend API installation"
    activate_python_venv
    python_deps=(
        "optimum[openvino]"
        "optimum[neural-compressor]"
    )
    install_python_packages "${python_deps[@]}"

    if [ ! -d "./data/model/embeddings/bge-large-en-v1.5" ]; then
        echo -e "- Getting embedding model: bge-large-en-v1.5"
        if optimum-cli export openvino --model BAAI/bge-large-en-v1.5 --task feature-extraction ./data/model/embeddings/bge-large-en-v1.5
        then
            echo -e "- Successfully download embedding model"
        else
            echo -e "- Failed to download embedding model"
            exit 1
        fi
    fi

    if [ ! -d "./data/model/reranker/bge-reranker-large" ]; then
        echo -e "- Getting reranker model: bge-reranker-large"
        if optimum-cli export openvino --model BAAI/bge-reranker-large --task text-classification ./data/model/reranker/bge-reranker-large
        then
            echo -e "- Successfully download reranker model"
        else
            echo -e "- Failed to download reranker model"
            exit 1
        fi
    fi

    echo -e "- Installing backend dependencies"
    cd ./backend || exit
    python3 -m pip install --no-deps openai-whisper==20240927
    python3 -m pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu \
        torch==2.6.0 \
        torchvision==0.21.0 \
        torchaudio==2.6.0 \
        triton==3.2.0 \
        "optimum-intel[openvino,nncf]==1.21.0" \
        optimum==1.23.3
    python3 -m pip install -r requirements.txt
    cd .. || exit
}

install_edge_ui_deps(){
    print_info "Verify frontend installation"
    if command -v node &> /dev/null
    then
        NODE_VERSION=$(node -v)
        if [[ "$NODE_VERSION" == v22* ]]
        then
            echo "- Node.js version 22 is installed."
        else
            echo "- Node.js is installed, but the version is not 22. Installed version: $NODE_VERSION"
        fi
    else
        echo -e "- Installing Node.js version 22"
        sudo -E apt update
        sudo -E apt install -y curl

        curl -fsSL https://deb.nodesource.com/setup_22.x -o ./nodesource_setup.sh
        sudo -E bash ./nodesource_setup.sh
        sudo -E apt install -y nodejs
        rm -rf ./nodesource_setup.sh
    fi

    cd ./edge-ui || exit
    echo -e "- Installing frontend dependencies"
    npm install
    export NEXT_TELEMETRY_DISABLED=1
    npm run build
    cd .. || exit
}

entrypoint(){
    choice="${INSTALL_OPTION:-2}"
    if [ -z "$choice" ]; then
        echo -e "############################"
        echo -e "# LLM On Edge Installation #"
        echo -e "############################"
        echo -e ""
        echo -e "Select the device you would like to run on:"
        echo -e "1) VLLM (OpenVINO - CPU)"
        echo -e "2) OLLAMA (SYCL LLAMA.CPP - CPU/GPU)"
        echo -e ""
        read -rp "Enter your choice [1 or 2]: " choice
    fi
    case $choice in
    1)
        if [ -z "$HF_TOKEN" ]; then
            echo "HF_TOKEN not provided"
            exit 1
        fi
        install_inference_backend "OV_VLLM"
        echo "OV_VLLM" > ./.framework
        ;;
    2)
        install_inference_backend "OLLAMA"
        echo "OLLAMA" > ./.framework
        ;;
    *)
        echo "Invalid choice. Please enter 1 or 2."
        exit 1
        ;;
    esac
    # install_tts_deps
    # install_backend_api_deps
    install_edge_ui_deps
    print_info "Successfully setup the application. Please execute the run script to start the application"
}

entrypoint
