# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 


from typing import List
from pydantic import BaseModel


class FAQContent(BaseModel):
    question: str
    answer: str


class FAQ(BaseModel):
    faq: List[FAQContent]
