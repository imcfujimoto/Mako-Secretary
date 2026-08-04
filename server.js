const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const MEMOS_FILE = path.join(DATA_DIR, 'memos.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PRIORITIES = ['S', 'A', 'B', 'C'];

fs.mkdirSync(DATA_DIR, { recursive: true });

function normalizePriority(value, fallback) {
  return PRIORITIES.includes(value) ? value : fallback;
}

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    let size = 0;
    const LIMIT = 1024 * 1024; // 1MB
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > LIMIT) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

function serveStatic(req, res) {
  let urlPath = req.url === '/' ? '/index.html' : req.url;
  urlPath = urlPath.split('?')[0];
  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

async function handleApi(req, res, pathname) {
  // --- Memos ---
  if (pathname === '/api/memos' && req.method === 'GET') {
    const memos = readJson(MEMOS_FILE);
    sendJson(res, 200, memos);
    return;
  }

  if (pathname === '/api/memos' && req.method === 'POST') {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      sendJson(res, 400, { error: '不正なリクエストです' });
      return;
    }
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.body === 'string' ? body.body.trim() : '';
    const startTime = typeof body.startTime === 'string' ? body.startTime.trim() : '';
    const duration = typeof body.duration === 'string' ? body.duration.trim() : '';
    const priority = normalizePriority(body.priority, 'C');
    if (!title) {
      sendJson(res, 400, { error: 'タイトルを入力してください' });
      return;
    }
    const memos = readJson(MEMOS_FILE);
    const memo = {
      id: crypto.randomUUID(),
      title,
      body: content,
      startTime,
      duration,
      priority,
      createdAt: new Date().toISOString(),
    };
    memos.unshift(memo);
    writeJson(MEMOS_FILE, memos);
    sendJson(res, 201, memo);
    return;
  }

  const memoMatch = pathname.match(/^\/api\/memos\/([^/]+)$/);
  if (memoMatch && req.method === 'PATCH') {
    const id = memoMatch[1];
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      sendJson(res, 400, { error: '不正なリクエストです' });
      return;
    }
    const memos = readJson(MEMOS_FILE);
    const memo = memos.find((m) => m.id === id);
    if (!memo) {
      sendJson(res, 404, { error: 'メモが見つかりません' });
      return;
    }
    const title = typeof body.title === 'string' ? body.title.trim() : memo.title;
    if (!title) {
      sendJson(res, 400, { error: 'タイトルを入力してください' });
      return;
    }
    memo.title = title;
    memo.body = typeof body.body === 'string' ? body.body.trim() : memo.body;
    memo.startTime = typeof body.startTime === 'string' ? body.startTime.trim() : memo.startTime;
    memo.duration = typeof body.duration === 'string' ? body.duration.trim() : memo.duration;
    memo.priority = normalizePriority(body.priority, memo.priority || 'C');
    writeJson(MEMOS_FILE, memos);
    sendJson(res, 200, memo);
    return;
  }

  if (memoMatch && req.method === 'DELETE') {
    const id = memoMatch[1];
    const memos = readJson(MEMOS_FILE);
    const idx = memos.findIndex((m) => m.id === id);
    if (idx === -1) {
      sendJson(res, 404, { error: 'メモが見つかりません' });
      return;
    }
    memos.splice(idx, 1);
    writeJson(MEMOS_FILE, memos);
    sendJson(res, 200, { ok: true });
    return;
  }

  // --- Tasks ---
  if (pathname === '/api/tasks' && req.method === 'GET') {
    const tasks = readJson(TASKS_FILE);
    sendJson(res, 200, tasks);
    return;
  }

  if (pathname === '/api/tasks' && req.method === 'POST') {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      sendJson(res, 400, { error: '不正なリクエストです' });
      return;
    }
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) {
      sendJson(res, 400, { error: 'タスク内容を入力してください' });
      return;
    }
    const priority = normalizePriority(body.priority, 'C');
    const tasks = readJson(TASKS_FILE);
    const task = {
      id: crypto.randomUUID(),
      title,
      priority,
      done: false,
      createdAt: new Date().toISOString(),
    };
    tasks.unshift(task);
    writeJson(TASKS_FILE, tasks);
    sendJson(res, 201, task);
    return;
  }

  const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskMatch && req.method === 'PATCH') {
    const id = taskMatch[1];
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      sendJson(res, 400, { error: '不正なリクエストです' });
      return;
    }
    const tasks = readJson(TASKS_FILE);
    const task = tasks.find((t) => t.id === id);
    if (!task) {
      sendJson(res, 404, { error: 'タスクが見つかりません' });
      return;
    }
    if (typeof body.title === 'string') {
      const trimmed = body.title.trim();
      if (!trimmed) {
        sendJson(res, 400, { error: 'タスク内容を入力してください' });
        return;
      }
      task.title = trimmed;
    }
    if (typeof body.priority === 'string') {
      task.priority = normalizePriority(body.priority, task.priority || 'C');
    }
    if (typeof body.done === 'boolean') {
      task.done = body.done;
    } else if (body.title === undefined && body.priority === undefined) {
      task.done = !task.done;
    }
    writeJson(TASKS_FILE, tasks);
    sendJson(res, 200, task);
    return;
  }

  if (taskMatch && req.method === 'DELETE') {
    const id = taskMatch[1];
    const tasks = readJson(TASKS_FILE);
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) {
      sendJson(res, 404, { error: 'タスクが見つかりません' });
      return;
    }
    tasks.splice(idx, 1);
    writeJson(TASKS_FILE, tasks);
    sendJson(res, 200, { ok: true });
    return;
  }

  // --- Weekly reviews ---
  if (pathname === '/api/reviews' && req.method === 'GET') {
    const reviews = readJson(REVIEWS_FILE);
    reviews.sort((a, b) => {
      if (a.weekStart !== b.weekStart) return a.weekStart < b.weekStart ? 1 : -1;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
    sendJson(res, 200, reviews);
    return;
  }

  if (pathname === '/api/reviews' && req.method === 'POST') {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      sendJson(res, 400, { error: '不正なリクエストです' });
      return;
    }
    const weekStart = typeof body.weekStart === 'string' ? body.weekStart.trim() : '';
    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
    if (!weekStart) {
      sendJson(res, 400, { error: '対象週を選択してください' });
      return;
    }
    if (!comment) {
      sendJson(res, 400, { error: '振り返りコメントを入力してください' });
      return;
    }
    const reviews = readJson(REVIEWS_FILE);
    const review = {
      id: crypto.randomUUID(),
      weekStart,
      comment,
      createdAt: new Date().toISOString(),
    };
    reviews.unshift(review);
    writeJson(REVIEWS_FILE, reviews);
    sendJson(res, 201, review);
    return;
  }

  sendJson(res, 404, { error: 'Not Found' });
}

const server = http.createServer((req, res) => {
  const pathname = req.url.split('?')[0];

  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname).catch((err) => {
      console.error(err);
      sendJson(res, 500, { error: 'サーバーエラーが発生しました' });
    });
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res);
    return;
  }

  res.writeHead(405);
  res.end('Method Not Allowed');
});

server.listen(PORT, () => {
  console.log(`秘書アプリを起動しました: http://localhost:${PORT}`);
});
