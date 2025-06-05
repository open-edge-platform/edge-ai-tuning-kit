# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import argparse

import sys
sys.path.append("/usr/src/app")

from trainer.train import val_test_dataset_generation, finetuning, export_model

def is_valid_file(parser, arg):
    try:
        # Normalize the path to resolve any symbolic links and redundant separators
        path = os.path.normpath(os.path.realpath(arg))
        
        # Check if the file exists
        if not os.path.isfile(path):
            parser.error(f"The file {arg} does not exist!")
        
        # Get the absolute path only after validation
        return os.path.abspath(path)
    except (ValueError, TypeError, OSError) as e:
        parser.error(f"Invalid file path: {arg}. Error: {str(e)}")

def validate_and_sanitize_args(args):
    # Validate and sanitize config_file
    if args.config_file:
        if not (args.config_file.endswith('.yaml') or args.config_file.endswith('.yml')):
            raise ValueError("The config file must be a YAML file.")

    # Validate do_test_generation
    if args.do_test_generation and not args.config_file:
        raise ValueError("The --do_test_generation flag requires a valid --config_file.")

    # Validate do_train
    if args.do_train and not args.config_file:
        raise ValueError("The --do_train flag requires a valid --config_file.")

    return args

if __name__ == "__main__":
    os.environ['CCL_PROCESS_LAUNCHER'] = 'none'
    os.environ["LOCAL_RANK"] = str(os.getenv('MPI_LOCALRANKID', 0))
    os.environ["WORLD_SIZE"] = str(os.getenv('PMI_SIZE', 1))
    os.environ["RANK"] = str(os.environ["LOCAL_RANK"])
    port = os.getenv("MASTER_PORT", 29500)
    os.environ["MASTER_PORT"] = str(port)

    parser = argparse.ArgumentParser(
        description="Training/Finetuning Script for LLM")
    parser.add_argument(
        "--config_file", type=lambda x: is_valid_file(parser, x), help="Path to the training YAML config file")
    parser.add_argument(
        "--do_test_generation", action="store_true", default=False, help="Creating the synthetic dataset for validation and test.")
    parser.add_argument(
        "--do_train", action="store_true", default=False, help="Perform training")
    parser.add_argument(
        "--resume_from_checkpoint", action="store_true", default=False, help="This will help to resume the checkpoint task")
    parser.add_argument(
        "--export_ov", action="store_true", default=False, help="Export model to OpenVINO format.")
    args = parser.parse_args()

    # Validate and sanitize arguments
    try:
        args = validate_and_sanitize_args(args)
    except ValueError as e:
        parser.error(str(e))

    if args.do_test_generation:
        val_test_dataset_generation(args)

    if args.do_train:
        finetuning(args)

    if args.export_ov:
        export_model(args)
