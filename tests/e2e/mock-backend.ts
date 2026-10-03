import type { Page, Route } from "@playwright/test";
import { emptyProgress } from "../../src/lib/progress/derive";
import type { ProgressData } from "../../src/lib/progress/types";
import { OWNER_A, OWNER_B } from "./helpers";
export const MOCK_ORIGIN = "https://mock.supabase.invalid", AUTH_KEY = "sb-mock-auth-token";
export function user(id: string) { return { id, aud: "authenticated", role: "authenticated", email: id === OWNER_A ? "a@example.invalid" : "b@example.invalid", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }; }
export function session(id: string) {
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, aud: "authenticated", role: "authenticated", exp: 4070908800 })).toString("base64url")}.test-signature`;
  return { access_token: token, refresh_token: `fake-refresh-${id}`, token_type: "bearer", expires_in: 3600000, expires_at: 4070908800, user: user(id) };
}
function jwtOwner(route: Route) {
  try { const token = route.request().headers().authorization?.replace("Bearer ", "") ?? ""; return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).sub as string; } catch { return null; }
}
function postgresOrder(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(postgresOrder);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.length - b.length || a.localeCompare(b)).map(([k, v]) => [k, postgresOrder(v)]));
  return value;
}
export class MockBackend {
  rows = new Map<string, { snapshot: ProgressData; revision: number; epoch: number }>();
  requests: { method: string; path: string; owner: string | null; body: Record<string, unknown> | null }[] = [];
  failReads = false; failResets = false; conflictNext = false; delayFirstRead = 0;
  passwordChanged = false; corrections: Record<string, unknown>[] = [];
  constructor() {}
  put(id: string, data: ProgressData) { this.rows.set(id, { snapshot: { ...data, ownerId: id }, revision: 1, epoch: data.epoch }); }
  writes() { return this.requests.filter((r) => r.path.endsWith("save_hosoon_progress") || r.path.endsWith("reset_hosoon_progress")); }
  async install(page: Page) {
    await page.route(`${MOCK_ORIGIN}/**`, async (route) => {
      const url = new URL(route.request().url()), method = route.request().method(), owner = jwtOwner(route);
      const body = method !== "GET" && route.request().postData() ? route.request().postDataJSON() as Record<string, unknown> : null;
      this.requests.push({ method, path: url.pathname, owner, body });
      const respond = (json: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(postgresOrder(json)), headers: { "Access-Control-Allow-Origin": "*" } });
      if (url.pathname === "/auth/v1/user") {
        if (!owner) return respond({ message: "invalid token" }, 401);
        if (method === "PUT") this.passwordChanged = true;
        return respond(user(owner));
      }
      if (url.pathname === "/auth/v1/token") {
        const id = body?.email === "b@example.invalid" ? OWNER_B : OWNER_A; return respond(session(id));
      }
      if (url.pathname === "/auth/v1/logout") return route.fulfill({ status: 204 });
      if (url.pathname === "/rest/v1/user_progress") {
        if (this.delayFirstRead) { const delay = this.delayFirstRead; this.delayFirstRead = 0; await new Promise((done) => setTimeout(done, delay)); }
        if (this.failReads) return respond({ code: "08006", message: "network failure" }, 503);
        const target = url.searchParams.get("user_id")?.replace("eq.", "");
        if (target !== owner) return respond([]);
        const row = this.rows.get(target!); if (!row) return respond([]);
        return respond([{ user_id: target, schema_version: 4, ...row, created_at: new Date().toISOString() }]);
      }
      if (url.pathname.startsWith("/rest/v1/rpc/")) {
        const snapshot = body?.p_snapshot as ProgressData;
        if (!owner || snapshot.ownerId !== owner) return respond({ code: "42501", message: "wrong owner" }, 403);
        const row = this.rows.get(owner), revision = row?.revision ?? 0, epoch = row?.epoch ?? 0;
        if (this.conflictNext) { this.conflictNext = false; if (row) row.revision++; return respond({ code: "40001", message: "HOSOON_CONFLICT" }, 409); }
        if (body?.p_expected_revision !== revision) return respond({ code: "40001", message: "HOSOON_CONFLICT" }, 409);
        const reset = url.pathname.endsWith("reset_hosoon_progress");
        if (reset && this.failResets) return respond({ code: "08006", message: "reset failed" }, 503);
        if (!reset && (body?.p_expected_epoch !== epoch || snapshot.epoch !== epoch)) return respond({ code: "40001", message: "HOSOON_CONFLICT" }, 409);
        const next = { snapshot: { ...snapshot, epoch: reset ? epoch + 1 : epoch }, revision: revision + 1, epoch: reset ? epoch + 1 : epoch };
        this.rows.set(owner, next); return respond({ user_id: owner, schema_version: 4, ...next });
      }
      if (url.pathname === "/rest/v1/thumun_corrections") { if (!owner || body?.user_id !== owner) return respond({ code: "42501", message: "denied" }, 403); this.corrections.push(body!); return respond(null, 201); }
      if (url.pathname === "/rest/v1/progress_recoveries") return respond([]);
      return respond({ message: "unhandled mock endpoint" }, 404);
    });
  }
}
export function account(id: string, note: string, currentDay = 1) { const data = emptyProgress(id); data.currentDay = currentDay; data.notes[1] = note; data.settings.quietMode = true; data.versions["note:1"] = { clock: 10, device: "server" }; data.versions.currentDay = { clock: 10, device: "server" }; return data; }
