const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const path = require('path');
const { version: APP_VERSION } = require('./package.json');
const persistentStore = require('./src/agents/store');

const architectureEngine = require('./src/engine/architecture');
const bomEngine = require('./src/engine/bom');
const pcbEngine = require('./src/engine/pcb');
const firmwareEngine = require('./src/engine/firmware');
const enclosureEngine = require('./src/engine/enclosure');
const renderEngine = require('./src/engine/render');
const testfixtureEngine = require('./src/engine/testfixture');
const spiceEngine = require('./src/engine/spice');
const distributorEngine = require('./src/engine/distributor');
const multiboardEngine = require('./src/engine/multiboard');
const consumerEngine = require('./src/engine/consumer');
const negotiatorEngine = require('./src/engine/negotiator');
const userguideEngine = require('./src/engine/userguide');
const dbEngine = require('./src/engine/db');
const aiBrainEngine = require('./src/engine/ai_brain');
const kicadEngine = require('./src/engine/kicad');
const liveCompEngine = require('./src/engine/live_components');
const ngspiceEngine = require('./src/engine/ngspice');
const exportEngine = require('./src/engine/export');
const businessEngine = require('./src/engine/business');

const agentsApi = require('./src/agents/api');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // required for Render / cloud

app.disable('x-powered-by');
app.set('trust proxy', 1);

const allowedOrigins = new Set(
  [process.env.BASE_URL, ...(process.env.CORS_ORIGINS || '').split(',')]
    .filter(Boolean)
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
);
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.add('http://localhost:3000');
  allowedOrigins.add('http://127.0.0.1:3000');
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
      styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      upgradeInsecureRequests: []
    }
  }
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID']
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '2mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/api/health'
});
const expensiveRunLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many design runs. Please try again later.' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts. Please try again later.' }
});

app.use('/api', apiLimiter);
app.use('/api/agents/run', expensiveRunLimiter);
app.use('/api/agents/auth/login', authLimiter);
app.use('/api/agents/auth/register', authLimiter);
app.use('/api/agents/auth/google/callback', authLimiter);
app.use(express.static(path.join(__dirname, 'public')));

// Health check for Render / load balancers
app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'circuitflow',
    version: APP_VERSION,
    build_commit: process.env.RENDER_GIT_COMMIT || null,
    readiness_endpoint: '/ready'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'circuitflow',
    version: APP_VERSION,
    build_commit: process.env.RENDER_GIT_COMMIT || null,
    readiness_endpoint: '/ready'
  });
});

app.get(['/ready', '/api/ready'], async (req, res) => {
  try {
    const postgresConfigured = persistentStore.hasDatabaseUrl();
    const postgresReady = postgresConfigured ? await persistentStore.initPostgres() : false;
    const store = persistentStore.getStoreInfo();
    if (postgresConfigured && !postgresReady) {
      return res.status(503).json({ ready: false, service: 'circuitflow', version: APP_VERSION, store });
    }
    res.status(200).json({ ready: true, service: 'circuitflow', version: APP_VERSION, store });
  } catch (err) {
    console.error('[ready]', err.message);
    res.status(503).json({ ready: false, service: 'circuitflow', version: APP_VERSION });
  }
});

app.use('/api/agents', agentsApi);

app.get('/api/business/pricing', (req, res) => {
  try {
    const tiers = businessEngine.getSubscriptionTiers();
    res.json({ success: true, tiers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/business/export-cost', (req, res) => {
  try {
    const { tierId, currentMonthExports } = req.body;
    const costDetails = businessEngine.calculateExportCost(tierId, currentMonthExports || 0);
    res.json({ success: true, costDetails });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/business/turnkey-quote', (req, res) => {
  try {
    const { projectData, tierId } = req.body;
    const quote = businessEngine.calculateTurnkeyQuote(projectData, tierId);
    res.json({ success: true, quote });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/generate/architecture', async (req, res) => {
  try {
    const { prompt, constraints, apiKey, provider } = req.body;
    const aiResult = await aiBrainEngine.synthesizeWithAIBrain(prompt, apiKey, provider);
    const arch = architectureEngine.generateArchitecture(prompt, constraints);
    res.json({ success: true, architecture: arch, aiBrain: aiResult });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/generate/kicad', (req, res) => {
  try {
    const designData = req.body || {};
    const kicadProject = kicadEngine.generateKiCadProject(designData);
    res.json({ success: true, kicad: kicadProject });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/components/search', async (req, res) => {
  try {
    const query = req.query.q || 'BLE';
    const results = await liveCompEngine.searchLiveComponents(query);
    res.json({ success: true, components: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/projects/save', (req, res) => {
  try {
    const projectData = req.body || {};
    const record = dbEngine.saveProject(projectData);
    res.json({ success: true, project: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/projects/list', (req, res) => {
  try {
    const projects = dbEngine.listProjects();
    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/projects/:id', (req, res) => {
  try {
    const project = dbEngine.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/generate/userguide', (req, res) => {
  try {
    const guideParams = req.body || {};
    const userguide = userguideEngine.generateUserGuide(guideParams);
    res.json({ success: true, userguide });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/generate/consumer', (req, res) => {
  try {
    const { profileType, customOverrides } = req.body;
    const consumer = consumerEngine.processConsumerProfile(profileType, customOverrides);
    res.json({ success: true, consumer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/generate/negotiate', (req, res) => {
  try {
    const { currentDesign, requestedShapeChange } = req.body;
    const negotiation = negotiatorEngine.evaluateShapeChangeAndNegotiate(currentDesign, requestedShapeChange);
    res.json({ success: true, negotiation });
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
    const { pcb, consumer, options } = req.body;
    const enclosure = enclosureEngine.generateEnclosure(pcb, consumer, options);
    res.json({ success: true, enclosure });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/generate/render', (req, res) => {
  try {
    const { pcb, enclosure, options } = req.body;
    const render = renderEngine.generate3DRender(pcb, enclosure, options);
    res.json({ success: true, render });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/generate/testfixture', (req, res) => {
  try {
    const { pcb } = req.body;
    const testfixture = testfixtureEngine.generateTestFixture(pcb);
    res.json({ success: true, testfixture });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/generate/spice', (req, res) => {
  try {
    const { architecture, bom, consumer, shape } = req.body;
    const spice = spiceEngine.runSimulationAndThermal(architecture, bom, consumer, shape);
    res.json({ success: true, spice });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/generate/distributor', (req, res) => {
  try {
    const { bom, pcb } = req.body;
    const distributor = distributorEngine.generateDistributorQuotes(bom, pcb);
    res.json({ success: true, distributor });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/generate/multiboard', (req, res) => {
  try {
    const { architecture } = req.body;
    const multiboard = multiboardEngine.generateMultiBoardSystem(architecture);
    res.json({ success: true, multiboard });
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

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'API route not found' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || (err.message === 'Origin is not allowed by CORS' ? 403 : 500);
  if (status >= 500) console.error('[server]', err.message);
  res.status(status).json({ success: false, error: status === 500 ? 'Internal server error' : err.message });
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`CircuitFlow listening on http://${HOST}:${PORT}`);
    console.log(`Health: /health`);
    console.log(`Agents UI: /agents.html`);
    console.log(`Agents API: POST /api/agents/run`);
  });
}

module.exports = app;
