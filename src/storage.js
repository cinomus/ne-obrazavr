import { RUN_LENGTH } from "./session.js";

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

// A saved score is the best correct count together with how many answers
// that run actually contained. A bare number up to the set size is an older
// untimed result. A bare number past that size has no honest denominator.
export function scoreParts(saved) {
  if (saved && typeof saved === "object") {
    const correct = Math.max(0, Math.round(Number(saved.correct) || 0));
    const total = Math.max(correct, Math.round(Number(saved.total) || 0));
    return { correct, total };
  }
  const correct = Math.max(0, Math.round(Number(saved) || 0));
  if (correct <= RUN_LENGTH) return { correct, total: RUN_LENGTH };
  return { correct, total: null };
}

function betterScore(prev, next) {
  if (!prev) return true;
  if (prev.total == null && next.total != null) return true;
  if (next.total == null) return false;
  if (next.correct !== prev.correct) return next.correct > prev.correct;
  return next.total < prev.total;
}

export function rememberScore(grade, topicId, correct, total) {
  const all = readScores();
  const id = starId(grade, topicId);
  const prev = id in all ? scoreParts(all[id]) : null;
  const next = scoreParts({ correct, total });
  const chosen = betterScore(prev, next) ? next : prev;
  all[id] = chosen.total == null ? chosen.correct : { correct: chosen.correct, total: chosen.total };
  localStorage.setItem(SCORE_KEY, JSON.stringify(all));
  return scoreParts(all[id]);
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
