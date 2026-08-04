const PRIORITIES = ['S', 'A', 'B', 'C'];

export async function onRequestPatch(context) {
  const id = context.params.id;
  let body;
  try {
    body = await context.request.json();
  } catch (err) {
    return Response.json({ error: '不正なリクエストです' }, { status: 400 });
  }

  const existing = await context.env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
  if (!existing) {
    return Response.json({ error: 'タスクが見つかりません' }, { status: 404 });
  }

  let title = existing.title;
  if (typeof body.title === 'string') {
    const trimmed = body.title.trim();
    if (!trimmed) {
      return Response.json({ error: 'タスク内容を入力してください' }, { status: 400 });
    }
    title = trimmed;
  }

  let priority = existing.priority;
  if (typeof body.priority === 'string' && PRIORITIES.includes(body.priority)) {
    priority = body.priority;
  }

  let done = !!existing.done;
  if (typeof body.done === 'boolean') {
    done = body.done;
  } else if (body.title === undefined && body.priority === undefined) {
    done = !done;
  }

  await context.env.DB.prepare(
    'UPDATE tasks SET title = ?, priority = ?, done = ? WHERE id = ?'
  ).bind(title, priority, done ? 1 : 0, id).run();

  return Response.json({ id, title, priority, done, createdAt: existing.createdAt });
}

export async function onRequestDelete(context) {
  const id = context.params.id;
  const existing = await context.env.DB.prepare('SELECT id FROM tasks WHERE id = ?').bind(id).first();
  if (!existing) {
    return Response.json({ error: 'タスクが見つかりません' }, { status: 404 });
  }
  await context.env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
  return Response.json({ ok: true });
}
