import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test';
const {default: app} = await import('../server.js');
let server, base;
before(async () => {
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); });
const json = (path, options) => fetch(`${base}${path}`, options);

test('health and root endpoints respond without MongoDB', async () => {
  const root = await json('/');
  assert.equal(root.status, 200);
  assert.equal((await root.json()).health, '/api/health');
  const health = await json('/api/health');
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');
});

test('email analyze endpoint supports in-memory create, read, update, dashboard, alerts and delete', async () => {
  const response = await json('/api/emails/analyze', {
    method: 'POST', headers: {'content-type':'application/json'},
    body: JSON.stringify({sender:'student@example.com',recipient:'staff@example.com',subject:'Urgent account alert',messageBody:'Please verify your account immediately.'}),
  });
  assert.equal(response.status, 201);
  const created = await response.json();
  assert.equal(created.storageMode, 'memory');
  assert.equal(created.analysis.sender, 'student@example.com');
  assert.ok(created.analysis.riskScore > 0);
  const id = created.analysis._id;

  const list = await (await json('/api/emails')).json();
  assert.equal(list.total, 1);
  assert.equal(list.items[0]._id, id);
  const detail = await (await json(`/api/emails/${id}`)).json();
  assert.equal(detail.analysis.subject, 'Urgent account alert');

  const updatedResponse = await json(`/api/emails/${id}`, {
    method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({reviewStatus:'REVIEWED'}),
  });
  assert.equal(updatedResponse.status, 200);
  assert.equal((await updatedResponse.json()).analysis.reviewStatus, 'REVIEWED');

  const stats = await (await json('/api/dashboard/stats')).json();
  assert.equal(stats.total, 1);
  assert.equal(stats.counts.SUSPICIOUS, 1);
  const alertList = await (await json('/api/alerts')).json();
  assert.equal(alertList.items.length, 1);
  const alert = alertList.items[0];
  const resolved = await json(`/api/alerts/${alert._id}`, {
    method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({status:'RESOLVED'}),
  });
  assert.equal((await resolved.json()).alert.status, 'RESOLVED');

  const deleted = await json(`/api/emails/${id}`, {method:'DELETE'});
  assert.equal(deleted.status, 200);
  assert.equal((await (await json('/api/emails')).json()).total, 0);
  assert.equal((await (await json('/api/alerts')).json()).items.length, 0);
});

test('DFA endpoint accepts the same sequence the analyzer uses', async () => {
  const response = await json('/api/dfa/test', {
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sequence:['N','S','S','S']}),
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.accepted, true);
  assert.equal(result.finalState, 'q3');
});

test('invalid JSON email requests return a client error', async () => {
  const response = await json('/api/emails/analyze', {
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sender:''}),
  });
  assert.equal(response.status, 400);
});
test('text upload is analyzed without MongoDB and unsupported files are rejected', async () => {
  const form = new FormData();
  form.append('sender','upload-check@example.com');
  form.append('subject','Temporary upload integration check');
  form.append('file',new Blob(['A plain text test message.']), 'flow-check.txt');
  const response = await json('/api/emails/upload',{method:'POST',body:form});
  assert.equal(response.status,201);
  const result = await response.json();
  assert.equal(result.storageMode,'memory');
  assert.equal(result.extractedEmail.messageBody,'A plain text test message.');
  await json(`/api/emails/${result.analysis._id}`,{method:'DELETE'});

  const badForm = new FormData();
  badForm.append('file',new Blob(['not an email']),'unsupported.pdf');
  const rejected = await json('/api/emails/upload',{method:'POST',body:badForm});
  assert.equal(rejected.status,400);
});
