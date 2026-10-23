// npm audit gate with a narrow, documented allowlist. Reads `npm audit --json` on stdin.
//
// Fails on every high or critical advisory except the ones listed in ALLOWED. Each entry states why
// it is tolerated and must be removed as soon as a fixed version exists.
import { readFileSync } from 'node:fs';

const ALLOWED = {
  // braces <= 3.0.3: stack-exhaustion DoS on deeply nested patterns, and no patched release exists.
  // Reached only through tailwindcss@3 (a build-time dev dependency, via chokidar and micromatch),
  // and the only patterns it expands are the content globs written in this repo. Remove once braces
  // ships a fix or Tailwind 4 drops the dependency.
  'GHSA-vfj7-8cjw-p6xm': 'braces: no fix available; dev-only via tailwindcss@3',
};
const BLOCKING = new Set(['high', 'critical']);

const report = JSON.parse(readFileSync(0, 'utf8'));
if (!report.vulnerabilities) {
  // A network or registry failure produces an error object instead of a report: fail closed.
  console.error('npm audit did not produce a report:', JSON.stringify(report.error ?? report));
  process.exit(1);
}

const failures = [];
for (const [name, vuln] of Object.entries(report.vulnerabilities)) {
  for (const via of vuln.via) {
    // A string entry names another vulnerable package, which is checked under its own key.
    if (typeof via === 'string' || !BLOCKING.has(via.severity)) continue;
    const id = via.url?.split('/').pop();
    if (id in ALLOWED) console.log(`allowed ${id} (${name}): ${ALLOWED[id]}`);
    else failures.push(`${via.severity} ${name}: ${via.title} ${via.url}`);
  }
}

if (failures.length) {
  console.error(`${failures.length} blocking advisories:\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('npm audit: no blocking advisories outside the allowlist.');
