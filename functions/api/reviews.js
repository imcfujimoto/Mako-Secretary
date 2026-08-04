export async function onRequestGet(context) {
  const { results } = await context.env.DB.prepare(
    'SELECT * FROM reviews ORDER BY weekStart DESC, createdAt DESC'
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
  const weekStart = typeof body.weekStart === 'string' ? body.weekStart.trim() : '';
  const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
  if (!weekStart) {
    return Response.json({ error: '対象週を選択してください' }, { status: 400 });
  }
  if (!comment) {
    return Response.json({ error: '振り返りコメントを入力してください' }, { status: 400 });
  }
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await context.env.DB.prepare(
    'INSERT INTO reviews (id, weekStart, comment, createdAt) VALUES (?, ?, ?, ?)'
  ).bind(id, weekStart, comment, createdAt).run();

  return Response.json({ id, weekStart, comment, createdAt }, { status: 201 });
}
