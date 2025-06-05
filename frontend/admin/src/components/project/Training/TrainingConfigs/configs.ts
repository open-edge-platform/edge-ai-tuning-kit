// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

export const supportedTaskType = [
    {
        name: 'LORA',
        description: 'Train model with LoRA adapter',
    },
    {
        name: 'QLORA',
        description: 'Train model with QLoRA adapter',
    },
];

export const numGPUs = [
    {
        name: '1',
        description: 'Training with single GPU',
    },
    {
        name: '-1',
        description: 'Training with all available GPUs',
    },
];

export const supportedDevice = [
    {
        name: 'xpu',
        description: 'Intel® Discrete Graphics GPU',
    }
];