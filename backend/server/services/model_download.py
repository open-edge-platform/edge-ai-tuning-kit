# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

import os
import logging
from multiprocessing import Process
from huggingface_hub import snapshot_download
from tqdm.auto import tqdm

from sqlalchemy import create_engine
from sqlalchemy.engine.url import URL
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

# Active download processes keyed by model DB id
ACTIVE_DOWNLOADS = {}


def _create_subprocess_db_session():
    """Create a fresh DB engine and session for use in a forked subprocess.
    SQLAlchemy connection pools are not fork-safe, so subprocesses must
    create their own engine."""
    db_url = URL.create(
        drivername="postgresql",
        username=os.environ.get("POSTGRES_USER", "postgres"),
        password=os.environ.get("POSTGRES_PASSWORD", "postgres"),
        host=os.environ.get("POSTGRES_URI", "postgres"),
        database=os.environ.get("POSTGRES_DB", "postgres"),
    )
    engine = create_engine(db_url)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return Session()


def _update_model_in_db(db, model_id: int, data: dict):
    """Update model record using the provided DB session."""
    from models.llm import LLMModel
    try:
        db.query(LLMModel).filter(LLMModel.id == model_id).update(data)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[model_download] DB update failed for model {model_id}: {e}")


class _ProgressTqdm(tqdm):
    """tqdm subclass that reports download progress to the database.
    Only tracks the file-count progress bar (small total = number of files),
    not the per-file byte progress bars (large total = file size in bytes)."""

    record_id = None
    model_name = None
    db_session = None
    _last_logged_pct = -1

    def update(self, n=1):
        ret = super().update(n)
        if not self.total or self.total <= 0:
            return ret

        # Only track file-level progress (total = number of files, small number).
        # Skip per-file byte-level progress bars (total = bytes, large number).
        if self.total > 1000:
            return ret

        pct = int(self.n * 100 / self.total)
        if pct == self._last_logged_pct:
            return ret
        self._last_logged_pct = pct

        if self.db_session:
            _update_model_in_db(
                self.db_session,
                self.record_id,
                {
                    "download_metadata": {
                        "status": "DOWNLOADING",
                        "progress": pct,
                    }
                },
            )
        return ret


def _make_tqdm_class(record_id: int, model_name: str, db_session):
    """Factory that returns a tqdm class with injected context."""
    class ProgressTqdm(_ProgressTqdm):
        pass
    ProgressTqdm.record_id = record_id
    ProgressTqdm.model_name = model_name
    ProgressTqdm.db_session = db_session
    ProgressTqdm._last_logged_pct = -1
    return ProgressTqdm


def _download_worker(record_id: int, model_id: str, model_dir: str, model_revision: str):
    """Target function executed in a separate process."""
    import sys
    log_file = f"/tmp/download_{record_id}.log"
    log = open(log_file, "w", buffering=1)
    sys.stdout = log
    sys.stderr = log

    db = _create_subprocess_db_session()
    try:
        print(f"[model_download] Starting download for {model_id}...")
        _update_model_in_db(db, record_id, {
            "download_metadata": {
                "status": "DOWNLOADING",
                "progress": 0,
            }
        })

        tqdm_class = _make_tqdm_class(record_id, model_id, db)

        snapshot_download(
            repo_id=model_id,
            revision=model_revision,
            local_dir=model_dir,
            ignore_patterns=["*.pth"],
            tqdm_class=tqdm_class,
        )

        _update_model_in_db(db, record_id, {
            "is_downloaded": True,
            "download_metadata": {
                "status": "SUCCESS",
                "progress": 100,
            }
        })
        print(f"[model_download] Download completed for {model_id}")

    except Exception as e:
        print(f"[model_download] Download failed for {model_id}: {e}")
        _update_model_in_db(db, record_id, {
            "download_metadata": {
                "status": "FAILED",
                "progress": -1,
            }
        })
    finally:
        db.close()


def start_download(record_id: int, model_id: str, model_dir: str, model_revision: str):
    """Start a model download in an isolated background process. Returns the Process."""
    if record_id in ACTIVE_DOWNLOADS and ACTIVE_DOWNLOADS[record_id].is_alive():
        return ACTIVE_DOWNLOADS[record_id]

    p = Process(
        target=_download_worker,
        args=(record_id, model_id, model_dir, model_revision),
        daemon=True,
    )
    p.start()
    ACTIVE_DOWNLOADS[record_id] = p
    return p


def stop_download(record_id: int):
    """Terminate a running download process."""
    if record_id in ACTIVE_DOWNLOADS and ACTIVE_DOWNLOADS[record_id].is_alive():
        ACTIVE_DOWNLOADS[record_id].terminate()
        ACTIVE_DOWNLOADS[record_id].join(timeout=5)
        del ACTIVE_DOWNLOADS[record_id]
