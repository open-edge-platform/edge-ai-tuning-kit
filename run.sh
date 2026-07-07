#!/bin/bash
# SPDX-License-Identifier: Apache-2.0

set -euo pipefail

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

# ── Helpers ───────────────────────────────────────────────────────────

verify_env() {
    if [[ ! -f "${WORKDIR}/.env" ]]; then
        err ".env not found — run './setup.sh --build' first"
        exit 1
    fi
}

verify_hf_token() {
    if [[ -z "${HF_TOKEN:-}" ]]; then
        echo "Please enter your Hugging Face token:"
        IFS= read -rsp 'HF_TOKEN: ' HUGGINGFACE_TOKEN
        export HF_TOKEN="$HUGGINGFACE_TOKEN"
        ok "HF_TOKEN set"
    fi
}

# ── Actions ───────────────────────────────────────────────────────────

start() {
    verify_env
    verify_hf_token

    echo ""
    echo "Starting Edge AI Tuning Kit..."

    RENDER_GROUP_ID="$RENDER_GROUP_ID" \
    DOCKER_GROUP_ID="$DOCKER_GROUP_ID" \
    docker compose -f "${WORKDIR}/docker-compose.yml" up -d

    ok "App started — open http://localhost in your browser"
}

stop() {
    echo ""
    echo "Stopping Edge AI Tuning Kit..."
    docker compose -f "${WORKDIR}/docker-compose.yml" down --remove-orphans
    ok "App stopped"
}

# ── Main ──────────────────────────────────────────────────────────────

show_help() {
    cat <<EOF
Usage: run.sh [OPTION]

  --start, -s    Start the application (requires HF_TOKEN)
  --stop,  -t    Stop the application and remove containers
  --help,  -h    Show this help message
EOF
}

case "${1:-}" in
    --start|-s)
        start
        ;;
    --stop|-t)
        stop
        ;;
    --help|-h)
        show_help
        ;;
    "")
        err "No action specified"
        show_help
        exit 1
        ;;
    *)
        err "Unknown option '$1'"
        show_help
        exit 1
        ;;
esac
