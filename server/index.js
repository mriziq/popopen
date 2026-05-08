const express = require('express');
const path = require('path');
const skillsRouter = require('./routes/skills');
const filesRouter = require('./routes/files');
const analyticsRouter = require('./routes/analytics');
const searchRouter = require('./routes/search');
const frontmatterRouter = require('./routes/frontmatter');
const settingsRouter = require('./routes/settings');
const dashboardRouter = require('./routes/dashboard');
const historyRouter = require('./routes/history');
const updatesRouter = require('./routes/updates');
const bulkRouter = require('./routes/bulk');
const uninstallRouter = require('./routes/uninstall');
const { startWatcher, addClient } = require('./lib/watcher');

const app = express();
const PORT = process.env.PORT || 3377;

// Middleware
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api', skillsRouter);
app.use('/api', filesRouter);
app.use('/api', analyticsRouter);
app.use('/api', searchRouter);
app.use('/api', frontmatterRouter);
app.use('/api', settingsRouter);
app.use('/api', dashboardRouter);
app.use('/api', historyRouter);
app.use('/api', updatesRouter);
app.use('/api', bulkRouter);
app.use('/api', uninstallRouter);

// SSE endpoint for file changes
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('\n');
  addClient(res);
});

// Start
function start() {
  startWatcher();
  app.listen(PORT, () => {
    console.log(`skill-journal running at http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
