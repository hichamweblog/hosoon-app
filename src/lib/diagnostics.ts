export type DiagnosticCode = "screen-render-failed" | "storage-unavailable" | "sync-failed" | "pwa-registration-failed" | "mushaf-download-failed" | "audio-failed";
const events: { code: DiagnosticCode; at: string }[] = [];
/** Local, bounded and content-free. No notes, tokens, email, recordings or payload logging. */
export function reportDiagnostic(code: DiagnosticCode) {
  events.push({ code, at: new Date().toISOString() });
  if (events.length > 50) events.shift();
}
export function diagnosticReport() { return { app: "hosoon", generatedAt: new Date().toISOString(), events: [...events] }; }
