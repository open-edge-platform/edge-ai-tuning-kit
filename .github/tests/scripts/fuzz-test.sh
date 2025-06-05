#!/bin/bash

set -eou pipefail

cleanup_environment() {
    echo -e "Cleaning up environment...\n"
    if [[ -d "tmp" ]]; then
        echo -e "Removing old tmp directory...\n"
        sudo rm -rf tmp
    fi
}

build_restler_fuzzer() {
    echo -e "Setting up Restler Fuzzer...\n"
    if [[ -d "thirdparty/restler-fuzzer" ]]; then
    echo "Restler Fuzzer already cloned."
    else
    echo "Cloning Restler Fuzzer..."
    git clone https://github.com/microsoft/restler-fuzzer.git thirdparty/restler-fuzzer
    fi

    cd thirdparty/restler-fuzzer || exit 1
    echo -e "Building Restler Fuzzer...\n"
    docker build -t restler .
    cd ../.. || exit 1
}

build_and_run_application() {
    echo -e "Preparing the environment file...\n"
    if [[ ! -f ".env" ]]; then
        cp .env.template .env
    fi

    echo -e "Changing the HOST in environment to 0.0.0.0"
    sed -i 's/HOST=127.0.0.1/HOST=0.0.0.0/g' .env

    echo -e "Stopping if got any existing containers...\n"
    ./setup.sh -s

    echo -e "Removing the application volumes...\n"
    docker volume rm edge-ai-tuning-kit-data-cache
    docker volume rm edge-ai-tuning-kit-database 
    docker volume rm edge-ai-tuning-kit-task-cache

    echo -e "Building the application...\n"
    ./setup.sh -b

    echo -e "Running the application...\n"
    HOST=0.0.0.0 ./setup.sh -r
}

restart_application() {
    echo -e "Stopping the application...\n"
    ./setup.sh -s

    echo -e "Removing the application volumes...\n"
    docker volume rm edge-ai-tuning-kit-data-cache
    docker volume rm edge-ai-tuning-kit-database 
    docker volume rm edge-ai-tuning-kit-task-cache

    echo -e "Running the application...\n"
    HOST=0.0.0.0 ./setup.sh -r
}

prepare_fuzzing_environment() {
    echo -e "Preparing fuzzing environment...\n"
    if [[ -d "tmp" ]]; then
        echo -e "Removing old tmp directory...\n"
        sudo rm -rf tmp
    fi
    mkdir -p tmp

    echo -e "Downloading OpenAPI spec...\n"
    wget -Y off --no-check-certificate http://localhost:5999/openapi.json -O tmp/openapi.json
}

run_restler_fuzzer_test() {
    echo -e "[$(date)] - Running Restler Fuzzer Test...\n"
    docker run --rm --add-host=host.docker.internal:host-gateway \
        -v "$(pwd)/tmp:/fuzzing_ws" \
        -w /fuzzing_ws \
        -e http_proxy="" \
        -e HTTP_PROXY="" \
        -e https_proxy="" \
        -e HTTPS_PROXY="" \
        -e no_proxy=localhost,127.0.0.1,host.docker.internal \
        -e NO_PROXY=localhost,127.0.0.1,host.docker.internal \
        restler \
        sh -c \
        "/RESTler/restler/Restler compile --api_spec openapi.json; \
        mkdir -p tests; \
        cp Compile/config.json tests/config.json; \
        cp Compile/dict.json tests/dict.json; \
        cp Compile/engine_settings.json tests/engine_settings.json; \
        cp Compile/grammar.json tests/grammar.json; \
        /RESTler/restler/Restler test --grammar_file ./Compile/grammar.py --dictionary_file ./tests/dict.json --settings ./tests/engine_settings.json --no_ssl --target_ip host.docker.internal --target_port 5999"
    echo -e "[$(date)] - Completed Restler Fuzzer Test...\n"
}

