/**
 * End-to-end check of spec §10 against the running server, over MCP (and REST where the item is REST):
 * `TASKER_API_KEY=tsk_… pnpm --filter server mcp:check`. Prints PASS / FAIL per line, exits 1 on any FAIL.
 * It creates a temporary key (with its own webhook receiver) for the draft / webhook / revoked-key checks, deletes the
 * rows it made, revokes the temporary key and restores `failed_mode`.
 */
import 'dotenv/config';
import { createHmac } from 'node:crypto';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ResourceUpdatedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import { addDays, format, parseISO, startOfISOWeek } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

const BASE = process.env.TASKER_URL ?? `http://127.0.0.1:${process.env.PORT ?? 3109}`;
const KEY = process.env.TASKER_API_KEY ?? '';
const TZ = 'Europe/Kyiv';
const META = { locale: 'uk', timeZone: TZ };
const TAG = '[mcp-check]';

let failed = 0;
const line = (ok: boolean, name: string, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Structured = Record<string, any>;
type CallResult = { isError?: boolean; structuredContent?: Structured };

async function connect(key: string): Promise<Client> {
  const client = new Client({ name: 'mcp-check', version: '0.1.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`), { requestInit: { headers: { Authorization: `Bearer ${key}` } } }));
  return client;
}

async function call(client: Client, name: string, args: Record<string, unknown>, meta: Record<string, unknown> = {}): Promise<CallResult> {
  return (await client.callTool({ name, arguments: args, _meta: { ...META, ...meta } })) as CallResult;
}

async function rest(method: string, path: string, key: string, body?: unknown): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-time-zone': TZ, ...(key && { authorization: `Bearer ${key}` }) },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  const json = (await res.json().catch(() => ({}))) as { data?: unknown };
  return { status: res.status, data: json.data ?? json };
}

/** A raw MCP `initialize` (status only), for the 401 checks. */
async function rawInitialize(key: string | null): Promise<number> {
  const res = await fetch(`${BASE}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(key && { authorization: `Bearer ${key}` }) },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'mcp-check', version: '0' } } }),
  });
  await res.body?.cancel();
  return res.status;
}

/** A local receiver for the temporary key's webhooks; checks Mia's signature rule on each. */
function startReceiver(getKey: () => string): Promise<{ server: HttpServer; url: string; events: { body: Structured; sigOk: boolean }[] }> {
  const events: { body: Structured; sigOk: boolean }[] = [];
  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const secret = createHmac('sha256', 'webhook').update(getKey()).digest();
      const ts = String(req.headers['x-connector-timestamp']);
      const expected = createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex');
      events.push({ body: JSON.parse(raw) as Structured, sigOk: expected === req.headers['x-connector-signature'] && req.headers['x-connector'] === 'tasker' });
      res.writeHead(200, { 'content-type': 'application/json' }).end('{"updated":0}');
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/connectors/events`, events })));
}

