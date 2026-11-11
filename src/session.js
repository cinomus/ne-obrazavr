import { assertQuestion, exampleKey, pastPrompt, questionKey } from "./question.js";

export const RUN_LENGTH = 10;

function tryMake(topic, ops) {
  try {
    const made = topic.make(ops);
    assertQuestion(made);
    if (topic.check) topic.check(made);
    return made;
  } catch {
    return null;
  }
}

const answerPools = new Map();

function shownAnswer(question) {
  return String(question?.answer ?? "");
}

// Distinct answers this trainer can deal. Sampling stops at the second one.
// A pool of one answer is left alone: neighboring cards may share it.
function answerPool(topic, ops) {
  const id = `${topic.id}|${ops?.join(",") || ""}`;
  const cached = answerPools.get(id);
  if (cached) return cached;
  const answers = new Set();
  const keys = new Set();
  let stagnant = 0;
  for (let attempt = 0; attempt < 500 && stagnant < 80 && answers.size < 2; attempt += 1) {
    const made = tryMake(topic, ops);
    if (!made) continue;
    answers.add(shownAnswer(made));
    const key = exampleKey(made);
    if (keys.has(key)) stagnant += 1;
    else {
      keys.add(key);
      stagnant = 0;
    }
  }
  answerPools.set(id, answers);
  return answers;
}

function canSeparateAnswers(topic, ops, avoidAnswer) {
  if (avoidAnswer == null) return false;
  const answers = answerPool(topic, ops);
  return answers.size > 1;
}

// Draw the next new card without putting one back. `used` is the current
// cycle. When every example the trainer can produce has already appeared,
// start a new cycle. A pool of one example starts that next cycle immediately.
// The next card also takes a different answer when the pool has more than one,
// unless the only examples still unused share the answer just shown.
function startCycle(topic, ops, avoid, prevKey, avoidAnswer) {
  const avoidText = avoidAnswer == null ? null : shownAnswer({ answer: avoidAnswer });
  const skipSame = canSeparateAnswers(topic, ops, avoidText);
  let sameExample = null;
  let fallback = null;
  let sameAnswerExample = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const made = tryMake(topic, ops);
    if (!made) continue;
    const key = exampleKey(made);
    fallback = { made, key };
    const answerOk = !skipSame || shownAnswer(made) !== avoidText;
    if (key !== avoid && answerOk) return { question: { ...made, isReplay: false }, used: [key] };
    if (key !== avoid && !sameAnswerExample) sameAnswerExample = { made, key };
    if (questionKey(made) !== prevKey) sameExample = { made, key };
  }
  const picked = sameAnswerExample || sameExample || fallback;
  if (!picked) {
    const made = { type: "number", tokens: ["2", "+", "2"], answer: "4" };
    return { question: { ...made, isReplay: false }, used: [exampleKey(made)] };
  }
  return { question: { ...picked.made, isReplay: false }, used: [picked.key] };
}

function drawQuestion(topic, ops, used, avoid, prevKey, avoidAnswer) {
  const seen = new Set(used);
  const avoidText = avoidAnswer == null ? null : shownAnswer({ answer: avoidAnswer });
  const skipSame = canSeparateAnswers(topic, ops, avoidText);
  let duplicates = 0;
  let sameAnswerUnused = null;
  for (let attempt = 0; attempt < 1500 && duplicates < 120; attempt += 1) {
    const made = tryMake(topic, ops);
    if (!made) continue;
    const key = exampleKey(made);
    if (!seen.has(key)) {
      if (skipSame && shownAnswer(made) === avoidText) {
        if (!sameAnswerUnused) sameAnswerUnused = { question: { ...made, isReplay: false }, used: [...used, key] };
        continue;
      }
      return { question: { ...made, isReplay: false }, used: [...used, key] };
    }
    duplicates += 1;
  }
  if (sameAnswerUnused) return sameAnswerUnused;
  return startCycle(topic, ops, avoid, prevKey, avoidText);
}

function pushPast(state, kind, user = "") {
  const item = {
    id: Math.random().toString(36).slice(2),
    kind,
    prompt: pastPrompt(state.question),
    answer: state.question.type === "steps"
      ? `${state.question.result}${state.question.work?.remainder ? ` ост. ${state.question.work.remainder}` : ""}`
      : state.question.answer,
    user,
  };
  return [item, ...state.past].slice(0, 4);
}

