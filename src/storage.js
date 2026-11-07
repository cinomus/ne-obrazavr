const STAR_KEY = "ne-obrazavr-stars";
const SCORE_KEY = "ne-obrazavr-scores";
const RECORD_KEY = "ne-obrazavr-records";
const SOUND_KEY = "ne-obrazavr-sound";
const KEYPAD_KEY = "ne-obrazavr-keypad";

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

export function starId(grade, topicId) {
  return `${grade}:${topicId}`;
}

export function readStars() {
  return readJson(STAR_KEY);
}

export function starsFor(firstCorrect, total) {
  if (!total) return 0;
  const ratio = firstCorrect / total;
  if (ratio >= 0.95) return 3;
  if (ratio >= 0.75) return 2;
  if (ratio >= 0.45) return 1;
  return 0;
}

export function rememberStars(grade, topicId, earned) {
  const all = readStars();
  const id = starId(grade, topicId);
  const prev = all[id] || 0;
  const next = Math.max(prev, earned);
  all[id] = next;
  localStorage.setItem(STAR_KEY, JSON.stringify(all));
  return { prev, next, earned };
}

export function readScores() {
  return readJson(SCORE_KEY);
}

export function rememberScore(grade, topicId, firstCorrect) {
  const all = readScores();
  const id = starId(grade, topicId);
  const prev = all[id] || 0;
  const next = Math.max(prev, firstCorrect);
  all[id] = next;
  localStorage.setItem(SCORE_KEY, JSON.stringify(all));
  return next;
}

export function shownRecord(saved, xp) {
  return Math.max(Number(saved) || 0, Number(xp) || 0);
}

export function readRecords() {
  return readJson(RECORD_KEY);
}

export function rememberRecord(grade, topicId, xp) {
  const all = readRecords();
  const id = starId(grade, topicId);
  const prev = all[id] || 0;
  const next = Math.max(prev, xp);
  all[id] = next;
  localStorage.setItem(RECORD_KEY, JSON.stringify(all));
  return { prev, next };
}

export function soundEnabled() {
  return localStorage.getItem(SOUND_KEY) !== "0";
}

export function setSoundEnabled(on) {
  localStorage.setItem(SOUND_KEY, on ? "1" : "0");
}

export function keypadPreferred() {
  return localStorage.getItem(KEYPAD_KEY) !== "0";
}

export function setKeypadPreferred(on) {
  localStorage.setItem(KEYPAD_KEY, on ? "1" : "0");
}
