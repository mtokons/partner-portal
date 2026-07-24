"""
ingest.py
=========

Lawful content ingestion for the Model Test Learning System.

This module deliberately replaces the "stealth scraper" pattern (rotating
user-agents + evasive delays against a named third-party site) with an
ingestor that operates on material the operator **owns or has licensed**:

    * uploaded files (HTML / plain text)  -> primary path
    * an explicit URL fetch               -> optional, and only when it is
      permitted by the target's robots.txt, using a single honest,
      self-identifying User-Agent.

The parsing helpers (reading passages, multiple-choice options, cloze texts)
are unchanged in capability — they simply run on content you are entitled to
process.
"""

from __future__ import annotations

import logging
import re
import time
import urllib.robotparser
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("mts.ingest")

# A single, honest, identifying User-Agent. No rotation, no evasion.
USER_AGENT = "SCCG-ModelTestBot/1.0 (+https://portal.mysccg.de; contact=admin@mysccg.de)"

DEFAULT_TIMEOUT = 20  # seconds
POLITE_DELAY = 1.0  # seconds between successive requests to the same host


class IngestError(Exception):
    """Raised when a source cannot be ingested."""


class DisallowedByRobots(IngestError):
    """Raised when robots.txt disallows fetching a URL."""


@dataclass
class RawExamContent:
    """
    Loosely-structured content extracted from a source document.

    This is intentionally permissive: the :mod:`mapper` module is responsible
    for turning it into a strictly-validated :class:`telc_schema.TelcExam`.
    """

    reading_passages: list[dict[str, Any]] = field(default_factory=list)
    multiple_choice: list[dict[str, Any]] = field(default_factory=list)
    cloze_texts: list[dict[str, Any]] = field(default_factory=list)
    raw_text: str = ""

    def as_dict(self) -> dict[str, Any]:
        return {
            "reading_passages": self.reading_passages,
            "multiple_choice": self.multiple_choice,
            "cloze_texts": self.cloze_texts,
            "raw_text": self.raw_text,
        }


