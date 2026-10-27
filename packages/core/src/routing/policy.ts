export * as RoutingPolicy from "./policy.js"

import { Model } from "@opencode/schema/model"

export type Preference = "cost-first" | "balanced" | "quality-first"
export type Tier = "local" | "routine" | "pro"

export interface Candidate {
  /** Catalog identity; never the provider API model id. */
  readonly ref: Model.Ref
  readonly tier: Tier
  /** Catalog price in USD per million tokens; 0 when unknown or free. */
  readonly inputCost: number
  readonly outputCost: number
  /** Catalog context limit in tokens; 0 means unknown. */
  readonly contextLimit: number
}

export type TaskType = "bounded-code" | "analysis" | "tests" | "refactor" | "debug" | "architecture" | "security" | "general"

export interface Evidence {
  readonly task: TaskType
  readonly complexity: "low" | "moderate" | "high"
  /** Estimated input tokens for the request, including prompt overhead. */
  readonly estimatedInputTokens: number
  readonly riskElevated: boolean
}

export interface Budget {
  readonly localEnabled: boolean
  readonly localFailures: number
  readonly routineFailures: number
  readonly localMax: number
  readonly routineMax: number
  readonly localUnhealthy: boolean
  readonly routineUnhealthy: boolean
  readonly proUnhealthy: boolean
}

export interface Route {
  readonly ref: Model.Ref
  readonly tier: Tier
  /** Concise, non-sensitive reasons for the choice. */
  readonly reasons: readonly string[]
  /** Whether cost or context figures in the reasons are estimates. */
  readonly estimates: boolean
}

const OUTPUT_RESERVE = 4_000
const OVERHEAD_MARGIN = 1.15

/**
 * Coding work the local model may take when healthy and within its context
 * budget. Planning, analysis, review, and control stay on the routine tier.
 */
const LOCAL_TASKS: ReadonlySet<TaskType> = new Set(["bounded-code", "tests", "refactor"])

export interface SelectionInput {
  readonly preference: Preference
  readonly candidates: Partial<Record<Tier, Candidate>>
  readonly evidence: Evidence
  readonly budget: Budget
}

/**
 * Deterministic route selection. Purely functional: no IO, no model calls, no
 * state. Availability failures and attempt counts arrive as already-computed
 * budget inputs; the caller owns persistence and cooldowns.
 */
export const selectRoute = (input: SelectionInput): Route | undefined => {
  const { candidates } = input
  const fits = (candidate: Candidate) =>
    candidate.contextLimit <= 0 ||
    Math.ceil(input.evidence.estimatedInputTokens * OVERHEAD_MARGIN) + OUTPUT_RESERVE <= candidate.contextLimit

  const eligible = (tier: Tier): Candidate | undefined => {
    const candidate = candidates[tier]
    if (!candidate || !fits(candidate)) return undefined
    const unhealthy =
      tier === "local"
        ? input.budget.localUnhealthy
        : tier === "routine"
          ? input.budget.routineUnhealthy
          : input.budget.proUnhealthy
    if (unhealthy) return undefined
    if (tier === "local" && !input.budget.localEnabled) return undefined
    return candidate
  }

  const local = eligible("local")
  const routine = eligible("routine")
  const pro = eligible("pro")

  const attemptsExceeded = (tier: Tier) =>
    tier === "local"
      ? input.budget.localFailures >= input.budget.localMax
      : tier === "routine"
        ? input.budget.routineFailures >= input.budget.routineMax
        : false

  const route = (tier: Tier, candidate: Candidate, reasons: readonly string[]): Route => ({
    ref: candidate.ref,
    tier,
    reasons,
    estimates: true,
  })

  const prefer = input.preference

  // Security-sensitive or otherwise elevated-risk work escalates directly and
  // never falls back to the local tier: a weak local model is not a safe
  // reduced-capability mode for elevated risk. No route means the caller falls
  // back to the user's configured default model.
  if (input.evidence.task === "security" || input.evidence.riskElevated) {
    if (pro) return route("pro", pro, ["elevated risk or security-sensitive task"])
    if (routine)
      return route("routine", routine, ["elevated risk or security-sensitive task", "pro tier unavailable, falling back to routine"])
    return undefined
  }

  if (input.evidence.task === "architecture" || (input.evidence.task === "debug" && input.evidence.complexity === "high")) {
    if (pro)
      return route("pro", pro, [
        input.evidence.task === "architecture" ? "cross-module or architectural decision" : "difficult debugging",
      ])
    if (routine) return route("routine", routine, ["pro tier unavailable, falling back to routine"])
    return undefined
  }

  if (input.evidence.task === "debug") {
    if (prefer === "quality-first" && pro) return route("pro", pro, ["difficult debugging, quality-first preference"])
    if (routine && !attemptsExceeded("routine"))
      return route("routine", routine, ["debugging task", "routine tier meets quality and context requirements at lower expected cost"])
    if (pro) return route("pro", pro, ["routine tier exhausted its attempt budget"])
    if (routine) return route("routine", routine, ["debugging task", "routine attempts budget reached but no pro tier"])
    return undefined
  }

  if (LOCAL_TASKS.has(input.evidence.task)) {
    const localSuitable = local && !attemptsExceeded("local")
    if (prefer === "cost-first") {
      if (localSuitable) return route("local", local, ["bounded task fits local tier", "cost-first preference"])
      if (routine) return route("routine", routine, ["local tier not eligible", "cost-first preference"])
      if (local) return route("local", local, ["routine tier unavailable", "local tier is the only eligible candidate"])
      if (pro) return route("pro", pro, ["only pro tier eligible"])
      return undefined
    }
    if (prefer === "balanced") {
      // Balanced delegates coding work to the local tier and keeps planning,
      // analysis, review, and control on the routine tier.
      if (localSuitable) return route("local", local, ["coding task fits local tier", "balanced preference"])
      if (routine && !attemptsExceeded("routine"))
        return route("routine", routine, ["local tier not eligible", "balanced preference"])
      if (pro) return route("pro", pro, ["lower tiers exhausted their attempt budgets"])
      return undefined
    }
    // quality-first
    if (routine && !attemptsExceeded("routine")) return route("routine", routine, ["quality-first preference"])
    if (localSuitable) return route("local", local, ["routine tier not eligible", "local tier remains eligible"])
    if (pro) return route("pro", pro, ["quality-first preference", "lower tiers not eligible"])
    return undefined
  }

  // General work (planning, analysis, review, and elevated risk): routine by
  // default; pro before local when routine is exhausted, since the local tier is
  // reserved for coding tasks.
  if (routine && !attemptsExceeded("routine"))
    return route("routine", routine, ["general task", "routine tier meets quality and context requirements at lower expected cost"])
  if (pro) return route("pro", pro, ["routine tier exhausted its attempt budget"])
  if (local && !attemptsExceeded("local")) return route("local", local, ["only eligible tier"])
  return undefined
}

