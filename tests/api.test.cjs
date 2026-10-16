const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const request = require('supertest');
const express = require('express');

// Keep tests independent of the developer's .env file.
Object.assign(process.env, {
  NODE_ENV: 'test', PORT: '3000', CORS_ORIGINS: 'http://localhost:5173',
  TRUST_PROXY_HOPS: '0', RATE_LIMIT_WINDOW_MS: '60000', RATE_LIMIT_MAX: '100',
  LOG_LEVEL: 'info', LOG_TO_FILE: 'false',
});
// Never read/write the developer's configured database in tests.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:1/unused';
const databaseTest = { skip: !process.env.TEST_DATABASE_URL && 'Set TEST_DATABASE_URL to a migrated test database' };
const { prisma } = require('../dist/src/lib/prisma');
const { PrismaClient } = require('../dist/src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const createdIds = [];
after(async () => {
  if (createdIds.length) await prisma.task.deleteMany({ where: { id: { in: createdIds } } });
  await prisma.$disconnect();
});
const { app } = require('../dist/src/app');
const { errorHandler } = require('../dist/src/middlewares/errorHandler');
const { limiter } = require('../dist/src/middlewares/rateLimiter');

// Supertest binds ephemeral loopback ports; no running app or database is required.
test('health, headers and request ID', async () => {
  const res = await request(app).get('/api/v1/health').expect(200);
  assert.equal(res.body.status, 'ok');
  assert.match(res.headers['x-request-id'], /^[0-9a-f-]{36}$/);
  assert.ok(res.headers['x-content-type-options']);
  assert.equal(res.headers['x-powered-by'], undefined);
});

test('task CRUD, persistence and pagination', databaseTest, async () => {
  const created = await request(app).post('/api/v1/admin/tasks').send({ title: '  Learn Express  ' }).expect(201);
  const task = created.body.task;
  createdIds.push(task.id);
  const secondClient = new PrismaClient({ adapter: new PrismaPg(
    { connectionString: process.env.TEST_DATABASE_URL },
    { schema: new URL(process.env.TEST_DATABASE_URL).searchParams.get('schema') || 'public' },
  ) });
  try {
    const persisted = await secondClient.task.findUnique({ where: { id: task.id } });
    assert.equal(persisted.title, 'Learn Express');
  } finally { await secondClient.$disconnect(); }
  assert.equal(task.title, 'Learn Express');
  assert.equal(task.completed, false);
  assert.deepEqual(Object.keys(task).sort(), ['id', 'title', 'completed', 'createdAt', 'updatedAt'].sort());
  assert.equal(created.headers.location, `/api/v1/user/tasks/${task.id}`);
  await request(app).get(created.headers.location).expect(200);
  const listed = await request(app).get('/api/v1/user/tasks?page=1&limit=1').expect(200);
  assert.equal(listed.body.currentPage, 1);
  assert.equal(listed.body.tasks.length, 1);
  const updated = await request(app).patch(`/api/v1/admin/tasks/${task.id}`).send({ completed: true }).expect(200);
  assert.equal(updated.body.task.completed, true);
  assert.equal(updated.body.task.title, 'Learn Express');
  await request(app).delete(`/api/v1/admin/tasks/${task.id}`).expect(200);
  const missing = await request(app).get(created.headers.location).expect(404);
  assert.equal(missing.body.error, 'Error_NotFound');
});

test('validation rejects invalid, empty and extra fields without echoing values', async () => {
  for (const body of [{}, { title: ' ' }, { title: 42 }, { title: 'x', completed: 'true' }, { title: 'x', admin: true }]) {
    const res = await request(app).post('/api/v1/admin/tasks').send(body).expect(400);
    assert.equal(res.body.error, 'Error_Invalid');
    assert.deepEqual(Object.keys(res.body).sort(), ['error', 'message']);
    assert.equal(typeof res.body.message, 'string');
  }
  await request(app).patch(`/api/v1/admin/tasks/${randomUUID()}`).send({}).expect(400);
  await request(app).get('/api/v1/user/tasks/not-a-uuid').expect(400);
  await request(app).get('/api/v1/user/tasks?limit=101&page=0').expect(400);
});

test('valid UUIDs for missing tasks return 404', databaseTest, async () => {
  const id = randomUUID();
  const url = `/api/v1/admin/tasks/${id}`;
  await request(app).get(`/api/v1/user/tasks/${id}`).expect(404);
  await request(app).patch(url).send({ title: 'missing' }).expect(404);
  await request(app).delete(url).expect(404);
});

test('malformed JSON and oversized payloads use API errors', async () => {
  const malformed = await request(app).post('/api/v1/admin/tasks').set('Content-Type', 'application/json').send('{').expect(400);
  assert.equal(malformed.body.error, 'Error_Invalid');
  const oversized = await request(app).post('/api/v1/admin/tasks').send({ title: 'a'.repeat(1024 * 1024) }).expect(413);
  assert.equal(oversized.body.error, 'Error_Invalid');
});

test('unknown routes use JSON 404', async () => {
  const res = await request(app).get('/missing').expect(404);
  assert.equal(res.body.error, 'Error_NotFound');
});

test('CORS allowlist and preflight', async () => {
  const allowed = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173').expect(200);
  assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:5173');
  const denied = await request(app).get('/api/v1/health').set('Origin', 'https://untrusted.example').expect(403);
  assert.equal(denied.body.error, 'Error_Unauthorised');
  await request(app).options('/api/v1/admin/tasks').set('Origin', 'http://localhost:5173')
    .set('Access-Control-Request-Method', 'POST').expect(204);
});

test('Express 5 forwards async failures and hides internal errors', async () => {
  const failing = express();
  failing.get('/failure', async () => { throw new Error('private database credentials'); });
  failing.use(errorHandler);
  const res = await request(failing).get('/failure').expect(500);
  assert.equal(res.body.message, 'Internal server error');
  assert.equal(res.body.error, 'Error_InternalServer');
  assert.deepEqual(Object.keys(res.body).sort(), ['error', 'message']);
  assert.ok(!JSON.stringify(res.body).includes('private database credentials'));
});

test('rate limit returns JSON 429 with retry headers', async () => {
  // Reuse the configured limiter with a separate client address to isolate its bucket.
  const limited = express();
  limited.set('trust proxy', 1);
  limited.use(limiter);
  limited.get('/', (_req, res) => res.sendStatus(200));
  for (let i = 0; i < 100; i++) {
    await request(limited).get('/').set('X-Forwarded-For', '192.0.2.10').expect(200);
  }
  const res = await request(limited).get('/').set('X-Forwarded-For', '192.0.2.10').expect(429);
  assert.equal(res.body.error, 'Error_OverLimit');
  assert.ok(res.headers['retry-after']);
  assert.ok(res.headers.ratelimit);
});
