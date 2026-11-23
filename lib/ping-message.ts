/**
 * The status request Ping sends into the running turn.
 *
 * Shared by both entries: `server.ts` uses it as the settings default, `app.tsx`
 * uses it while settings load or when the setting is blank. Keep it in its own
 * module — importing a value from `server.ts` into the app bundle would pull the
 * backend entry into the frontend build.
 */
export const DEFAULT_PING_MESSAGE =
  "[Ping] Пользователь ждёт статус по задаче. Кратко: что сейчас делаешь, на каком шаге, есть ли блокеры и что дальше. Работу не останавливай — сначала короткий статус, потом продолжай.";

/** The setting value to send, falling back to the default when blank. */
export function resolvePingMessage(value: string | undefined): string {
  return value !== undefined && value.trim() !== "" ? value : DEFAULT_PING_MESSAGE;
}
