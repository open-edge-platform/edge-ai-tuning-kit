# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import sys
__import__('pysqlite3')
sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')

import re
import ast
import time
import uuid
import shutil
import logging
import chromadb

from chromadb.config import Settings
from FlagEmbedding import FlagReranker
from chromadb.utils import embedding_functions
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    TextLoader,
    PyPDFLoader,
    UnstructuredHTMLLoader,
    UnstructuredPowerPointLoader,
)

EMBEDDING_MODEL = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="BAAI/bge-large-en-v1.5")
RERANKER_MODEL = FlagReranker("BAAI/bge-reranker-base", use_fp16=True)

class Score:
    def __init__(self, page_content, metadata, new_score=None):
        self.page_content = page_content
        self.metadata = metadata
        self.new_score = new_score

class ChromaClient:
    def __init__(self, dataset_id) -> None:
        self.logger = logging.getLogger(__name__)
        self.db_dir = f"/usr/src/app/data/projects/{dataset_id}/chroma"
        self.doc_dir = f"/usr/src/app/data/projects/{dataset_id}/chroma/documents"
        
        if not os.path.isdir(self.db_dir):
            os.makedirs(self.db_dir, exist_ok=True)

        self.embedding = EMBEDDING_MODEL
        self.reranker = RERANKER_MODEL
        self.collection_name = "text-embeddings"
        self.client = chromadb.PersistentClient(self.db_dir, settings=Settings(anonymized_telemetry=False))
        self.client.get_or_create_collection(
            self.collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    def _read_file(self, file_path):
        if not os.path.isfile(file_path):
            raise FileNotFoundError(
                f"Unable to find file at path: {file_path}")
        if file_path.endswith(".txt"):
            loader = TextLoader(file_path)
        elif file_path.endswith(".pdf"):
            loader = PyPDFLoader(str(file_path))
        else:
            raise NotImplementedError(
                f"No loader implemented for {file_path}.")
        documents = loader.load()
        return documents

    def _text_chunking(self, texts):
        processed_documents = []
        for doc in texts:
            if hasattr(doc, 'page_content'):
                doc.page_content = re.sub(
                    r'\s+', ' ', doc.page_content.replace("\n", " ")).strip()
                if hasattr(doc, 'metadata'):
                    if 'source' in doc.metadata:
                        doc.metadata['source'] = doc.metadata['source'].split(
                            "/")[-1]
                        doc.page_content += doc.page_content + \
                            '\n' + 'Source: ' + doc.metadata['source']
                    if 'page' in doc.metadata:
                        doc_page = doc.metadata['page']
                        doc.page_content += f" (Page {doc_page})"
                processed_documents.append(doc)
        return processed_documents

    def _verify_text_chunk(self, text_chunk):
        if len(text_chunk.page_content) == 0:
            self.logger.warning("No text found from the current text chunk.")
            return False
        else:
            return True

    def _save_text_embeddings(self, text_chunks):
        try:
            collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"},
                embedding_function=self.embedding
            )

            texts = [doc.page_content for doc in text_chunks]
            metadatas = [doc.metadata for doc in text_chunks]
            ids = [str(uuid.uuid4()) for doc in text_chunks]

            collection.add(
                metadatas=metadatas,
                documents=texts,
                ids=ids
            )
            return True
        except Exception as error:
            self.logger.error(
                f"Failed to save embeddings from vector db. Error: {error}")
            return False

    def _query_embeddings(self, collection, query, vectorK):
        results = collection.query(
            query_texts=[query],
            n_results=vectorK
        )
        return results['documents'][0]

    def _rerank_embeddings(self, query, text_embeddings_results, vectorP):
        scores = self.reranker.compute_score(
            [[query, str(text_chunk)]
             for text_chunk in text_embeddings_results],
            normalize=True
        )
        reranked_results = [{'document': doc, 'score': round(sc*100, 2)} for sc, doc in sorted(
            zip(scores, text_embeddings_results), reverse=True)]

        if len(reranked_results) <= vectorP:
            filtered_reranked_results = reranked_results
        else:
            filtered_reranked_results = reranked_results[:vectorP]
        return filtered_reranked_results

    def get_num_embeddings(self):
        try:
            collection = self.client.get_or_create_collection(
                name=self.collection_name,
                embedding_function=self.embedding
            )
            data = collection.get()
            return len(data["ids"])
        except Exception as error:
            self.logger.error(
                f"Failed to get number of total embeddings from vector db. Error: {error}")

    def get_all_collection_data(self, page, pageSize, source):
        try:
            collection = self.client.get_or_create_collection(
                name=self.collection_name
            )
            if source:
                data = collection.get(where={"source": source})
            else:
                data = collection.get()
            num_embeddings = len(data["ids"])
            doc_chunk_list = [
                {
                    "ids": data["ids"][x],
                    "chunk": data["documents"][x],
                    "source": data["metadatas"][x]["source"].split("/")[-1],
                    "page": data["metadatas"][x]["page"],
                }
                for x in range(num_embeddings)
            ]
            doc_chunk_list = sorted(doc_chunk_list, key=lambda x: x['page'])
            start_index = (page - 1) * pageSize
            end_index = start_index + pageSize
            paginated_data = doc_chunk_list[start_index:end_index]
            data = {
                "num_embeddings": num_embeddings,
                "doc_chunks": paginated_data,
                "current_page": page,
                "total_pages": (num_embeddings + pageSize - 1) // pageSize,
            }
            return data
        except Exception as error:
            self.logger.error(
                f"Failed to retrieve get collection data from vector db. Error: {error}")
            return {
                "num_embeddings": num_embeddings,
                "doc_chunks": {
                    "ids": [],
                    "chunk": [],
                    "source": [],
                    "page": [],
                },
                "current_page": page,
                "total_pages": (num_embeddings + pageSize - 1) // pageSize,
            }

    def get_all_sources(self):
        try:
            collection = self.client.get_or_create_collection(
                name=self.collection_name,
            )
            data = collection.get()
            num_data = len(data["ids"])
            sources_list = [data["metadatas"][x]["source"].split(
                "/")[-1] for x in range(num_data)]
            unique_source_list = list(set(sources_list))
            return unique_source_list
        except Exception as error:
            self.logger.error(
                f"Failed to retrieve all the data sources from vector db. Error: {error}")
            return []

    def query_data(self, query, vectorK=20, vectorP=3):
        try:
            collection = self.client.get_collection(
                name=self.collection_name,
                embedding_function=self.embedding
            )
            start_time = time.perf_counter()
            text_embeddings_results = self._query_embeddings(
                collection, query, vectorK)
            embeddings_elapsed_time = time.perf_counter() - start_time
            self.logger.info(
                f"Embeddings performance: {embeddings_elapsed_time:.4} secs")

            start_time = time.perf_counter()
            # Using the original query here for reranking
            reranked_results = self._rerank_embeddings(
                query[0], text_embeddings_results, vectorP)
            reranker_elapsed_time = time.perf_counter() - start_time
            self.logger.info(
                f"Reranker performance: {reranker_elapsed_time:.4} secs")
            return reranked_results

        except Exception as error:
            self.logger.error(
                f"Failed to get embeddings and reranked results from vector db. Error: {error}")
            return []

    def create_collection_data(self, processed_list, chunk_size, chunk_overlap):
        processed_list = ast.literal_eval(processed_list)
        for file_name in processed_list:
            try:
                file_path = f"{self.db_dir}/documents/{file_name}"
                documents = self._read_file(file_path)
                text_splitter = RecursiveCharacterTextSplitter(
                    chunk_size=int(chunk_size),
                    chunk_overlap=int(chunk_overlap),
                    length_function=len,
                    is_separator_regex=False
                )
                texts = text_splitter.split_documents(documents)
                self.logger.info(f"Length of original text chunks: {len(texts)}")

                processed_documents = self._text_chunking(texts)
                self.logger.info(
                    f"Length of processed text chunks: {len(processed_documents)}")

                if len(processed_documents) == 0:
                    raise RuntimeError(
                        "No text chunks retrieved from the documents.")

                verified_text_chunks = []
                for i, chunk in enumerate(processed_documents):
                    self.logger.info(
                        f"Processing chunk: {i+1} / {len(processed_documents)}")
                    isTextChunkOk = self._verify_text_chunk(chunk)
                    if isTextChunkOk:
                        verified_text_chunks.append(chunk)
                self.logger.info(
                    f"Num of verified text chunks: {len(verified_text_chunks)}")

                self._save_text_embeddings(verified_text_chunks)
                self.logger.info(
                    f"Text embeddings created saved in {self.db_dir}")
            except Exception as error:
                self.logger.error(
                    f"Failed to create collection data. Error: {error}")
                return None
        self.logger.info(
            f"Text embeddings created successfully.")
        return True

    def delete_data(self, uuid):
        try:
            collection = self.client.get_collection(
                name=self.collection_name,
                embedding_function=self.embedding
            )
            collection.delete(
                ids=[str(uuid)]
            )
            return True
        except Exception as error:
            self.logger.error(
                f"Failed to delete data: {uuid} from vector db. Error: {error}")
            return False

    def delete_data_by_source(self, source):
        try:
            collection = self.client.get_collection(
                name=self.collection_name,
            )
            response = collection.get(
                where={"source": source},
            )
            doc_ids = [doc_id for doc_id in response["ids"]]
            collection.delete(ids=doc_ids)
            return True
        except Exception as error:
            self.logger.error(
                f"Failed to delete data source: {source} from vector db. Error: {error}")
            return False

    def delete_collection(self):
        if not os.path.isdir(self.db_dir):
            self.logger.warning(f"Unable to find {self.db_dir}")
            return False
        shutil.rmtree(self.db_dir)
        return True
