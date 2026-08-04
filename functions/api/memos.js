const PRIORITIES = ['S', 'A', 'B', 'C'];

export async function onRequestGet(context) {
  const { results } = await context.env.DB.prepare(
    'SELECT * FROM memos ORDER BY createdAt DESC'
  ).all();
  return Response.json(results);
}

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch (err) {
    return Response.json({ error: '不正なリクエストです' }, { status: 400 });
  }
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return Response.json({ error: 'タイトルを入力してください' }, { status: 400 });
  }
  const content = typeof body.body === 'string' ? body.body.trim() : '';
  const startTime = typeof body.startTime === 'string' ? body.startTime.trim() : '';
  const duration = typeof body.duration === 'string' ? body.duration.trim() : '';
  const priority = PRIORITIES.includes(body.priority) ? body.priority : 'C';
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await context.env.DB.prepare(
    'INSERT INTO memos (id, title, body, startTime, duration, priority, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, title, content, startTime, duration, priority, createdAt).run();

  return Response.json(
    { id, title, body: content, startTime, duration, priority, createdAt },
    { status: 201 }
  );
}
