"""
telc_schema.py
==============

Pydantic v2 schema for a dual-level **telc Deutsch A2-B1** model test.

The schema intentionally mirrors the official telc exam architecture so that
authored / licensed content can be validated into a single, stable JSON module
that the portal front-end renders.

Subtests modelled:
    * lesen                  – Parts 1-4 (advertisements, T/F matrix, MC)
    * sprachbausteine        – Part 1 (10-gap cloze, 3 choices per gap)
    * hoeren_und_schreiben   – Items 52-56 (telephone data matrix)
    * muendliche_pruefung    – oral profile cards + collective planning prompts

Notes on content sourcing
--------------------------
This schema is content-source agnostic. It is designed to hold material that
the operator authors themselves or has licensed. It is NOT a mechanism to
launder third-party copyrighted exam content.
"""

from __future__ import annotations

from enum import Enum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


# --------------------------------------------------------------------------- #
# Shared primitives
# --------------------------------------------------------------------------- #
class TelcLevel(str, Enum):
    """Supported CEFR / telc levels for this module."""

    A2 = "A2"
    B1 = "B1"
    A2_B1 = "A2-B1"


class StrictModel(BaseModel):
    """Base model: forbid unknown keys so malformed input is rejected early."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


# --------------------------------------------------------------------------- #
# Metadata
# --------------------------------------------------------------------------- #
class ExamMetadata(StrictModel):
    level: TelcLevel = Field(..., description="Target telc level of the exam.")
    title: str = Field(..., min_length=3, max_length=200)
    version: str = Field(
        ...,
        pattern=r"^\d+\.\d+\.\d+$",
        description="Semantic version of this exam module, e.g. '1.0.0'.",
    )
    language: Literal["de"] = Field(default="de")
    source_licence: str | None = Field(
        default=None,
        description="Human-readable note on the licence / ownership of the "
        "source content (e.g. 'Own authoring', 'Licensed from X').",
    )


# --------------------------------------------------------------------------- #
# LESEN – Parts 1-4
# --------------------------------------------------------------------------- #
class Advertisement(StrictModel):
    """A single short advertisement / notice used in Lesen Teil 1."""

    ref: str = Field(..., description="Letter/label of the advert, e.g. 'a'.")
    text: str = Field(..., min_length=1)


class MatchingItem(StrictModel):
    """A situation to be matched to an advertisement (Lesen Teil 1)."""

    number: int = Field(..., ge=1)
    prompt: str = Field(..., min_length=1)
    correct_ref: str | None = Field(
        default=None, description="Correct advertisement ref, or None if no match."
    )


class LesenPart1(StrictModel):
    part: Literal[1] = 1
    instructions: str
    advertisements: Annotated[list[Advertisement], Field(min_length=1)]
    items: Annotated[list[MatchingItem], Field(min_length=1)]


class TrueFalseItem(StrictModel):
    """A single statement in the Lesen Teil 2 True/False matrix."""

    number: int = Field(..., ge=1)
    statement: str = Field(..., min_length=1)
    answer: bool | None = Field(
        default=None, description="True = richtig, False = falsch, None = unset."
    )


class LesenPart2(StrictModel):
    part: Literal[2] = 2
    instructions: str
    passage: str = Field(..., min_length=1, description="Reading passage text.")
    items: Annotated[list[TrueFalseItem], Field(min_length=1)]


class MultipleChoiceOption(StrictModel):
    key: Literal["a", "b", "c"]
    text: str = Field(..., min_length=1)


class MultipleChoiceItem(StrictModel):
    number: int = Field(..., ge=1)
    question: str = Field(..., min_length=1)
    options: Annotated[list[MultipleChoiceOption], Field(min_length=2, max_length=3)]
    correct_key: Literal["a", "b", "c"] | None = None

    @model_validator(mode="after")
    def _validate_correct_key(self) -> "MultipleChoiceItem":
        if self.correct_key is not None:
            keys = {o.key for o in self.options}
            if self.correct_key not in keys:
                raise ValueError(
                    f"correct_key '{self.correct_key}' not among options {sorted(keys)}"
                )
        return self


class LesenPart3(StrictModel):
    """Advertisement / situation matching with MC-style resolution."""

    part: Literal[3] = 3
    instructions: str
    advertisements: Annotated[list[Advertisement], Field(min_length=1)]
    items: Annotated[list[MatchingItem], Field(min_length=1)]


class LesenPart4(StrictModel):
    """Multiple-choice reading comprehension."""

    part: Literal[4] = 4
    instructions: str
    passage: str = Field(..., min_length=1)
    items: Annotated[list[MultipleChoiceItem], Field(min_length=1)]


class LesenSubtest(StrictModel):
    part1: LesenPart1
    part2: LesenPart2
    part3: LesenPart3
    part4: LesenPart4


# --------------------------------------------------------------------------- #
# SPRACHBAUSTEINE – Part 1 (10-gap cloze)
# --------------------------------------------------------------------------- #
class ClozeChoice(StrictModel):
    key: Literal["a", "b", "c"]
    text: str = Field(..., min_length=1)


class ClozeGap(StrictModel):
    number: int = Field(..., ge=1)
    choices: Annotated[list[ClozeChoice], Field(min_length=3, max_length=3)]
    correct_key: Literal["a", "b", "c"] | None = None

    @model_validator(mode="after")
    def _validate_correct_key(self) -> "ClozeGap":
        if self.correct_key is not None:
            keys = {c.key for c in self.choices}
            if self.correct_key not in keys:
                raise ValueError(
                    f"correct_key '{self.correct_key}' not among choices {sorted(keys)}"
                )
        return self


class SprachbausteineSubtest(StrictModel):
    part: Literal[1] = 1
    instructions: str
    text_with_gaps: str = Field(
        ...,
        min_length=1,
        description="Cloze body with gap markers, e.g. '... __21__ ...'.",
    )
    gaps: Annotated[list[ClozeGap], Field(min_length=10, max_length=10)]

    @model_validator(mode="after")
    def _validate_unique_gap_numbers(self) -> "SprachbausteineSubtest":
        numbers = [g.number for g in self.gaps]
        if len(set(numbers)) != len(numbers):
            raise ValueError("Cloze gap numbers must be unique.")
        return self


# --------------------------------------------------------------------------- #
# HÖREN & SCHREIBEN – Items 52-56 (telephone data matrix)
# --------------------------------------------------------------------------- #
class TelephoneDataItem(StrictModel):
    """
    One field of the telephone-message form (Items 52-56).
    Each item captures a single datum the candidate must extract from audio.
    """

    number: Annotated[int, Field(ge=52, le=56)]
    label: str = Field(..., min_length=1, description="Field label, e.g. 'Name'.")
    expected_value: str | None = Field(
        default=None, description="Reference answer, if provided by the author."
    )


class HoerenUndSchreibenSubtest(StrictModel):
    instructions: str
    audio_ref: str | None = Field(
        default=None, description="Identifier/URL of the associated audio asset."
    )
    transcript: str | None = Field(
        default=None, description="Optional transcript for authoring/review only."
    )
    items: Annotated[list[TelephoneDataItem], Field(min_length=5, max_length=5)]

    @model_validator(mode="after")
    def _validate_item_range(self) -> "HoerenUndSchreibenSubtest":
        numbers = sorted(i.number for i in self.items)
        if numbers != [52, 53, 54, 55, 56]:
            raise ValueError("hoeren_und_schreiben items must be numbered 52-56.")
        return self


# --------------------------------------------------------------------------- #
# MÜNDLICHE PRÜFUNG – profile cards + collective planning
# --------------------------------------------------------------------------- #
class OralProfileCard(StrictModel):
    """A 'sich kennenlernen' profile card used in the oral exam."""

    ref: str = Field(..., description="Card identifier, e.g. 'A1'.")
    topic: str = Field(..., min_length=1)
    prompts: Annotated[list[str], Field(min_length=1)]


class PlanningPrompt(StrictModel):
    """A collective-planning task ('etwas gemeinsam planen')."""

    ref: str
    scenario: str = Field(..., min_length=1)
    guiding_points: Annotated[list[str], Field(min_length=1)]


class MuendlichePruefungSubtest(StrictModel):
    instructions: str
    profile_cards: Annotated[list[OralProfileCard], Field(min_length=1)]
    planning_prompts: Annotated[list[PlanningPrompt], Field(min_length=1)]


# --------------------------------------------------------------------------- #
# Root exam module
# --------------------------------------------------------------------------- #
class Subtests(StrictModel):
    lesen: LesenSubtest
    sprachbausteine: SprachbausteineSubtest
    hoeren_und_schreiben: HoerenUndSchreibenSubtest
    muendliche_pruefung: MuendlichePruefungSubtest


class TelcExam(StrictModel):
    """Root validated model returned to the front-end wizard."""

    exam_id: str = Field(..., min_length=1)
    metadata: ExamMetadata
    subtests: Subtests
