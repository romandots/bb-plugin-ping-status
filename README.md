# bb-plugin-ping-status

A **Ping** button in the thread composer, next to the voice and stop controls.

When an agent is mid-turn and has gone quiet, click Ping: it sends a status
request straight into the running turn, and the agent answers where it is
without the turn being cut short.

## What it does

- The button appears in a thread's composer and is always clickable there. It
  does not gate on "is the agent running": bb reports that only while a turn is
  live, and the case Ping exists for is a run that has gone quiet — including
  one bb already considers idle. The tooltip says which of the two will happen.
- One click sends the configured text with `mode: "steer-if-active"` through
  bb's public thread API: into the live turn if there is one, otherwise a new
  turn that answers with a status summary. The reply lands in the transcript as
  a normal assistant message.
- If the provider cannot be steered mid-turn, bb queues the request instead; the
  toast says which happened, so you never wonder whether the click did anything.
- A second click while a request is in flight is ignored.

## Settings

`bb plugin config ping-status set message "<text>"`, or the plugin's page under
Settings → Installed plugins:

| Setting | Default | Meaning |
| --- | --- | --- |
| `message` | `[Ping] Пользователь ждёт статус по задаче. Кратко: что сейчас делаешь, на каком шаге, есть ли блокеры и что дальше. Работу не останавливай — сначала короткий статус, потом продолжай.` | What Ping sends into the running turn. Blank falls back to this text. |

## Install

The plugin id is `ping-status` (the final package-name component minus the
`bb-plugin-` prefix) and it namespaces the plugin's routes, storage, settings
and CLI. It is a server plugin with no `bb.host` entry, so one install covers
every machine and client of that bb server:

```
bb plugin install https://github.com/romandots/bb-plugin-ping-status
```

## Layout

- `app.tsx` — the composer action (`app.composer.customize`). It reads
  `useComposer()` for the thread and running state, `useSettings()` for the
  wording, and calls `useSdk().threads.send`.
- `server.ts` — the one setting. No RPC, no storage, no CLI: the send goes
  through bb's own thread API, which already runs with your session.
- `lib/ping-message.ts` — the default wording, shared by both entries.
- `app.test.tsx` — the frontend contract, run against the SDK's own slot
  harness (`npm test`).

## Development

```
npm install
npx tsc --noEmit     # types against the pinned SDK
npm test             # vitest + @get-bb/plugin-sdk/testing/app
bb plugin build      # dist/app.js, dist/server.js
bb plugin dev        # rebuild + reload on every save
```

`bb plugin types` wants `@get-bb/plugin-sdk@0.6.168`, the exact SDK of bb 0.50.1,
which is not published to npm yet; the pin stays on the nearest published 0.6.169.
Re-run `bb plugin types` once 0.6.168 lands.
