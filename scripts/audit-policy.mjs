import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const config = JSON.parse(readFileSync(join(root, 'audit-ci.json'), 'utf8'));
const command = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts['audit:ci'];
const advisory = 'GHSA-fc5q-39xc-vjpf';
const clean = {
  auditReportVersion: 2,
  vulnerabilities: {},
  metadata: { vulnerabilities: { total: 0 } },
};
const failed = { error: { code: 'ECONNRESET', summary: 'Registry unavailable' } };

function report(id = advisory, severity = 'high') {
  return {
    auditReportVersion: 2,
    vulnerabilities: {
      picomatch: {
        name: 'picomatch',
        severity,
        isDirect: true,
        range: '*',
        nodes: ['node_modules/picomatch'],
        via: [
          {
            source: 1,
            name: 'picomatch',
            dependency: 'picomatch',
            title: 'Policy fixture',
            url: `https://github.com/advisories/${id}`,
            severity,
            range: '*',
          },
        ],
        effects: [],
        fixAvailable: false,
      },
    },
    metadata: {
      vulnerabilities: {
        info: 0,
        low: 0,
        moderate: 0,
        high: severity === 'high' ? 1 : 0,
        critical: severity === 'critical' ? 1 : 0,
        total: 1,
      },
    },
  };
}

function runPolicy(all, production, policy = config) {
  const fixture = mkdtempSync(join(tmpdir(), 'meeting-audit-policy-'));
  try {
    mkdirSync(join(fixture, 'bin'));
    writeFileSync(join(fixture, 'audit-ci.json'), JSON.stringify(policy));
    writeFileSync(
      join(fixture, 'bin', 'npm'),
      `#!${process.execPath}\n` +
        `
const prod = process.argv.includes('--omit=dev');
const data = JSON.parse(prod ? process.env.POLICY_PRODUCTION : process.env.POLICY_ALL);
console.log(JSON.stringify(data));
process.exit(data.error || Object.keys(data.vulnerabilities || {}).length ? 1 : 0);
`,
      { mode: 0o755 },
    );
    const result = spawnSync('/bin/sh', ['-c', command], {
      cwd: fixture,
      encoding: 'utf8',
      timeout: 10000,
      env: {
        ...process.env,
        PATH: [join(fixture, 'bin'), join(root, 'node_modules', '.bin'), process.env.PATH].join(
          delimiter,
        ),
        POLICY_ALL: JSON.stringify(all),
        POLICY_PRODUCTION: JSON.stringify(production),
      },
    });
    assert.ifError(result.error);
    return { status: result.status, output: result.stdout + result.stderr };
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

test('exception configuration has a reason and an exact expiry, with failure handling enabled', () => {
  assert.equal(config.high, true);
  assert.equal(config['pass-enoaudit'], false);
  assert.ok(config.allowlist.length > 0);
  for (const record of config.allowlist) {
    for (const [id, entry] of Object.entries(record)) {
      assert.match(id, /^GHSA-/);
      assert.ok(entry.notes.trim());
      assert.equal(new Date(entry.expiry).toISOString(), entry.expiry);
    }
  }
});

const expired = structuredClone(config);
expired.allowlist[0][advisory].expiry = '2000-01-01T00:00:00.000Z';
for (const [name, all, production, policy, passes] of [
  ['allows only the reviewed dev advisory', report(), clean, config, true],
  ['passes a clean report', clean, clean, config, true],
  ['blocks an unlisted high advisory', report('GHSA-unlisted-high'), clean, config, false],
  [
    'blocks an unlisted critical advisory',
    report('GHSA-unlisted-critical', 'critical'),
    clean,
    config,
    false,
  ],
  ['blocks the exception in production', report(), report(), config, false],
  ['blocks an expired exception', report(), clean, expired, false],
  ['blocks a full-audit JSON error', failed, clean, config, false],
  ['blocks a production-audit JSON error', report(), failed, config, false],
  ['blocks a missing full audit report', {}, clean, config, false],
]) {
  test(name, () => {
    const result = runPolicy(all, production, policy);
    assert.equal(result.status === 0, passes, result.output);
  });
}
