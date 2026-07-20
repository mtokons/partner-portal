"""
generator.py
============

The Gemini AI Orchestration Layer of the Model Test Learning System.
Generates validated, original telc Deutsch A2-B1 mock exams from reference texts.
"""

from __future__ import annotations

import os
import logging
from typing import List, Dict, Optional, Union, Any
from pydantic import BaseModel, Field

from google import genai
from google.genai import types

logger = logging.getLogger("mts.generator")

# --------------------------------------------------------------------------- #
# Pydantic V2 Schemas for Structured output
# --------------------------------------------------------------------------- #

class MetadataSchema(BaseModel):
    level: str = Field(..., description="Target vocabulary level, e.g. 'A2', 'B1', or 'A2-B1'")
    title: str = Field(..., description="Title of the mock exam")

class AdvertisementSchema(BaseModel):
    ref: str = Field(..., description="Letter/label of the advertisement, e.g., 'a', 'b', 'c'")
    text: str = Field(..., description="Content text of the advertisement")

class MatchingItemSchema(BaseModel):
    number: int = Field(..., description="Item number in the exam")
    prompt: str = Field(..., description="The situation description to match against advertisements")
    correct_ref: Optional[str] = Field(None, description="The correct advertisement letter/ref (e.g. 'a') or null if there is no match")

class TrueFalseItemSchema(BaseModel):
    number: int = Field(..., description="Item number in the exam")
    statement: str = Field(..., description="A statement based on the reading passage")
    answer: bool = Field(..., description="Whether the statement is true (True = richtig) or false (False = falsch)")

class MultipleChoiceOptionSchema(BaseModel):
    key: str = Field(..., description="Option key, must be 'a', 'b', or 'c'")
    text: str = Field(..., description="Text content for this option")

class MultipleChoiceItemSchema(BaseModel):
    number: int = Field(..., description="Item number in the exam")
    question: str = Field(..., description="The reading comprehension question")
    options: List[MultipleChoiceOptionSchema] = Field(..., description="Exactly 3 options keyed 'a', 'b', and 'c'")
    correct_key: str = Field(..., description="The correct answer key, must be 'a', 'b', or 'c'")

class LesenPartSchema(BaseModel):
    part: int = Field(..., description="Part number (1, 2, 3, or 4)")
    instructions: str = Field(..., description="Instructions in German for this part")
    passage: Optional[str] = Field(None, description="Reading passage text (only for parts 2 and 4, null for parts 1 and 3)")
    advertisements: Optional[List[AdvertisementSchema]] = Field(None, description="List of advertisements (only for parts 1 and 3, null for parts 2 and 4)")
    matching_items: Optional[List[MatchingItemSchema]] = Field(None, description="Situational matching prompts (only for parts 1 and 3)")
    tf_items: Optional[List[TrueFalseItemSchema]] = Field(None, description="True/False statements (only for part 2)")
    mc_items: Optional[List[MultipleChoiceItemSchema]] = Field(None, description="Multiple-choice items (only for part 4)")

class SprachbausteineSchema(BaseModel):
    instructions: str = Field(..., description="Instructions in German for this subtest")
    text_with_gaps: str = Field(..., description="Cloze text block with 10 numbered gaps, labeled as __21__, __22__, ..., __30__")
    gaps: Dict[str, Dict[str, str]] = Field(
        ...,
        description="Mapping of gap numbers ('21' to '30') to option dicts mapping 'a', 'b', and 'c' to their text"
    )
    correct_answers: Dict[str, str] = Field(
        ...,
        description="Mapping of gap numbers ('21' to '30') to the correct key ('a', 'b', or 'c')"
    )

class WritingPromptSchema(BaseModel):
    title: str = Field(..., description="Title of the writing task")
    situation: str = Field(..., description="Description of the writing situation/context")
    task_description: str = Field(..., description="Instructions, recipient, and points to cover")

class SchreibenSchema(BaseModel):
    instructions: str = Field(..., description="Instructions in German for the writing section")
    prompts: List[WritingPromptSchema] = Field(..., description="Situational writing prompts")

