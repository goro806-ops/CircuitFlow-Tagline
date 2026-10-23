const express = require('express');
const cors = require('cors');
const path = require('path');

const architectureEngine = require('./src/engine/architecture');
const bomEngine = require('./src/engine/bom');
const pcbEngine = require('./src/engine/pcb');
const firmwareEngine = require('./src/engine/firmware');
const enclosureEngine = require('./src/engine/enclosure');
const exportEngine = require('./src/engine/export');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.post('/api/generate/architecture', (req, res) => {
  try {
    const { prompt, constraints } = req.body;
    const arch = architectureEngine.generateArchitecture(prompt, constraints);
    res.json({ success: true, architecture: arch });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/generate/bom', (req, res) => {
  try {
    const { architecture } = req.body;
    const bom = bomEngine.generateBOM(architecture);
    res.json({ success: true, bom });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/generate/pcb', (req, res) => {
  try {
    const { architecture, bom } = req.body;
    const pcb = pcbEngine.generatePCB(architecture, bom);
    res.json({ success: true, pcb });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/generate/firmware', (req, res) => {
  try {
    const { architecture, bom } = req.body;
    const firmware = firmwareEngine.generateFirmware(architecture, bom);
    res.json({ success: true, firmware });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/generate/enclosure', (req, res) => {
  try {
    const { pcb } = req.body;
    const enclosure = enclosureEngine.generateEnclosure(pcb);
    res.json({ success: true, enclosure });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/export/package', async (req, res) => {
  try {
    const projectData = req.body;
    const zipBuffer = await exportEngine.bundleReleasePackage(projectData);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="CircuitFlow_Production_Package.zip"');
    res.send(zipBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`CircuitFlow Platform running at http://localhost:${PORT}`);
  });
}

module.exports = app;
