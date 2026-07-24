"""
mapper.py
=========

Transforms loosely-structured :class:`ingest.RawExamContent` into a strictly
validated :class:`telc_schema.TelcExam`.

The mapper is deterministic and defensive: where the raw source does not supply
enough material for a required section, it emits clearly-labelled placeholder
scaffolding so the human editor can complete it in the verify step. This keeps
the pipeline moving without ever fabricating "answers" that look authoritative.
"""

from __future__ import annotations

import logging
from typing import Any

from pydantic import ValidationError

from ingest import RawExamContent
from telc_schema import (
    Advertisement,
    ClozeChoice,
    ClozeGap,
    ExamMetadata,
    HoerenUndSchreibenSubtest,
    LesenPart1,
    LesenPart2,
    LesenPart3,
    LesenPart4,
    LesenSubtest,
    MatchingItem,
    MuendlichePruefungSubtest,
    MultipleChoiceItem,
    MultipleChoiceOption,
    OralProfileCard,
    PlanningPrompt,
    SprachbausteineSubtest,
    Subtests,
    TelcExam,
    TelcLevel,
    TelephoneDataItem,
    TrueFalseItem,
)

logger = logging.getLogger("mts.mapper")

_PLACEHOLDER = "[TO BE COMPLETED BY EDITOR]"


class MappingError(Exception):
    """Raised when raw content cannot be mapped into the telc schema."""


def map_raw_to_exam(
    raw: RawExamContent,
    *,
    exam_id: str,
    title: str,
    level: TelcLevel = TelcLevel.A2_B1,
    version: str = "1.0.0",
    source_licence: str | None = None,
) -> TelcExam:
    """
    Build a validated :class:`TelcExam` from raw ingested content.

    Raises
    ------
    MappingError
        If the assembled structure fails schema validation.
    """
    logger.info("Mapping raw content into telc schema for exam_id=%s", exam_id)

    metadata = ExamMetadata(
        level=level, title=title, version=version, source_licence=source_licence
    )

    try:
        exam = TelcExam(
            exam_id=exam_id,
            metadata=metadata,
            subtests=Subtests(
                lesen=_map_lesen(raw),
                sprachbausteine=_map_sprachbausteine(raw),
                hoeren_und_schreiben=_map_hoeren_schreiben(raw),
                muendliche_pruefung=_map_muendliche_pruefung(raw),
            ),
        )
    except ValidationError as exc:
        logger.error("Schema validation failed: %s", exc)
        raise MappingError(f"Mapped structure failed validation: {exc}") from exc

    logger.info("Successfully mapped exam_id=%s", exam_id)
    return exam


# --------------------------------------------------------------------------- #
# LESEN
# --------------------------------------------------------------------------- #
def _map_lesen(raw: RawExamContent) -> LesenSubtest:
    passages = [p["text"] for p in raw.reading_passages]
    mc = raw.multiple_choice

    part1 = LesenPart1(
        instructions="Ordnen Sie die Situationen den Anzeigen zu.",
        advertisements=_advertisements_or_placeholder(passages, count=5),
        items=[
            MatchingItem(number=i, prompt=f"{_PLACEHOLDER} (Situation {i})")
            for i in range(1, 6)
        ],
    )

    part2 = LesenPart2(
        instructions="Lesen Sie den Text und entscheiden Sie: richtig oder falsch?",
        passage=passages[0] if passages else _PLACEHOLDER,
        items=[
            TrueFalseItem(number=i, statement=f"{_PLACEHOLDER} (Aussage {i})")
            for i in range(6, 11)
        ],
    )

    part3 = LesenPart3(
        instructions="Lesen Sie die Anzeigen und ordnen Sie zu.",
        advertisements=_advertisements_or_placeholder(passages[1:], count=6),
        items=[
            MatchingItem(number=i, prompt=f"{_PLACEHOLDER} (Situation {i})")
            for i in range(11, 21)
        ],
    )

    part4 = LesenPart4(
        instructions="Lesen Sie den Text und wählen Sie die richtige Antwort.",
        passage=passages[1] if len(passages) > 1 else _PLACEHOLDER,
        items=_mc_items_or_placeholder(mc, start=1, count=max(1, min(5, len(mc)) or 1)),
    )

    return LesenSubtest(part1=part1, part2=part2, part3=part3, part4=part4)