class TelcExamSchema(BaseModel):
    metadata: MetadataSchema
    lesen: List[LesenPartSchema] = Field(..., description="List containing exactly 4 items for Lesen Parts 1, 2, 3, and 4")
    sprachbausteine: SprachbausteineSchema
    schreiben: SchreibenSchema


# --------------------------------------------------------------------------- #
# AI Generation Execution
# --------------------------------------------------------------------------- #

def generate_mock_exam(reference_text: str) -> TelcExamSchema:
    """
    Calls the Gemini 2.5 Flash model with the google-genai SDK to generate
    a new, original telc Deutsch A2-B1 mock exam adhering to the TelcExamSchema.
    """
    logger.info("Initializing Google GenAI client...")
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY environment variable is not set!")
        raise ValueError("GEMINI_API_KEY environment variable must be set to run generator.")
        
    client = genai.Client(api_key=api_key)

    prompt = f"""
You are an expert telc Deutsch A2-B1 exam creator.
Analyze the following reference text to understand its vocabulary level (A2-B1 range), linguistic complexity, stylistic themes, and structural flow:

--- REFERENCE TEXT START ---
{reference_text}
--- REFERENCE TEXT END ---

Now, generate a COMPLETELY ORIGINAL, brand new telc Deutsch A2-B1 mock exam in German.
Constraint: Ensure 100% original content. Do not copy any sentences or texts directly from the reference text to avoid plagiarism, but model the difficulty, topics, vocabulary, and test formatting after it.

Follow these specific instructions for each section:

1. METADATA:
   - Provide a suitable title and the vocabulary level (e.g. "A2-B1", "B1", etc.).

2. LESEN (Parts 1 to 4):
   - You must output a list of exactly 4 parts corresponding to telc Lesen sections.
   - Part 1: Matching situations. Create 5 short advertisements/notices (advertisements with refs 'a' through 'e') and 5 situational prompts (items numbered 1 to 5) to match. Make sure there is a matching correct_ref or null if no match.
   - Part 2: True/False reading comprehension. Create a reading passage (approx. 150-250 words) on a relevant topic, and 5 statements (items numbered 6 to 10) with answers as boolean (True = richtig, False = falsch).
   - Part 3: Situation matching (similar to Part 1 but with more items). Create 6 advertisements/notices (advertisements with refs 'a' through 'f') and 5 situations (items numbered 11 to 15) to match.
   - Part 4: Multiple-choice reading comprehension. Create a text passage (approx. 150-250 words), and 5 multiple-choice questions (items numbered 16 to 20), each with 3 options ('a', 'b', 'c') and a correct_key.

3. SPRACHBAUSTEINE:
   - Provide a cohesive letter or text block with exactly 10 cloze gaps numbered 21 to 30 (use gap markers like '__21__', '__22__', etc.).
   - Provide 3 options ('a', 'b', 'c') for each gap in the 'gaps' dict.
   - Specify the correct answer ('a', 'b', or 'c') for each gap in the 'correct_answers' dict.
   - The grammar and vocabulary tested in the gaps should match typical A2-B1 telc grammar points (prepositions, adjective endings, relative pronouns, conjunctions, etc.).

4. SCHREIBEN:
   - Provide standard telc Deutsch A2-B1 writing tasks.
   - Create 1 or 2 situational writing prompts (e.g., writing a complaint letter or responding to an invitation, with scenario and bullet points to address).
"""

    logger.info("Sending content generation request to gemini-2.5-flash...")
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=TelcExamSchema,
                temperature=0.2, # Low temperature to ensure high structure alignment and formatting accuracy
            ),
        )
        logger.info("Received response from Gemini. Parsing and validating schema...")
        
        # Pydantic V2 schema validation is enforced when passing response_schema,
        # but we parse the JSON response text using model_validate_json to ensure absolute correctness.
        # This will raise a ValidationError if it does not adhere to TelcExamSchema.
        validated_exam = TelcExamSchema.model_validate_json(response.text)
        logger.info("Mock exam generated and validated successfully.")
        return validated_exam
        
    except Exception as e:
        logger.error("Generation/validation pipeline failed: %s", e)
        raise RuntimeError(f"Failed to generate valid mock exam from Gemini: {e}") from e
