/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve static resources from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Simple API endpoint 
app.get('/api/health', (req, res) => {
  res.json({ status: 'active', timestamp: new Date().toISOString() });
});

// Single Page Application wildcard router to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('===================================================================');
  console.log('   UNIVERSAL ACCOUNTING DATA RECONCILER - ULTRA RECONCILER PRO');
  console.log(`   Running natively on Localhost: http://localhost:${PORT}`);
  console.log('   Press Ctrl+C to terminate this process gracefully.');
  console.log('===================================================================');
});