function queueReplay(state) {
  // A missed card stays on screen until it is resolved. It is not dealt again
  // later in the run: the draw already consumed that example.
  return state.queue;
}

function serve(state, question, primaryDone, queue, used = state.used) {
  const now = state.now || 0;
  const clock = state.clock
    ? { ...state.clock, exampleDeadline: now + state.clock.exampleMs, barStopped: false }
    : null;
  return {
    ...state,
    question,
    queue,
    used,
    clock,
    now,
    attemptStartedAt: state.clock ? now : state.attemptStartedAt,
    input: "",
    flashValue: "",
    phase: "answer",
    primaryDone,
    requeued: false,
    attempted: false,
    tried: [],
    step: 0,
    prevKey: questionKey(question),
    pictureHint: "",
    pictureRedo: false,
    showSolution: false,
    hintText: "",
  };
}

function advance(state, topic, ops) {
  const primaryDone = state.question.isReplay ? state.primaryDone : state.primaryDone + 1;
  const queue = state.queue.map((item) => ({ ...item, wait: item.wait - 1 }));
  const dueIndex = queue.findIndex((item) => item.wait <= 0);
  if (dueIndex >= 0) {
    const due = queue[dueIndex];
    return serve(state, due.question, primaryDone, queue.filter((_, index) => index !== dueIndex));
  }
  if (!state.clock && primaryDone >= RUN_LENGTH) {
    if (queue.length) {
      const due = queue[0];
      return serve(state, due.question, primaryDone, queue.slice(1));
    }
    return {
      ...state,
      queue,
      phase: "done",
      primaryDone,
      input: "",
      flashValue: "",
      tried: [],
    };
  }
  const drawn = drawQuestion(topic, ops, state.used || [], exampleKey(state.question), state.prevKey, state.question.answer);
  return serve(state, drawn.question, primaryDone, queue, drawn.used);
}

function applyCorrect(state, now) {
  const timed = Boolean(state.clock);
  const counts = timed ? !state.question.isReplay : !state.attempted && !state.question.isReplay;
  const gain = counts ? state.stats.multiplier : 0;
  const streak = counts ? state.stats.streak + 1 : state.stats.streak;
  const step = timed ? 3 : 5;
  const answers = timed && counts
    ? [...(state.answers || []), { ok: true, ms: Math.max(0, now - (state.attemptStartedAt || 0)) }]
    : state.answers;
  return {
    ...state,
    answers,
    now,
    past: !state.attempted ? pushPast(state, "ok") : state.past,
    status: { kind: "ok", text: "Верно!" },
    stats: {
      ...state.stats,
      xp: state.stats.xp + gain,
      firstCorrect: state.stats.firstCorrect + (counts ? 1 : 0),
      streak,
      multiplier: counts ? 1 + Math.floor(streak / step) : state.stats.multiplier,
    },
  };
}

function timesWord(n) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return "раз";
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return "раза";
  return "раз";
}

function pictureHint(question, typed) {
  const picture = question.picture;
  if (!picture || !typed) return "";
  const eachLen = picture.entry[0].length;
  const groupsLen = picture.entry[1].length;
  const each = Number(typed.slice(0, eachLen));
  const groups = Number(typed.slice(eachLen, eachLen + groupsLen));
  const total = Number(typed.slice(eachLen + groupsLen));
  if (each === picture.groups && groups === picture.each && picture.each !== picture.groups) {
    return `Первым пишут, сколько ${picture.one}: по ${picture.each} взяли ${picture.groups} ${timesWord(picture.groups)}`;
  }
  const badEach = each !== picture.each;
  const badGroups = groups !== picture.groups;
  if (badEach && badGroups) return `Сначала — сколько ${picture.one}, потом — сколько всего ${picture.forms[2]}`;
  if (badEach) return `Первое число — сколько ${picture.many} ${picture.one}`;
  if (badGroups) return `Второе число — сколько всего ${picture.forms[2]}`;
  if (total !== picture.each * picture.groups) return `Сложите: ${picture.sum.split(" = ")[0]}`;
  return "";
}

