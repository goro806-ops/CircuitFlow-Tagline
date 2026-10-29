#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'docs/HARDWARE_RELEASE_CHECKLIST.md',
  'docs/SAFETY_REGULATORY_REVIEW_PACKAGE.md',
  'docs/REGULATORY_EVIDENCE_INDEX.md',
  'docs/SAFETY_COMPLIANCE_TEST_PLAN.md',
  'docs/VALIDATION_MATRIX.md'
];
const requiredSections = {
  'docs/HARDWARE_RELEASE_CHECKLIST.md': [
    '## 5. Safety and regulatory',
    '## 6. Release sign-off',
    'SAFETY_REGULATORY_REVIEW_PACKAGE.md'
  ],
  'docs/SAFETY_REGULATORY_REVIEW_PACKAGE.md': [
    '## Scope and applicability decisions',
    '## Minimum safety evidence before release review',
    '## Human review gates',
    '## Release decision'
  ],
  'docs/REGULATORY_EVIDENCE_INDEX.md': [
    '| ID | Evidence artifact',
    '## Artifact control rules'
  ],
  'docs/SAFETY_COMPLIANCE_TEST_PLAN.md': [
    '## Configuration to freeze',
    '## Formal lab planning',
    '## Exit criteria'
  ]
};

const findings = [];
for (const relative of requiredFiles) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    findings.push(`missing required file: ${relative}`);
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  if (!text.trim()) findings.push(`empty required file: ${relative}`);
  for (const section of requiredSections[relative] || []) {
    if (!text.includes(section)) findings.push(`missing required section "${section}" in ${relative}`);
  }
}

// Block accidental credential commits while allowing documented empty fields and
// non-secret words such as "DATABASE_URL".
const secretPatterns = [
  /postgres(?:ql)?:\/\/[^\s)]+:[^\s)]+@/i,
  /-----BEGIN (?:RSA|EC|OPENSSH|PRIVATE) KEY-----/,
  /\b(?:ghp|github_pat|sk|xai|gsk|AIza)[A-Za-z0-9_-]{20,}\b/,
  /(?:OPENAI|ANTHROPIC|GROQ|XAI)_API_KEY\s*=\s*['"]?[^\s'"`]{12,}/i
];
for (const relative of requiredFiles) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) findings.push(`possible secret pattern in ${relative}: ${pattern}`);
  }
}

if (findings.length) {
  console.error('Release evidence validation failed:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(JSON.stringify({
  valid: true,
  required_files: requiredFiles,
  human_signoff_required: true,
  certification_claims_allowed: false,
  message: 'Evidence package structure is valid; human and laboratory approvals remain required.'
}, null, 2));
