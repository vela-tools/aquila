import { createServer } from "node:http";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const PORT = Number(process.env.PORT ?? 8099);
const LOG_FILE = process.env.LOG_FILE ?? "";
const KEEP = Number(process.env.KEEP ?? 5000);
const MAX_BODY = 10 * 1024 * 1024;

const items = [];
let seq = 0;

function load() {
    if (!LOG_FILE) return;
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    if (!existsSync(LOG_FILE)) return;
    for (const line of readFileSync(LOG_FILE, "utf8").split("\n")) {
        if (!line.trim()) continue;
        try {
            const item = JSON.parse(line);
            items.push(item);
            seq = Math.max(seq, item.seq);
        } catch {
            // A line that is not JSON, such as one cut short when the receiver stopped mid-write, is skipped.
        }
    }
    items.splice(0, Math.max(0, items.length - KEEP));
}

function persistAll() {
    if (LOG_FILE) writeFileSync(LOG_FILE, items.map((item) => JSON.stringify(item) + "\n").join(""));
}

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const URI = /^[a-z][a-z0-9+.-]*:\S+$/i;

function problemsOf(body) {
    if (body === null || typeof body !== "object" || Array.isArray(body)) return ["body is not a JSON object"];
    const problems = [];
    if (typeof body.id !== "string" || !URI.test(body.id)) problems.push("id is missing or not a URI");
    if (body.type !== "Notification") problems.push(`type is ${JSON.stringify(body.type)}, expected "Notification"`);
    if (typeof body.subscriptionId !== "string" || !URI.test(body.subscriptionId))
        problems.push("subscriptionId is missing or not a URI");
    if (typeof body.notifiedAt !== "string" || !DATE_TIME.test(body.notifiedAt))
        problems.push("notifiedAt is missing or not a DateTime");
    const data = body.data;
    const features = data && typeof data === "object" && data.type === "FeatureCollection" ? data.features : null;
    if (!Array.isArray(data) && !Array.isArray(features))
        problems.push("data is neither an array nor a FeatureCollection");
    else if ((features ?? data).length === 0) problems.push("data is empty");
    return problems;
}

const entitiesOf = (body) => {
    const data = body?.data;
    const list = Array.isArray(data) ? data : Array.isArray(data?.features) ? data.features : [];
    return list.map((e) => e?.id).filter(Boolean);
};

const SHOWN_HEADERS = /^(content-type|link|user-agent|authorization|ngsild-.*|x-.*)$/i;

function record(req, url, bodyText, answered) {
    let body = null;
    try {
        body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
        // A body that is not JSON is recorded as null, and problemsOf reports it.
    }
    const problems = problemsOf(body);
    const item = {
        seq: ++seq,
        receivedAt: new Date().toISOString(),
        tag: decodeURIComponent(url.pathname.replace(/^\/notify\/?/, "")) || null,
        path: url.pathname + url.search,
        headers: Object.fromEntries(Object.entries(req.headers).filter(([k]) => SHOWN_HEADERS.test(k))),
        answered,
        subscriptionId: typeof body?.subscriptionId === "string" ? body.subscriptionId : null,
        entities: entitiesOf(body),
        valid: problems.length === 0,
        problems,
        body,
        ...(body === null && bodyText ? { bodyText } : {}),
    };
    items.push(item);
    if (items.length > KEEP) items.shift();
    if (LOG_FILE) appendFileSync(LOG_FILE, JSON.stringify(item) + "\n");
    const ids = item.entities.length > 3 ? [...item.entities.slice(0, 3), "…"] : item.entities;
    console.log(
        `${item.receivedAt} #${item.seq} [${item.tag ?? "-"}] answered ${answered} ` +
            `${item.subscriptionId ?? "no subscriptionId"} ${item.entities.length} entities${ids.length ? ` (${ids.join(", ")})` : ""}` +
            (item.valid ? "" : ` INVALID: ${problems.join("; ")}`),
    );
    return item;
}

function matcher(params) {
    const sub = params.get("subscriptionId");
    const tag = params.get("tag");
    const tagPrefix = params.get("tagPrefix");
    const after = Number(params.get("after") ?? 0);
    return (i) =>
        (!sub || i.subscriptionId === sub) &&
        (!tag || i.tag === tag) &&
        (!tagPrefix || (i.tag ?? "").startsWith(tagPrefix)) &&
        i.seq > after;
}

function filtered(params) {
    const limit = Math.min(Number(params.get("limit") ?? 100), KEEP);
    return items.filter(matcher(params)).slice(-limit);
}

const escape = (text) =>
    String(text).replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );

function page(params) {
    const shown = filtered(params).reverse();
    const rows = shown
        .map(
            (i) => `<details${i.valid ? "" : ' class="bad"'}>
  <summary><span class="seq">#${i.seq}</span> <time>${escape(i.receivedAt)}</time> <b>${escape(i.tag ?? "-")}</b>
  <span class="answer a${String(i.answered)[0]}">${i.answered}</span>
  <code>${escape(i.subscriptionId ?? "no subscriptionId")}</code> ${i.entities.length} entities
  ${i.valid ? "" : `<span class="problems">${escape(i.problems.join("; "))}</span>`}</summary>
  <pre>${escape(JSON.stringify({ headers: i.headers, body: i.body ?? i.bodyText ?? null }, null, 2))}</pre>
</details>`,
        )
        .join("\n");
    const filter = [...params].map(([k, v]) => `${escape(k)}=${escape(v)}`).join(", ");
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Notifications</title>
<style>
  :root { color-scheme: light dark; --bg: #fff; --fg: #1d1d1f; --muted: #6b6b70; --line: #e3e3e6; --bad: #b42318; --ok: #067647; }
  @media (prefers-color-scheme: dark) { :root { --bg: #161618; --fg: #ededf0; --muted: #9a9aa2; --line: #2c2c30; --bad: #f97066; --ok: #47cd89; } }
  body { margin: 0; padding: 16px; font: 14px/1.45 system-ui, sans-serif; background: var(--bg); color: var(--fg); }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p { margin: 0 0 12px; color: var(--muted); }
  details { border-top: 1px solid var(--line); padding: 6px 0; }
  summary { cursor: pointer; display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
  .seq, time { color: var(--muted); font-variant-numeric: tabular-nums; }
  code, pre { font: 12px/1.4 ui-monospace, monospace; }
  pre { overflow-x: auto; padding: 8px; border: 1px solid var(--line); border-radius: 6px; }
  .a2 { color: var(--ok); } .a4, .a5 { color: var(--bad); }
  .bad summary, .problems { color: var(--bad); }
</style>
</head>
<body>
<h1>Notifications (${shown.length}${filter ? `, ${filter}` : ""})</h1>
<p>POST to /notify/&lt;tag&gt;. Add ?status=500 to answer with an error, ?delay=2000 to answer late. Filter with ?tag=, ?tagPrefix=, ?subscriptionId=. Refreshes every 5 s.</p>
${rows || "<p>None yet.</p>"}
<script>setTimeout(() => { if (!document.querySelector('details[open]')) location.reload(); }, 5000);</script>
</body>
</html>`;
}

function send(res, status, body, type = "application/json") {
    res.writeHead(status, { "Content-Type": type, "Access-Control-Allow-Origin": "*" });
    res.end(type === "application/json" ? JSON.stringify(body) : body);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on("data", (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY) {
                reject(new Error("body too large"));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        req.on("error", reject);
    });
}

load();

createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://receiver");
    try {
        if (req.method === "POST" && (url.pathname === "/notify" || url.pathname.startsWith("/notify/"))) {
            const bodyText = await readBody(req);
            const status = Number(url.searchParams.get("status") ?? 200);
            const delay = Number(url.searchParams.get("delay") ?? 0);
            record(req, url, bodyText, status);
            if (delay > 0) await new Promise((r) => setTimeout(r, delay));
            res.writeHead(status);
            res.end();
            return;
        }
        if (req.method === "GET" && url.pathname === "/notifications")
            return send(res, 200, { items: filtered(url.searchParams) });
        const one = /^\/notifications\/(\d+)$/.exec(url.pathname);
        if (req.method === "GET" && one) {
            const item = items.find((i) => i.seq === Number(one[1]));
            return item ? send(res, 200, item) : send(res, 404, { error: "not found" });
        }
        if (req.method === "DELETE" && url.pathname === "/notifications") {
            const before = items.length;
            const matches = matcher(url.searchParams);
            const keep = url.searchParams.size ? items.filter((i) => !matches(i)) : [];
            items.splice(0, items.length, ...keep);
            persistAll();
            return send(res, 200, { removed: before - items.length });
        }
        if (req.method === "GET" && url.pathname === "/health")
            return send(res, 200, { ok: true, count: items.length });
        if (req.method === "GET" && url.pathname === "/")
            return send(res, 200, page(url.searchParams), "text/html; charset=utf-8");
        send(res, 404, { error: "not found" });
    } catch (e) {
        send(res, 500, { error: String(e?.message ?? e) });
    }
}).listen(PORT, () => console.log(`receiver listening on ${PORT}${LOG_FILE ? `, log ${LOG_FILE}` : ""}`));