function markWrong(state, value, now) {
  const first = !state.attempted;
  const keepPicture = Boolean(state.question.picture && value);
  const stamped = now ?? state.now ?? 0;
  const answers = state.clock && first
    ? [...(state.answers || []), { ok: false, ms: Math.max(0, stamped - (state.attemptStartedAt || 0)) }]
    : state.answers;
  return {
    ...state,
    answers,
    now: stamped,
    queue: queueReplay(state),
    past: first ? pushPast(state, "bad", value) : state.past,
    input: keepPicture ? value : "",
    pictureHint: keepPicture ? pictureHint(state.question, value) : "",
    pictureRedo: keepPicture,
    flashValue: value || "",
    phase: "flash",
    attempted: true,
    tried: value ? [...state.tried, value] : state.tried,
    status: null,
    stats: {
      ...state.stats,
      wrong: state.stats.wrong + 1,
      streak: 0,
      multiplier: 1,
    },
  };
}

function expectedDigits(question) {
  if (question.picture?.entry) return question.picture.entry.join("");
  if (question.entry) return question.entry.join("");
  return question.answer;
}

function typeStep(state, digit) {
  const index = state.step || 0;
  const cell = state.question.steps[index];
  const next = `${state.input || ""}${digit}`.replace(/\D/g, "").slice(0, cell.value.length);
  if (next.length < cell.value.length) return { ...state, input: next, step: index, flashValue: "" };
  if (next === cell.value) {
    if (index + 1 >= state.question.steps.length) return { correct: true, state: { ...state, input: "", step: index, flashValue: "" } };
    return { ...state, input: "", step: index + 1, flashValue: "", status: null };
  }
  return { wrong: true, state: { ...state, step: index }, value: next };
}

function typeDigit(state, digit) {
  if (state.phase !== "answer") return state;
  if (state.question.picture && state.pictureRedo) {
    state = { ...state, input: "", pictureRedo: false, pictureHint: "" };
  }
  if (state.question.type === "steps") return typeStep(state, digit);
  if (state.question.type === "commit") {
    const next = `${state.input || ""}${digit}`.replace(/\D/g, "").slice(0, 8);
    return { ...state, input: next, status: null };
  }
  const kind = state.question.type;
  if (kind !== "number" && kind !== "column") return state;
  const expected = expectedDigits(state.question);
  if (digit === "0" && state.input === "" && expected !== "0") return state;
  const cap = state.question.check ? expected.length : 8;
  const next = (state.input + digit).replace(/\D/g, "").slice(0, Math.min(8, cap));
  if (/^0\d/.test(next)) return state;
  if (next.length < expected.length || state.question.check) {
    return { ...state, input: next, status: null };
  }
  if (next === expected) return { correct: true, state };
  return { wrong: true, state, value: next };
}

function choose(state, value) {
  if (state.phase !== "answer") return state;
  if (value === state.question.answer) return { correct: true, state };
  return { wrong: true, state, value };
}

export function initSession(topic, ops, clock) {
  const drawn = drawQuestion(topic, ops, [], "", "");
  const question = drawn.question;
  const now = clock?.now ?? 0;
  const exampleMs = Math.max(1, Number(clock?.exampleSeconds) || 0) * 1000;
  const totalMs = Math.max(1, Number(clock?.totalSeconds) || 0) * 1000;
  return {
    question,
    input: "",
    phase: "answer",
    flashValue: "",
    status: null,
    past: [],
    primaryDone: 0,
    queue: [],
    used: drawn.used,
    requeued: false,
    attempted: false,
    step: 0,
    tried: [],
    prevKey: questionKey(question),
    pictureHint: "",
    pictureRedo: false,
    showSolution: false,
    hintText: "",
    now,
    attemptStartedAt: now,
    answers: [],
    clock: clock
      ? { exampleMs, totalMs, exampleDeadline: now + exampleMs, runDeadline: now + totalMs, barStopped: false }
      : null,
    stats: { xp: 0, firstCorrect: 0, wrong: 0, streak: 0, multiplier: 1 },
  };
}

export function exampleBarPercent(clock, now) {
  if (!clock?.exampleMs) return 0;
  if (clock.barStopped) return 0;
  const left = Math.max(0, clock.exampleDeadline - now);
  return Math.max(0, Math.min(100, (left / clock.exampleMs) * 100));
}

export function timedReport(state) {
  const answers = state.answers || [];
  const correct = answers.filter((item) => item.ok).length;
  const averageMs = answers.length ? answers.reduce((sum, item) => sum + item.ms, 0) / answers.length : 0;
  return { points: state.stats?.xp || 0, correct, given: answers.length, averageMs };
}

