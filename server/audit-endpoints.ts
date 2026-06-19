// @ts-nocheck
// PII leak audit: hits every registered Express route unauthenticated and
// reports any response body that contains PII-shaped strings (email, phone,
// DOB, address). Read-only. Safe to run against any environment.
//
//   npx tsx server/audit-endpoints.ts
//   API_BASE=https://staging.hers365.com npx tsx server/audit-endpoints.ts
//
// Exit code is 0 only if zero leaks were found.

import 'dotenv/config';

const API_BASE = process.env.API_BASE ?? 'http://localhost:4000';

// Keep this list in sync with mounted routes in server/app.ts and server/core-server.ts.
// Each entry is { method, path }. Path placeholders use ":id" style.
const ROUTES: Array<{ method: string; path: string }> = [
  { method: 'GET', path: '/api/messages/conversations' },
  { method: 'GET', path: '/api/messages/conversations/1/messages' },
  { method: 'GET', path: '/api/messages/unread-count' },
  { method: 'GET', path: '/api/messages/requests' },
  { method: 'GET', path: '/api/players' },
  { method: 'GET', path: '/api/players/1' },
  { method: 'GET', path: '/api/coaches' },
  { method: 'GET', path: '/api/coaches/1' },
  { method: 'GET', path: '/api/profile' },
  { method: 'GET', path: '/api/profile/stats' },
  { method: 'GET', path: '/api/rankings' },
  { method: 'GET', path: '/api/programs' },
  { method: 'GET', path: '/api/recruiting' },
  { method: 'GET', path: '/api/scholarships' },
  { method: 'GET', path: '/api/feed' },
  { method: 'GET', path: '/api/admin/reports' },
  { method: 'GET', path: '/api/admin/users' },
];

// PII patterns. Tuned to catch obvious leaks while keeping false positives low.
const PII_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'email',     re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { name: 'us_phone',  re: /(?<!\d)(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g },
  { name: 'iso_dob',   re: /"(?:dob|birthdate|birth_date|dateOfBirth)"\s*:\s*"[^"]+"/gi },
  { name: 'address',   re: /"(?:address|street|streetAddress|home_address)"\s*:\s*"[^"]+"/gi },
  { name: 'ssn_like',  re: /(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)/g },
];

type Finding = {
  method: string;
  path: string;
  status: number;
  matches: Array<{ kind: string; sample: string; count: number }>;
};

async function hit(method: string, path: string) {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, { method, headers: { Accept: 'application/json' } });
    const body = await res.text();
    return { ok: true, status: res.status, body };
  } catch (err: any) {
    return { ok: false, status: 0, body: '', error: err?.message ?? String(err) };
  }
}

function scan(body: string): Finding['matches'] {
  const out: Finding['matches'] = [];
  for (const p of PII_PATTERNS) {
    const m = body.match(p.re);
    if (m && m.length > 0) {
      out.push({ kind: p.name, sample: m[0], count: m.length });
    }
  }
  return out;
}

async function main() {
  console.log(`🔎 Auditing ${ROUTES.length} routes against ${API_BASE}`);
  const findings: Finding[] = [];
  const errors: Array<{ method: string; path: string; error: string }> = [];

  for (const r of ROUTES) {
    const res = await hit(r.method, r.path);
    if (!res.ok) {
      errors.push({ method: r.method, path: r.path, error: (res as any).error });
      continue;
    }
    // Anything that's 200/201 unauthenticated is suspect; 401/403 is what we want.
    const matches = scan(res.body);
    if (matches.length > 0) {
      findings.push({ method: r.method, path: r.path, status: res.status, matches });
    }
    const tag = matches.length > 0 ? '🚨 LEAK' : res.status >= 400 ? '✅ guarded' : '⚠️  open (no PII detected)';
    console.log(`${tag.padEnd(28)} ${res.status} ${r.method} ${r.path}`);
  }

  console.log('\n────────── SUMMARY ──────────');
  console.log(`Routes scanned: ${ROUTES.length}`);
  console.log(`PII leaks: ${findings.length}`);
  console.log(`Network errors: ${errors.length}`);

  if (findings.length > 0) {
    console.log('\nLeaks:');
    for (const f of findings) {
      console.log(`  ${f.method} ${f.path} → ${f.status}`);
      for (const m of f.matches) {
        console.log(`    • ${m.kind} ×${m.count}  e.g. ${m.sample.slice(0, 60)}`);
      }
    }
  }

  if (errors.length > 0) {
    console.log('\nUnreachable:');
    for (const e of errors) console.log(`  ${e.method} ${e.path} → ${e.error}`);
  }

  process.exit(findings.length > 0 ? 1 : 0);
}

main();
