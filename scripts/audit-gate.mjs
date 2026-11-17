// CI dependency gate: fail on any high/critical advisory, except ones listed in audit-allowlist.json.
// An allowlisted advisory must have a reason and an expiry, may only affect dev dependencies, and
// fails the gate again once it expires.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BLOCKING = new Set(['high', 'critical']);
const today = new Date().toISOString().slice(0, 10);
const allowlist = JSON.parse(readFileSync(new URL('../audit-allowlist.json', import.meta.url), 'utf8'));

function advisories(args) {
  let out;
  try {
    out = execFileSync('npm', ['audit', '--json', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    out = error.stdout; // npm audit exits 1 when it finds anything
  }
  const found = new Map();
  for (const vuln of Object.values(JSON.parse(out).vulnerabilities ?? {})) {
    for (const via of vuln.via) {
      if (typeof via !== 'object' || !BLOCKING.has(via.severity)) continue;
      const id = via.url?.split('/').pop() ?? String(via.source);
      found.set(id, `${id} ${via.severity} ${via.name}: ${via.title}`);
    }
  }
  return found;
}

const problems = [];
for (const entry of allowlist) {
  if (!entry.id || !entry.reason || !entry.expires) problems.push(`allowlist entry needs id, reason and expires: ${JSON.stringify(entry)}`);
  else if (entry.expires < today) problems.push(`allowlist entry ${entry.id} expired on ${entry.expires}: re-check it`);
}
const allowed = new Set(allowlist.filter((e) => e.expires >= today).map((e) => e.id));

const all = advisories([]);
for (const [id, line] of all) if (!allowed.has(id)) problems.push(line);
for (const [id, line] of advisories(['--omit=dev'])) if (allowed.has(id)) problems.push(`${line} (allowlisted, but it reaches production dependencies)`);

const skipped = [...all.keys()].filter((id) => allowed.has(id));
if (skipped.length) console.log(`Allowlisted (dev only): ${skipped.join(', ')}`);
if (problems.length) {
  console.error(`npm audit gate failed:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('npm audit gate passed: no blocking advisories.');