function finishTimed(state) {
  return {
    ...state,
    phase: "done",
    input: "",
    flashValue: "",
    showSolution: false,
    hintText: "",
    status: null,
  };
}

function expireExample(state, now) {
  return {
    ...state,
    now,
    phase: "answer",
    input: "",
    flashValue: "",
    pictureRedo: false,
    pictureHint: "",
    showSolution: false,
    hintText: "",
    status: { kind: "time", text: "Время вышло" },
    attemptStartedAt: now,
    clock: { ...state.clock, barStopped: true },
    stats: { ...state.stats, streak: 0, multiplier: 1 },
  };
}

export function reduceSession(state, action, topic, ops) {
  const now = action.now ?? state.now ?? 0;
  if (action.now != null) state = { ...state, now };
  if (action.type === "tick-clock") {
    if (!state.clock || state.phase === "done") return state;
    if (now >= state.clock.runDeadline) return finishTimed({ ...state, now });
    if ((state.phase === "answer" || state.phase === "flash") && !state.clock.barStopped && now >= state.clock.exampleDeadline) {
      return expireExample(state, now);
    }
    return { ...state, now };
  }
  if (state.clock && state.phase !== "done" && now >= state.clock.runDeadline) {
    return finishTimed({ ...state, now });
  }
  if (action.type === "tick-flash") {
    if (state.phase !== "flash") return state;
    return {
      ...state,
      phase: "answer",
      flashValue: "",
      input: state.pictureRedo ? state.input : "",
      attemptStartedAt: state.clock ? now : state.attemptStartedAt,
      now,
    };
  }
  if (action.type === "tick-reveal") {
    if (state.phase !== "reveal") return state;
    return advance(state, topic, ops);
  }
  if (action.type === "next") {
    if (state.phase === "done") return state;
    if (state.phase !== "reveal" && !state.showSolution) return state;
    let current = state;
    if (state.phase === "answer" && !state.attempted) {
      current = {
        ...state,
        answers: state.clock
          ? [...(state.answers || []), { ok: false, ms: Math.max(0, now - (state.attemptStartedAt || 0)) }]
          : state.answers,
        queue: queueReplay(state),
        attempted: true,
        past: pushPast(state, "skip"),
        stats: {
          ...state.stats,
          wrong: state.stats.wrong + 1,
          streak: 0,
          multiplier: 1,
        },
      };
    }
    return advance(current, topic, ops);
  }
  if (action.type === "explain") {
    if (!state.question?.solution || state.phase === "done") return state;
    return { ...state, showSolution: true, hintText: "" };
  }
  if (action.type === "hint") {
    const text = action.kind === "rule" ? state.question.rule : state.question.help;
    if (!text || state.phase === "done") return state;
    return { ...state, hintText: text, showSolution: false };
  }
  if (action.type === "reveal") {
    if (state.phase !== "answer") return state;
    const first = !state.attempted;
    return {
      ...state,
      answers: state.clock && first
        ? [...(state.answers || []), { ok: false, ms: Math.max(0, now - (state.attemptStartedAt || 0)) }]
        : state.answers,
      queue: queueReplay(state),
      phase: "reveal",
      showSolution: false,
      hintText: "",
      attempted: true,
      status: { kind: "show", text: "Правильный ответ" },
      pictureHint: state.question.picture?.sum || "",
      input: state.question.picture ? state.question.picture.entry.join("") : state.input,
      past: first ? pushPast(state, "skip") : state.past,
      stats: {
        ...state.stats,
        wrong: state.stats.wrong + (first ? 1 : 0),
        streak: 0,
        multiplier: 1,
      },
    };
  }
  if (action.type === "back") {
    if (state.phase !== "answer") return state;
    if (state.question.type !== "number" && state.question.type !== "column" && state.question.type !== "steps" && state.question.type !== "commit") return state;
    return { ...state, input: state.input.slice(0, -1), flashValue: "", pictureRedo: false, pictureHint: state.question.picture ? "" : state.pictureHint };
  }
  if (action.type === "clear") {
    if (state.phase !== "answer") return state;
    if (state.question.type !== "number" && state.question.type !== "column" && state.question.type !== "steps" && state.question.type !== "commit") return state;
    return { ...state, input: "", flashValue: "" };
  }
  if (action.type === "nudge") {
    if (state.phase !== "answer" || state.question.type !== "commit") return state;
    const base = Number(state.input || state.question.scene?.shown || 0);
    const next = Math.max(0, base + (action.delta || 0));
    return { ...state, input: String(next), status: null };
  }
  if (action.type === "scale") {
    if (state.phase !== "answer" || state.question.type !== "commit" || !state.input) return state;
    const next = String(Number(state.input) * action.factor);
    if (next.length > 8) return state;
    return { ...state, input: next, status: null };
  }
  if (action.type === "commit") {
    if (state.phase !== "answer") return state;
    if (state.question.type === "number" && state.question.check) {
      if (state.input === expectedDigits(state.question)) return advance(applyCorrect(state, now), topic, ops);
      return markWrong(state, state.input, now);
    }
    if (state.question.type !== "commit") return state;
    if (state.input === state.question.answer) return advance(applyCorrect(state, now), topic, ops);
    return markWrong(state, state.input, now);
  }
  if (action.type === "build-check") {
    if (state.phase !== "answer" || state.question.type !== "build") return state;
    const { total, blue, orange } = state.question.scene;
    const ok = action.blue >= 1 && action.orange >= 1 && action.blue + action.orange === total && (action.blue !== blue || action.orange !== orange);
    if (ok) return advance(applyCorrect(state, now), topic, ops);
    return markWrong(state, `${action.blue}+${action.orange}`, now);
  }
  if (action.type === "select-check") {
    if (state.phase !== "answer" || state.question.type !== "select") return state;
    const raw = [...new Set((action.ids || []).filter(Boolean))];
    const scene = state.question.scene || {};
    const shareIds = raw.filter((id) => /^\d+$/.test(id) && Number(id) < scene.parts);
    const share = scene.kind === "share" && shareIds.length === scene.need;
    const frame = scene.kind === "frame" && raw.length === scene.need && raw.every((id) => /^\d+$/.test(id) && Number(id) < scene.have);
    const ordered = scene.kind === "sort" || scene.kind === "ops" || scene.kind === "dict";
    const sequence = (action.ids || []).join("|") === state.question.answer;
    const exact = raw.slice().sort().join("|") === state.question.answer.split("|").filter(Boolean).sort().join("|");
    if (share || frame || (ordered ? sequence : exact)) return advance(applyCorrect(state, now), topic, ops);
    return markWrong(state, raw.join("|"), now);
  }
  if (action.type === "paint-check") {
    if (state.phase !== "answer" || state.question.type !== "paint") return state;
    const got = [...action.cells].map((cell) => cell.join(":")).sort().join("|");
    if (got === state.question.answer) return advance(applyCorrect({ ...state, badPaint: [] }, now), topic, ops);
    const needed = new Set((state.question.answer || "").split("|").filter(Boolean));
    const extras = action.cells.filter((cell) => !needed.has(cell.join(":")));
    return markWrong({ ...state, badPaint: extras }, got, now);
  }

  let result = state;
  if (action.type === "digit") result = typeDigit(state, action.digit);
  if (action.type === "choice") result = choose(state, action.value);
  if (action.type === "key") {
    const key = action.key;
    if (key === " " || key === "Spacebar") {
      return reduceSession(state, { type: "reveal" }, topic, ops);
    }
    if (state.question.type === "compare" && (key === "<" || key === ">" || key === "=")) {
      result = choose(state, key);
    } else if (state.question.type === "choice" && /^[1-9]$/.test(key)) {
      const option = state.question.choices[Number(key) - 1];
      result = option ? choose(state, option) : state;
    } else if (/^[0-9]$/.test(key)) {
      result = typeDigit(state, key);
    }
  }

  if (result?.correct) {
    const held = ["number", "column", "steps", "compare", "choice"].includes(result.state.question.type);
    if (held || result.state.question.picture || result.state.question.scene?.kind === "story") {
      const picture = result.state.question.picture;
      return {
        ...applyCorrect(result.state, now),
        phase: "reveal",
        showSolution: false,
        hintText: "",
        input: picture ? picture.entry.join("") : result.state.question.answer,
        pictureHint: picture?.sum || "",
        pictureRedo: false,
      };
    }
    return advance(applyCorrect(result.state, now), topic, ops);
  }
  if (result?.wrong) return markWrong(result.state, result.value, now);
  return result;
}
