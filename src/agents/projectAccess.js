'use strict';

function assertOwner(req = {}, project = {}) {
  if (project.owner_id && !req.user) {
    const err = new Error('Authentication required for owned project');
    err.status = 401;
    throw err;
  }
  if (req.user && project.owner_id && project.owner_id !== req.user.user_id) {
    const err = new Error('Not your project');
    err.status = 403;
    throw err;
  }
}

module.exports = { assertOwner };
