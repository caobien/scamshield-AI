import request from 'supertest';
import { createApp } from '../../server/app.js';

const app = createApp();

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`, err);
    process.exit(1);
  }
}

console.log('\n--- HTTP INTEGRATION TESTS: EXPRESS APPLICATION ---');

await runTest('Health endpoint returns JSON, security headers, and a request ID', async () => {
  const response = await request(app).get('/api/health').expect(200);
  if (response.body.status !== 'ok') throw new Error('Expected health status "ok".');
  if (!response.headers['x-request-id']) throw new Error('Missing X-Request-Id header.');
  if (response.headers['x-content-type-options'] !== 'nosniff') {
    throw new Error('Missing X-Content-Type-Options: nosniff header.');
  }
});

await runTest('Analyze endpoint rejects invalid input before any Gemini call', async () => {
  const response = await request(app)
    .post('/api/analyze')
    .send({ sourceType: 'MESSAGE', inputContent: '' })
    .expect(400);
  if (!response.body.error || !response.body.requestId) {
    throw new Error('Expected a safe error and request ID.');
  }
});

await runTest('Malformed JSON receives a safe JSON 400 response', async () => {
  const response = await request(app)
    .post('/api/analyze')
    .set('Content-Type', 'application/json')
    .send('{')
    .expect(400);
  if (response.body.error !== 'Dữ liệu JSON không hợp lệ.') {
    throw new Error('Expected safe malformed-JSON response.');
  }
});
