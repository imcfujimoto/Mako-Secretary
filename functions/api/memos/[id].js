const PRIORITIES = ['S', 'A', 'B', 'C'];

export async function onRequestPatch(context) {
  const id = context.params.id;
  let body;
  try {
    body = await context.request.json();
  } catch (err) {
    return Response.json({ error: '不正なリクエストです' }, { status: 400 });
  }

  const existing = await context.env.DB.prepare('SELECT * FROM memos WHERE id = ?').bind(id).first();
  if (!existing) {
    return Response.json({ error: 'メモが見つかりません' }, { status: 404 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : existing.title;
  if (!title) {
    return Response.json({ error: 'タイトルを入力してください' }, { status: 400 });
  }
  const content = typeof body.body === 'string' ? body.body.trim() : existing.body;
  const startTime = typeof body.startTime === 'string' ? body.startTime.trim() : existing.startTime;
  const duration = typeof body.duration === 'string' ? body.duration.trim() : existing.duration;
  const priority = PRIORITIES.includes(body.priority) ? body.priority : existing.priority;

  await context.env.DB.prepare(
    'UPDATE memos SET title = ?, body = ?, startTime = ?, duration = ?, priority = ? WHERE id = ?'
  ).bind(title, content, startTime, duration, priority, id).run();

  return Response.json({ id, title, body: content, startTime, duration, priority, createdAt: existing.createdAt });
}

export async function onRequestDelete(context) {
  const id = context.params.id;
  const existing = await context.env.DB.prepare('SELECT id FROM memos WHERE id = ?').bind(id).first();
  if (!existing) {
    return Response.json({ error: 'メモが見つかりません' }, { status: 404 });
  }
  await context.env.DB.prepare('DELETE FROM memos WHERE id = ?').bind(id).run();
  return Response.json({ ok: true });
}
