import { isJoinCode, normalizeCode, parseRejoinCode, randomCode, JOIN_CODE_LENGTH } from "./codes.ts";
import type { MatchRoom } from "./match-room.ts";
import { cleanName, type Failure } from "./room.ts";

export { MatchRoom } from "./match-room.ts";

export interface Env {
  MATCHES: DurableObjectNamespace<MatchRoom>;
  ASSETS: Fetcher;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const failure = (f: Failure) => json({ message: f.message }, f.status);

/** Strips the success flag; failures become error responses. */
function send<T extends { ok: boolean }>(r: T) {
  if (!r.ok) return failure(r as unknown as Failure);
  const { ok: _ok, ...body } = r as T & { ok: true };
  return json(body);
}

async function body(request: Request): Promise<Record<string, unknown>> {
  try {
    const b = await request.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function bearer(request: Request): string | null {
  const h = request.headers.get("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7) : null;
}

async function api(request: Request, env: Env, path: string[]): Promise<Response> {
  const method = request.method;
  const room = (code: string) => env.MATCHES.get(env.MATCHES.idFromName(code));

  // POST /api/matches  { name }
  if (path.length === 1 && path[0] === "matches" && method === "POST") {
    const name = cleanName((await body(request)).name);
    if (!name) return json({ message: "Enter your name." }, 400);
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode(JOIN_CODE_LENGTH);
      const r = await room(code).create(code, name);
      if (r.ok || !("exists" in r)) return send(r);
    }
    return json({ message: "Couldn't create a game. Try again." }, 500);
  }

  // POST /api/rejoin  { rejoinCode }
  if (path.length === 1 && path[0] === "rejoin" && method === "POST") {
    const parsed = parseRejoinCode(String((await body(request)).rejoinCode ?? ""));
    if (!parsed) return json({ message: "That doesn't look like a rejoin code." }, 400);
    return send(await room(parsed.code).rejoin(parsed.secret));
  }

  if (path[0] !== "matches" || !path[1]) return json({ message: "Not found." }, 404);
  const code = normalizeCode(path[1]);
  if (!isJoinCode(code)) return json({ message: "That doesn't look like a game code." }, 400);
  const stub = room(code);
  const token = bearer(request);
  const action = path[2];

  if (!action && method === "GET") return send(await stub.get(token));
  if (method !== "POST") return json({ message: "Not found." }, 404);
  const b = await body(request);
  switch (action) {
    case "join": {
      const name = cleanName(b.name);
      if (!name) return json({ message: "Enter your name." }, 400);
      return send(await stub.join(name));
    }
    case "word":
      return send(await stub.setWord(token, b.round, b.word));
    case "guess":
      return send(await stub.guess(token, b.round, b.guess));
    case "summary-seen":
      return send(await stub.summarySeen(token, b.round));
    case "rematch":
      return send(await stub.rematch(token));
  }
  return json({ message: "Not found." }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      return await api(request, env, url.pathname.slice(5).split("/").filter(Boolean));
    } catch (e) {
      console.error(e);
      return json({ message: "Something went wrong. Try again." }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