/**
 * Deterministic task classification from the latest user request text. Keyword
 * matching only; never invokes inference. Returns conservative defaults so an
 * unrecognized request counts as bounded coding work.
 */
export const classifyTask = (text: string): Omit<Evidence, "estimatedInputTokens"> => {
  const riskElevated =
    /\b(delete|drop|wipe|purge|rm -rf|destroy|overwrite)\b/i.test(text) ||
    /\b(production|prod (deploy|migrat)|database (migrat|drop|reset)|security|auth|secret|vulnerab|cve|injection|csrf|xss|permission(s)? (model|system)|privilege)\b/i.test(
      text,
    )
  const security =
    riskElevated &&
    /\b(security|auth|secret|vulnerab|cve|injection|csrf|xss|privilege|permission(s)? (model|system))\b/i.test(text)
  if (security) return { task: "security", complexity: classifyComplexity(text), riskElevated: true }

  if (riskElevated) return { task: "general", complexity: classifyComplexity(text), riskElevated: true }

  if (/\b(architecture|architectural|design|restructur|re-architect|cross-module|major (change|refactor)|migrat(e|ion))\b/i.test(text))
    return { task: "architecture", complexity: "high", riskElevated: false }

  if (
    /\b(debug|bug(s)?|broken|failing|fails?|exception|traceback|stack ?trace|crash(es|ed)?|regression|flaky|not working|doesn'?t work|unresolved)\b/i.test(
      text,
    )
  )
    return { task: "debug", complexity: classifyComplexity(text), riskElevated: false }

  if (/\b(write|add|create|generate|implement)?\s?(unit |integration )?tests?( for)?\b/i.test(text) && /\btest/i.test(text))
    return { task: "tests", complexity: classifyComplexity(text), riskElevated: false }

  if (/\b(analy[sz]e|explain|summari[sz]e|review|understand|investigate|document)\b/i.test(text))
    return { task: "analysis", complexity: classifyComplexity(text), riskElevated: false }

  if (/\b(refactor|simplify|clean ?up|rework|restructure)\b/i.test(text))
    return { task: "refactor", complexity: classifyComplexity(text), riskElevated: false }

  return { task: "bounded-code", complexity: classifyComplexity(text), riskElevated: false }
}

const classifyComplexity = (text: string) => {
  const size = text.length / 4
  if (size >= 24_000) return "high" as const
  if (size >= 8_000) return "moderate" as const
  return "low" as const
}
