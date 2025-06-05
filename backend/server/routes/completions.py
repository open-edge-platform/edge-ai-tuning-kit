# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 


import logging
import requests
from typing import Annotated, List, Union
from typing_extensions import TypedDict, Required

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from services.tasks import TaskService

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="",
    responses={404: {"description": "Unable to find routes for completions"}}
)


CONVERSATIONAL_PROMPT = """You are a helpful and truthful assistant. Answer the QUESTION below.

### QUESTION: 
{question}
"""

RAG_PROMPT = """Your task is to answer user question based on the provided CONTEXT. DO NOT USE YOUR OWN KNOWLEDGE TO ANSWER THE QUESTION.
If the QUESTION is out of CONTEXT, STRICTLY do not reply.

### TONE
Always reply in a gentle and helpful tone using English like a human.

### CONTEXT
{context}

### QUESTION
{question}
"""

NO_CONTEXT_FOUND_PROMPT = """You are a helpful and truthful assistant. Remind user that you do not have the data related to the question asked and mentioned to user what is the context available.

### TONE
Always reply in a gentle and helpful tone using English like a human.

### QUESTION
{question}
"""

QUERY_REWRITE_PROMPT = """You are a helpful assistant that generates multiple search queries based on a single input query.
Generate 5 search queries related to: {query}
"""

class ICreateCompletions(TypedDict, total=False):
    model: Required[str]
    prompt: Required[Union[List[int], List[List[int]], str, List[str], None]]
    projectID: Required[str]
    rag: bool = False
    endpoint: str = "http://host.docker.internal:5950/v1/completions"
    suffix: str
    max_tokens: int = 16
    temperature: Union[int, float] = 1
    top_p: Union[int, float] = 1
    n: int = 1
    stream: bool = False
    logprobs: int
    echo: bool = False
    stop: Union[str, List[str]]
    presence_penalty: float = 0
    frequency_penalty: float = 0
    best_of: int
    logit_bias: dict[str, float]
    user: str
    top_k: int = -1
    ignore_eos: bool = False
    use_beam_search: bool = False
    stop_token_ids: List[int]
    skip_special_tokens: bool = True

class ICreateChatCompletions(TypedDict, total=False):
    model: Required[str]
    messages: Required[List]
    endpoint: str = "http://host.docker.internal:5950/v1/completions"
    suffix: str
    max_tokens: int = 16
    temperature: Union[int, float] = 1
    top_p: Union[int, float] = 1
    n: int = 1
    stream: bool = False
    logprobs: int
    echo: bool = False
    stop: Union[str, List[str]]
    presence_penalty: float = 0
    frequency_penalty: float = 0
    best_of: int
    logit_bias: dict[str, float]
    user: str
    top_k: int = -1
    ignore_eos: bool = False
    use_beam_search: bool = False
    stop_token_ids: List[int]
    skip_special_tokens: bool = True


@router.get("/v1/completions/models", status_code=200)
async def models(endpoint: str = 'http://host.docker.internal:5950/v1/models'):
    try:
        result = requests.get(endpoint)
    except:
        return {"status": False, "message": "Invalid endpoint"}
    return result.json()

@router.post("/v1/chat/completions", status_code=200)
async def chat_completions(service: Annotated[TaskService, Depends()], taskService: Annotated[TaskService, Depends()], data: ICreateChatCompletions):
    def _streamer():
        for chunk in llm.iter_content(chunk_size=1024):
            yield (chunk)

    endpoint = data.get(
        'endpoint', "http://host.docker.internal:5950/v1/chat/completions")
    try:
        llm = requests.post(
            endpoint,
            json=data,
            stream=True
        )
    except:
        return {"status": False, "message": "Invalid data"}

    return StreamingResponse(_streamer(), media_type="text/event-stream")
