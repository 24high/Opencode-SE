export * as RoutingInstructions from "./instructions.js"

import ORCHESTRATOR from "./orchestrator.txt"
import { Effect, Schema } from "effect"
import { Instructions } from "../instructions/index.js"

/**
 * Concise orchestrator instructions appended to the instruction baseline when
 * model routing is enabled. The full routing policy text lives in the
 * versioned orchestrator.txt file; this module only wires it into the
 * instruction sources.
 */
export const make = (): Instructions.List =>
  Instructions.make({
    key: Instructions.Key.make("core/routing"),
    codec: Schema.toCodecJson(Schema.String),
    read: Effect.succeed(ORCHESTRATOR),
    render: {
      initial: (text) => text,
      changed: (_previous, text) => text,
    },
  })
