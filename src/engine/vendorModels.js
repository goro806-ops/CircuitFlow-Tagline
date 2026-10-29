const fs = require('fs');
const path = require('path');

const registryPath = path.join(__dirname, '..', '..', 'models', 'spice', 'registry.json');

function loadVendorModelRegistry() {
  try {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    if (!registry || !Array.isArray(registry.models)) throw new Error('invalid vendor model registry');
    return registry;
  } catch (error) {
    return { schema_version: 1, models: [], error: error.message };
  }
}

function getVendorModel(id) {
  return loadVendorModelRegistry().models.find((model) => model.id === id) || null;
}

module.exports = { loadVendorModelRegistry, getVendorModel };
