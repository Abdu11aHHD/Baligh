import "server-only";
import { DEFAULT_DEPARTMENT, LIMITS } from "../constants";
import { applySafetyFloor, assessSafety, type SafetyFlag } from "../safety";
import type { Turn } from "../schemas";
import { AIError } from "./errors";
import { chatCompletion } from "./openrouter";
import { isLocationQuestion, normalizeModelOutput, extractJsonObject, type NormalizedOutput, type TicketDraft } from "./parse";
import { buildMessages, REPAIR_INSTRUCTION } from "./prompt";

export interface AnalysisInput {
  description: string;
  turns: Turn[];
  locationName: string | null;
}

export interface AnalysisResult {
  status: "ready" | "needs_clarification";
  reply: string;
  question: string | null;
  /** Ticket fields after deterministic safety rules were applied. */
  draft: TicketDraft;
  /** What Llama suggested before safety rules — kept for auditing. */
  aiPriority: TicketDraft["priority"];
  safety: { flags: SafetyFlag[]; immediateDanger: boolean; raisedPriority: boolean; minPriority: TicketDraft["priority"] | null };
  locationText: string | null;
  missingFields: string[];
  model: string;
}

/**
 * Full analysis pipeline: prompt → Llama → JSON extraction → schema
 * normalisation (with one repair retry) → business rules → safety floor.
 */
export async function analyzeReport(input: AnalysisInput): Promise<AnalysisResult> {
  const finalTurn = input.turns.length >= LIMITS.maxClarifications;
  const messages = buildMessages({ ...input, finalTurn });

  const first = await chatCompletion(messages);
  let model = first.model;
  let normalized: NormalizedOutput;
  try {
    normalized = normalizeModelOutput(extractJsonObject(first.content));
  } catch (e) {
    if (!(e instanceof AIError) || e.code !== "AI_INVALID_OUTPUT") throw e;
    // One repair attempt: show the model its own output and ask for JSON only.
    const retry = await chatCompletion([
      ...messages,
      { role: "assistant", content: first.content.slice(0, 2000) },
      { role: "user", content: REPAIR_INSTRUCTION },
    ]);
    model = retry.model;
    normalized = normalizeModelOutput(extractJsonObject(retry.content));
  }

  // Business rule: never ask for a location we already know.
  if (
    normalized.status === "needs_clarification" &&
    input.locationName &&
    normalized.question &&
    isLocationQuestion(normalized.question) &&
    normalized.draft
  ) {
    normalized = { ...normalized, status: "ready", question: null };
  }

  // Business rule: bounded conversation.
  if (finalTurn && normalized.status === "needs_clarification") {
    if (!normalized.draft) throw new AIError("AI_INCOMPLETE", "Model still needs clarification after the last allowed turn");
    normalized = { ...normalized, status: "ready", question: null };
  }

  if (!normalized.draft) {
    // needs_clarification without a draft: build a neutral placeholder the UI will not show as a ticket.
    normalized = {
      ...normalized,
      draft: {
        title: "بلاغ قيد التوضيح",
        summary: input.description.slice(0, LIMITS.summaryMax),
        category: "other",
        subcategory: "other",
        priority: "normal",
        priorityReason: "",
        department: DEFAULT_DEPARTMENT.other,
      },
    };
  }

  const draft = normalized.draft as TicketDraft;
  const safety = assessSafety(input.description, ...input.turns.map((t) => t.answer));
  const finalPriority = applySafetyFloor(draft.priority, safety);
  const raisedPriority = finalPriority !== draft.priority;
  const safetyDraft: TicketDraft = { ...draft, priority: finalPriority };

  if (safety.immediateDanger && safetyDraft.category !== "safety") {
    // Keep the AI category (e.g. maintenance/electrical) but route to safety team.
    safetyDraft.department = "safety";
  }
  if (raisedPriority) {
    safetyDraft.priorityReason = "تم رفع الأولوية تلقائيًا لوجود مؤشرات خطر على السلامة في وصف البلاغ.";
  }

  return {
    status: normalized.status,
    reply: normalized.reply,
    question: normalized.question,
    draft: safetyDraft,
    aiPriority: draft.priority,
    safety: { flags: safety.flags, immediateDanger: safety.immediateDanger, raisedPriority, minPriority: safety.minPriority },
    locationText: input.locationName ? null : normalized.locationText,
    missingFields: normalized.missingFields,
    model,
  };
}
