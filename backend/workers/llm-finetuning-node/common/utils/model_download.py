# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

import asyncio
from tqdm.auto import tqdm
from huggingface_hub import snapshot_download
from celery.utils.log import get_task_logger

from utils.clients import ModelsService, update_model_download_progress


EXPORT_PATH = "./data/cache/hub"
logger = get_task_logger(__name__)


# ------------------------------------------------------------
# Async-safe helper
# ------------------------------------------------------------
def fire_and_forget(coro):
    """
    Safely execute an async coroutine from sync code.
    Works whether an event loop is running or not.
    """
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        # No running loop → safe to block
        asyncio.run(coro)
    else:
        # Running loop → schedule task
        loop.create_task(coro)


# ------------------------------------------------------------
# Base tqdm class (HF-compatible)
# ------------------------------------------------------------
class HFProgressTqdm(tqdm):
    """
    tqdm class compatible with huggingface_hub.snapshot_download
    with logging + async progress updates.
    """

    # Injected via subclass
    model_id = None
    task_id = None
    record_id = None
    logger = None
    log_every_pct = 1

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._last_logged_pct = -1

    def update(self, n=1):
        ret = super().update(n)
        self._maybe_log_progress()
        return ret

    def _maybe_log_progress(self):
        # total may not exist early
        if not self.total or self.total <= 0:
            return

        pct = int(self.n * 100 / self.total)

        # throttle updates
        if pct == self._last_logged_pct:
            return
        if pct % self.log_every_pct != 0:
            return

        self._last_logged_pct = pct

        if self.logger:
            self.logger.info(f"Downloading {self.model_id}: {pct}%")

        fire_and_forget(
            update_model_download_progress(
                self.record_id,
                {
                    "download_metadata": {
                        "download_task_id": self.task_id,
                        "status": "DOWNLOADING",
                        "progress": pct,
                    }
                },
            )
        )


# ------------------------------------------------------------
# Factory that returns a REAL tqdm class (critical!)
# ------------------------------------------------------------
def make_hf_tqdm_class(
    *,
    model_id: str,
    task_id: str,
    record_id: int,
    logger,
    log_every_pct: int = 1,
):
    class _HFProgressTqdm(HFProgressTqdm):
        pass

    _HFProgressTqdm.model_id = model_id
    _HFProgressTqdm.task_id = task_id
    _HFProgressTqdm.record_id = record_id
    _HFProgressTqdm.logger = logger
    _HFProgressTqdm.log_every_pct = max(1, log_every_pct)

    return _HFProgressTqdm


# ------------------------------------------------------------
# Main download pipeline
# ------------------------------------------------------------
def HFModelDownloadPipeline(
    id: int,
    task_id: str,
    model_id: str,
    model_dir: str,
    model_revision: str = "main",
):
    model_client = ModelsService()

    try:
        logger.info("Starting HF model download task...")

        # Initial DB state
        model_client.update_status(
            id,
            {
                "download_metadata": {
                    "download_task_id": task_id,
                    "status": "DOWNLOADING",
                    "progress": -1,
                }
            },
        )

        tqdm_class = make_hf_tqdm_class(
            model_id=model_id,
            task_id=task_id,
            record_id=id,
            logger=logger,
            log_every_pct=1,
        )

        snapshot_download(
            repo_id=model_id,
            revision=model_revision,
            local_dir=model_dir,
            resume_download=True,
            ignore_patterns=["*.pth"],
            tqdm_class=tqdm_class,
        )

        logger.info(f"{model_id} downloaded successfully to {model_dir}")

        # Final DB state
        model_client.update_status(
            id,
            {
                "is_downloaded": True,
                "download_metadata": {
                    "download_task_id": None,
                    "status": "SUCCESS",
                    "progress": 100,
                },
            },
        )

        return True

    except Exception as error:
        logger.exception("HF model download failed")

        model_client.update_status(
            id,
            {
                "download_metadata": {
                    "download_task_id": None,
                    "status": "FAILED",
                    "progress": -1,
                },
            },
        )

        raise RuntimeError(
            f"Failed to download {model_id}. Error: {error}"
        )
