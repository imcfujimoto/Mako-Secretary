const memoForm = document.getElementById('memo-form');
const memoTitleInput = document.getElementById('memo-title');
const memoPriorityInput = document.getElementById('memo-priority');
const memoStartInput = document.getElementById('memo-start');
const memoDurationInput = document.getElementById('memo-duration');
const memoBodyInput = document.getElementById('memo-body');
const memoList = document.getElementById('memo-list');

const taskForm = document.getElementById('task-form');
const taskTitleInput = document.getElementById('task-title');
const taskPriorityInput = document.getElementById('task-priority');
const taskList = document.getElementById('task-list');

const PRIORITY_ORDER = { S: 0, A: 1, B: 2, C: 3 };
const PRIORITY_LABELS = { S: 'S', A: 'A', B: 'B', C: 'C' };

function sortByPriority(items) {
  return [...items].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority || 'C'];
    const pb = PRIORITY_ORDER[b.priority || 'C'];
    if (pa !== pb) return pa - pb;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

function priorityOptions(selected) {
  return Object.keys(PRIORITY_ORDER)
    .map((p) => `<option value="${p}" ${p === selected ? 'selected' : ''}>${PRIORITY_LABELS[p]}</option>`)
    .join('');
}

const reviewForm = document.getElementById('review-form');
const reviewWeekInput = document.getElementById('review-week');
const reviewCommentInput = document.getElementById('review-comment');
const reviewList = document.getElementById('review-list');

const dashMemoCount = document.getElementById('dash-memo-count');
const dashTaskCount = document.getElementById('dash-task-count');
const dashTaskOpenCount = document.getElementById('dash-task-open-count');
const reviewHighlightWeek = document.getElementById('review-highlight-week');
const reviewHighlightComment = document.getElementById('review-highlight-comment');

function formatDate(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatStart(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getMondayOfCurrentWeek() {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return toDateInputValue(monday);
}

function formatWeekLabel(weekStart) {
  const start = new Date(`${weekStart}T00:00:00`);
  if (Number.isNaN(start.getTime())) return weekStart;
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const pad = (n) => String(n).padStart(2, '0');
  return `${start.getFullYear()}/${pad(start.getMonth() + 1)}/${pad(start.getDate())} 〜 ${pad(end.getMonth() + 1)}/${pad(end.getDate())} の週`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'エラーが発生しました' }));
    throw new Error(err.error || 'エラーが発生しました');
  }
  return res.json();
}

function renderDashboard(memos, tasks, reviews) {
  dashMemoCount.textContent = memos.length;
  dashTaskCount.textContent = tasks.length;
  dashTaskOpenCount.textContent = tasks.filter((t) => !t.done).length;

  if (reviews.length === 0) {
    reviewHighlightWeek.textContent = '';
    reviewHighlightComment.textContent = 'まだ振り返りが記録されていません';
    return;
  }
  const latest = reviews[0];
  reviewHighlightWeek.textContent = formatWeekLabel(latest.weekStart);
  reviewHighlightComment.textContent = latest.comment;
}

let editingMemoId = null;
let editingTaskId = null;
let confirmDeleteMemoId = null;
let confirmDeleteTaskId = null;

