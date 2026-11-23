// bb-plugin-ping-status — backend entry.
//
// Ping needs no RPC and no storage: the composer button sends the status
// request straight through bb's public thread API (`useSdk().threads.send`),
// which already runs with the signed-in user's authority. What stays here is
// the one setting the frontend reads, so the wording is editable without
// touching code.
import { z } from "zod";
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { DEFAULT_PING_MESSAGE } from "./lib/ping-message";

export default async function plugin(bb: BbPluginApi) {
  // Rendered in Settings → Installed plugins and editable with
  // `bb plugin config ping-status set message "<text>"`.
  bb.settings.define({
    message: {
      type: "string",
      label: "Status request text",
      description:
        "What Ping sends into the running turn. The thread's agent answers it like any other user message.",
      experimental_multiline: true,
      experimental_schema: z
        .string()
        .max(2000, "Keep the status request under 2000 characters"),
      default: DEFAULT_PING_MESSAGE,
    },
  });

  bb.log.info("loaded");
}
