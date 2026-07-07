#!/bin/bash
# SPDX-License-Identifier: Apache-2.0

set -euo pipefail

readonly APP_VERSION=2025.1
readonly SERVER_IP=backend

WORKDIR="$(cd "$(dirname "$0")" && pwd)"
readonly WORKDIR

RENDER_GROUP_ID="$(getent group render | cut -d: -f3)"
export RENDER_GROUP_ID

DOCKER_GROUP_ID="$(getent group docker | cut -d: -f3)"
export DOCKER_GROUP_ID

# ── Logging ───────────────────────────────────────────────────────────

# Three colours only — stripped when stdout is not a tty
C_GREEN='\033[32m'
C_YELLOW='\033[33m'
C_RED='\033[31m'
C_RESET='\033[0m'

if [[ ! -t 1 ]]; then
    C_GREEN=''; C_YELLOW=''; C_RED=''; C_RESET=''
fi

readonly C_GREEN C_YELLOW C_RED C_RESET

ok()   { printf "  ${C_GREEN}✓${C_RESET}  %s\n" "$*"; }
warn() { printf "  ${C_YELLOW}⚠${C_RESET}  %s\n" "$*" >&2; }
err()  { printf "  ${C_RED}✗${C_RESET}  %s\n" "$*" >&2; }

# ── Verification ──────────────────────────────────────────────────────

verify_platform() {
    local cpu_model
    cpu_model="$(grep -m1 'model name' /proc/cpuinfo | cut -d: -f2 | sed 's/^[[:space:]]*//')"
    ok "CPU: ${cpu_model}"
}

verify_ram() {
    local total_ram_kb total_ram_gb
    total_ram_kb="$(grep MemTotal /proc/meminfo | awk '{print $2}')"
    total_ram_gb=$((total_ram_kb / 1000 ** 2))

    if (( total_ram_gb >= 64 )); then
        ok "RAM: ${total_ram_gb} GB"
    else
        err "Minimum RAM required is 64 GB (found ${total_ram_gb} GB)"
        exit 1
    fi
}

verify_gpu() {
    local -a gpu_list=(
        "Intel(R) Arc(TM) A770 Graphics"
        "Intel(R) Arc(TM) A770M Graphics"
        "Intel(R) Data Center GPU Flex 170"
        "Intel(R) Arc(TM) B580 Graphics"
        "Intel(R) Arc(TM) Pro B50 Graphics"
        "Intel(R) Arc(TM) Pro B60 Graphics"
        "Intel(R) Graphics \[0xe20b\]"
        "Intel(R) Graphics \[0xe211\]"
    )

    if ! command -v clinfo &>/dev/null; then
        err "clinfo not found — install it before proceeding"
        exit 1
    fi

    local gpu gpu_model found=false
    for gpu in "${gpu_list[@]}"; do
        if clinfo -l | grep -q "$gpu"; then
            found=true
            gpu_model="$gpu"
            break
        fi
    done

    if $found; then
        ok "GPU: ${gpu_model}"
    else
        err "Unsupported GPU"
        echo "Supported GPUs:" >&2
        for gpu in "${gpu_list[@]}"; do
            echo "  - ${gpu}" >&2
        done
        exit 1
    fi
}

verify_docker() {
    if command -v docker &>/dev/null; then
        ok "Docker: $(docker --version)"
    else
        err "Docker not installed — https://docs.docker.com/engine/install/ubuntu/"
        exit 1
    fi
}

verify_docker_group() {
    if groups "$USER" | grep -qw docker; then
        ok "User is in 'docker' group"
    else
        err "User not in 'docker' group"
        echo "Fix: sudo usermod -aG docker \$USER  (then re-login)" >&2
        exit 1
    fi
}

verify_os() {
    local os_release
    os_release="$(cat /etc/os-release)"

    if echo "$os_release" | grep -q 'Ubuntu 22.04'; then
        ok "OS: Ubuntu 22.04 LTS"
    elif echo "$os_release" | grep -q 'Ubuntu 24.04'; then
        ok "OS: Ubuntu 24.04 LTS"
    elif echo "$os_release" | grep -q 'Ubuntu 26.04'; then
        ok "OS: Ubuntu 26.04 LTS"
    else
        err "Unsupported OS — use Ubuntu 22.04 / 24.04 / 26.04 LTS"
        exit 1
    fi
}