class SourceDocumentIngestor:
    """
    Parse telc-style practice material from content the operator controls.

    Typical usage::

        ingestor = SourceDocumentIngestor()
        raw = ingestor.from_html(uploaded_html, source_note="Own authoring")
        # or, for a permitted URL:
        raw = ingestor.from_url("https://my-licensed-source.example/exam")
    """

    def __init__(
        self,
        *,
        timeout: int = DEFAULT_TIMEOUT,
        polite_delay: float = POLITE_DELAY,
        session: requests.Session | None = None,
    ) -> None:
        self.timeout = timeout
        self.polite_delay = polite_delay
        self.session = session or requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT})
        self._last_request_ts: float = 0.0
        self._robots_cache: dict[str, urllib.robotparser.RobotFileParser] = {}

    # ------------------------------------------------------------------ #
    # Public entry points
    # ------------------------------------------------------------------ #
    def from_text(self, text: str, *, source_note: str | None = None) -> RawExamContent:
        """Parse a plain-text document you own."""
        logger.info("Ingesting plain text (source_note=%s)", source_note)
        return self._parse_soup(BeautifulSoup(f"<pre>{text}</pre>", "html.parser"), text)

    def from_html(self, html: str, *, source_note: str | None = None) -> RawExamContent:
        """Parse an HTML document you authored or uploaded."""
        logger.info("Ingesting HTML (source_note=%s)", source_note)
        soup = BeautifulSoup(html, "html.parser")
        return self._parse_soup(soup, soup.get_text("\n", strip=True))

    def from_url(self, url: str) -> RawExamContent:
        """
        Fetch and parse a URL — only if robots.txt permits it.

        This exists for licensed / owned online sources. It will NOT bypass
        access controls: it identifies itself honestly and honours robots.txt.
        """
        if not self._is_allowed_by_robots(url):
            raise DisallowedByRobots(f"robots.txt disallows fetching: {url}")

        self._respect_delay()
        logger.info("Fetching permitted URL: %s", url)
        try:
            resp = self.session.get(url, timeout=self.timeout)
            resp.raise_for_status()
        except requests.RequestException as exc:  # pragma: no cover - network
            raise IngestError(f"Failed to fetch {url}: {exc}") from exc
        finally:
            self._last_request_ts = time.monotonic()

        return self.from_html(resp.text, source_note=f"Fetched: {url}")

    # ------------------------------------------------------------------ #
    # robots.txt + politeness
    # ------------------------------------------------------------------ #
    def _is_allowed_by_robots(self, url: str) -> bool:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise IngestError(f"Unsupported or malformed URL: {url}")

        root = f"{parsed.scheme}://{parsed.netloc}"
        rp = self._robots_cache.get(root)
        if rp is None:
            rp = urllib.robotparser.RobotFileParser()
            rp.set_url(f"{root}/robots.txt")
            try:
                rp.read()
            except Exception as exc:  # noqa: BLE001 - robots fetch best-effort
                logger.warning("Could not read robots.txt for %s: %s", root, exc)
                # Fail closed: if we cannot verify permission, do not fetch.
                return False
            self._robots_cache[root] = rp
        return rp.can_fetch(USER_AGENT, url)

    def _respect_delay(self) -> None:
        elapsed = time.monotonic() - self._last_request_ts
        if elapsed < self.polite_delay:
            time.sleep(self.polite_delay - elapsed)

    # ------------------------------------------------------------------ #
    # Parsing helpers
    # ------------------------------------------------------------------ #
    def _parse_soup(self, soup: BeautifulSoup, raw_text: str) -> RawExamContent:
        content = RawExamContent(raw_text=raw_text)
        try:
            content.reading_passages = self._extract_reading_passages(soup)
            content.multiple_choice = self._extract_multiple_choice(soup, raw_text)
            content.cloze_texts = self._extract_cloze_texts(soup, raw_text)
        except Exception as exc:  # noqa: BLE001 - never crash on messy input
            logger.exception("Parsing error; returning partial content: %s", exc)
        logger.info(
            "Parsed: %d passages, %d MC items, %d cloze blocks",
            len(content.reading_passages),
            len(content.multiple_choice),
            len(content.cloze_texts),
        )
        return content

    @staticmethod
    def _extract_reading_passages(soup: BeautifulSoup) -> list[dict[str, Any]]:
        """Collect paragraph-like blocks that read as prose passages."""
        passages: list[dict[str, Any]] = []
        for idx, node in enumerate(soup.find_all(["p", "article", "section"])):
            text = node.get_text(" ", strip=True)
            # Heuristic: a passage is a reasonably long block of prose.
            if len(text) >= 120:
                passages.append({"index": idx, "text": text})
        return passages

    @staticmethod
    def _extract_multiple_choice(
        soup: BeautifulSoup, raw_text: str
    ) -> list[dict[str, Any]]:
        """
        Extract multiple-choice items.

        Recognises two shapes:
          1. Explicit lists (<ol>/<ul>) whose items start with 'a) b) c)'.
          2. Inline 'a) ... b) ... c) ...' runs in plain text.
        """
        items: list[dict[str, Any]] = []

        # Shape 1: HTML lists
        for list_node in soup.find_all(["ol", "ul"]):
            options = []
            for li in list_node.find_all("li", recursive=False):
                li_text = li.get_text(" ", strip=True)
                m = re.match(r"^\(?([a-cA-C])\)?[.)]\s*(.+)$", li_text)
                if m:
                    options.append({"key": m.group(1).lower(), "text": m.group(2)})
            if 2 <= len(options) <= 3:
                items.append({"question": None, "options": options})

        # Shape 2: inline text runs
        inline_pattern = re.compile(
            r"a\)\s*(?P<a>.+?)\s+b\)\s*(?P<b>.+?)\s+c\)\s*(?P<c>.+?)(?=(?:\s+\d+\.|\s*$))",
            re.IGNORECASE | re.DOTALL,
        )
        for m in inline_pattern.finditer(raw_text):
            items.append(
                {
                    "question": None,
                    "options": [
                        {"key": "a", "text": m.group("a").strip()},
                        {"key": "b", "text": m.group("b").strip()},
                        {"key": "c", "text": m.group("c").strip()},
                    ],
                }
            )
        return items

    @staticmethod
    def _extract_cloze_texts(
        soup: BeautifulSoup, raw_text: str
    ) -> list[dict[str, Any]]:
        """
        Detect cloze/fill-in-the-blank bodies.

        A cloze body is text containing gap markers such as '__21__', '____',
        or '(21)'. Returns the body plus the discovered gap numbers.
        """
        gap_marker = re.compile(r"__+\s*(\d+)?\s*__+|\(\s*(\d+)\s*\)|_{3,}")
        cloze_blocks: list[dict[str, Any]] = []

        candidate_nodes = soup.find_all(["p", "div", "pre", "section"]) or [soup]
        for node in candidate_nodes:
            text = node.get_text(" ", strip=True)
            markers = list(gap_marker.finditer(text))
            if len(markers) >= 3:
                numbers = [
                    int(g) for m in markers for g in m.groups() if g and g.isdigit()
                ]
                cloze_blocks.append(
                    {"text_with_gaps": text, "gap_numbers": numbers}
                )
        return cloze_blocks
