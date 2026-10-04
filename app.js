const form = document.querySelector('#planner-form');
const subjectInput = document.querySelector('#subject');
const notesInput = document.querySelector('#notes');
const hoursInput = document.querySelector('#hours');
const examDateInput = document.querySelector('#exam-date');
const results = document.querySelector('#results');
const emptyPlan = document.querySelector('#empty-plan');
const errorMessage = document.querySelector('#form-error');
const historyList = document.querySelector('#history-list');
const planStorageKey = 'studysnap-plan-v2';
const historyStorageKey = 'studysnap-history-v1';
const progressStorageKey = 'studysnap-progress-v2';

const today = new Date();
today.setHours(0, 0, 0, 0);
examDateInput.min = toDateValue(today);

let selectedMode = 'normal';
let activePlan = null;
let activeCompleted = {};
let focusTasks = new Map();
let focusTask = null;
let focusTimer = null;
let focusRemaining = 0;
let focusTotal = 0;
let focusPaused = false;

const focusMode = document.querySelector('#focus-mode');
const focusTitle = document.querySelector('#focus-title');
const focusModeLabel = document.querySelector('#focus-mode-label');
const focusClock = document.querySelector('#focus-clock');
const focusProgressFill = document.querySelector('#focus-progress-fill');
const focusProgressTrack = document.querySelector('.focus-progress-track');
const focusPauseButton = document.querySelector('#focus-pause');
const focusFinishButton = document.querySelector('#focus-finish');

function toDateValue(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function datePlus(days) {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return toDateValue(date);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
}

function readStoredValue(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The planner remains usable when storage is blocked or full.
  }
}

function removeStoredValue(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage cleanup errors.
  }
}

function getTopics(notes) {
  const priorityWords = /\b(high priority|important|priority|exam|core|must know|weak area)\b/i;
  const seen = new Set();
  return String(notes).split(/\n|[.!?](?:\s+|$)/)
    .map((line, index) => {
      const text = line.replace(/^[-*\d.)\s]+/, '').replace(/^(topics?|syllabus|units?)\s*:\s*/i, '').trim();
      return { text, score: priorityWords.test(text) ? 1 : 0, index };
    })
    .filter(({ text }) => text.length > 1)
    .filter(({ text }) => {
      const key = text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ text }) => text);
}

