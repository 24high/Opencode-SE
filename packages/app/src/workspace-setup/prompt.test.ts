import { expect, test } from "bun:test"
import { WorkspaceSetupPrompt as Prompt } from "./prompt"

const source = Prompt.template()

test("the canonical template is loaded from the Markdown file at runtime", () => {
  expect(source.length).toBeGreaterThan(500)
  // Marker text that exists only in the checked-in file: proving the assembled
  // prompt comes from disk, not from a duplicated source string.
  expect(source).toContain("<!-- workspace-generation-template v")
  expect(source).toContain("## Artifacts to Generate")
  expect(source).toContain("<!-- BEGIN initial-task -->")
  expect(source).toContain("<!-- END initial-task -->")
})

test("assembly replaces every defined placeholder and inserts the description as data", () => {
  const description = 'a "quoted" {braced} {{fake_placeholder}} description\nwith newline and umlauts: äöü 日本語'
  const assembled = Prompt.assembleGenerationPrompt({
    template: source,
    description,
    outputLanguage: "German",
    configBlock: '{"routing":{"enabled":true}}',
  })
  // The user content appears byte-for-byte inside the data section.
  expect(assembled).toContain(`<project-description>\n${description}\n</project-description>`)
  // Placeholder-like text in the description did not trigger substitution.
  expect(assembled).toContain("{{fake_placeholder}}")
  // Defined placeholders were replaced.
  expect(assembled).not.toContain("{{project_description}}")
  expect(assembled).not.toContain("{{output_language}}")
  expect(assembled).not.toContain("{{config_block}}")
  expect(assembled).not.toContain("{{template_version}}")
  expect(assembled).toContain(String(Prompt.TEMPLATE_VERSION))
  expect(assembled).toContain("German")
  expect(assembled).toContain('{"routing":{"enabled":true}}')
})

test("changing the template changes the runtime prompt without a source-code duplicate", () => {
  const changed = source.replace("## Artifacts to Generate", "## Custom Section From Test")
  const assembled = Prompt.assembleGenerationPrompt({
    template: changed,
    description: "desc",
    outputLanguage: "English",
    configBlock: "{}",
  })
  expect(assembled).toContain("## Custom Section From Test")
})

test("missing placeholders produce an actionable error instead of a broken prompt", () => {
  expect(() =>
    Prompt.assembleGenerationPrompt({
      template: source.replaceAll("{{project_description}}", "{{gone}}"),
      description: "desc",
      outputLanguage: "English",
      configBlock: "{}",
    }),
  ).toThrow("{{project_description}}")
})

test("the initial task is extracted deterministically with the description substituted", () => {
  const task = Prompt.extractInitialTask(source, "my project")
  expect(task).toContain("## Initial Task")
  expect(task).toContain("my project")
  expect(task).not.toContain("{{project_description}}")
  expect(task).not.toContain("<!-- BEGIN initial-task -->")
  expect(() => Prompt.extractInitialTask(source.replace("<!-- BEGIN initial-task -->", "<!-- gone -->"), "x")).toThrow()
})