async function main(): Promise<void> {
  if (!KEY) throw new Error('Set TASKER_API_KEY (pnpm --filter server --silent cli api-key create <name>)');
  const created: { items: string[]; habits: string[] } = { items: [], habits: [] };
  const today = formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd');
  const monday = format(startOfISOWeek(parseISO(today)), 'yyyy-MM-dd');
  const day = (n: number) => format(addDays(parseISO(monday), n), 'yyyy-MM-dd');
  const tomorrow = format(addDays(parseISO(today), 1), 'yyyy-MM-dd');
  const at = (date: string, hhmm: string) => fromZonedTime(`${date}T${hhmm}:00`, TZ).toISOString();

  // §10.5 — auth
  line((await rawInitialize(null)) === 401, '§10.5 /mcp without a key → 401');

  let tempKey = '';
  const receiver = await startReceiver(() => tempKey);
  const mia = await connect(KEY);
  const settingsBefore = (await rest('GET', '/settings', KEY)).data as { failedMode: string };

  try {
    // §10.5 — tools/list + tools/call
    const { tools } = await mia.listTools();
    const createItem = tools.find((t) => t.name === 'create_item');
    line(tools.length >= 29 && (createItem?._meta as Structured | undefined)?.lookup?.project_id === 'find_projects', '§10.5 tools/list with a key', `${tools.length} tools, create_item _meta.lookup.project_id = ${(createItem?._meta as Structured | undefined)?.lookup?.project_id}`);
    const schemaOk = tools.every((t) => (t.inputSchema as Structured).additionalProperties === false);
    line(schemaOk, '§8.2 every inputSchema has additionalProperties:false');

    // §10.7 — lookups
    const projects = await call(mia, 'find_projects', { query: 'Mia' });
    const miaProject = (projects.structuredContent?.results as Structured[] | undefined)?.find((r) => r.label === 'Mia');
    line(!!miaProject, '§10.7 find_projects answers structuredContent.results', JSON.stringify(projects.structuredContent?.results?.[0] ?? null));

    // §10.1 — task with a 3-line checklist and 2 reminders: create / update / complete over MCP
    const t1 = await call(mia, 'create_item', {
      type: 'task', title: `${TAG} задача з чеклістом`, date: tomorrow,
      checklist: [{ title: 'перший' }, { title: 'другий' }, { title: 'третій' }],
      reminders: [{ at: at(tomorrow, '09:00') }, { at: at(tomorrow, '10:00') }],
    });
    const item1 = t1.structuredContent?.item as Structured | undefined;
    if (item1) created.items.push(item1.id);
    line(!t1.isError && item1?.checklist?.length === 3 && item1?.reminders?.length === 2, '§10.1 MCP create_item: checklist 3 + reminders 2', t1.isError ? JSON.stringify(t1.structuredContent) : `#${item1?.short_id}`);
    const found = await call(mia, 'find_items', { query: `#${item1?.short_id}` });
    line((found.structuredContent?.results as Structured[] | undefined)?.[0]?.id === item1?.id, '§10.7 find_items "#<n>" answers structuredContent.results', (found.structuredContent?.results as Structured[] | undefined)?.[0]?.label);
    const u1 = await call(mia, 'update_item', { item_id: item1?.id, title: `${TAG} задача з чеклістом (оновлена)` });
    line(!u1.isError && String((u1.structuredContent?.item as Structured | undefined)?.title).endsWith('(оновлена)'), '§10.1 MCP update_item');
    const tg = await call(mia, 'toggle_checklist_item', { item_id: item1?.id, title: 'другий' });
    line(!tg.isError, '§10.1 MCP toggle_checklist_item by line text', tg.isError ? JSON.stringify(tg.structuredContent) : '');
    const c1 = await call(mia, 'complete_item', { item_id: item1?.id });
    line(!c1.isError && (c1.structuredContent?.item as Structured | undefined)?.status === 'done', '§10.1 MCP complete_item → done');

    // §10.1 — the same over REST
    const r1 = await rest('POST', '/items/create', KEY, { type: 'task', title: `${TAG} REST задача`, date: tomorrow, checklist: [{ title: 'a' }, { title: 'b' }, { title: 'c' }], reminders: [{ at: at(tomorrow, '09:00') }, { at: at(tomorrow, '11:00') }] });
    if (r1.data?.id) created.items.push(r1.data.id);
    const r1u = await rest('PUT', '/items/update', KEY, { id: r1.data?.id, priority: 2 });
    const r1c = await rest('POST', '/items/complete', KEY, { id: r1.data?.id });
    line(r1.status === 201 && r1.data?.checklist?.length === 3 && r1.data?.reminders?.length === 2 && r1u.status === 200 && r1c.data?.status === 'done', '§10.1 REST create / update / complete', `${r1.status} ${r1u.status} ${r1c.status}`);

    // §10.2 — weekly Mon/Wed/Fri: strip, complete one, skip one, Today
    const p = await call(mia, 'create_item', { type: 'task', title: `${TAG} пн/ср/пт`, recurrence: { freq: 'weekly', weekdays: [1, 3, 5] }, starts_on: monday });
    const pid = (p.structuredContent?.item as Structured | undefined)?.id as string;
    if (pid) created.items.push(pid);
    const done = await call(mia, 'complete_item', { item_id: pid, date: day(0) });
    const skip = await call(mia, 'skip_occurrence', { item_id: pid, date: day(2) });
    const strip = await rest('GET', `/today/strip?from=${day(0)}&to=${day(6)}`, KEY);
    const stripDays = strip.data?.days as { date: string; total: number }[];
    const todayMon = await call(mia, 'get_today', { date: day(0) });
    const todayWed = await call(mia, 'get_today', { date: day(2) });
    const todayTue = await call(mia, 'get_today', { date: day(1) });
    const entry = (r: CallResult) => (r.structuredContent?.entries as Structured[] | undefined)?.find((e) => e.item_id === pid);
    line(!p.isError && !done.isError && !skip.isError && Array.isArray(stripDays) && stripDays.length === 7, '§10.2 periodic weekly: strip of 7 days, complete + skip', `strip totals ${Array.isArray(stripDays) ? stripDays.map((d) => d.total).join(',') : JSON.stringify(strip.data).slice(0, 80)}`);
    line(entry(todayMon)?.status === 'done' && entry(todayWed)?.status === 'skipped' && !entry(todayTue), '§10.2 Today: Mon done, Wed skipped, Tue absent');

    // §10.3 — sequential threads
    const parent = await call(mia, 'create_item', { type: 'task', title: `${TAG} потоки`, date: tomorrow });
    const parentId = (parent.structuredContent?.item as Structured | undefined)?.id as string;
    if (parentId) created.items.push(parentId);
    const split = await call(mia, 'split_task', { item_id: parentId, order: 'sequential', threads: [{ title: 'крок 1' }, { title: 'крок 2' }, { title: 'крок 3' }] });
    const children = ((await call(mia, 'list_items', { parent_id: parentId })).structuredContent?.items as Structured[] | undefined) ?? [];
    const ordered = [...children].sort((a, b) => a.position - b.position);
    const lockedTry = await call(mia, 'complete_item', { item_id: ordered[1]?.id });
    const lockedCode = (lockedTry.structuredContent?.errors as Structured[] | undefined)?.[0]?.code;
    line(!split.isError && ordered.length === 3 && lockedTry.isError === true && lockedCode === 'invalid:item:thread-locked', '§10.3 sequential: thread 2 locked until 1 is done', lockedCode);
    for (const c of ordered) await call(mia, 'complete_item', { item_id: c.id });
    const parentAfter = await call(mia, 'get_item', { item_id: parentId });
    line((parentAfter.structuredContent?.item as Structured | undefined)?.status === 'done', '§10.3 the parent closes with the last thread');

    // §10.4 — numeric habit: check-ins over last week (done, partial, explicit fail, then nothing), stats missed vs explicit
    const lastMon = day(-7);
    const h = await call(mia, 'create_habit', { name: `${TAG} вода`, evaluation: 'numeric', target_value: 8, target_condition: 'at_least', unit: 'склянок', recurrence: { freq: 'daily' }, starts_on: lastMon });
    const hid = (h.structuredContent?.habit as Structured | undefined)?.id as string;
    if (hid) created.habits.push(hid);
    const checkins = [
      await call(mia, 'check_in_habit', { habit_id: hid, date: day(-7), value: 8 }),
      await call(mia, 'check_in_habit', { habit_id: hid, date: day(-6), value: 5 }),
      await call(mia, 'check_in_habit', { habit_id: hid, date: day(-5), status: 'failed' }),
      await call(mia, 'check_in_habit', { habit_id: hid, date: day(0), value: 9 }),
    ];
    await call(mia, 'update_settings', { failed_mode: 'missed' });
    const sMissed = await call(mia, 'get_stats', { period: 'week', anchor: lastMon, scope: 'habits' });
    await call(mia, 'update_settings', { failed_mode: 'explicit' });
    const sExplicit = await call(mia, 'get_stats', { period: 'week', anchor: lastMon, scope: 'habits' });
    const score = (s: CallResult) => (s.structuredContent?.habits as Structured[] | undefined)?.find((x) => x.id === hid)?.score as number | null | undefined;
    line(!h.isError && checkins.every((c) => !c.isError) && score(sMissed) != null && score(sExplicit) != null && (score(sExplicit) as number) > (score(sMissed) as number), '§10.4 numeric habit: get_stats week, missed vs explicit', h.isError ? JSON.stringify(h.structuredContent) : `score missed ${score(sMissed)} < explicit ${score(sExplicit)}`);

    // §10.6 — dry run + draft + webhook, under a temporary key with its own events_url
    const tk = await rest('POST', '/api-keys/create', KEY, { name: `mcp-check-${Date.now()}`, eventsUrl: receiver.url });
    tempKey = tk.data?.key as string;
    const tempId = tk.data?.apiKey?.id ?? tk.data?.id;
    line(!!tempKey, 'temporary key for the draft / webhook checks', tk.status === 201 ? '' : JSON.stringify(tk.data).slice(0, 120));
    const agent = await connect(tempKey);
    const updated: string[] = [];
    agent.setNotificationHandler(ResourceUpdatedNotificationSchema, async (n) => void updated.push(n.params.uri));

    const dry = await call(agent, 'create_item', { type: 'task', title: `${TAG} драфт`, project_id: miaProject?.id, remind_at: at(tomorrow, '10:00') }, { dryRun: true });
    const sc = dry.structuredContent ?? {};
    line(sc.valid === true && !!sc.draftId && !!sc.batchId && sc.preview?.refs?.project_id?.label === 'Mia' && String(sc.preview?.computed?.due ?? '').includes('завтра'), '§10.6 dry run: draft + preview (refs.project_id.label, computed.due)', `label=${sc.preview?.refs?.project_id?.label} due=${sc.preview?.computed?.due}`);
    const draftsUri = `tasker://drafts/${sc.batchId}`;
    await agent.subscribeResource({ uri: draftsUri });

    const past = await call(agent, 'create_item', { type: 'task', title: `${TAG} минуле`, remind_at: at(today, '00:01') }, { dryRun: true });
    const pastCode = (past.structuredContent?.errors as Structured[] | undefined)?.[0]?.code;
    line(past.isError === true && past.structuredContent?.valid === false && pastCode === 'invalid:item:remind-at-past', '§10.6 past remind_at → invalid:item:remind-at-past');

    const saved = await call(agent, 'create_item', {}, { draftId: sc.draftId });
    const savedItem = saved.structuredContent?.item as Structured | undefined;
    if (savedItem?.id) created.items.push(savedItem.id);
    line(!saved.isError && !!savedItem?.id, '§10.6 _meta.draftId executes the draft', saved.isError ? JSON.stringify(saved.structuredContent) : `#${savedItem?.short_id}`);
    const again = await call(agent, 'create_item', {}, { draftId: sc.draftId });
    line((again.structuredContent?.errors as Structured[] | undefined)?.[0]?.code === 'conflict:draft:not-pending', '§8.4 saving a saved draft → conflict:draft:not-pending');

    const resource = await agent.readResource({ uri: draftsUri });
    const state = JSON.parse(String((resource.contents[0] as { text?: string }).text)) as { drafts: Structured[] };
    line(state.drafts[0]?.status === 'saved' && state.drafts[0]?.itemId === savedItem?.id, `§8.5 ${draftsUri.slice(0, 24)}… shows saved`, state.drafts[0]?.label);
    for (let i = 0; i < 40 && (!updated.includes(draftsUri) || !receiver.events.length); i += 1) await sleep(250);
    line(updated.includes(draftsUri), '§8.5 notifications/resources/updated for the batch');
    const ev = receiver.events.find((e) => e.body.type === 'draft.updated' && e.body.draftId === sc.draftId);
    line(!!ev && ev.sigOk && ev.body.status === 'saved' && ev.body.itemId === savedItem?.id, '§10.6 draft.updated webhook (signed) received', ev ? `label=${ev.body.label} sig=${ev.sigOk}` : 'none');

    const ctx = await agent.readResource({ uri: 'tasker://context' });
    line(String((ctx.contents[0] as { text?: string }).text).startsWith('tasker:'), '§8.5 tasker://context resource');
    const td = await agent.readResource({ uri: 'tasker://today' });
    line(!!JSON.parse(String((td.contents[0] as { text?: string }).text)).date, '§8.5 tasker://today resource');

    // §10.5 — revoked key: the open session and a new one both get 401
    const del = await rest('DELETE', `/api-keys/delete?id=${tempId}`, KEY);
    const revokedNew = await rawInitialize(tempKey);
    const revokedOld = await agent.listTools().then(() => 'ok', (e: Error) => e.message);
    line(del.status === 200 && revokedNew === 401 && /401/.test(revokedOld), '§10.5 revoked key → 401 (new and open session)', `${revokedNew} / ${revokedOld.slice(0, 60)}`);
    await agent.close().catch(() => undefined);

    console.log('INFO  §10.8 the Mia session hand-over is a message, not a server check');
  } finally {
    for (const id of created.items.reverse()) await call(mia, 'delete_item', { item_id: id }).catch(() => undefined);
    for (const id of created.habits) await rest('DELETE', `/habits/delete?id=${id}`, KEY).catch(() => undefined);
    await call(mia, 'update_settings', { failed_mode: settingsBefore.failedMode }).catch(() => undefined);
    await mia.close().catch(() => undefined);
    receiver.server.close();
  }
  console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
  process.exit(failed ? 1 : 0);
}

main().catch((e: Error) => {
  console.error(`FAIL  ${e.message}`);
  process.exit(1);
});
