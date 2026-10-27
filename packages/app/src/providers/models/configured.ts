import { createEffect, createMemo, on } from "solid-js"
import { useData } from "@/runtime/server/current"
import { useWorkspaceLocation } from "@/workspaces/location"
import { useServerSDK } from "@/runtime/server/client"

/** Location config documents, kept in sync with the active directory and connection. */
function useLocationConfigDocuments() {
  const data = useData()
  const location = useWorkspaceLocation()
  const server = useServerSDK()
  createEffect(
    on(
      () => [location().directory, server.connection.status()] as const,
      ([directory]) => {
        void data.location.config.sync({ directory }).catch(() => undefined)
      },
    ),
  )
  return () => data.location.config.list({ directory: location().directory })
}

export function useConfiguredModel() {
  const documents = useLocationConfigDocuments()

  const model = createMemo(() => {
    const entry = documents()?.findLast((entry) => entry.type === "document" && entry.info.model !== undefined)
    const model = entry?.type === "document" ? entry.info.model : undefined

    if (!model) return

    if (typeof model !== "string") return { providerID: model.providerID, modelID: model.model, variant: model.variant }
    const [providerID, ...parts] = model.split("/")

    return { providerID, modelID: parts.join("/"), variant: undefined }
  })

  return Object.assign(model, { ready: () => documents() !== undefined })
}

/**
 * Cost-aware routing settings from the location configuration. The composer
 * offers automatic model routing only when the workspace enables it.
 */
export function useRouting() {
  const documents = useLocationConfigDocuments()

  const settings = createMemo(() => {
    const entry = documents()?.findLast((entry) => entry.type === "document" && entry.info.routing !== undefined)
    return entry?.type === "document" ? entry.info.routing : undefined
  })

  return Object.assign(() => settings()?.enabled === true, {
    ready: () => documents() !== undefined,
    settings,
  })
}