# ── Package management ────────────────────────────────────────────────

install_packages() {
    local -a packages=("$@")
    local install_required=0

    for pkg in "${packages[@]}"; do
        local installed latest
        installed="$(dpkg-query -W -f='${Version}' "$pkg" 2>/dev/null || true)"
        latest="$(apt-cache policy "$pkg" | grep Candidate | awk '{print $2}')"

        if [[ -z "$installed" || "$installed" != "$latest" ]]; then
            install_required=1
        fi
    done

    if (( install_required )); then
        sudo -E apt-get update
        sudo -E apt-get install -y "${packages[@]}"
    fi
}

# ── Environment ───────────────────────────────────────────────────────

generate_random_password() {
    openssl rand -base64 8 | tr '+/' 'AB'
}

update_env_passwords() {
    local redis_pw postgres_user postgres_pw
    redis_pw="$(generate_random_password)"
    postgres_user="$(generate_random_password)"
    postgres_pw="$(generate_random_password)"

    sed -i "s|REDIS_PASSWORD=redis|REDIS_PASSWORD=${redis_pw}|" "${WORKDIR}/.env"
    sed -i "s|POSTGRES_USER=postgres|POSTGRES_USER=${postgres_user}|" "${WORKDIR}/.env"
    sed -i "s|POSTGRES_PASSWORD=postgres|POSTGRES_PASSWORD=${postgres_pw}|" "${WORKDIR}/.env"

    ok "Randomized Redis password"
    ok "Randomized PostgreSQL user & password"
}

setup_env() {
    local cache_env="/home/${USER}/.cache/intel-eadat/.env"

    if [[ -f "${WORKDIR}/.env" ]]; then
        ok ".env already present"
        return
    fi

    if [[ -f "$cache_env" ]]; then
        ok "Reusing cached .env"
        cp "$cache_env" "${WORKDIR}/.env"
    else
        echo "Creating .env from template..." >&2
        mkdir -p "$(dirname "$cache_env")"
        cp "${WORKDIR}/.env.template" "${WORKDIR}/.env"
        update_env_passwords
        cp "${WORKDIR}/.env" "$cache_env"
    fi
}

# ── Build ─────────────────────────────────────────────────────────────

install_dependencies() {
    if grep -q 'Ubuntu 26.04' /etc/os-release; then
        echo "Installing Ubuntu 26.04 dependencies..." >&2
        install_packages dpclang-6 onedpl-headers
        ok "Dependencies installed"
    fi
}

build_images() {
    echo "Pulling intel/vllm:0.17.0-xpu..." >&2
    docker pull intel/vllm:0.17.0-xpu
    echo "Building Docker images..." >&2
    APP_VER="$APP_VERSION" docker compose -f "${WORKDIR}/docker-compose.yml" build --build-arg SERVER_IP="$SERVER_IP"
    ok "Docker images built"
}

# ── Main ──────────────────────────────────────────────────────────────

build() {
    echo ""
    echo "=========================================="
    echo "  Edge AI Tuning Kit — Setup"
    echo "=========================================="

    echo ""
    echo "Verifying system..."
    verify_os
    verify_platform
    verify_ram
    verify_gpu
    verify_docker
    verify_docker_group

    echo ""
    echo "Installing dependencies..."
    install_dependencies

    echo ""
    echo "Configuring .env..."
    setup_env

    echo ""
    echo "Building Docker images..."
    build_images

    ok "Setup complete!"
    echo "Start the app with: ./run.sh --start"
}

show_help() {
    cat <<EOF
Usage: setup.sh [OPTION]

  --build, -b    Verify prerequisites and build Docker images (default)
  --help,   -h   Show this help message
EOF
}

case "${1:-}" in
    --build|-b)
        build
        ;;
    --help|-h)
        show_help
        ;;
    "")
        build
        ;;
    *)
        err "Unknown option '$1'"
        show_help
        exit 1
        ;;
esac
