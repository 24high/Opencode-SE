export * as ConfigCompactionPlugin from "./compaction.js"

import { define } from "@opencode/plugin/effect/plugin"
import { Effect } from "effect"
import { Config } from "../../config.js"
import { SessionCompaction } from "../../session/compaction.js"
import { ConfigEntryObserver } from "./entry-observer.js"

export const Plugin = define({
  id: "opencode.config.compaction",
  effect: Effect.fn(function* (ctx) {
    const config = yield* Config.Service
    const compaction = yield* SessionCompaction.Service
    const loaded = yield* ConfigEntryObserver.observe(config, ctx.event, compaction.reload())
    yield* compaction.transform((editor) => {
      for (const entry of loaded.entries) {
        if (entry.type !== "document" || !entry.info.compaction) continue
        editor.configure({
          ...(entry.info.compaction.auto === undefined ? {} : { auto: entry.info.compaction.auto }),
          ...(entry.info.compaction.buffer === undefined ? {} : { buffer: entry.info.compaction.buffer }),
          ...(entry.info.compaction.keep?.tokens === undefined ? {} : { keep: entry.info.compaction.keep.tokens }),
          ...(entry.info.compaction.early === undefined
            ? {}
            : {
                early: {
                  ...(entry.info.compaction.early.enabled === undefined
                    ? {}
                    : { enabled: entry.info.compaction.early.enabled }),
                  ...(entry.info.compaction.early.min_tokens === undefined
                    ? {}
                    : { minTokens: entry.info.compaction.early.min_tokens }),
                  ...(entry.info.compaction.early.min_benefit_tokens === undefined
                    ? {}
                    : { minBenefitTokens: entry.info.compaction.early.min_benefit_tokens }),
                  ...(entry.info.compaction.early.cooldown_seconds === undefined
                    ? {}
                    : { cooldownMs: entry.info.compaction.early.cooldown_seconds * 1000 }),
                  ...(entry.info.compaction.early.require_task_boundary === undefined
                    ? {}
                    : { requireTaskBoundary: entry.info.compaction.early.require_task_boundary }),
                  ...(entry.info.compaction.early.local_summarize === undefined
                    ? {}
                    : { localSummarize: entry.info.compaction.early.local_summarize }),
                },
              }),
        })
      }
    })
  }),
})
