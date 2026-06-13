/**
 * Express server endpoint tests.
 * Run: node --experimental-vm-modules node_modules/.bin/jest tests/
 */

const http = require('http');

describe('Server endpoints', () => {
  test('GET /api/health returns 200 with status healthy', (done) => {
    http.get('http://localhost:3000/api/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(data);
        expect(body.status).toBe('healthy');
        expect(body.timestamp).toBeDefined();
        done();
      });
    });
  });

  test('GET /unknown returns 404', (done) => {
    http.get('http://localhost:3000/unknown', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        expect(res.statusCode).toBe(404);
        const body = JSON.parse(data);
        expect(body.error).toBe('Not found');
        done();
      });
    });
  });
});
