# explainer.py
# LLM Explainer for SENTINEL
# Sends entity intelligence reports and classifier scores to Claude,
# which reasons through the evidence and returns a structured explanation.
# This is the human-in-the-loop AI layer — the operator reads this reasoning
# before making an approve/deny decision.

import os
import json
import anthropic
# API key is loaded from the shell environment

from backend.simulation.engine import Entity, EntityType
from backend.classifier.model import classifier

# Run: export ANTHROPIC_API_KEY='your-key' before starting the server

# ── Anthropic Client ──────────────────────────────────────────────────────────

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


# ── Prompt Builder ────────────────────────────────────────────────────────────
# Constructs the prompt sent to Claude for each entity explanation request.
# The prompt is designed to make Claude reason carefully and hedge appropriately
# rather than producing overconfident assessments.

def _build_prompt(entity: Entity, classifier_result: dict) -> str:
    """
    Builds a structured prompt combining the entity's intel report
    with the classifier's numerical assessment.
    """

    # Format feature importances as a readable list
    top_features = sorted(
        classifier_result["feature_importance"].items(),
        key=lambda x: x[1],
        reverse=True
    )[:5]  # Top 5 most important features

    feature_lines = "\n".join(
        f"  - {name.replace('_', ' ')}: {round(imp * 100, 1)}% importance"
        for name, imp in top_features
    )

    # Format classifier probabilities
    probs = classifier_result["probabilities"]

    prompt = f"""You are an AI analyst assistant in a tactical command and control system called SENTINEL.
Your role is to help a human operator assess potential threats on the battlefield.
You must reason carefully, acknowledge uncertainty, and never recommend lethal action without strong evidence.
Civilian safety is the highest priority — false positives have serious consequences.

You have been provided with:
1. A raw intelligence report for a tracked entity
2. A machine learning classifier assessment of that entity

Your task is to reason through the evidence and produce a structured explanation
that helps the operator make an informed decision.

---

INTELLIGENCE REPORT:
{entity.intel_report}

---

CLASSIFIER ASSESSMENT:
- Threat score: {classifier_result["threat_score"]} (0.0 = no threat, 1.0 = confirmed hostile)
- Model confidence: {classifier_result["confidence"]}
- Classification label: {classifier_result["label"]}
- Class probabilities:
    Non-threat: {probs["non_threat"]}
    Hostile:    {probs["hostile"]}
    Ambiguous:  {probs["ambiguous"]}
- Top features driving this score:
{feature_lines}

---

Respond in the following JSON format exactly — no preamble, no markdown, just the JSON object:

{{
    "summary": "2-3 sentence summary of the key evidence for and against threat classification",
    "reasoning": [
        "Step 1: ...",
        "Step 2: ...",
        "Step 3: ..."
    ],
    "agrees_with_classifier": true or false,
    "confidence_assessment": "Your assessment of how certain this classification is and why",
    "recommended_action": "approve_engagement | deny_engagement | request_more_intel",
    "recommended_action_rationale": "1-2 sentences explaining your recommendation",
    "civilian_risk": "low | medium | high",
    "civilian_risk_rationale": "1 sentence on risk to non-combatants if wrong"
}}"""

    return prompt


# ── LLM Explainer ─────────────────────────────────────────────────────────────

def explain_entity(entity: Entity) -> dict:
    """
    Runs the classifier on the entity, then sends the intel report
    and classifier results to Claude for natural language reasoning.

    Returns a structured explanation dict containing:
    - summary
    - reasoning chain
    - whether LLM agrees with classifier
    - recommended action
    - civilian risk assessment
    - raw classifier result (for disagreement detection)
    """

    # ── Step 1: Get classifier score ──────────────────────────────────────────
    classifier_result = classifier.score(entity)

    # ── Step 2: Build and send prompt to Claude ───────────────────────────────
    prompt = _build_prompt(entity, classifier_result)

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    raw_response = message.content[0].text

    # ── Step 3: Parse Claude's JSON response ──────────────────────────────────
    cleaned = raw_response.strip()

    # Strip markdown code fences if Claude wrapped the response
    if "```" in cleaned:
        # Extract content between the first ``` and last ```
        first = cleaned.index("```") + 3        # skip opening ```
        last  = cleaned.rindex("```")           # find closing ```
        cleaned = cleaned[first:last].strip()
        # Strip language tag if present (e.g. "json\n")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()

    try:
        llm_result = json.loads(cleaned)
    except json.JSONDecodeError as e:
        llm_result = {
            "summary": "LLM response could not be parsed. Review raw intel report manually.",
            "reasoning": ["Parse error — manual review required"],
            "agrees_with_classifier": None,
            "confidence_assessment": "Unknown",
            "recommended_action": "request_more_intel",
            "recommended_action_rationale": "Unable to parse LLM response. Defaulting to caution.",
            "civilian_risk": "unknown",
            "civilian_risk_rationale": "Unable to assess — manual review required",
        }

    # ── Step 4: Detect LLM / classifier disagreement ─────────────────────────
    # Disagreement is surfaced explicitly to the operator as an additional signal.
    # A high classifier score with a deny recommendation = meaningful conflict.
    classifier_recommends_approve = classifier_result["threat_score"] > 0.5
    llm_recommends_approve        = llm_result.get("recommended_action") == "approve_engagement"
    disagreement                  = classifier_recommends_approve != llm_recommends_approve

    # ── Step 5: Assemble final response ───────────────────────────────────────
    return {
        "entity_id":          entity.id,
        "entity_type":        entity.entity_type.value,
        "unit_name":          entity.unit_name,
        "llm_explanation":    llm_result,
        "classifier_result":  classifier_result,
        "disagreement":       disagreement,
        "disagreement_detail": (
            f"Classifier scores this as {'threat' if classifier_recommends_approve else 'non-threat'} "
            f"({classifier_result['threat_score']}) but LLM recommends "
            f"{'approve' if llm_recommends_approve else 'deny or more intel'}."
        ) if disagreement else None,
    }