run_restler_fuzzer_lean() {
    echo -e "[$(date)] - Running Restler Fuzzer Lean...\n"
    docker run --rm --add-host=host.docker.internal:host-gateway \
        -v "$(pwd)/tmp:/fuzzing_ws" \
        -w /fuzzing_ws \
        -e http_proxy="" \
        -e HTTP_PROXY="" \
        -e https_proxy="" \
        -e HTTPS_PROXY="" \
        -e no_proxy=localhost,127.0.0.1,host.docker.internal \
        -e NO_PROXY=localhost,127.0.0.1,host.docker.internal \
        restler \
        sh -c \
        "/RESTler/restler/Restler compile --api_spec openapi.json; \
        mkdir -p tests; \
        cp Compile/config.json tests/config.json; \
        cp Compile/dict.json tests/dict.json; \
        cp Compile/engine_settings.json tests/engine_settings.json; \
        cp Compile/grammar.json tests/grammar.json; \
        /RESTler/restler/Restler fuzz-lean --grammar_file ./Compile/grammar.py --dictionary_file ./tests/dict.json --settings ./tests/engine_settings.json --no_ssl --target_ip host.docker.internal --target_port 5999 --time_budget 1"
    echo -e "[$(date)] - Completed Restler Fuzzer Lean...\n"
}

run_restler_fuzzer() {
    echo -e "[$(date)] - Running Restler Fuzzer...\n"
    docker run --rm --add-host=host.docker.internal:host-gateway \
        -v "$(pwd)/tmp:/fuzzing_ws" \
        -w /fuzzing_ws \
        -e http_proxy="" \
        -e HTTP_PROXY="" \
        -e https_proxy="" \
        -e HTTPS_PROXY="" \
        -e no_proxy=localhost,127.0.0.1,host.docker.internal \
        -e NO_PROXY=localhost,127.0.0.1,host.docker.internal \
        restler \
        sh -c \
        "/RESTler/restler/Restler compile --api_spec openapi.json; \
        mkdir -p tests; \
        cp Compile/config.json tests/config.json; \
        cp Compile/dict.json tests/dict.json; \
        cp Compile/engine_settings.json tests/engine_settings.json; \
        cp Compile/grammar.json tests/grammar.json; \
        /RESTler/restler/Restler fuzz --grammar_file ./Compile/grammar.py --dictionary_file ./tests/dict.json --settings ./tests/engine_settings.json --no_ssl --target_ip host.docker.internal --target_port 5999 --time_budget 1"
    echo -e "[$(date)] - Completed Restler Fuzzer...\n"
}

