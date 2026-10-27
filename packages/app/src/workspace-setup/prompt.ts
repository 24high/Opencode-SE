export * as WorkspaceSetupPrompt from "./prompt.js"

import TEMPLATE from "./template/workspace-generation.md?raw"

/**
 * The checked-in Markdown template is the single source of truth for workspace
 * generation. It is loaded from disk at runtime (bundled as text in packaged
 * builds) and never duplicated as a TypeScript string.
 */
export const template = () => TEMPLATE

/** Bumped whenever the template's contract changes. */
export const TEMPLATE_VERSION = 1

export const PLACEHOLDERS = {
  description: "{{project_description}}",
  outputLanguage: "{{output_language}}",
  configBlock: "{{config_block}}",
  version: "{{template_version}}",
} as const

const INITIAL_TASK_START = "<!-- BEGIN initial-task -->"
const INITIAL_TASK_END = "<!-- END initial-task -->"

export class TemplateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "WorkspaceSetupTemplateError"
  }
}

export interface AssemblyInput {
  /** The canonical template text loaded from the Markdown file. */
  readonly template: string
  /** The user's project description, inserted verbatim. */
  readonly description: string
  /** Output language for generated artifacts, e.g. "English" or "German". */
  readonly outputLanguage: string
  /** Serialized configuration block the workspace generation must write. */
  readonly configBlock: string
}

/**
 * Deterministic assembly: replaces only the explicitly defined placeholders
 * and inserts the user's description as data. User content never triggers
 * substitution because replacement splits the template on the literal
 * placeholder tokens and joins the pieces around the inserted values.
 */
export const assembleGenerationPrompt = (input: AssemblyInput): string => {
  const { template: source } = input
  const replaced = replaceAll(source, [
    [PLACEHOLDERS.version, String(TEMPLATE_VERSION)],
    [PLACEHOLDERS.description, input.description],
    [PLACEHOLDERS.outputLanguage, input.outputLanguage],
    [PLACEHOLDERS.configBlock, input.configBlock],
  ])
  return replaced
}

/** Extracts the initial-task section from the canonical template. */
export const extractInitialTask = (source: string, description: string): string => {
  const start = source.indexOf(INITIAL_TASK_START)
  const end = source.indexOf(INITIAL_TASK_END)
  if (start === -1 || end === -1 || end <= start)
    throw new TemplateError(`The workspace template is missing the initial-task markers (${INITIAL_TASK_START} ... ${INITIAL_TASK_END})`)
  const block = source.slice(start + INITIAL_TASK_START.length, end).trim()
  return replaceAll(block, [[PLACEHOLDERS.description, description]])
}

/** Replaces each token with its value; throws when a token is absent from the source. */
const replaceAll = (source: string, replacements: ReadonlyArray<readonly [string, string]>): string => {
  let result = source
  for (const [token, value] of replacements) {
    const parts = result.split(token)
    if (parts.length < 2)
      throw new TemplateError(`The workspace template is missing the required placeholder: ${token}`)
    result = parts.join(value)
  }
  return result
}

/** True when the template file loaded at runtime, which tests also assert. */
export const isTemplateLoaded = () => TEMPLATE.length > 0