function renderMemos(memos) {
  if (memos.length === 0) {
    memoList.innerHTML = '<li class="empty">メモはまだありません</li>';
    return;
  }
  memoList.innerHTML = sortByPriority(memos)
    .map((memo) => {
      const priority = memo.priority || 'C';
      if (memo.id === editingMemoId) {
        return `
        <li class="memo-item" data-id="${memo.id}">
          <div class="edit-form">
            <label class="field-label">タイトル</label>
            <input type="text" class="edit-memo-title" value="${escapeHtml(memo.title)}">
            <label class="field-label">重要度</label>
            <select class="edit-memo-priority">${priorityOptions(priority)}</select>
            <div class="form-row">
              <div class="form-col">
                <label class="field-label">開始時刻</label>
                <input type="datetime-local" class="edit-memo-start" value="${escapeHtml(memo.startTime || '')}">
              </div>
              <div class="form-col">
                <label class="field-label">予定時間</label>
                <input type="text" class="edit-memo-duration" value="${escapeHtml(memo.duration || '')}">
              </div>
            </div>
            <label class="field-label">本文</label>
            <textarea class="edit-memo-body" rows="4">${escapeHtml(memo.body || '')}</textarea>
            <div class="edit-actions">
              <button class="btn-save" data-action="save-memo">保存</button>
              <button class="btn-cancel" data-action="cancel-memo">キャンセル</button>
            </div>
          </div>
        </li>`;
      }
      const schedule = [
        memo.startTime ? `開始時刻: ${formatStart(memo.startTime)}` : '',
        memo.duration ? `予定時間: ${escapeHtml(memo.duration)}` : '',
      ]
        .filter(Boolean)
        .join(' / ');
      return `
      <li class="memo-item" data-id="${memo.id}">
        <div class="memo-title"><span class="priority-badge priority-${priority}">${priority}</span>${escapeHtml(memo.title)}</div>
        ${schedule ? `<div class="item-meta memo-schedule">${schedule}</div>` : ''}
        ${memo.body ? `<div class="memo-body">${escapeHtml(memo.body)}</div>` : ''}
        <div class="item-meta">作成日時: ${formatDate(memo.createdAt)}</div>
        ${
          memo.id === confirmDeleteMemoId
            ? `<div class="item-actions confirm-actions">
                <span class="confirm-text">本当に削除しますか?</span>
                <button class="btn-delete" data-action="confirm-delete-memo">削除する</button>
                <button class="btn-cancel" data-action="cancel-delete-memo">キャンセル</button>
              </div>`
            : `<div class="item-actions">
                <button class="btn-edit" data-action="edit-memo">編集</button>
                <button class="btn-delete" data-action="delete-memo">削除</button>
              </div>`
        }
      </li>`;
    })
    .join('');
}

function renderTasks(tasks) {
  if (tasks.length === 0) {
    taskList.innerHTML = '<li class="empty">タスクはまだありません</li>';
    return;
  }
  taskList.innerHTML = sortByPriority(tasks)
    .map((task) => {
      const priority = task.priority || 'C';
      if (task.id === editingTaskId) {
        return `
        <li class="task-item" data-id="${task.id}">
          <div class="edit-form edit-form-inline">
            <input type="text" class="edit-task-title" value="${escapeHtml(task.title)}">
            <select class="edit-task-priority">${priorityOptions(priority)}</select>
            <div class="edit-actions">
              <button class="btn-save" data-action="save-task">保存</button>
              <button class="btn-cancel" data-action="cancel-task">キャンセル</button>
            </div>
          </div>
        </li>`;
      }
      return `
      <li class="task-item ${task.done ? 'done' : ''}" data-id="${task.id}">
        <div class="task-main">
          <span class="task-title"><span class="priority-badge priority-${priority}">${priority}</span>${escapeHtml(task.title)}</span>
          <div class="item-meta">作成日時: ${formatDate(task.createdAt)} / 状態: ${task.done ? '完了' : '未完了'}</div>
        </div>
        ${
          task.id === confirmDeleteTaskId
            ? `<div class="task-actions confirm-actions">
                <span class="confirm-text">本当に削除しますか?</span>
                <button class="btn-delete" data-action="confirm-delete">削除する</button>
                <button class="btn-cancel" data-action="cancel-delete">キャンセル</button>
              </div>`
            : `<div class="task-actions">
                <button class="btn-edit" data-action="edit">編集</button>
                <button class="btn-complete" data-action="toggle">${task.done ? '未完了に戻す' : '完了にする'}</button>
                <button class="btn-delete" data-action="delete">削除</button>
              </div>`
        }
      </li>`;
    })
    .join('');
}

function renderReviews(reviews) {
  if (reviews.length === 0) {
    reviewList.innerHTML = '<li class="empty">振り返りはまだありません</li>';
    return;
  }
  reviewList.innerHTML = reviews
    .map(
      (review) => `
      <li class="review-item">
        <div class="review-week">${escapeHtml(formatWeekLabel(review.weekStart))}</div>
        <div class="review-comment">${escapeHtml(review.comment)}</div>
        <div class="item-meta">作成日時: ${formatDate(review.createdAt)}</div>
      </li>`
    )
    .join('');
}

let state = { memos: [], tasks: [], reviews: [] };

function renderAll() {
  renderDashboard(state.memos, state.tasks, state.reviews);
  renderMemos(state.memos);
  renderTasks(state.tasks);
  renderReviews(state.reviews);
}

async function loadAll() {
  const [memos, tasks, reviews] = await Promise.all([
    fetchJson('/api/memos'),
    fetchJson('/api/tasks'),
    fetchJson('/api/reviews'),
  ]);
  state.memos = memos;
  state.tasks = tasks;
  state.reviews = reviews;
  renderAll();
}

memoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = memoTitleInput.value.trim();
  const priority = memoPriorityInput.value;
  const body = memoBodyInput.value.trim();
  const startTime = memoStartInput.value;
  const duration = memoDurationInput.value.trim();
  if (!title) return;
  try {
    const memo = await fetchJson('/api/memos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority, body, startTime, duration }),
    });
    state.memos.unshift(memo);
    renderAll();
    memoForm.reset();
  } catch (err) {
    alert(err.message);
  }
});

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = taskTitleInput.value.trim();
  const priority = taskPriorityInput.value;
  if (!title) return;
  try {
    const task = await fetchJson('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority }),
    });
    state.tasks.unshift(task);
    renderAll();
    taskForm.reset();
  } catch (err) {
    alert(err.message);
  }
});

taskList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const li = e.target.closest('.task-item');
  const id = li.dataset.id;
  const action = btn.dataset.action;

  try {
    if (action === 'toggle') {
      const task = state.tasks.find((t) => t.id === id);
      const updated = await fetchJson(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !task.done }),
      });
      const idx = state.tasks.findIndex((t) => t.id === id);
      state.tasks[idx] = updated;
      renderAll();
    } else if (action === 'delete') {
      confirmDeleteTaskId = id;
      renderAll();
    } else if (action === 'cancel-delete') {
      confirmDeleteTaskId = null;
      renderAll();
    } else if (action === 'confirm-delete') {
      await fetchJson(`/api/tasks/${id}`, { method: 'DELETE' });
      state.tasks = state.tasks.filter((t) => t.id !== id);
      confirmDeleteTaskId = null;
      renderAll();
    } else if (action === 'edit') {
      editingTaskId = id;
      renderAll();
    } else if (action === 'cancel-task') {
      editingTaskId = null;
      renderAll();
    } else if (action === 'save-task') {
      const title = li.querySelector('.edit-task-title').value.trim();
      if (!title) return;
      const priority = li.querySelector('.edit-task-priority').value;
      const updated = await fetchJson(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority }),
      });
      const idx = state.tasks.findIndex((t) => t.id === id);
      state.tasks[idx] = updated;
      editingTaskId = null;
      renderAll();
    }
  } catch (err) {
    alert(err.message);
  }
});

memoList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const li = e.target.closest('.memo-item');
  const id = li.dataset.id;
  const action = btn.dataset.action;

  try {
    if (action === 'delete-memo') {
      confirmDeleteMemoId = id;
      renderAll();
    } else if (action === 'cancel-delete-memo') {
      confirmDeleteMemoId = null;
      renderAll();
    } else if (action === 'confirm-delete-memo') {
      await fetchJson(`/api/memos/${id}`, { method: 'DELETE' });
      state.memos = state.memos.filter((m) => m.id !== id);
      confirmDeleteMemoId = null;
      renderAll();
    } else if (action === 'edit-memo') {
      editingMemoId = id;
      renderAll();
    } else if (action === 'cancel-memo') {
      editingMemoId = null;
      renderAll();
    } else if (action === 'save-memo') {
      const title = li.querySelector('.edit-memo-title').value.trim();
      if (!title) return;
      const priority = li.querySelector('.edit-memo-priority').value;
      const startTime = li.querySelector('.edit-memo-start').value;
      const duration = li.querySelector('.edit-memo-duration').value.trim();
      const body = li.querySelector('.edit-memo-body').value.trim();
      const updated = await fetchJson(`/api/memos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority, startTime, duration, body }),
      });
      const idx = state.memos.findIndex((m) => m.id === id);
      state.memos[idx] = updated;
      editingMemoId = null;
      renderAll();
    }
  } catch (err) {
    alert(err.message);
  }
});

reviewForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const weekStart = reviewWeekInput.value;
  const comment = reviewCommentInput.value.trim();
  if (!weekStart || !comment) return;
  try {
    const review = await fetchJson('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart, comment }),
    });
    state.reviews = [review, ...state.reviews].sort((a, b) => {
      if (a.weekStart !== b.weekStart) return a.weekStart < b.weekStart ? 1 : -1;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
    renderAll();
    reviewForm.reset();
    reviewWeekInput.value = getMondayOfCurrentWeek();
  } catch (err) {
    alert(err.message);
  }
});

reviewWeekInput.value = getMondayOfCurrentWeek();

loadAll().catch((err) => {
  console.error(err);
  alert('データの読み込みに失敗しました');
});
