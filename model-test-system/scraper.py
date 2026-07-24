"""
scraper.py
==========

The Extraction Layer of the Model Test Learning System.
Responsible for scraping web content or extracting text from uploaded files (.txt, .pdf).
"""

from __future__ import annotations

import logging
import random
import time
import io
from typing import List
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
import pypdf

logger = logging.getLogger("mts.scraper")

# List of common real-world user agents to spoof browsers
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Edge/120.0.0.0",
]

class ContentIngester:
    """
    Ingests raw source material either from a URL (web scraping) or files.
    """

    def __init__(self, timeout: int = 15):
        self.timeout = timeout

    def scrape_url(self, url: str) -> str:
        """
        Scrapes raw text from the target URL.
        Includes random delays and user-agent spoofing.
        """
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError(f"Malformed or unsupported URL scheme: {url}")

        # Politeness / anti-bot delay
        delay = random.uniform(0.5, 2.0)
        logger.info("Applying random delay of %.2fs before scraping: %s", delay, url)
        time.sleep(delay)

        # Select a random User-Agent
        user_agent = random.choice(USER_AGENTS)
        headers = {
            "User-Agent": user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
            "Referer": "https://www.google.com/",
        }

        logger.info("Fetching URL %s with User-Agent: %s", url, user_agent)
        try:
            response = requests.get(url, headers=headers, timeout=self.timeout)
            response.raise_for_status()
        except requests.RequestException as e:
            logger.error("Failed to fetch URL %s: %s", url, e)
            raise RuntimeError(f"HTTP request failed: {e}") from e

        # Extract text using BeautifulSoup
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Remove script and style elements to avoid extracting code
        for script_or_style in soup(["script", "style", "nav", "footer", "header"]):
            script_or_style.decompose()

        # Get text
        text = soup.get_text(separator="\n")
        
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        clean_text = "\n".join(chunk for chunk in chunks if chunk)
        
        logger.info("Successfully scraped %d characters of text from %s", len(clean_text), url)
        return clean_text

    def extract_file(self, file_bytes: bytes, filename: str) -> str:
        """
        Extracts clean text content from raw file bytes.
        Supports .txt and .pdf formats.
        """
        logger.info("Extracting file content from '%s' (size=%d bytes)", filename, len(file_bytes))
        
        lower_name = filename.lower()
        if lower_name.endswith(".txt"):
            try:
                return file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                # Fallback to latin-1
                return file_bytes.decode("latin-1")
                
        elif lower_name.endswith(".pdf"):
            try:
                pdf_file = io.BytesIO(file_bytes)
                reader = pypdf.PdfReader(pdf_file)
                text_parts = []
                
                for idx, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                    else:
                        logger.warning("No text extracted from page %d of %s", idx + 1, filename)
                
                full_text = "\n\n".join(text_parts)
                # Clean up whitespace
                lines = (line.strip() for line in full_text.splitlines())
                clean_text = "\n".join(line for line in lines if line)
                logger.info("Extracted %d characters of text from PDF %s", len(clean_text), filename)
                return clean_text
            except Exception as e:
                logger.error("Failed to parse PDF file %s: %s", filename, e)
                raise ValueError(f"Could not parse PDF file: {e}") from e
                
        elif lower_name.endswith(".docx"):
            try:
                import zipfile
                import xml.etree.ElementTree as ET
                
                with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                    xml_content = z.read("word/document.xml")
                    root = ET.fromstring(xml_content)
                    
                    paragraphs = []
                    for p in root.findall(".//w:p", ns):
                        texts = []
                        for t in p.findall(".//w:t", ns):
                            if t.text:
                                texts.append(t.text)
                        if texts:
                            paragraphs.append("".join(texts))
                    
                    full_text = "\n\n".join(paragraphs)
                    lines = (line.strip() for line in full_text.splitlines())
                    clean_text = "\n".join(line for line in lines if line)
                    logger.info("Extracted %d characters of text from DOCX %s", len(clean_text), filename)
                    return clean_text
            except Exception as e:
                logger.error("Failed to parse DOCX file %s: %s", filename, e)
                raise ValueError(f"Could not parse DOCX file: {e}") from e
                
        else:
            # Fallback to general plain text decoding for unsupported extensions
            try:
                return file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                return file_bytes.decode("latin-1")

