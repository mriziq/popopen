const express = require('express');
const { writeSkillFile } = require('../lib/scanner');

const router = express.Router();

router.put('/files', express.text({ type: '*/*', limit: '5mb' }), (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ error: 'path query parameter required' });
  }
  try {
    writeSkillFile(filePath, req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
