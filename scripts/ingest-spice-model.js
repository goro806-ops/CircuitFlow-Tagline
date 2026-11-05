#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function usage() {
  console.error('Usage: node scripts/ingest-spice-model.js --file MODEL --id REGISTRY_ID --source-url URL --license-status STATUS --dialect DIALECT --pin-order "1=IN,2=GND" --validation-evidence-id ID [--root PRIVATE_ROOT]');
  process.exitCode = 2;
}

function args(argv) {
  const result = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--') || !argv[i + 1] || argv[i + 1].startsWith('--')) return null;
    result[key.slice(2)] = argv[i + 1];
    i += 1;
  }
  return result;
}

function required(options, names) {
  return names.every(name => options[name] && String(options[name]).trim());
}

function safeId(value) {
  return /^[a-z0-9][a-z0-9._-]{2,127}$/i.test(String(value));
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function ingest(options) {
  if (!required(options, ['file', 'id', 'source-url', 'license-status', 'dialect', 'pin-order', 'validation-evidence-id']) || !safeId(options.id)) {
    usage();
    return null;
  }
  const source = path.resolve(options.file);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) throw new Error('model file does not exist or is not a regular file');
  const root = path.resolve(options.root || process.env.SPICE_MODEL_ROOT || '/var/lib/circuitflow/spice');
  const destinationDir = path.join(root, options.id);
  if (fs.existsSync(destinationDir)) throw new Error(`model ID already exists in private storage: ${options.id}`);
  fs.mkdirSync(destinationDir, { recursive: true, mode: 0o700 });
  const extension = path.extname(source).toLowerCase() || '.model';
  const destination = path.join(destinationDir, `model${extension}`);
  const temporary = `${destination}.tmp-${process.pid}`;
  fs.copyFileSync(source, temporary, fs.constants.COPYFILE_EXCL);
  fs.chmodSync(temporary, 0o600);
  fs.renameSync(temporary, destination);
  const digest = sha256(destination);
  const manifest = {
    schema_version: 1,
    id: options.id,
    source_url: options['source-url'],
    license_status: options['license-status'],
    dialect: options.dialect,
    pin_order: options['pin-order'],
    artifact_path: destination,
    sha256: digest,
    validation_evidence_id: options['validation-evidence-id'],
    ingested_at: new Date().toISOString(),
    content_not_logged: true
  };
  const manifestPath = path.join(destinationDir, 'manifest.json');
  const temporaryManifest = `${manifestPath}.tmp-${process.pid}`;
  fs.writeFileSync(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  fs.renameSync(temporaryManifest, manifestPath);
  return { ...manifest, manifest_path: manifestPath };
}

if (require.main === module) {
  try {
    const options = args(process.argv);
    if (!options) usage();
    else {
      const result = ingest(options);
      if (result) console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error(`SPICE model ingestion failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { ingest, sha256 };
