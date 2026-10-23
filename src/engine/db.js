/**
 * CircuitFlow In-Memory & Persistent Project Storage Engine
 */

const projectsDb = new Map();

/**
 * Saves a hardware project design into storage.
 */
function saveProject(projectData) {
  const projectId = projectData.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();

  const record = {
    id: projectId,
    createdAt: timestamp,
    updatedAt: timestamp,
    name: projectData.architecture?.deviceConcept || 'CircuitFlow Design Project',
    summary: {
      mcu: projectData.architecture?.mcu?.name || 'N/A',
      ipRating: projectData.consumer?.ipRating || 'Standard',
      bomCostUSD: projectData.bom?.summary?.unitCostUSD || 0
    },
    data: projectData
  };

  projectsDb.set(projectId, record);
  return record;
}

/**
 * Lists all stored hardware design projects.
 */
function listProjects() {
  const list = [];
  for (const [id, record] of projectsDb.entries()) {
    list.push({
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      summary: record.summary
    });
  }
  return list;
}

/**
 * Retrieves a hardware project design by ID.
 */
function getProjectById(projectId) {
  return projectsDb.get(projectId) || null;
}

module.exports = {
  saveProject,
  listProjects,
  getProjectById,
  projectsDb
};