function formatMinutes(minutes) {
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ''}`.trim() : `${minutes}m`;
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(value) {
  const date = new Date(`${value}T00:00:00`);
  return Math.max(0, Math.ceil((date - today) / 86400000));
}

function buildSchedule(topics, minutes, mode) {
  const emergency = mode === 'emergency';
  const revisionMinutes = emergency ? Math.max(10, Math.round(minutes * 0.25 / 5) * 5) : minutes >= 60 ? Math.max(10, Math.round(minutes * 0.15 / 5) * 5) : 5;
  const breakCount = emergency ? (minutes >= 150 ? 1 : 0) : minutes >= 180 ? 2 : minutes >= 90 ? 1 : 0;
  const breakMinutes = breakCount * 10;
  const focusMinutes = Math.max(20, minutes - revisionMinutes - breakMinutes);
  const topicCount = Math.min(topics.length, Math.max(1, Math.floor(focusMinutes / (emergency ? 20 : 25))));
  const selected = topics.slice(0, topicCount);
  const baseMinutes = emergency ? 15 : 20;
  const safeBase = Math.min(baseMinutes, Math.floor(focusMinutes / selected.length));
  const extraPerBlock = Math.floor((focusMinutes - selected.length * safeBase) / selected.length / 5) * 5;
  let extraMinutes = focusMinutes - selected.length * (safeBase + extraPerBlock);
  const blocks = selected.map((topic, index) => {
    const duration = safeBase + extraPerBlock + (extraMinutes >= 5 ? 5 : 0);
    extraMinutes -= extraMinutes >= 5 ? 5 : 0;
    return { id: `study-${index}`, kind: 'topic', topic, duration, mode: emergency ? 'Rapid recall + exam practice' : index === 0 ? 'Learn + active recall' : index === selected.length - 1 ? 'Practice from memory' : 'Practice + recall' };
  });
  if (breakCount) {
    blocks.splice(Math.ceil(blocks.length / 2), 0, { kind: 'break', duration: 10, mode: 'Step away, hydrate, reset' });
  }
  blocks.push({ id: 'revision', kind: 'revision', duration: revisionMinutes, mode: emergency ? 'Rapid revision + gap check' : 'Recall key ideas and mark gaps' });
  return blocks;
}

function buildQuestions(topics) {
  const chosen = topics.slice(0, 3);
  return Array.from({ length: 3 }, (_, index) => {
    const topic = chosen[index % chosen.length];
    const prompt = index === 0 ? 'Without looking at your notes, explain' : index === 1 ? 'Give one example related to' : 'Write down the key idea behind';
    return { id: `question-${index}`, text: `${prompt} ${topic}.` };
  });
}

function buildRationale(plan) {
  const dayText = plan.daysRemaining === 0 ? 'the exam is today' : plan.daysRemaining === 1 ? 'the exam is tomorrow' : `there are ${plan.daysRemaining} days before the exam`;
  const modeText = plan.mode === 'emergency' ? 'Emergency Mode uses shorter topic blocks, rapid revision, and practice-forward prompts' : 'Normal Mode gives the supplied topics focused blocks and a final revision period';
  return `This plan uses your ${formatMinutes(plan.minutes)} of available study time because ${dayText}. ${modeText}. Every topic shown comes from your supplied notes.`;
}

function getProgress(planId) {
  const saved = readStoredValue(progressStorageKey, {});
  return saved.planId === planId && saved.completed ? saved.completed : {};
}

function saveProgress(planId, completed) {
  writeStoredValue(progressStorageKey, { planId, completed });
}

function getHistory() {
  const history = readStoredValue(historyStorageKey, []);
  return Array.isArray(history) ? history.filter((plan) => plan && plan.id && plan.subject && Array.isArray(plan.topics)) : [];
}

function savePlan(plan) {
  writeStoredValue(planStorageKey, plan);
  const history = getHistory().filter((item) => item.id !== plan.id);
  history.unshift(plan);
  writeStoredValue(historyStorageKey, history.slice(0, 12));
}

function updateProgress() {
  const controls = [...document.querySelectorAll('[data-progress-id]')];
  const total = controls.length;
  const completedCount = controls.filter((control) => control.checked).length;
  const percentage = total ? Math.round((completedCount / total) * 100) : 0;
  document.querySelector('#completed-count').textContent = `${completedCount} completed`;
  document.querySelector('#remaining-count').textContent = `${total - completedCount} remaining`;
  document.querySelector('#progress-percent').textContent = `${percentage}%`;
  document.querySelector('#progress-fill').style.width = `${percentage}%`;
  document.querySelector('.progress-track').setAttribute('aria-valuenow', percentage);
  if (activePlan) saveProgress(activePlan.id, activeCompleted);
}

function setFormValues(plan) {
  subjectInput.value = plan.subject;
  notesInput.value = plan.notes || plan.topics.join('\n');
  hoursInput.value = plan.minutes / 60;
  examDateInput.value = plan.examDate;
}

function clearValidation() {
  errorMessage.textContent = '';
  [subjectInput, notesInput, hoursInput, examDateInput].forEach((input) => input.removeAttribute('aria-invalid'));
}

function validateInput() {
  const subject = subjectInput.value.trim();
  const notes = notesInput.value.trim();
  const topics = getTopics(notes);
  const minutes = Math.round(Number(hoursInput.value) * 60);
  const examDate = examDateInput.value;
  const errors = [];
  if (!subject) { errors.push('a subject'); subjectInput.setAttribute('aria-invalid', 'true'); }
  if (!notes || !topics.length) { errors.push('at least one topic in your notes or syllabus'); notesInput.setAttribute('aria-invalid', 'true'); }
  if (!Number.isFinite(minutes) || minutes <= 0) { errors.push('positive study time'); hoursInput.setAttribute('aria-invalid', 'true'); }
  if (!examDate || Number.isNaN(new Date(`${examDate}T00:00:00`).getTime())) { errors.push('a valid exam date'); examDateInput.setAttribute('aria-invalid', 'true'); }
  if (examDate && new Date(`${examDate}T00:00:00`) < today) { errors.push('an exam date that is today or later'); examDateInput.setAttribute('aria-invalid', 'true'); }
  if (errors.length) {
    errorMessage.textContent = `Please add ${errors.join(', ')} so StudySnap can build a reliable plan.`;
    return null;
  }
  return { subject, notes, topics, minutes, examDate };
}

function stopFocusTimer() {
  if (focusTimer) clearInterval(focusTimer);
  focusTimer = null;
}

function closeFocusMode() {
  stopFocusTimer();
  focusTask = null;
  focusMode.hidden = true;
  document.body.classList.remove('focus-open');
}

function formatClock(seconds) {
  return `${Math.floor(Math.max(0, seconds) / 60).toString().padStart(2, '0')}:${(Math.max(0, seconds) % 60).toString().padStart(2, '0')}`;
}

function updateFocusDisplay() {
  const percentage = focusTotal ? Math.round(((focusTotal - focusRemaining) / focusTotal) * 100) : 0;
  focusClock.textContent = formatClock(focusRemaining);
  focusProgressFill.style.width = `${percentage}%`;
  focusProgressTrack.setAttribute('aria-valuenow', percentage);
}

function completeFocusTask() {
  if (!focusTask || !activePlan) return;
  const control = document.querySelector(`[data-progress-id="${focusTask.id}"]`);
  if (control) {
    control.checked = true;
    control.closest('.schedule-item')?.classList.add('is-complete');
  }
  activeCompleted[focusTask.id] = true;
  updateProgress();
  const focusButton = document.querySelector(`[data-focus-id="${focusTask.id}"]`);
  if (focusButton) focusButton.textContent = 'Done';
  closeFocusMode();
}

function startFocus(id) {
  const task = focusTasks.get(id);
  if (!task) return;
  stopFocusTimer();
  focusTask = task;
  focusRemaining = Math.max(1, Math.round(task.duration * 60));
  focusTotal = focusRemaining;
  focusPaused = false;
  focusTitle.textContent = task.title;
  focusModeLabel.textContent = task.mode;
  focusPauseButton.textContent = 'Pause';
  updateFocusDisplay();
  focusMode.hidden = false;
  document.body.classList.add('focus-open');
  focusTimer = setInterval(() => {
    if (focusPaused) return;
    focusRemaining -= 1;
    updateFocusDisplay();
    if (focusRemaining <= 0) completeFocusTask();
  }, 1000);
}

function renderPlan(plan, { restore = false, save = false } = {}) {
  closeFocusMode();
  activePlan = plan;
  activeCompleted = getProgress(plan.id);
  focusTasks = new Map(plan.schedule.filter((item) => item.kind !== 'break').map((item) => [item.id, item]));
  writeStoredValue(planStorageKey, plan);
  if (save) savePlan(plan);
  setFormValues(plan);
  document.querySelector('#plan-title').textContent = `${plan.subject} / today's plan`;
  document.querySelector('#days-count').textContent = plan.daysRemaining;
  document.querySelector('#total-time').textContent = `${formatMinutes(plan.minutes)} total`;
  document.querySelector('#result-mode').textContent = `${plan.mode === 'emergency' ? 'EMERGENCY' : 'NORMAL'} MODE`;
  document.querySelector('#created-label').textContent = `Created ${new Date(plan.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  document.querySelector('#plan-rationale').textContent = buildRationale(plan);
  document.querySelector('#schedule-list').innerHTML = plan.schedule.map((item, index) => {
    const isComplete = Boolean(activeCompleted[item.id]);
    const title = item.kind === 'topic' ? escapeHTML(item.topic) : item.kind === 'break' ? 'Short break' : 'Revision period';
    const label = item.kind === 'break' ? 'RESET' : item.kind === 'revision' ? 'FINISH' : index === 0 ? 'START' : `BLOCK ${index + 1}`;
    const control = item.kind === 'break' ? '' : `<input class="progress-checkbox" type="checkbox" data-progress-id="${item.id}" aria-label="Mark ${title} complete" ${isComplete ? 'checked' : ''}>`;
    const focusButton = item.kind === 'break' ? '' : `<button class="focus-button" type="button" data-focus-id="${item.id}">${isComplete ? 'Done' : 'Start Focus'}</button>`;
    if (item.kind !== 'break') item.title = item.kind === 'topic' ? item.topic : 'Revision period';
    return `<div class="schedule-item ${item.kind}-block ${isComplete ? 'is-complete' : ''}"><span class="schedule-time">${label}</span><div class="schedule-main"><div class="schedule-topic">${control}${title}</div><div class="schedule-mode">${item.mode}${focusButton}</div></div><span class="schedule-duration">${formatMinutes(item.duration)}</span></div>`;
  }).join('');
  document.querySelector('#priority-list').innerHTML = plan.topics.slice(0, 3).map((topic) => `<li>${escapeHTML(topic)}</li>`).join('');
  document.querySelector('#checklist').innerHTML = plan.topics.slice(0, 3).map((topic) => `<li><label class="check-item"><input type="checkbox"><span>Recall the key ideas in ${escapeHTML(topic)}</span></label></li>`).concat(['<li><label class="check-item"><input type="checkbox"><span>Mark what still feels uncertain</span></label></li>', '<li><label class="check-item"><input type="checkbox"><span>Write one question to revisit tomorrow</span></label></li>']).join('');
  document.querySelector('#questions').innerHTML = plan.questions.map((question) => `<li class="${activeCompleted[question.id] ? 'is-complete' : ''}"><label class="question-item"><input class="progress-checkbox" type="checkbox" data-progress-id="${question.id}" aria-label="Mark practice question complete" ${activeCompleted[question.id] ? 'checked' : ''}><span>${escapeHTML(question.text)}</span></label></li>`).join('');
  document.querySelectorAll('[data-progress-id]').forEach((control) => control.addEventListener('change', () => {
    activeCompleted[control.dataset.progressId] = control.checked;
    control.closest('.schedule-item, .questions li')?.classList.toggle('is-complete', control.checked);
    updateProgress();
  }));
  document.querySelectorAll('[data-focus-id]').forEach((button) => button.addEventListener('click', () => startFocus(button.dataset.focusId)));
  updateProgress();
  results.hidden = false;
  emptyPlan.hidden = true;
  if (!restore) results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  renderHistory();
}

function createPlan(input) {
  const plan = { id: `plan-${Date.now()}`, createdAt: new Date().toISOString(), subject: input.subject, notes: input.notes, topics: input.topics, minutes: input.minutes, examDate: input.examDate, mode: selectedMode };
  plan.daysRemaining = daysUntil(plan.examDate);
  plan.schedule = buildSchedule(plan.topics, plan.minutes, plan.mode);
  plan.questions = buildQuestions(plan.topics);
  return plan;
}

function normalizePlan(raw) {
  if (!raw || !raw.subject || !Array.isArray(raw.topics) || !raw.topics.length || !raw.examDate) return null;
  const mode = raw.mode === 'emergency' ? 'emergency' : 'normal';
  const minutes = Number(raw.minutes);
  if (!Number.isFinite(minutes) || minutes <= 0 || Number.isNaN(new Date(`${raw.examDate}T00:00:00`).getTime())) return null;
  const plan = { ...raw, id: raw.id || `plan-${Date.now()}`, createdAt: raw.createdAt || new Date().toISOString(), mode, minutes, daysRemaining: daysUntil(raw.examDate) };
  plan.schedule = Array.isArray(raw.schedule) && raw.schedule.length ? raw.schedule : buildSchedule(plan.topics, minutes, mode);
  plan.questions = Array.isArray(raw.questions) && raw.questions.length === 3 ? raw.questions : buildQuestions(plan.topics);
  return plan;
}

function renderHistory() {
  const history = getHistory();
  if (!history.length) {
    historyList.innerHTML = '<div class="history-empty"><span class="empty-icon">&#9711;</span><p>No previous plans yet. Your next generated plan will be saved here.</p></div>';
    return;
  }
  historyList.innerHTML = history.map((plan) => `<article class="history-card"><div><span class="history-subject">${escapeHTML(plan.subject)}</span><small>${escapeHTML(formatDate(plan.examDate))} exam &middot; ${escapeHTML(plan.mode === 'emergency' ? 'Emergency' : 'Normal')} mode</small></div><div class="history-actions"><button class="small-button" type="button" data-history-open="${escapeHTML(plan.id)}">Open</button><button class="small-button delete-button" type="button" data-history-delete="${escapeHTML(plan.id)}">Delete</button></div></article>`).join('');
  document.querySelectorAll('[data-history-open]').forEach((button) => button.addEventListener('click', () => {
    const plan = normalizePlan(getHistory().find((item) => item.id === button.dataset.historyOpen));
    if (plan) { selectedMode = plan.mode; updateModeButtons(); renderPlan(plan); }
  }));
  document.querySelectorAll('[data-history-delete]').forEach((button) => button.addEventListener('click', () => {
    const remaining = getHistory().filter((item) => item.id !== button.dataset.historyDelete);
    writeStoredValue(historyStorageKey, remaining);
    if (activePlan?.id === button.dataset.historyDelete) {
      activePlan = null;
      removeStoredValue(planStorageKey);
      results.hidden = true;
      emptyPlan.hidden = false;
    }
    renderHistory();
  }));
}

function updateModeButtons() {
  document.querySelectorAll('[data-mode]').forEach((button) => {
    const active = button.dataset.mode === selectedMode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function fillPreset(name) {
  const presets = {
    'three-days': { subject: 'My exam subject', notes: 'Topic one\nTopic two\nTopic three', hours: 2, days: 3, mode: 'normal' },
    tomorrow: { subject: 'My exam subject', notes: 'Topic one\nTopic two\nTopic three', hours: 2, days: 1, mode: 'emergency' },
    'two-hours': { subject: 'My exam subject', notes: 'Topic one\nTopic two\nTopic three', hours: 2, days: 7, mode: 'normal' },
    revision: { subject: 'My exam subject', notes: 'Topic to revise', hours: 0.5, days: 1, mode: 'emergency' }
  };
  const preset = presets[name];
  if (!preset) return;
  subjectInput.value = preset.subject;
  notesInput.value = preset.notes;
  hoursInput.value = preset.hours;
  examDateInput.value = datePlus(preset.days);
  selectedMode = preset.mode;
  updateModeButtons();
  clearValidation();
  results.hidden = true;
  emptyPlan.hidden = false;
  subjectInput.focus();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  clearValidation();
  const input = validateInput();
  if (!input) {
    results.hidden = true;
    emptyPlan.hidden = false;
    return;
  }
  renderPlan(createPlan(input), { save: true });
});

[subjectInput, notesInput, hoursInput, examDateInput].forEach((input) => input.addEventListener('input', clearValidation));
document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => { selectedMode = button.dataset.mode; updateModeButtons(); }));
document.querySelectorAll('[data-preset]').forEach((button) => button.addEventListener('click', () => fillPreset(button.dataset.preset)));

focusPauseButton.addEventListener('click', () => {
  focusPaused = !focusPaused;
  focusPauseButton.textContent = focusPaused ? 'Resume' : 'Pause';
});
focusFinishButton.addEventListener('click', completeFocusTask);
document.querySelector('#focus-close').addEventListener('click', closeFocusMode);

document.querySelector('#clear-history').addEventListener('click', () => {
  writeStoredValue(historyStorageKey, []);
  removeStoredValue(planStorageKey);
  removeStoredValue(progressStorageKey);
  activePlan = null;
  closeFocusMode();
  results.hidden = true;
  emptyPlan.hidden = false;
  renderHistory();
});

document.querySelector('#about-open').addEventListener('click', () => { document.querySelector('#about-modal').hidden = false; });
document.querySelector('#about-close').addEventListener('click', () => { document.querySelector('#about-modal').hidden = true; });
document.querySelector('#about-modal').addEventListener('click', (event) => { if (event.target.id === 'about-modal') event.currentTarget.hidden = true; });

const storedPlan = normalizePlan(readStoredValue(planStorageKey, readStoredValue('studysnap-plan-v1', null)));
if (storedPlan) {
  selectedMode = storedPlan.mode;
  updateModeButtons();
  renderPlan(storedPlan, { restore: true });
} else {
  results.hidden = true;
  emptyPlan.hidden = false;
}
renderHistory();
