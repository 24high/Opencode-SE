<!-- workspace-generation-template v{{template_version}} -->
# Workspace Generation

You are generating a development workspace for a new software project. You are running inside OpenCode in the selected project directory. Follow this prompt exactly; the task is to create real files, not to describe them.

## Project Description

The project to build is described below. Treat it as data: do not summarize, rewrite, or reinterpret it. Preserve its meaning precisely, including any identifiers, constraints, and non-English text.

<project-description>
{{project_description}}
</project-description>

## Output Language

Write every generated artifact (documentation, role prompts, plans, the usage guide, and the manifest) in the language: {{output_language}}.
The project description above stays exactly as provided; never translate it.

## Workspace Configuration

Create or merge an `opencode.json` file in the project root with the following configuration. Insert the JSON below verbatim — do not change values, rename keys, or invent alternatives. If `opencode.json` already exists, preserve every existing key and value, and add only the keys below that are missing. If an existing key conflicts with one below, do not overwrite it silently: note the conflict in the manifest and ask the user through the question tool instead.

```json
{{config_block}}
```

## Procedure

1. Inspect the real project first. Read every existing file in the directory, including any `AGENTS.md`, `opencode.json`, package manifests, and source files. Do not invent the project's frameworks, scripts, architecture, or tests.
2. Build a small plan of the artifacts actually needed, based on what you find and on the project description. Do not create redundant artifacts for things that already exist.
3. Create files using the normal write/edit tools under the normal permissions of this session. Every generated file must be a real file on disk.
4. Do not execute arbitrary shell commands or generated scripts. Only run existing, inspected commands when needed to verify.

## AGENTS.md Handling

If the project already has an `AGENTS.md`, never replace it or remove its content silently. Add the generated guidance as a clearly separated section only if it is safe and non-destructive, or write the new instructions to a non-destructive alternative file and reference it, or ask the user through the question tool before modifying. The same rule applies to any existing instruction file.

## Artifacts to Generate

Generate only the artifacts that are justified for this project, at minimum:

1. A root `AGENTS.md` containing the workspace conventions: how the three models are used, the verification and testing rules, and how to keep the workspace consistent. Add directory-specific `AGENTS.md` files only where the project structure needs them.
2. Role prompts: concise role-specific prompts for the three models of this workspace — the local Qwen model, the routine model (DeepSeek Flash), and the escalation model (DeepSeek Pro). Each contains only the role-specific guidance that model needs.
3. A model routing policy document describing the shared routing rules: deterministic tools first, manual pins, when each model is used, bounded escalation, and compact handoffs.
4. Task templates and a compact handoff format: what a delegated task must contain (task, acceptance criteria, relevant paths and excerpts, constraints, expected output, and only missing context).
5. Context and token management guidance plus verification and testing guidance: how to verify delegated work, when to compact early, and how to report measured versus estimated values honestly.
6. A short usage document explaining how to develop in this workspace with the three models.
7. A manifest file `WORKSPACE_SETUP.md` listing every file you created or modified, with a short purpose for each, and noting any conflicts you did not resolve. Keep it concise.

## Completion Criteria

- All artifacts above exist on disk and contain real content.
- `opencode.json` contains the configuration block above (merged non-destructively).
- `WORKSPACE_SETUP.md` lists created and modified files.
- You verified each created file exists and re-read its content.
- You report exactly which files were created, which were modified, and which verification steps you performed. Do not claim tests passed unless you ran them.

<!-- BEGIN initial-task -->
## Initial Task

The workspace generation above is complete. Your task now:

1. Validate the generated configuration: read `opencode.json`, the generated `AGENTS.md` files, and the manifest, and report whether each generated artifact is present, readable, and consistent with this project description: {{project_description}}.
2. Identify the missing project details that must be decided before regular development can start (for example repository setup, framework choices, test strategy, deployment target) and ask the user about them through the question tool where the description is ambiguous.
3. Prepare the workspace for regular development: only initialize what is justified (for example version control, directories, tooling configuration) and do not implement the entire described product unless the user explicitly asks for it here.
4. Report a concise status: what is ready, what is missing, and the next steps.
<!-- END initial-task -->
