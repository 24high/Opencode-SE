import { useDialog } from "@opencode/ui/context/dialog"
import { useCommand, type CommandOption } from "@/shell/commands/command"
import { useLanguage } from "@/runtime/i18n/language"
import { useGlobal } from "@/runtime/server/runtime"
import { useServers } from "@/runtime/server/registry"
import { useTabs } from "@/shell/tabs/tabs"
import { lazy, Suspense } from "solid-js"
import type { Environment } from "./controller"

const WorkspaceSetupWizard = lazy(() => import("./wizard").then((module) => ({ default: module.WorkspaceSetupWizard })))

/**
 * Opens the workspace setup wizard through the shared dialog manager. The
 * server-scoped capabilities are passed in because dialog content renders in
 * the dialog portal, above the Server and Tabs providers.
 */
export const openWorkspaceSetupWizard = (dialog: ReturnType<typeof useDialog>, env: Environment) => {
  dialog.show(() => (
    <Suspense>
      <WorkspaceSetupWizard env={env} />
    </Suspense>
  ))
}

/** Registers the palette command; mount once inside the app shell. */
export function WorkspaceSetupCommands() {
  const command = useCommand()
  const language = useLanguage()
  const dialog = useDialog()
  const global = useGlobal()
  const servers = useServers()
  const tabs = useTabs()

  command.register("workspace-setup", () => {
    const commands: CommandOption[] = [
      {
        id: "workspace-setup.open",
        title: language.t("workspaceSetup.title"),
        category: language.t("command.category.project"),
        featured: true,
        onSelect: () => {
          const conn = servers.visible[0]
          if (!conn) return
          openWorkspaceSetupWizard(dialog, { server: conn, context: global.ensureServerCtx(conn), tabs })
        },
      },
    ]
    return commands
  })

  return null
}
