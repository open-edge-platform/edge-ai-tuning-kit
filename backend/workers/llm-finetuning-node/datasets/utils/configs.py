# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

GENERATION_MODEL = "./data/models/hf/Mistral-7B-Instruct-v0.3"
GENERATION_OV_MODEL = "./data/models/ov/Mistral-7B-Instruct-v0.3"
FAQ_GENERATION_TEMPLATE = """You are a helpful assistant with expertise in content analysis and question generation.

## Task: 
- Thoroughly analyze the provided document context.
- Generate {num_generation_per_page} insightful and accurate question-and-answer pairs that capture the key points of the document.
- Ensure that your questions are clear and engaging.
- Provide concise answers that are directly supported by the context.
- Format your response using clear markdown formatting (e.g., bullet points, numbered lists, or tables) for better readability and organization.

## Language Requirement:
- All responses must be in {language}.

## Document Context:
{context}
"""
ANALYSE_DATA_MEANINGFUL_SYS_MESSAGE = """You are a reliable and informative assistant. You are provided with a context and your task is to analyze if the context is meaningful.
Is the following context meaningful? (YES or NO)

### Context
{context}
"""
DATASET_AUGMENT_SYS_MESSAGE = """You are a helpful assistant. Your task is to rephrase the given sentence and retain the original meaning.

## Given sentence: {original_sentence}
"""