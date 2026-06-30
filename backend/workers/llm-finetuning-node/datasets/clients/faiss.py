# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0 

import os
import re
import ast
import time
import shutil
import logging

from FlagEmbedding import FlagReranker
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    TextLoader,
    PyPDFLoader,
    UnstructuredHTMLLoader,
    UnstructuredPowerPointLoader,
)

EMBEDDING_MODEL = SentenceTransformerEmbeddings(model_name="BAAI/bge-large-en-v1.5")
RERANKER_MODEL = FlagReranker("BAAI/bge-reranker-base", use_fp16=True)

class FaissClient:
    def __init__(self, dataset_id) -> None:
        self.logger = logging.getLogger(__name__)
        self.base_dir = f"/usr/src/app/data/projects/{dataset_id}"
        self.faiss_path = f"{self.base_dir}/faissdb"
        self.doc_dir = f"{self.base_dir}/faiss/documents"
        
        if not os.path.isdir(self.faiss_path):
            os.makedirs(self.base_dir, exist_ok=True)
        if not os.path.isdir(self.doc_dir):
            os.makedirs(self.doc_dir, exist_ok=True)

        self.embedding = EMBEDDING_MODEL
        self.reranker = RERANKER_MODEL

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

    def _load_db(self):
        """Load existing FAISS database or return None if not found."""
        if not os.path.exists(self.faiss_path):
            return None
        return FAISS.load_local(
            self.faiss_path, self.embedding, allow_dangerous_deserialization=True
        )

    def _save_db(self, db):
        """Persist FAISS database to disk."""
        os.makedirs(self.faiss_path, exist_ok=True)
        db.save_local(self.faiss_path)

    def _save_text_embeddings(self, text_chunks):
        try:
            db = self._load_db()
            if db is not None:
                db.add_documents(text_chunks)
            else:
                db = FAISS.from_documents(text_chunks, self.embedding)
            self._save_db(db)
            return True
        except Exception as error:
            self.logger.error(
                f"Failed to save embeddings from vector db. Error: {error}")
            return False

    def _query_embeddings(self, db, query, vectorK):
        results = db.similarity_search(query, k=vectorK)
        return [doc.page_content for doc in results]

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

    def get_all_collection_data(self, page, pageSize, source=None):
        try:
            db = self._load_db()
            if db is None:
                return None

            # Retrieve all documents from the vector store
            all_docs = db.get_by_ids(list(db.index_to_docstore_id.values()))

            # Filter by source if specified
            if source:
                all_docs = [doc for doc in all_docs if doc.metadata.get("source") == source]

            num_data = len(all_docs)

            # Apply pagination
            start = (page - 1) * pageSize
            end = min(start + pageSize, num_data)

            doc_chunks = []
            for i in range(start, end):
                doc = all_docs[i]
                doc_chunks.append({
                    "chunk_id": i,
                    "id": doc.id,
                    "chunk": doc.page_content,
                    "metadata": doc.metadata
                })

            return {
                "num_embeddings": num_data,
                "doc_chunks": doc_chunks
            }
        except Exception as error:
            self.logger.error(
                f"Failed to retrieve all the data from vector db. Error: {error}")
            return None

    def get_all_sources(self):
        try:
            db = self._load_db()
            if db is None:
                return []

            all_docs = db.get_by_ids(list(db.index_to_docstore_id.values()))
            sources_list = [doc.metadata.get("source", "").split("/")[-1] for doc in all_docs]
            unique_source_list = list(set(sources_list))
            return unique_source_list
        except Exception as error:
            self.logger.error(
                f"Failed to retrieve all the data sources from vector db. Error: {error}")
            return []

    def get_num_embeddings(self):
        try:
            db = self._load_db()
            if db is None:
                return 0
            return db.index.ntotal
        except Exception as error:
            self.logger.error(
                f"Failed to retrieve the number of embeddings from vector db. Error: {error}")
            return 0

    def query_data(self, query, vectorK=20, vectorP=3):
        try:
            db = self._load_db()
            if db is None:
                return []

            start_time = time.perf_counter()
            text_embeddings_results = self._query_embeddings(
                db, query[0], vectorK)
            embeddings_elapsed_time = time.perf_counter() - start_time
            self.logger.info(
                f"Embeddings performance: {embeddings_elapsed_time:.4} secs")

            start_time = time.perf_counter()
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
                file_path = f"{self.doc_dir}/{file_name}"
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
                    f"Text embeddings created saved in {self.faiss_path}")
            except Exception as error:
                self.logger.error(
                    f"Failed to create collection data. Error: {error}")
                return None
        self.logger.info(
            f"Text embeddings created successfully.")
        return True

    def delete_data(self, doc_uuid):
        try:
            db = self._load_db()
            if db is None:
                return False

            db.delete([str(doc_uuid)])
            self._save_db(db)
            return True
        except Exception as error:
            self.logger.error(
                f"Failed to delete data: {doc_uuid} from vector db. Error: {error}")
            return False

    def delete_data_by_source(self, source):
        try:
            db = self._load_db()
            if db is None:
                return False

            all_docs = db.get_by_ids(list(db.index_to_docstore_id.values()))
            doc_ids_to_delete = [
                doc.id for doc in all_docs if doc.metadata.get("source") == source
            ]

            if doc_ids_to_delete:
                db.delete(doc_ids_to_delete)
                self._save_db(db)
            return True
        except Exception as error:
            self.logger.error(
                f"Failed to delete data source: {source} from vector db. Error: {error}")
            return False

    def delete_collection(self):
        # Remove FAISS DB
        if os.path.exists(self.faiss_path):
            if os.path.isdir(self.faiss_path):
                shutil.rmtree(self.faiss_path)
            else:
                os.remove(self.faiss_path)
        # Remove documents directory
        faiss_dir = f"{self.base_dir}/faiss"
        if os.path.isdir(faiss_dir):
            shutil.rmtree(faiss_dir)
        return True
