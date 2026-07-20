"""
store.py
========

Minimal in-memory persistence for wizard jobs and validated exams.

This is a deliberately small, thread-safe store so the API layer stays clean.
Swap the two dictionaries for Redis / a database in production without changing
the router contract.
"""

from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any

import os
import json
import logging
from pathlib import Path

from ingest import RawExamContent
from telc_schema import TelcExam


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    READY = "ready"
    FAILED = "failed"


@dataclass
class IngestJob:
    job_id: str
    status: JobStatus = JobStatus.PENDING
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    source_note: str | None = None
    error: str | None = None
    raw: RawExamContent | None = None

    def touch(self) -> None:
        self.updated_at = datetime.now(timezone.utc)


class Store:
    """Thread-safe registry of jobs and validated exams with filesystem persistence."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._jobs: dict[str, IngestJob] = {}
        self._exams: dict[str, TelcExam] = {}
        
        # Setup file-based persistence
        self.exams_dir = Path(__file__).parent / "exams"
        self.exams_dir.mkdir(parents=True, exist_ok=True)
        self._load_all_exams()

    def _load_all_exams(self) -> None:
        logger = logging.getLogger("mts.store")
        for filepath in self.exams_dir.glob("*.json"):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                exam = TelcExam.model_validate(data)
                self._exams[exam.exam_id] = exam
                logger.info("Pre-loaded exam '%s' from %s", exam.exam_id, filepath.name)
            except Exception as e:
                logger.error("Failed to load pre-configured exam from %s: %s", filepath.name, e)

    # ----------------------------- jobs ------------------------------- #
    def create_job(self, source_note: str | None = None) -> IngestJob:
        with self._lock:
            job = IngestJob(job_id=uuid.uuid4().hex, source_note=source_note)
            self._jobs[job.job_id] = job
            return job

    def get_job(self, job_id: str) -> IngestJob | None:
        with self._lock:
            return self._jobs.get(job_id)

    def update_job(
        self,
        job_id: str,
        *,
        status: JobStatus | None = None,
        raw: RawExamContent | None = None,
        error: str | None = None,
    ) -> IngestJob | None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return None
            if status is not None:
                job.status = status
            if raw is not None:
                job.raw = raw
            if error is not None:
                job.error = error
            job.touch()
            return job

    # ----------------------------- exams ------------------------------ #
    def save_exam(self, exam: TelcExam) -> None:
        with self._lock:
            self._exams[exam.exam_id] = exam
            # Persist to disk as JSON
            try:
                filepath = self.exams_dir / f"{exam.exam_id}.json"
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(exam.model_dump_json(indent=2))
            except Exception as e:
                logging.getLogger("mts.store").error(
                    "Failed to persist exam %s to disk: %s", exam.exam_id, e
                )

    def get_exam(self, exam_id: str) -> TelcExam | None:
        with self._lock:
            # Check memory first
            exam = self._exams.get(exam_id)
            if exam is not None:
                return exam
            
            # Fallback to loading from disk if it exists
            filepath = self.exams_dir / f"{exam_id}.json"
            if filepath.exists():
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    exam = TelcExam.model_validate(data)
                    self._exams[exam_id] = exam
                    return exam
                except Exception as e:
                    logging.getLogger("mts.store").error(
                        "Failed to load exam %s from disk: %s", exam_id, e
                    )
            return None

    def delete_exam(self, exam_id: str) -> bool:
        with self._lock:
            # Remove from memory
            deleted_mem = self._exams.pop(exam_id, None) is not None
            # Remove from disk
            filepath = self.exams_dir / f"{exam_id}.json"
            deleted_disk = False
            if filepath.exists():
                try:
                    filepath.unlink()
                    deleted_disk = True
                except Exception as e:
                    logging.getLogger("mts.store").error(
                        "Failed to delete exam %s from disk: %s", exam_id, e
                    )
            return deleted_mem or deleted_disk

    def new_exam_id(self) -> str:
        return f"exam_{uuid.uuid4().hex[:12]}"


# Module-level singleton used by the API layer.
store = Store()