def _advertisements_or_placeholder(
    passages: list[str], *, count: int
) -> list[Advertisement]:
    letters = "abcdefghijklmnop"
    ads: list[Advertisement] = []
    for i in range(count):
        text = passages[i] if i < len(passages) else f"{_PLACEHOLDER} (Anzeige {letters[i]})"
        ads.append(Advertisement(ref=letters[i], text=text[:500]))
    return ads


def _mc_items_or_placeholder(
    mc: list[dict[str, Any]], *, start: int, count: int
) -> list[MultipleChoiceItem]:
    items: list[MultipleChoiceItem] = []
    for offset in range(count):
        number = start + offset
        src = mc[offset] if offset < len(mc) else None
        if src and src.get("options"):
            options = [
                MultipleChoiceOption(key=o["key"], text=o["text"])
                for o in src["options"]
                if o.get("key") in ("a", "b", "c") and o.get("text")
            ][:3]
        else:
            options = [
                MultipleChoiceOption(key=k, text=f"{_PLACEHOLDER} ({k})")
                for k in ("a", "b", "c")
            ]
        if len(options) < 2:
            options = [
                MultipleChoiceOption(key=k, text=f"{_PLACEHOLDER} ({k})")
                for k in ("a", "b", "c")
            ]
        items.append(
            MultipleChoiceItem(
                number=number,
                question=(src or {}).get("question") or f"{_PLACEHOLDER} (Frage {number})",
                options=options,
                correct_key=None,
            )
        )
    return items


# --------------------------------------------------------------------------- #
# SPRACHBAUSTEINE
# --------------------------------------------------------------------------- #
def _map_sprachbausteine(raw: RawExamContent) -> SprachbausteineSubtest:
    cloze = raw.cloze_texts[0] if raw.cloze_texts else None
    text_with_gaps = (
        cloze["text_with_gaps"]
        if cloze
        else " ".join(f"... __{n}__ ..." for n in range(21, 31))
    )

    gaps = [
        ClozeGap(
            number=n,
            choices=[
                ClozeChoice(key="a", text=f"{_PLACEHOLDER} (a)"),
                ClozeChoice(key="b", text=f"{_PLACEHOLDER} (b)"),
                ClozeChoice(key="c", text=f"{_PLACEHOLDER} (c)"),
            ],
            correct_key=None,
        )
        for n in range(21, 31)
    ]

    return SprachbausteineSubtest(
        instructions="Was passt in die Lücken? Wählen Sie a, b oder c.",
        text_with_gaps=text_with_gaps,
        gaps=gaps,
    )


# --------------------------------------------------------------------------- #
# HÖREN & SCHREIBEN
# --------------------------------------------------------------------------- #
def _map_hoeren_schreiben(raw: RawExamContent) -> HoerenUndSchreibenSubtest:
    labels = ["Name", "Datum", "Uhrzeit", "Telefonnummer", "Grund des Anrufs"]
    items = [
        TelephoneDataItem(number=52 + i, label=labels[i], expected_value=None)
        for i in range(5)
    ]
    return HoerenUndSchreibenSubtest(
        instructions="Hören Sie die Nachricht und ergänzen Sie das Formular.",
        audio_ref=None,
        transcript=None,
        items=items,
    )


# --------------------------------------------------------------------------- #
# MÜNDLICHE PRÜFUNG
# --------------------------------------------------------------------------- #
def _map_muendliche_pruefung(raw: RawExamContent) -> MuendlichePruefungSubtest:
    profile_cards = [
        OralProfileCard(
            ref="A1",
            topic=f"{_PLACEHOLDER} (Thema)",
            prompts=[f"{_PLACEHOLDER} (Stichwort)"],
        )
    ]
    planning_prompts = [
        PlanningPrompt(
            ref="P1",
            scenario=f"{_PLACEHOLDER} (Planungsaufgabe)",
            guiding_points=[f"{_PLACEHOLDER} (Leitpunkt)"],
        )
    ]
    return MuendlichePruefungSubtest(
        instructions="Sprechen Sie zu zweit und planen Sie gemeinsam.",
        profile_cards=profile_cards,
        planning_prompts=planning_prompts,
    )
