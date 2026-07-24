"""
api.py
======

FastAPI router implementing the 4-step Model Test wizard.

    Step 1  POST /api/wizard/step1-ingest              -> start ingestion (background task)
    Step 2  GET  /api/wizard/step2-structure/{job_id}  -> map + validate against telc schema
    Step 3  PUT  /api/wizard/step3-verify/{exam_id}    -> apply editor overrides
    Step 4  GET  /api/wizard/step4-export/{exam_id}     -> export verified JSON module
            GET  /api/wizard/step4-export/{exam_id}/pdf -> PDF compilation stub
"""

from __future__ import annotations

import logging
from typing import Any, Literal

from fastapi import APIRouter, BackgroundTasks, Body, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel, Field, ValidationError

from ingest import DisallowedByRobots, IngestError, SourceDocumentIngestor
from mapper import MappingError, map_raw_to_exam
from store import JobStatus, store
from telc_schema import TelcExam, TelcLevel

logger = logging.getLogger("mts.api")

router = APIRouter(prefix="/api/wizard", tags=["model-test-wizard"])
ingestor = SourceDocumentIngestor()


# --------------------------------------------------------------------------- #
# Request / response models
# --------------------------------------------------------------------------- #
class IngestRequest(BaseModel):
    """
    Exactly one source must be supplied.

    * ``html`` / ``text`` – content you own or authored (preferred).
    * ``url``             – a licensed/owned online source; fetched only if
                            robots.txt permits and with an honest User-Agent.
    """

    source_type: Literal["html", "text", "url"]
    payload: str = Field(..., min_length=1, description="HTML, text, or a URL.")
    source_note: str | None = Field(
        default=None, description="Ownership/licence note recorded with the job."
    )


class IngestResponse(BaseModel):
    job_id: str
    status: JobStatus


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    error: str | None = None


class StructureResponse(BaseModel):
    exam_id: str
    exam: TelcExam


class VerifyRequest(BaseModel):
    """Partial override document merged into the stored exam (deep merge)."""

    overrides: dict[str, Any] = Field(default_factory=dict)


# --------------------------------------------------------------------------- #
# Step 1 – ingest (background task)
# --------------------------------------------------------------------------- #
def _run_ingest(job_id: str, source_type: str, payload: str) -> None:
    store.update_job(job_id, status=JobStatus.RUNNING)
    try:
        if source_type == "html":
            raw = ingestor.from_html(payload)
        elif source_type == "text":
            raw = ingestor.from_text(payload)
        else:  # url
            raw = ingestor.from_url(payload)
        store.update_job(job_id, status=JobStatus.READY, raw=raw)
        logger.info("Ingest job %s completed", job_id)
    except DisallowedByRobots as exc:
        logger.warning("Ingest job %s blocked by robots.txt: %s", job_id, exc)
        store.update_job(job_id, status=JobStatus.FAILED, error=str(exc))
    except IngestError as exc:
        logger.error("Ingest job %s failed: %s", job_id, exc)
        store.update_job(job_id, status=JobStatus.FAILED, error=str(exc))
    except Exception as exc:  # noqa: BLE001 - background task must not bubble
        logger.exception("Ingest job %s crashed", job_id)
        store.update_job(job_id, status=JobStatus.FAILED, error=f"Unexpected: {exc}")


def _run_ingest_file(job_id: str, file_bytes: bytes, filename: str) -> None:
    store.update_job(job_id, status=JobStatus.RUNNING)
    try:
        from scraper import ContentIngester
        scraper_ingester = ContentIngester()
        text = scraper_ingester.extract_file(file_bytes, filename)
        
        # Parse structures using existing ingestor
        raw = ingestor.from_text(text)
        store.update_job(job_id, status=JobStatus.READY, raw=raw)
        logger.info("Ingest file job %s completed", job_id)
    except Exception as exc:
        logger.exception("Ingest file job %s crashed", job_id)
        store.update_job(job_id, status=JobStatus.FAILED, error=str(exc))


