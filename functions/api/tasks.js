const PRIORITIES = ['S', 'A', 'B', 'C'];

export async function onRequestGet(context) {
  const { results } = await context.env.DB.prepare(
    'SELECT * FROM tasks ORDER BY createdAt DESC'
  ).all();
  return Response.json(results.map((t) => ({ ...t, done: !!t.done })));
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
    return Response.json({ error: 'タスク内容を入力してください' }, { status: 400 });
  }
  const priority = PRIORITIES.includes(body.priority) ? body.priority : 'C';
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await context.env.DB.prepare(
    'INSERT INTO tasks (id, title, priority, done, createdAt) VALUES (?, ?, ?, 0, ?)'
  ).bind(id, title, priority, createdAt).run();

  return Response.json({ id, title, priority, done: false, createdAt }, { status: 201 });
}
