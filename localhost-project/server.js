/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Universal Accounting Data Reconciler — Express server
 * With security headers, error handling middleware, and health endpoint.
 */

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Serve static resources from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// 404 handler — must come before global error handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('===================================================================');
  console.log('   UNIVERSAL ACCOUNTING DATA RECONCILER - ULTRA RECONCILER PRO');
  console.log(`   Running natively on Localhost: http://localhost:${PORT}`);
  console.log('   Press Ctrl+C to terminate this process gracefully.');
  console.log('===================================================================');
});