@router.post(
    "/step1-ingest",
    response_model=IngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def step1_ingest(req: IngestRequest, background: BackgroundTasks) -> IngestResponse:
    """Kick off ingestion asynchronously and return a job handle."""
    job = store.create_job(source_note=req.source_note)
    logger.info("Created ingest job %s (source_type=%s)", job.job_id, req.source_type)
    background.add_task(_run_ingest, job.job_id, req.source_type, req.payload)
    return IngestResponse(job_id=job.job_id, status=job.status)


@router.post(
    "/step1-ingest-file",
    response_model=IngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def step1_ingest_file(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    source_note: str | None = Form(None),
) -> IngestResponse:
    """Kick off ingestion from uploaded PDF or DOCX file asynchronously."""
    note = source_note or f"Uploaded file: {file.filename}"
    job = store.create_job(source_note=note)
    logger.info("Created file ingest job %s for file %s", job.job_id, file.filename)
    
    file_bytes = file.file.read()
    background.add_task(_run_ingest_file, job.job_id, file_bytes, file.filename)
    return IngestResponse(job_id=job.job_id, status=job.status)



@router.get("/step1-ingest/{job_id}/status", response_model=JobStatusResponse)
def step1_status(job_id: str) -> JobStatusResponse:
    """Poll the status of an ingestion job."""
    job = store.get_job(job_id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Job not found")
    return JobStatusResponse(job_id=job.job_id, status=job.status, error=job.error)


# --------------------------------------------------------------------------- #
# Step 2 – structure + validate
# --------------------------------------------------------------------------- #
@router.get("/step2-structure/{job_id}", response_model=StructureResponse)
def step2_structure(
    job_id: str,
    title: str = "telc Deutsch A2-B1 – Modelltest",
    level: TelcLevel = TelcLevel.A2_B1,
) -> StructureResponse:
    """Map the ingested raw content into a validated telc exam and store it."""
    job = store.get_job(job_id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.status == JobStatus.FAILED:
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail=f"Ingest failed: {job.error}"
        )
    if job.status != JobStatus.READY or job.raw is None:
        raise HTTPException(
            status.HTTP_425_TOO_EARLY, detail=f"Job not ready (status={job.status})"
        )

    exam_id = store.new_exam_id()
    try:
        exam = map_raw_to_exam(
            job.raw,
            exam_id=exam_id,
            title=title,
            level=level,
            source_licence=job.source_note,
        )
    except MappingError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    store.save_exam(exam)
    logger.info("Structured job %s into exam %s", job_id, exam_id)
    return StructureResponse(exam_id=exam_id, exam=exam)


# --------------------------------------------------------------------------- #
# Step 3 – verify / override
# --------------------------------------------------------------------------- #
def _deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    """Recursively merge ``override`` into ``base`` (returns a new dict)."""
    result = dict(base)
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


@router.put("/step3-verify/{exam_id}", response_model=TelcExam)
def step3_verify(
    exam_id: str,
    req: VerifyRequest = Body(...),
) -> TelcExam:
    """
    Apply editor overrides to a stored exam.

    The merged document is re-validated against the telc schema, so an invalid
    override is rejected with a 422 rather than corrupting the stored module.
    """
    exam = store.get_exam(exam_id)
    if exam is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Exam not found")

    merged = _deep_merge(exam.model_dump(mode="python"), req.overrides)
    try:
        updated = TelcExam.model_validate(merged)
    except ValidationError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors()
        ) from exc

    if updated.exam_id != exam_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail="exam_id is immutable"
        )

    store.save_exam(updated)
    logger.info("Applied overrides to exam %s", exam_id)
    return updated


# --------------------------------------------------------------------------- #
# Step 4 – export
# --------------------------------------------------------------------------- #
@router.get("/step4-export/{exam_id}", response_model=TelcExam)
def step4_export(exam_id: str) -> TelcExam:
    """Return the complete, verified exam module for front-end rendering."""
    exam = store.get_exam(exam_id)
    if exam is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Exam not found")
    return exam


class PdfExportResponse(BaseModel):
    exam_id: str
    status: Literal["not_implemented"]
    detail: str


@router.get("/step4-export/{exam_id}/pdf", response_model=PdfExportResponse)
def step4_export_pdf(exam_id: str) -> PdfExportResponse:
    """
    PDF compilation stub.

    Wire this to your PDF engine (e.g. WeasyPrint / a rendering worker). Kept as
    a stub so the wizard contract is complete without pulling in heavy deps.
    """
    exam = store.get_exam(exam_id)
    if exam is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Exam not found")
    logger.info("PDF export requested for exam %s (stub)", exam_id)
    return PdfExportResponse(
        exam_id=exam_id,
        status="not_implemented",
        detail="PDF compilation is not yet wired up; JSON export is available.",
    )
