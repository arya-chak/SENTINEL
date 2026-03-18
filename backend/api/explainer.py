# explainer.py
import os
import json
import anthropic

from backend.simulation.engine import Entity, EntityType
from backend.classifier.model import classifier, anomaly_detector 

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


def _build_prompt(entity: Entity, classifier_result: dict) -> str:
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

    # ── Anomaly block — only injected when flag is set ────────────────────────
    anomaly_block = ""
    if classifier_result.get("anomaly_flag"):
        anomaly_block = f"""
---

ANOMALY DETECTION:
This entity's feature combination is statistically unusual compared to the civilian
and friendly baseline population (anomaly score: {classifier_result.get('anomaly_score', 'N/A')}).
This is an independent signal — treat it separately from the classifier label.
An entity can score low on the threat classifier but still be anomalous if its
feature combination has never been seen in normal population samples.
Consider what might explain the anomaly and whether it affects your recommendation.
"""

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
{anomaly_block}
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


def explain_entity(entity: Entity) -> dict:
    # ── Step 1: Get classifier + anomaly scores ───────────────────────────────
    classifier_result = classifier.score(entity)
    anomaly_result    = anomaly_detector.score(entity)
    classifier_result = {**classifier_result, **anomaly_result}  # ← merge

    # ── Step 2: Build and send prompt to Claude ───────────────────────────────
    prompt = _build_prompt(entity, classifier_result)

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )

    raw_response = message.content[0].text

    # ── Step 3: Parse Claude's JSON response ──────────────────────────────────
    cleaned = raw_response.strip()

    if "```" in cleaned:
        first = cleaned.index("```") + 3
        last  = cleaned.rindex("```")
        cleaned = cleaned[first:last].strip()
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()

    try:
        llm_result = json.loads(cleaned)
    except json.JSONDecodeError:
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

    # ── Anomaly block — identical injection as _build_prompt ─────────────────
    anomaly_block = ""
    if classifier_result.get("anomaly_flag"):
        anomaly_block = f"""
ANOMALY DETECTION:
This entity's feature combination is statistically unusual compared to the civilian
and friendly baseline population (anomaly score: {classifier_result.get('anomaly_score', 'N/A')}).
This is an independent signal — treat it separately from the classifier label.
Consider what might explain the anomaly and whether it affects your recommendation.
"""

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
{anomaly_block}
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
    # ── Get classifier + anomaly scores ───────────────────────────────────────
    classifier_result = classifier.score(entity)
    anomaly_result    = anomaly_detector.score(entity)
    classifier_result = {**classifier_result, **anomaly_result}  # ← merge

    prompt = _build_stream_prompt(entity, classifier_result)

    buffer = ""
    past_delimiter = False

    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            if past_delimiter:
                buffer += text
            else:
                buffer += text
                if "---STRUCTURED---" in buffer:
                    past_delimiter = True
                    prose, _, remainder = buffer.partition("---STRUCTURED---")
                    prose = prose.strip()
                    if prose:
                        yield f"data: {prose}\n\n"
                    buffer = remainder
                else:
                    yield f"data: {text}\n\n"

    json_str = buffer.strip()
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