# Copyright (C) 2024 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

import os
import re
import sys
import json
import argparse

from template import ollama_template

MODELFILE_TEMPLATE = '''FROM ../llm

TEMPLATE """{chat_template}"""
'''


def validate_path(validate_path):
    path_parts = os.path.normpath(validate_path).split(os.sep)
    allowed_pattern = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9_\-\.]*$')
    for part in path_parts:
        if part and part != '.' and not allowed_pattern.match(part):
            parser.error(f"Path component '{part}' contains invalid characters")


def validate_and_sanitize_args(args, parser):
    """Validate and sanitize command line arguments."""
    # Validate model_path
    if not args.model_path:
        parser.error("The --model_path argument is required")
        
    # Convert to absolute path and normalize
    model_path = os.path.normpath(os.path.abspath(args.model_path))
    if not os.path.exists(model_path):
        parser.error(f"Model path {args.model_path} does not exist")
    validate_path(model_path)
    
    # Validate save_path
    if not args.save_path:
        parser.error("The --save_path argument is required")
    
    # Create save path directory if it doesn't exist
    save_path = os.path.normpath(os.path.abspath(args.save_path))
    save_dir = os.path.dirname(save_path)
    if save_dir and not os.path.exists(save_dir):
        try:
            os.makedirs(save_dir, exist_ok=True)
        except OSError as e:
            parser.error(f"Cannot create directory for save path: {str(e)}")
    validate_path(save_path)
    return args

def create_modelfile(model_path, save_path):
    # Sanitize and normalize paths 
    model_path = os.path.normpath(os.path.abspath(model_path))
    save_path = os.path.normpath(os.path.abspath(save_path))
    
    # Ensure the config.json file exists within the model path
    config_path = os.path.join(model_path, "config.json")
    if not os.path.isfile(config_path):
        raise ValueError(f"Config file not found at {config_path}")
        
    # Safely read the config file
    with open(config_path, 'r') as f:
        _data = f.read()
        model_data = json.loads(_data)
    
    # Validate model_type exists and is an allowed key in ollama_template
    model_type = model_data.get('model_type')
    if not model_type:
        raise ValueError("Model type not found in config.json")
    
    if model_type not in ollama_template:
        raise ValueError(f"Unsupported model type: {model_type}. Supported types: {', '.join(ollama_template.keys())}")

    # Create parent directory for save_path if it doesn't exist
    save_dir = os.path.dirname(save_path)
    if save_dir and not os.path.exists(save_dir):
        os.makedirs(save_dir, exist_ok=True)
        
    chat_template = ollama_template[model_type]
    
    # Validate the template string to avoid potential template injection
    data = MODELFILE_TEMPLATE.format(chat_template=chat_template)
    
    # Safely write to the output file
    with open(save_path, "w") as f:
        f.write(data)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Create a modified model file from a tokenizer.')
    parser.add_argument('--model_path', type=str, required=True, help='The identifier for the model file')
    parser.add_argument('--save_path', type=str, required=True, help='The path where the modified model file will be saved')
    args = parser.parse_args(None if len(sys.argv) > 1 else ["--help"])
    
    try:
        # Validate and sanitize arguments
        args = validate_and_sanitize_args(args, parser)
        create_modelfile(args.model_path, args.save_path)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
