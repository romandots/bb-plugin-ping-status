// bb-plugin-ping-status — frontend entry.
//
// One composer action button, mounted in a thread's composer next to the voice
// and stop controls. Clicking it sends the configured status request into the
// thread's running turn through bb's public thread API, so the agent answers
// where it is without waiting for the turn to finish.
//
// React, sonner and @get-bb/plugin-sdk/app are provided by the BB app at load
// time and never bundled here.
import { useState } from "react";
import {
  definePluginApp,
  useComposer,
  useSdk,
  useSettings,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import { resolvePingMessage } from "@/lib/ping-message";

// Matches bb's own composer icon buttons (the voice control): same box, same
// hover and focus chrome, same coarse-pointer growth on touch.
const BUTTON_CLASS =
  "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md p-0 " +
  "text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground " +
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring " +
  "disabled:pointer-events-none disabled:opacity-50 max-md:pointer-coarse:size-10";

function settingText(value: string | number | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function PingAction() {
  const composer = useComposer();
  const sdk = useSdk();
  const settings = useSettings();
  const [pending, setPending] = useState(false);

  // Registered for thread composers only, so the scope always carries a thread.
  const threadId = composer.scope.kind === "thread" ? composer.scope.threadId : null;
  const canPing = threadId !== null && composer.isRunning && !pending;

  const hint =
    pending
      ? "Отправляю запрос статуса…"
      : composer.isRunning
        ? "Запросить статус у работающего агента"
        : "Агент сейчас не работает";

  async function ping(threadId: string): Promise<void> {
    const result = await sdk.threads.send({
      threadId,
      // Add the request to the running turn. Where the provider cannot steer
      // mid-turn, bb queues it and the answer still comes back to this thread.
      mode: "steer-if-active",
      input: [
        {
          type: "text",
          text: resolvePingMessage(settingText(settings.values?.message)),
          mentions: [],
        },
      ],
    });
    if (result.delivery === "sent") {
      toast.success("Запрос статуса отправлен агенту");
    } else {
      toast.success("Агент не принимает сообщения в середине хода — запрос в очереди");
    }
  }

  return (
    <button
      type="button"
      className={BUTTON_CLASS}
      aria-label="Ping"
      title={hint}
      disabled={!canPing}
      onClick={() => {
        if (threadId === null || pending) return;
        setPending(true);
        ping(threadId).then(
          () => setPending(false),
          (cause: unknown) => {
            setPending(false);
            toast.error(cause instanceof Error ? cause.message : String(cause));
          },
        );
      }}
    >
      <Icon
        name={pending ? "Spinner" : "MessageQuestion"}
        className={pending ? "size-4 animate-spin" : "size-4"}
      />
    </button>
  );
}

export default definePluginApp((app) => {
  app.composer.customize({
    id: "ping",
    scopes: ["thread"],
    actions: [{ id: "ping", component: PingAction }],
  });
});
