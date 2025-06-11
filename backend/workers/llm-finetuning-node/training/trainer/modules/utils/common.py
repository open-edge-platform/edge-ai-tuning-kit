# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import time
import threading
import functools
from typing import List
from pydantic import BaseModel

import torch
import torch.distributed as dist
import openvino as ov


class GPUModel(BaseModel):
    name: str
    total_memory_mb: int
    max_compute_units: int
    eu_count: int
    support_fp64: bool
    support_fp16: bool
    support_atomic64: bool


def get_accelerator_device_information() -> List[GPUModel]:
    device_count = torch.xpu.device_count()
    devices = []
    for id in range(device_count):
        device = torch.xpu.get_device_properties(id)
        gpu_dev = GPUModel(
            name=device.name,
            total_memory_mb=int(device.total_memory / 1024 / 1024),
            max_compute_units=device.max_compute_units,
            eu_count=device.gpu_eu_count,
            support_atomic64=device.has_atomic64,
            support_fp16=device.has_fp16,
            support_fp64=device.has_fp64
        )
        devices.append(gpu_dev)
    return devices


def get_inference_device() -> str:
    """
    Select the appropriate inference device from the available devices.

    Returns:
        str: The selected inference device.
    """
    core = ov.Core()
    try:
        device_list = core.available_devices
        inference_device = "CPU"
        integrated_gpu = None
        for device in device_list:
            if 'GPU' in device:
                gpu_device_type = str(core.get_property(device, 'DEVICE_TYPE'))
                if gpu_device_type == "Type.DISCRETE":
                    return device
                elif gpu_device_type == "Type.INTEGRATED":
                    integrated_gpu = device

        if integrated_gpu:
            return integrated_gpu

        return inference_device
    except Exception as e:
        print(f"An error occurred while selecting the inference device: {e}")
        return "CPU"


def is_rank_zero():
    return not dist.is_initialized() or dist.get_rank() == 0


def monitor_xpu_ram(interval=1):
    """
    Decorator that monitors XPU RAM usage during function execution.
    
    Args:
        interval (float): Time interval in seconds between measurements.
        
    Usage:
        @monitor_xpu_ram()  # Note the parentheses
        def my_function():
            pass
            
        # OR with custom interval
        @monitor_xpu_ram(interval=0.5)
        def my_function():
            pass
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Flag to control monitoring
            monitoring = True
            
            # Function to monitor RAM in a separate thread
            def ram_monitor():
                print(f"Starting XPU RAM monitoring for function '{func.__name__}'")
                print(f"Monitoring interval: {interval} seconds")
                
                # Store peak memory usage
                peak_allocated = 0
                peak_reserved = 0
                
                while monitoring:
                    allocated_memory = torch.xpu.memory_allocated() / 1024**2
                    reserved_memory = torch.xpu.memory_reserved() / 1024**2
                    total_memory = torch.xpu.get_device_properties(0).total_memory / 1024**2
                    free_memory = total_memory - reserved_memory
                    
                    # Update peak values
                    peak_allocated = max(peak_allocated, allocated_memory)
                    peak_reserved = max(peak_reserved, reserved_memory)

                    print('-'*20)
                    print(f"Allocated Memory: {allocated_memory:.2f} MB")
                    print(f"Reserved Memory: {reserved_memory:.2f} MB")
                    print(f"Total Memory: {total_memory:.2f} MB")
                    print(f"Free Memory: {free_memory:.2f} MB")
                    print(f"Memory Usage: {100 * allocated_memory / total_memory:.2f}% \n")

                    time.sleep(interval)
                
                # Print summary when monitoring ends
                print(f"XPU RAM monitoring for '{func.__name__}' completed")
                print(f"Peak Allocated Memory: {peak_allocated:.2f} MB")
                print(f"Peak Reserved Memory: {peak_reserved:.2f} MB")
                print('-'*20)
            
            # Start monitoring thread
            monitor_thread = threading.Thread(target=ram_monitor)
            monitor_thread.daemon = True
            monitor_thread.start()
            
            try:
                # Execute the original function
                result = func(*args, **kwargs)
                return result
            finally:
                # Stop monitoring when function completes
                monitoring = False
                monitor_thread.join(timeout=interval*2)  # Wait for monitoring thread to finish
        
        return wrapper
    
    # Handle both @monitor_xpu_ram and @monitor_xpu_ram()
    if callable(interval):
        func = interval
        interval = 1
        return decorator(func)
    return decorator


def get_validated_model() -> List[str]:
    return [
        "mistralai/Mistral-7B-Instruct-v0.3",
        "meta-llama/Llama-3.2-1B-Instruct",
        "meta-llama/Llama-3.2-3B-Instruct",
        "Qwen/Qwen2.5-7B-Instruct"
    ]
