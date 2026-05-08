const express = require('express');
const { recordEvent, getStats, getRecentActivity } = require('../lib/analytics-store');

const router = express.Router();

router.post('/analytics/event', express.json(), (req, res) => {
  const { skill, event, file } = req.body;
  if (!skill || !event) {
    return res.status(400).json({ error: 'skill and event required' });
  }
  recordEvent(skill, event, file || null);
  res.json({ ok: true });
});

router.get('/analytics', (req, res) => {
  const skills = getStats();
  const recentActivity = getRecentActivity(50);
  res.json({ skills, recentActivity });
});

module.exports = router;
