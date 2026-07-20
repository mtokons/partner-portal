"""
main.py
=======

FastAPI application entry point for the Model Test Learning System backend.
Integrates ContentIngester and generator to build mock exams.
"""

from __future__ import annotations

import logging
from pydantic import BaseModel, Field

from fastapi import FastAPI, HTTPException, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware

from api import router as wizard_router
from scraper import ContentIngester
from generator import generate_mock_exam, TelcExamSchema

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)
logger = logging.getLogger("mts.main")

app = FastAPI(
    title="SCCG Model Test Learning System",
    version="1.1.0",
    description=(
        "Backend for building telc Deutsch A2-B1 model tests from content the "
        "operator owns or has licensed, plus automatic Gemini-based test generation."
    ),
)

# Enable CORS for local testing and cross-origin frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register existing wizard router to maintain compatibility
app.include_router(wizard_router)

# Instantiate scraper in-memory
ingester = ContentIngester()


class UrlIngestRequest(BaseModel):
    url: str = Field(..., description="The URL of the reference material to scrape.")


@app.get("/health", tags=["ops"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/api/ingest/url",
    response_model=TelcExamSchema,
    status_code=status.HTTP_200_OK,
    tags=["ingest"],
)
def ingest_url(req: UrlIngestRequest) -> TelcExamSchema:
    """
    Accepts a URL string, scrapes the text content, generates a completely original
    mock exam using Gemini 2.5 Flash, and returns the validated JSON.
    """
    logger.info("Received URL ingest request for: %s", req.url)
    try:
        raw_text = ingester.scrape_url(req.url)
        if not raw_text.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Scraped URL contains no readable text content.",
            )
            
        exam = generate_mock_exam(raw_text)
        return exam
    except ValueError as e:
        logger.error("Validation or URL error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except RuntimeError as e:
        logger.error("AI Generation pipeline failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        )
    except Exception as e:
        logger.exception("Unexpected error during URL ingestion pipeline")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {e}",
        )


@app.post(
    "/api/ingest/file",
    response_model=TelcExamSchema,
    status_code=status.HTTP_200_OK,
    tags=["ingest"],
)
async def ingest_file(file: UploadFile = File(...)) -> TelcExamSchema:
    """
    Accepts an uploaded file (TXT or PDF), extracts the text, generates a completely
    original mock exam using Gemini 2.5 Flash, and returns the validated JSON.
    """
    logger.info("Received file upload ingest request for: %s", file.filename)
    try:
        contents = await file.read()
        raw_text = ingester.extract_file(contents, file.filename)
        
        if not raw_text.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Uploaded file contains no readable text content.",
            )
            
        exam = generate_mock_exam(raw_text)
        return exam
    except ValueError as e:
        logger.error("File extraction error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except RuntimeError as e:
        logger.error("AI Generation pipeline failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        )
    except Exception as e:
        logger.exception("Unexpected error during file ingestion pipeline")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {e}",
        )