# ── Streaming Explainer ───────────────────────────────────────────────────────

def _build_stream_prompt(entity: Entity, classifier_result: dict) -> str:
    """
    Variant of the prompt that asks Claude to reason in prose first,
    then emit a delimiter, then output the structured JSON.
    This lets us stream the reasoning and parse the JSON at the end.
    """
    top_features = sorted(
        classifier_result["feature_importance"].items(),
        key=lambda x: x[1],
        reverse=True
    )[:5]

    feature_lines = "\n".join(
        f"  - {name.replace('_', ' ')}: {round(imp * 100, 1)}% importance"
        for name, imp in top_features
    )

    probs = classifier_result["probabilities"]

    return f"""You are an AI analyst assistant in a tactical command and control system called SENTINEL.
Your role is to help a human operator assess potential threats on the battlefield.
You must reason carefully, acknowledge uncertainty, and never recommend lethal action without strong evidence.
Civilian safety is the highest priority — false positives have serious consequences.

INTELLIGENCE REPORT:
{entity.intel_report}

CLASSIFIER ASSESSMENT:
- Threat score: {classifier_result["threat_score"]} (0.0 = no threat, 1.0 = confirmed hostile)
- Model confidence: {classifier_result["confidence"]}
- Classification label: {classifier_result["label"]}
- Class probabilities:
    Non-threat: {probs["non_threat"]}
    Hostile:    {probs["hostile"]}
    Ambiguous:  {probs["ambiguous"]}
- Top features driving this score:
{feature_lines}

First, reason through the evidence in plain prose. Do not use any markdown
formatting, bold, headers, or asterisks — write as plain text only. Think through what the signals mean,
what is consistent or inconsistent, and what uncertainty exists. Write 3-5 sentences.

Then output exactly this delimiter on its own line:
---STRUCTURED---

Then output ONLY this JSON object, no preamble, no markdown:
{{
    "summary": "2-3 sentence summary",
    "reasoning": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
    "agrees_with_classifier": true or false,
    "confidence_assessment": "how certain and why",
    "recommended_action": "approve_engagement | deny_engagement | request_more_intel",
    "recommended_action_rationale": "1-2 sentences",
    "civilian_risk": "low | medium | high",
    "civilian_risk_rationale": "1 sentence"
}}"""


async def stream_explain_entity(entity: Entity):
    """
    Async generator that streams the explanation as SSE events.

    Yields strings formatted as SSE events:
      data: <token text>        — phase 1: reasoning prose tokens
      data: [STRUCTURED] {...}  — phase 2: final JSON object (single event)
      data: [DONE]              — signals stream complete
    """
    classifier_result = classifier.score(entity)
    prompt = _build_stream_prompt(entity, classifier_result)

    buffer = ""           # accumulates everything seen so far
    past_delimiter = False

    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            if past_delimiter:
                # Phase 2: accumulate JSON silently
                buffer += text
            else:
                buffer += text
                if "---STRUCTURED---" in buffer:
                    past_delimiter = True
                    # Emit any prose that came before the delimiter
                    prose, _, remainder = buffer.partition("---STRUCTURED---")
                    prose = prose.strip()
                    if prose:
                        yield f"data: {prose}\n\n"
                    # remainder is the start of the JSON — keep accumulating
                    buffer = remainder
                else:
                    # Still in prose phase — stream tokens as they arrive
                    yield f"data: {text}\n\n"

    # Stream finished — buffer now holds the complete JSON
    json_str = buffer.strip()
    # Strip markdown fences if Claude added them
    if "```" in json_str:
        first = json_str.index("```") + 3
        last  = json_str.rindex("```")
        json_str = json_str[first:last].strip()
        if json_str.startswith("json"):
            json_str = json_str[4:].strip()

    try:
        llm_result = json.loads(json_str)
    except json.JSONDecodeError:
        llm_result = {
            "summary": "Parse error — review intel manually.",
            "reasoning": ["Parse error — manual review required"],
            "agrees_with_classifier": None,
            "confidence_assessment": "Unknown",
            "recommended_action": "request_more_intel",
            "recommended_action_rationale": "Unable to parse response.",
            "civilian_risk": "unknown",
            "civilian_risk_rationale": "Unable to assess.",
        }

    # Detect disagreement (same logic as explain_entity)
    classifier_recommends_approve = classifier_result["threat_score"] > 0.5
    llm_recommends_approve        = llm_result.get("recommended_action") == "approve_engagement"
    disagreement                  = classifier_recommends_approve != llm_recommends_approve

    structured = {
        "entity_id":           entity.id,
        "llm_explanation":     llm_result,
        "classifier_result":   classifier_result,
        "disagreement":        disagreement,
        "disagreement_detail": (
            f"Classifier scores this as {'threat' if classifier_recommends_approve else 'non-threat'} "
            f"({classifier_result['threat_score']}) but LLM recommends "
            f"{'approve' if llm_recommends_approve else 'deny or more intel'}."
        ) if disagreement else None,
    }

    yield f"data: [STRUCTURED] {json.dumps(structured)}\n\n"
    yield "data: [DONE]\n\n"