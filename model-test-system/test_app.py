"""
test_app.py
===========

Tests for the FastAPI Application Layer of the Model Test Learning System backend.
Mocks external requests and Gemini API calls to ensure quick, deterministic validation.
"""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Mock the entire google-genai client before importing main/generator to prevent initialization issues
mock_genai_client = MagicMock()
import sys
# Make sure google/genai modules exist in path or mock them if necessary.
# Since we installed google-genai, the import will succeed, but we want to mock it.

from main import app
from generator import TelcExamSchema

client = TestClient(app)

# Dummy schema-matching response structure
MOCK_EXAM_DATA = {
    "metadata": {
        "level": "A2-B1",
        "title": "Deutsches Zertifikat Modelltest"
    },
    "lesen": [
        {
            "part": 1,
            "instructions": "Ordnen Sie die Situationen den Anzeigen zu.",
            "passage": None,
            "advertisements": [
                {"ref": "a", "text": "Suche Wohnung in Berlin"}
            ],
            "matching_items": [
                {"number": 1, "prompt": "Jemand sucht ein Zimmer.", "correct_ref": "a"}
            ],
            "tf_items": None,
            "mc_items": None
        },
        {
            "part": 2,
            "instructions": "Lesen Sie den Text und entscheiden Sie: richtig oder falsch?",
            "passage": "Berlin ist die Hauptstadt von Deutschland.",
            "advertisements": None,
            "matching_items": None,
            "tf_items": [
                {"number": 6, "statement": "Berlin ist eine Stadt.", "answer": True}
            ],
            "mc_items": None
        },
        {
            "part": 3,
            "instructions": "Ordnen Sie zu.",
            "passage": None,
            "advertisements": [
                {"ref": "a", "text": "Deutschkurs am Abend"}
            ],
            "matching_items": [
                {"number": 11, "prompt": "Jemand möchte Deutsch lernen.", "correct_ref": "a"}
            ],
            "tf_items": None,
            "mc_items": None
        },
        {
            "part": 4,
            "instructions": "Wählen Sie die richtige Antwort.",
            "passage": "Das Museum ist heute geschlossen.",
            "advertisements": None,
            "matching_items": None,
            "tf_items": None,
            "mc_items": [
                {
                    "number": 16,
                    "question": "Wann ist das Museum geöffnet?",
                    "options": [
                        {"key": "a", "text": "Heute"},
                        {"key": "b", "text": "Morgen"},
                        {"key": "c", "text": "Nie"}
                    ],
                    "correct_key": "b"
                }
            ]
        }
    ],
    "sprachbausteine": {
        "instructions": "Was passt in die Lücken?",
        "text_with_gaps": "Sehr geehrte Damen und Herren, __21__ freue mich...",
        "gaps": {
            "21": {"a": "ich", "b": "du", "c": "wir"}
        },
        "correct_answers": {
            "21": "a"
        }
    },
    "schreiben": {
        "instructions": "Schreiben Sie einen Brief.",
        "prompts": [
            {
                "title": "Aufgabe 1: Einladung",
                "situation": "Sie haben eine Einladung erhalten.",
                "task_description": "Antworten Sie auf die Einladung."
            }
        ]
    }
}

@pytest.fixture
def mock_gemini():
    """Mocks the generate_content call on the genai client."""
    with patch("generator.genai.Client") as mock_client_cls:
        # Mock API key environment variable
        with patch.dict("os.environ", {"GEMINI_API_KEY": "fake-api-key"}):
            mock_client = MagicMock()
            mock_client_cls.return_value = mock_client
            
            mock_response = MagicMock()
            mock_response.text = json.dumps(MOCK_EXAM_DATA)
            mock_client.models.generate_content.return_value = mock_response
            
            yield mock_client

@pytest.fixture
def mock_requests():
    """Mocks requests.get for URL scraping."""
    with patch("scraper.requests.get") as mock_get:
        mock_response = MagicMock()
        mock_response.text = "<html><body><h1>Modelltest Referenz</h1><p>Dies ist ein toller Text fuer Sprachniveau B1.</p></body></html>"
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response
        yield mock_get


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ingest_url_success(mock_requests, mock_gemini):
    response = client.post("/api/ingest/url", json={"url": "https://example.com/telc-prep"})
    assert response.status_code == 200
    
    data = response.json()
    assert data["metadata"]["title"] == "Deutsches Zertifikat Modelltest"
    assert len(data["lesen"]) == 4
    assert data["sprachbausteine"]["correct_answers"]["21"] == "a"
    assert data["schreiben"]["prompts"][0]["title"] == "Aufgabe 1: Einladung"

    # Verify mocks were called
    mock_requests.assert_called_once()
    mock_gemini.models.generate_content.assert_called_once()


def test_ingest_url_invalid_url():
    response = client.post("/api/ingest/url", json={"url": "not-a-valid-url"})
    assert response.status_code == 400
    assert "Malformed" in response.json()["detail"]


def test_ingest_file_text_success(mock_gemini):
    file_content = b"Referenztext fuer den Test. Deutsch lernen macht Spass!"
    files = {"file": ("reference.txt", file_content, "text/plain")}
    
    with patch.dict("os.environ", {"GEMINI_API_KEY": "fake-api-key"}):
        response = client.post("/api/ingest/file", files=files)
        assert response.status_code == 200
        data = response.json()
        assert data["metadata"]["title"] == "Deutsches Zertifikat Modelltest"
        
        mock_gemini.models.generate_content.assert_called_once()


def test_ingest_file_pdf_success(mock_gemini):
    # Mock pypdf Reader instead of feeding a real binary PDF
    with patch("scraper.pypdf.PdfReader") as mock_pdf_reader:
        mock_reader_instance = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Referenztext extrahiert aus einer PDF-Seite."
        mock_reader_instance.pages = [mock_page]
        mock_pdf_reader.return_value = mock_reader_instance

        file_content = b"%PDF-1.4 mock binary pdf data"
        files = {"file": ("reference.pdf", file_content, "application/pdf")}
        
        with patch.dict("os.environ", {"GEMINI_API_KEY": "fake-api-key"}):
            response = client.post("/api/ingest/file", files=files)
            assert response.status_code == 200
            data = response.json()
            assert data["metadata"]["level"] == "A2-B1"
            
            mock_gemini.models.generate_content.assert_called_once()
            mock_pdf_reader.assert_called_once()


def test_existing_wizard_route():
    response = client.get("/api/wizard/step1-ingest/nonexistent-job-id/status")
    assert response.status_code == 404
    assert response.json()["detail"] == "Job not found"


def test_get_preloaded_exam():
    response = client.get("/api/wizard/step4-export/telc_a2_b1_ubungstest_1")
    assert response.status_code == 200
    data = response.json()
    assert data["exam_id"] == "telc_a2_b1_ubungstest_1"
    assert data["metadata"]["title"] == "telc Deutsch A2-B1 Übungstest 1"


def test_step1_ingest_file_txt():
    file_content = b"Reference text for wizard ingest."
    files = {"file": ("reference.txt", file_content, "text/plain")}
    response = client.post("/api/wizard/step1-ingest-file", files=files, data={"source_note": "Test source note"})
    assert response.status_code == 202
    data = response.json()
    assert "job_id" in data
    assert data["status"] in ("pending", "running", "ready")