compile_report() {
    echo -e "[$(date)] - Compiling report...\n"
    
    # Create evidence directory
    EVIDENCE_DIR="tmp/evidence"
    if [[ -d "$EVIDENCE_DIR" ]]; then
        echo "Removing old evidence directory..."
        rm -rf "$EVIDENCE_DIR"
    fi

    echo "Creating evidence directory..."
    mkdir -p "$EVIDENCE_DIR"

    
    # Get RESTler version/commit info
    if [[ -d "thirdparty/restler-fuzzer" ]]; then
        cd thirdparty/restler-fuzzer || exit 1
        RESTLER_VERSION=$(git describe --tags --always)
        RESTLER_COMMIT=$(git rev-parse HEAD)
        cd ../.. || exit 1
    else
        RESTLER_VERSION="Unknown"
        RESTLER_COMMIT="Unknown"
    fi
    
    # Create README.txt file
    cat > "$EVIDENCE_DIR/README.txt" << EOL
# RESTler Fuzzing Test Report

## RESTler Version Information
Release/Tag: $RESTLER_VERSION
Commit Hash: $RESTLER_COMMIT

## Commands Used
### Test Command:
/RESTler/restler/Restler test --grammar_file ./Compile/grammar.py --dictionary_file ./tests/dict.json --settings ./tests/engine_settings.json --no_ssl --target_ip host.docker.internal --target_port 5999

### Fuzz-Lean Command:
/RESTler/restler/Restler fuzz-lean --grammar_file ./Compile/grammar.py --dictionary_file ./tests/dict.json --settings ./tests/engine_settings.json --no_ssl --target_ip host.docker.internal --target_port 5999 --time_budget 1

### Fuzz Command:
/RESTler/restler/Restler fuzz --grammar_file ./Compile/grammar.py --dictionary_file ./tests/dict.json --settings ./tests/engine_settings.json --no_ssl --target_ip host.docker.internal --target_port 5999 --time_budget 1

## Configuration Customizations
The following files contain the RESTler configuration used:
- tests/config.json: Contains compiler configuration
- tests/dict.json: Contains the dictionary for dynamic objects
- tests/engine_settings.json: Contains engine settings
- tests/grammar.json: Contains generated grammar
EOL
    
    # Copy OpenAPI specification
    cp tmp/openapi.json "$EVIDENCE_DIR/"
    
    # Find experiment GUIDs for Fuzz and FuzzLean
    if [[ -d "tmp/Fuzz/RestlerResults" ]]; then
        FUZZ_GUID=$(find tmp/Fuzz/RestlerResults -maxdepth 1 -name "experiment*" -type d | head -1 | xargs basename)
        if [[ -n "$FUZZ_GUID" ]]; then
            # Copy Fuzz results
            mkdir -p "$EVIDENCE_DIR/Fuzz"
            cp "tmp/Fuzz/RestlerResults/$FUZZ_GUID/logs/main.txt" "$EVIDENCE_DIR/Fuzz/" 2>/dev/null || echo "Warning: main.txt not found for Fuzz"
            cp "tmp/Fuzz/RestlerResults/$FUZZ_GUID/bug_buckets/bug_buckets.txt" "$EVIDENCE_DIR/Fuzz/" 2>/dev/null || echo "Warning: bug_buckets.txt not found for Fuzz"
            cp "tmp/Fuzz/RestlerResults/$FUZZ_GUID/logs/testing_summary.json" "$EVIDENCE_DIR/Fuzz/" 2>/dev/null || echo "Warning: testing_summary.json not found for Fuzz"
        else
            echo "Warning: No experiment folder found for Fuzz mode"
        fi
    fi
    
    if [[ -d "tmp/FuzzLean/RestlerResults" ]]; then
        FUZZLEAN_GUID=$(find tmp/FuzzLean/RestlerResults -maxdepth 1 -name "experiment*" -type d | head -1 | xargs basename)
        if [[ -n "$FUZZLEAN_GUID" ]]; then
            # Copy FuzzLean results
            mkdir -p "$EVIDENCE_DIR/FuzzLean"
            cp "tmp/FuzzLean/RestlerResults/$FUZZLEAN_GUID/logs/main.txt" "$EVIDENCE_DIR/FuzzLean/" 2>/dev/null || echo "Warning: main.txt not found for FuzzLean"
            cp "tmp/FuzzLean/RestlerResults/$FUZZLEAN_GUID/bug_buckets/bug_buckets.txt" "$EVIDENCE_DIR/FuzzLean/" 2>/dev/null || echo "Warning: bug_buckets.txt not found for FuzzLean"
            cp "tmp/FuzzLean/RestlerResults/$FUZZLEAN_GUID/logs/testing_summary.json" "$EVIDENCE_DIR/FuzzLean/" 2>/dev/null || echo "Warning: testing_summary.json not found for FuzzLean"
        else
            echo "Warning: No experiment folder found for FuzzLean mode"
        fi
    fi
    
    # Copy configuration files used during testing
    mkdir -p "$EVIDENCE_DIR/configs"
    cp tmp/tests/config.json "$EVIDENCE_DIR/configs/" 2>/dev/null || echo "Warning: config.json not found"
    cp tmp/tests/dict.json "$EVIDENCE_DIR/configs/" 2>/dev/null || echo "Warning: dict.json not found"
    cp tmp/tests/engine_settings.json "$EVIDENCE_DIR/configs/" 2>/dev/null || echo "Warning: engine_settings.json not found"
    cp tmp/tests/grammar.json "$EVIDENCE_DIR/configs/" 2>/dev/null || echo "Warning: grammar.json not found"
    
    # Create ZIP archive
    TIMESTAMP=$(date +"%Y%m%d%H%M%S")
    (cd tmp && zip -r "restler_evidence_$TIMESTAMP.zip" evidence)
    
    echo -e "[$(date)] - Evidence package created: ./tmp/restler_evidence_$TIMESTAMP.zip\n"
}

main() {
    echo -e "Starting fuzz test...\n"
    cleanup_environment
    build_restler_fuzzer
    build_and_run_application
    prepare_fuzzing_environment
    run_restler_fuzzer_test
    restart_application
    run_restler_fuzzer_lean
    restart_application
    run_restler_fuzzer
    compile_report
}

main
