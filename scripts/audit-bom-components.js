#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { auditBom } = require('../src/agents/bomVerification');

function usage() {
  console.error('Usage: node scripts/audit-bom-components.js <project-export.json> [--json] [--output <report.json>]');
  process.exit(2);
}

const args = process.argv.slice(2);
const input = args.find(arg => !arg.startsWith('--'));
if (!input) usage();
const outputIndex = args.indexOf('--output');
const output = outputIndex >= 0 ? args[outputIndex + 1] : null;
if (outputIndex >= 0 && !output) usage();

let project;
try {
  project = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
} catch (error) {
  console.error(`Unable to read project JSON: ${error.message}`);
  process.exit(2);
}

const report = auditBom(project);
const json = JSON.stringify(report, null, 2);
if (output) fs.writeFileSync(path.resolve(output), `${json}\n`);
if (args.includes('--json') || output) console.log(json);
else {
  console.log(`BOM manufacturer-part audit: ${report.status}`);
  console.log(`Components: ${report.component_count}; blocked: ${report.blocked_count}; warnings: ${report.warning_count}`);
  for (const blocker of report.blockers) console.log(`BLOCKER: ${blocker}`);
  for (const warning of report.warnings) console.log(`WARNING: ${warning}`);
  if (output) console.log(`Report written to ${output}`);
}
process.exitCode = report.verified ? 0 : 1;
