import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as esbuild from "esbuild";
import { pathToFileURL } from "node:url";
import { everyTopic, GRADES } from "../src/curriculum.js";
import { LIVE_CARDS } from "./live-cards.js";
import { assertQuestion, evalTokens, exampleKey, questionKey } from "../src/question.js";
import { exampleBarPercent, initSession, reduceSession, RUN_LENGTH, timedReport } from "../src/session.js";
import { rememberRecord, readRecords } from "../src/storage.js";

const SAMPLES = 8;

function computedAnswer(question) {
  if (question.type === "number" && question.tokens?.length) return String(evalTokens(question.tokens));
  if (question.type === "number" && question.expect != null) return String(question.expect);
  if (question.type === "column") {
    const { a, b, op } = question.column;
    const value = op === "+" ? a + b : a - b;
    return String(value);
  }
  if (question.type === "compare") {
    return question.left < question.right ? "<" : question.left > question.right ? ">" : "=";
  }
  if (question.type === "choice" || question.type === "steps" || question.type === "paint" || question.type === "commit" || question.type === "select" || question.type === "build") return question.answer;
  throw new Error(`нечем проверить ${question.type}`);
}

function wrongValue(question) {
  if (question.type === "compare") return ["<", ">", "="].find((sign) => sign !== question.answer);
  if (question.type === "choice") return question.choices.find((option) => option !== question.answer);
  const digits = question.answer.split("");
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    const next = digits[index] === "9" ? "8" : String(Number(digits[index]) + 1);
    const candidate = `${digits.slice(0, index).join("")}${next}${digits.slice(index + 1).join("")}`;
    if (candidate !== question.answer && /^(0|[1-9]\d*)$/.test(candidate)) return candidate;
  }
  return question.answer === "0" ? "1" : "0";
}

function entryDigits(question) {
  if (question.picture?.entry) return question.picture.entry.join("");
  if (question.entry) return question.entry.join("");
  return question.answer;
}

function digitsToType(state) {
  if (state.question.type === "steps") {
    return state.question.steps.slice(state.step || 0).map((step) => step.value).join("");
  }
  return entryDigits(state.question);
}

function submit(state, topic, ops, value) {
  if (state.phase === "flash") state = reduceSession(state, { type: "tick-flash" }, topic, ops);
  if (state.question.type === "paint") {
    const cells = value === state.question.answer ? state.question.needed : [[99, 99]];
    return reduceSession(state, { type: "paint-check", cells }, topic, ops);
  }
  if (state.question.type === "build") {
    const source = value === state.question.answer ? value : "0+0";
    const [blue, orange] = source.split("+").map(Number);
    return reduceSession(state, { type: "build-check", blue: blue || 0, orange: orange || 0 }, topic, ops);
  }
  if (state.question.type === "select") {
    const ids = value === state.question.answer ? state.question.answer.split("|").filter(Boolean) : ["miss"];
    return reduceSession(state, { type: "select-check", ids }, topic, ops);
  }
  if (state.question.type === "commit") {
    let next = state;
    for (const digit of String(value)) {
      if (!/^\d$/.test(digit)) break;
      next = reduceSession(next, { type: "digit", digit }, topic, ops);
    }
    return reduceSession(next, { type: "commit" }, topic, ops);
  }
  if (state.question.type === "number" || state.question.type === "column" || state.question.type === "steps") {
    let next = state;
    for (const digit of String(value)) {
      const before = next.stats.wrong;
      next = reduceSession(next, { type: "digit", digit }, topic, ops);
      if (next.stats.wrong > before) break;
    }
    if (next.phase === "reveal") next = reduceSession(next, { type: "tick-reveal" }, topic, ops);
    if (state.question.check && next.phase === "answer") {
      next = reduceSession(next, { type: "commit" }, topic, ops);
    }
    return next;
  }
  let chosen = reduceSession(state, { type: "choice", value }, topic, ops);
  if (chosen.phase === "flash") chosen = reduceSession(chosen, { type: "tick-flash" }, topic, ops);
  if (chosen.phase === "reveal") chosen = reduceSession(chosen, { type: "tick-reveal" }, topic, ops);
  return chosen;
}

test("в каждом классе есть темы, и счётчики совпадают с живым списком", () => {
  assert.deepEqual(
    GRADES.map((grade) => grade.chapters.reduce((sum, chapter) => sum + chapter.topics.length, 0)),
    [83, 77, 103, 137],
  );
  const ids = new Set();
  for (const grade of GRADES) {
    for (const chapter of grade.chapters) {
      assert.ok(chapter.title.trim(), "пустой раздел");
      for (const topic of chapter.topics) {
        const key = `${grade.id}:${topic.id}`;
        assert.equal(ids.has(key), false, `повтор id ${key}`);
        ids.add(key);
        assert.equal(typeof topic.make, "function");
        assert.ok(topic.title.trim());
      }
    }
  }
});

test("каждая тема даёт верный пример, а неверный ответ не принимается", () => {
  const seen = new Set();
  const failures = [];
  for (const item of everyTopic()) {
    const { topic } = item;
    const ops = topic.setup?.ops;
    for (let sample = 0; sample < SAMPLES; sample += 1) {
      let question;
      try {
        question = topic.make(ops);
        assertQuestion(question);
        assert.equal(computedAnswer(question), question.answer, "вычисленный ответ");
        if (question.type === "number" || question.type === "column") {
          assert.ok(question.answer.length <= 8, "ответ длиннее поля ввода");
        }
        seen.add(question.type);
        if (question.type === "choice") assert.ok(question.choices.includes(question.answer));
      } catch (error) {
        failures.push(`${item.grade} ${topic.title}: ${error.message}`);
        break;
      }
      try {
        const state = initSession(topic, ops);
        assertQuestion(state.question);
        assert.equal(computedAnswer(state.question), state.question.answer);
        const wrong = wrongValue({ ...state.question, answer: entryDigits(state.question) });
        assert.notEqual(wrong, entryDigits(state.question));
        const missed = submit(state, topic, ops, wrong);
        assert.equal(missed.stats.wrong, 1, "ошибка не засчитана");
        assert.equal(missed.stats.firstCorrect, 0, "ошибка засчитана как верный ответ");
        assert.notEqual(missed.status?.text, "Верно!");
        assert.equal(missed.past[0]?.kind, "bad");
        if (["steps", "paint", "build", "select"].includes(state.question.type)) {
          assert.notEqual(missed.past[0]?.user, state.question.answer);
        } else {
          assert.equal(missed.past[0]?.user, wrong);
        }
        assert.equal(questionKey(missed.question), questionKey(state.question), "ошибка должна остаться на том же примере");
        const retried = submit(missed, topic, ops, digitsToType(missed));
        assert.equal(retried.stats.firstCorrect, 0, "повтор на том же примере не должен давать очко");
        assert.notEqual(questionKey(retried.question), questionKey(state.question));
        const solved = submit(retried, topic, ops, digitsToType(retried));
        assert.equal(solved.stats.firstCorrect, 1);
        assert.match(solved.status?.text || "", /Верно/);
      } catch (error) {
        failures.push(`${item.grade} ${topic.title} / ответ: ${error.message}`);
        break;
      }
    }
  }
  assert.deepEqual(failures, []);
  for (const type of ["number", "steps", "compare", "choice"]) {
    assert.ok(seen.has(type), `нет вопросов типа ${type}`);
  }
});

test("свой набор принимает выбранные действия и отбрасывает чужой ответ", () => {
  const customs = everyTopic().filter((item) => item.topic.setup);
  assert.equal(customs.length, 4);
  for (const item of customs) {
    const { topic } = item;
    for (const op of topic.setup.ops) assert.ok(topic.setup.labels[op], op);
    for (const op of topic.setup.ops) {
      for (let sample = 0; sample < 6; sample += 1) {
        const question = topic.make([op]);
        assertQuestion(question);
        assert.equal(computedAnswer(question), question.answer);
        if (question.tokens?.length) assert.ok(question.tokens.includes(op), `${topic.title} без «${op}»`);
      }
    }
    let state = initSession(topic, ["+"]);
    const started = questionKey(state.question);
    const wrong = wrongValue(state.question);
    state = submit(state, topic, ["+"], wrong);
    assert.equal(state.stats.firstCorrect, 0);
    assert.equal(state.stats.wrong, 1);
    assert.equal(questionKey(state.question), started);
    state = submit(state, topic, ["+"], digitsToType(state));
    assert.equal(state.stats.firstCorrect, 0);
    state = submit(state, topic, ["+"], digitsToType(state));
    assert.equal(state.stats.firstCorrect, 1);
  }
});

test("десять верных ответов заканчивают тренировку, а короткий ввод не считается ответом", () => {
  const topic = everyTopic().find((item) => item.topic.id.includes("slozhenie-v-predelah-10")).topic;
  let state = initSession(topic);
  assert.equal(state.question.answer.length > 0, true);
  if (state.question.answer.length > 1) {
    const partial = reduceSession(state, { type: "digit", digit: state.question.answer[0] }, topic);
    assert.equal(partial.phase, "answer");
    assert.equal(partial.stats.firstCorrect, 0);
    assert.equal(partial.input, state.question.answer[0]);
  }
  for (let step = 0; step < RUN_LENGTH; step += 1) {
    assert.equal(state.phase, "answer");
    state = submit(state, topic, undefined, state.question.answer);
  }
  assert.equal(state.phase, "done");
  assert.equal(state.stats.firstCorrect, RUN_LENGTH);
  assert.equal(state.stats.wrong, 0);
});

test("умножение по рисунку считает группы предметов, а не текст", () => {
  const topics = everyTopic().filter((item) => item.topic.title.includes("по рисунку"));
  assert.deepEqual(
    topics.map((item) => item.grade),
    [2, 3],
  );
  for (const item of topics) {
    for (let sample = 0; sample < 16; sample += 1) {
      const question = item.topic.make();
      assertQuestion(question);
      const { groups, each, kind } = question.picture;
      assert.equal(groups * each, Number(question.answer));
      assert.deepEqual(question.picture.entry, [String(each), String(groups), String(question.answer)]);
      assert.ok(kind === "apple" || kind === "star" || kind === "cube");
      assert.match(question.prompt, /^Сколько всего /);
      assert.ok(question.picture.sum.endsWith(`= ${question.answer}`));
      assert.equal(question.tokens.length, 0);
    }
    const state = initSession(item.topic);
    assert.equal(
      state.question.picture.groups * state.question.picture.each,
      Number(state.question.answer),
    );
    const typed = entryDigits(state.question);
    const missed = submit(state, item.topic, undefined, wrongValue({ ...state.question, answer: typed }));
    assert.equal(missed.stats.wrong, 1);
    assert.equal(missed.stats.firstCorrect, 0);
    assert.equal(questionKey(missed.question), questionKey(state.question));
    const retried = submit(missed, item.topic, undefined, digitsToType(missed));
    assert.equal(retried.stats.firstCorrect, 0);
    const solved = submit(retried, item.topic, undefined, digitsToType(retried));
    assert.equal(solved.stats.firstCorrect, 1);
  }
});

function topicNamed(grade, title) {
  const item = everyTopic().find((entry) => entry.grade === grade && entry.topic.title === title);
  assert.ok(item, `${grade}. ${title}`);
  return item.topic;
}

function freshState(topic, question) {
  return { ...initSession(topic), question, input: "", phase: "answer", showSolution: false };
}

let numericQuestion;
async function NumericQuestion() {
  if (!numericQuestion) {
    const outfile = new URL("../node_modules/.cache/ne-obrazavr-trainer-view.mjs", import.meta.url);
    esbuild.buildSync({
      absWorkingDir: new URL("..", import.meta.url).pathname,
      stdin: {
        contents: `export { NumericQuestion } from "./src/components/Trainer.jsx";`,
        resolveDir: new URL("..", import.meta.url).pathname,
        loader: "js",
      },
      bundle: true,
      format: "esm",
      platform: "node",
      jsx: "automatic",
      external: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
      outfile: outfile.pathname,
      logLevel: "silent",
    });
    numericQuestion = (await import(pathToFileURL(outfile.pathname).href)).NumericQuestion;
  }
  return numericQuestion;
}

function draw(View, state) {
  return renderToStaticMarkup(createElement(View, { state, dispatch() {} }));
}

function schemeLabels(html) {
  return [...html.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((match) => match[1]);
}

test("схема вычитания прячет неизвестное до решения и показывает его после", async () => {
  const topic = topicNamed(2, "Неизвестное уменьшаемое и вычитаемое – задачи");
  let question;
  for (let sample = 0; sample < 40 && !question; sample += 1) {
    const next = topic.make();
    const scene = next.scene || {};
    if (scene.mode === "leave" && scene.unknown === "b" && scene.top != null && Number(next.answer) !== Number(scene.a)) question = next;
  }
  assert.ok(question, "нет задачи, где неизвестно, сколько ушло");
  const View = await NumericQuestion();
  const open = { ...question, inlineScheme: true };
  const hidden = draw(View, freshState(topic, open));
  assert.deepEqual(schemeLabels(hidden), [String(question.scene.top), String(question.scene.a), "?"]);
  const explained = reduceSession(freshState(topic, open), { type: "explain" }, topic);
  const shown = draw(View, explained);
  assert.deepEqual(schemeLabels(shown), [String(question.scene.top), String(question.scene.a), String(question.answer)]);
});

test("«Показать решение» называет числа, действие и уравнение, а «Не знаю» только подставляет ответ", async () => {
  const topic = topicNamed(2, "Неизвестное уменьшаемое и вычитаемое – задачи");
  let question;
  for (let sample = 0; sample < 40 && !question; sample += 1) {
    const next = topic.make();
    if (next.scene?.mode === "leave" && next.scene?.unknown === "b" && next.scene?.top != null) question = next;
  }
  assert.ok(question);
  const View = await NumericQuestion();
  const start = freshState(topic, question);
  const explained = reduceSession(start, { type: "explain" }, topic);
  assert.equal(explained.phase, "answer");
  assert.equal(explained.showSolution, true);
  assert.equal(explained.input, "");
  const solution = draw(View, explained);
  const { top, a } = question.scene;
  assert.match(solution, new RegExp(`Было ${top}, осталось ${a}`));
  assert.match(solution, /вычитаем/);
  assert.match(solution, new RegExp(`${top} − ${a} = ${question.answer}`));
  assert.match(solution, new RegExp(`<li class="solution-answer"><strong>Ответ: ${question.answer}[^<]*</strong></li>`));
  assert.match(readFileSync(new URL("../src/styles.css", import.meta.url), "utf8"), /\.solution li\.solution-answer\s*\{[^}]*font-weight:\s*800/);
  const revealed = reduceSession(start, { type: "reveal" }, topic);
  assert.equal(revealed.phase, "reveal");
  assert.equal(revealed.showSolution, false);
  const filled = draw(View, revealed);
  assert.equal(filled.includes("solution-answer"), false);
  assert.equal(filled.includes("Решение"), false);
  assert.match(filled, new RegExp(`class="blank\\s+is-show">${question.answer}<`));
});

test("кнопка «Прослушать задачу» остаётся в карточке и скрыта", async () => {
  const topic = topicNamed(2, "Неизвестное уменьшаемое и вычитаемое – задачи");
  const View = await NumericQuestion();
  const html = draw(View, freshState(topic, topic.make()));
  assert.match(html, /<button type="button" class="btn secondary is-hidden"[^>]*>Прослушать задачу<\/button>/);
  assert.match(readFileSync(new URL("../src/styles.css", import.meta.url), "utf8"), /\.btn\.is-hidden\s*\{[^}]*display:\s*none/);
});

test("во 2 и 3 классе задачи до 100 всегда про «на N больше» или «на N меньше»", () => {
  const titles = [
    "Задачи на сложение и вычитание до 100 без перехода через десяток",
    "Задачи на сложение и вычитание до 100 с переходом через десяток",
  ];
  for (const grade of [2, 3]) {
    for (const title of titles) {
      const topic = topicNamed(grade, title);
      const seen = new Set();
      for (let sample = 0; sample < 24; sample += 1) {
        const question = topic.make();
        assertQuestion(question);
        const match = question.prompt.match(/на (\d+) (больше|меньше)/);
        assert.ok(match, `${grade}. ${title}: ${question.prompt}`);
        seen.add(match[2]);
        const extra = Number(match[1]);
        const known = Number(question.scene.a);
        const answer = Number(question.answer);
        if (match[2] === "больше") assert.equal(known + extra, answer);
        else assert.equal(known - extra, answer);
      }
      assert.deepEqual([...seen].sort(), ["больше", "меньше"]);
    }
  }
});

test("сравнение, столбик и выбор: верный знак принимается, соседний нет", () => {
  const wanted = ["compare", "steps", "choice"];
  for (const type of wanted) {
    const item = everyTopic().find((entry) => {
      try {
        return entry.topic.make(entry.topic.setup?.ops).type === type;
      } catch {
        return false;
      }
    });
    assert.ok(item, type);
    const { topic } = item;
    const ops = topic.setup?.ops;
    const state = initSession(topic, ops);
    assert.equal(state.question.type, type);
    const missed = submit(state, topic, ops, wrongValue(state.question));
    assert.equal(missed.stats.wrong, 1);
    assert.equal(missed.stats.firstCorrect, 0);
    assert.equal(questionKey(missed.question), questionKey(state.question));
    const retried = submit(missed, topic, ops, digitsToType(missed));
    assert.equal(retried.stats.firstCorrect, 0);
    const solved = submit(retried, topic, ops, digitsToType(retried));
    assert.equal(solved.stats.firstCorrect, 1);
  }
});

function liveTitle(text) {
  return text.toLowerCase().replace(/ё/g, "е").replace(/образавр/g, "фигурка").replace(/\s+/g, " ").replace(/[–—-]/g, "-").trim();
}

const LIVE_TOPICS = new Map();
for (const grade of GRADES) {
  for (const chapter of grade.chapters) {
    for (const topic of chapter.topics) LIVE_TOPICS.set(`${grade.id}|${liveTitle(chapter.title)}|${liveTitle(topic.title)}`, topic);
  }
}

const LIVE_OP = { "×": "×", x: "×", "·": "×", "∙": "×", "+": "+", "−": "−", "-": "−", "–": "−", ":": "÷", "÷": "÷" };

function liveOps(text) {
  const ops = [];
  for (const ch of text || "") if (LIVE_OP[ch]) ops.push(LIVE_OP[ch]);
  return ops;
}

function liveLeadingOps(text) {
  const clean = (text || "").trim();
  if (/знаки действий/.test(clean)) return [];
  const first = clean.match(/^[0-9]+\s*([×x·∙+−–:÷])/);
  if (first) return [LIVE_OP[first[1]]];
  const named = clean.match(/^Найдите (?:значение выражения|произведение|частное|разность|сумму)\s+/);
  if (!named) return [];
  return [...new Set(liveOps(clean.slice(named[0].length).split(/\s+Ответ\b/)[0]))];
}

function liveFamily(question) {
  const kind = question.scene?.kind || "";
  if (kind === "drop") return "drops";
  if (kind.startsWith("clock")) return "clock";
  if (question.work || question.type === "column") return "column";
  if (["pythagoras", "grid", "matrix"].includes(kind) || /таблиц/i.test(question.prompt || "")) return "table";
  if (question.tokens?.length) return "equation";
  if (question.type === "compare") return "compare";
  if (kind === "max") return "greatest";
  if (question.prompt && question.prompt.includes("?")) return "sentence";
  return "scene";
}

function liveShownOk(shown, samples) {
  const families = new Set(samples.map(liveFamily));
  const has = (...names) => names.some((name) => families.has(name));
  if (shown.startsWith("drops")) return has("drops");
  if (shown.startsWith("a clock")) return has("clock");
  if (shown.startsWith("a column")) return has("column");
  if (shown.startsWith("a table")) return has("table");
  if (shown.startsWith("a picture plus")) return has("sentence");
  return true;
}

function liveTypesDigits(question) {
  if (["number", "commit", "steps", "column"].includes(question.type)) return true;
  return question.type === "choice" && (question.choices || []).every((choice) => /^-?\d+$/.test(String(choice)));
}

function liveDescribe(question) {
  return [question.type, question.prompt ? question.prompt.slice(0, 80) : "", question.tokens?.length ? question.tokens.join(" ") : "", question.scene?.kind || ""].filter(Boolean).join(" · ");
}

function liveHasFactor(question, factor) {
  if ((question.tokens || []).includes(factor)) return true;
  return new RegExp(`(^|\\D)${factor}(\\D|$)`).test(question.prompt || "");
}

for (const card of LIVE_CARDS) {
  test(`${card.g} класс. ${card.t}`, () => {
    const topic = LIVE_TOPICS.get(`${card.g}|${liveTitle(card.c)}|${liveTitle(card.t)}`);
    assert.ok(topic, `original: раздел «${card.c}», карточка «${card.t}». ours: нет такой карточки`);
    const samples = [];
    for (let sample = 0; sample < 20; sample += 1) {
      const question = topic.make(topic.setup?.ops);
      assertQuestion(question);
      samples.push(question);
    }
    const problems = [];
    if (!liveShownOk(card.shown, samples)) {
      problems.push(`original: показано «${card.shown}», пример «${card.card.slice(0, 80)}». ours: ${liveDescribe(samples[0])}`);
    }
    if (/клавиатур|цифры на клавиатуре/i.test(card.child) && samples.some((question) => !liveTypesDigits(question))) {
      problems.push(`original: ребенок вводит цифры. ours: ${liveDescribe(samples.find((question) => !liveTypesDigits(question)))}`);
    }
    const needed = [...new Set([...liveLeadingOps(card.card), ...liveLeadingOps(card.next)])];
    if (needed.length && samples.every((question) => question.scene?.kind !== "ops") && !card.shown.startsWith("a column")) {
      const got = new Set();
      for (const question of samples) {
        for (const token of question.tokens || []) if (LIVE_OP[token]) got.add(LIVE_OP[token]);
        for (const op of liveOps(question.prompt)) got.add(op);
      }
      for (const op of needed) {
        if (!got.has(op)) problems.push(`original: действие ${op} в «${card.card.slice(0, 80)}». ours: ${[...got].join(", ") || liveDescribe(samples[0])}`);
      }
      const factor = card.t.match(/на (\d+)/);
      if (factor && /таблица/i.test(card.t)) {
        const miss = samples.find((question) => !liveHasFactor(question, factor[1]));
        if (miss) problems.push(`original: таблица на ${factor[1]}. ours: ${liveDescribe(miss)}`);
      }
    }
    assert.deepEqual(problems, []);
  });
}

function samplePool(topic, ops) {
  const keys = new Set();
  let stagnant = 0;
  for (let i = 0; i < 900 && stagnant < 180; i += 1) {
    let question;
    try {
      question = topic.make(ops);
      assertQuestion(question);
    } catch {
      continue;
    }
    const key = exampleKey(question);
    if (keys.has(key)) stagnant += 1;
    else {
      keys.add(key);
      stagnant = 0;
    }
    if (keys.size > RUN_LENGTH) return keys;
  }
  return keys;
}

function answerOne(state, topic, ops) {
  let next = submit(state, topic, ops, digitsToType(state));
  if (next.phase === "flash") next = reduceSession(next, { type: "tick-flash" }, topic, ops);
  if (next.phase === "reveal") next = reduceSession(next, { type: "tick-reveal" }, topic, ops);
  return next;
}

test("за один заход пример не повторяется, пока не кончился набор", () => {
  const small = [];
  for (const item of everyTopic()) {
    const { topic } = item;
    const ops = topic.setup?.ops;
    const pool = samplePool(topic, ops);
    let state = initSession(topic, ops);
    const keys = [];
    for (let step = 0; step < RUN_LENGTH; step += 1) {
      assert.equal(state.phase, "answer", `${item.grade} ${topic.title}`);
      keys.push(exampleKey(state.question));
      const doneBefore = state.primaryDone;
      state = answerOne(state, topic, ops);
      assert.equal(state.primaryDone, doneBefore + 1, `${item.grade} ${topic.title} не перешёл к следующему примеру`);
      if (step < RUN_LENGTH - 1) assert.equal(state.phase, "answer", topic.title);
    }
    assert.equal(state.phase, "done", topic.title);
    if (pool.size > RUN_LENGTH) {
      assert.equal(new Set(keys).size, RUN_LENGTH, `${item.grade} ${topic.title}: повтор при наборе больше захода`);
      continue;
    }
    small.push({ grade: item.grade, title: topic.title, size: pool.size });
    const seen = new Set();
    for (const key of keys) {
      if (seen.has(key)) {
        for (const itemKey of pool) {
          assert.ok(seen.has(itemKey), `${item.grade} ${topic.title}: повтор до того, как кончился набор из ${pool.size}`);
        }
        seen.clear();
      }
      seen.add(key);
    }
    assert.equal(new Set(keys.slice(0, pool.size)).size, pool.size, `${item.grade} ${topic.title}`);
  }
  const shapes = small.find((item) => item.grade === 1 && item.title === "Основные фигуры");
  const found = small.find((item) => item.title === "Найди фигуры на картинке");
  assert.equal(shapes?.size, 5);
  assert.equal(found?.size, 1);
});

function answerNumber(state, topic, value, now) {
  let next = state;
  for (const digit of String(value)) {
    next = reduceSession(next, { type: "digit", digit, now }, topic);
  }
  if (next.phase === "reveal") next = reduceSession(next, { type: "tick-reveal", now }, topic);
  return next;
}

test("режим на время: множитель, ошибка, истечение примера, статистика и рекорд", () => {
  const topic = everyTopic().find((item) => item.topic.id === "slozhenie-v-predelah-10").topic;
  const clock = { exampleSeconds: 10, totalSeconds: 80, now: 1_000 };
  let state = initSession(topic, undefined, clock);
  assert.equal(state.stats.multiplier, 1);
  assert.equal(state.stats.xp, 0);

  const times = [2_000, 3_000, 4_000, 5_000];
  for (let step = 0; step < 3; step += 1) {
    state = answerNumber(state, topic, state.question.answer, times[step]);
  }
  assert.equal(state.stats.xp, 3);
  assert.equal(state.stats.multiplier, 2);
  assert.equal(state.stats.streak, 3);

  state = answerNumber(state, topic, state.question.answer, times[3]);
  assert.equal(state.stats.xp, 5);
  assert.equal(state.stats.multiplier, 2);
  assert.equal(timedReport(state).correct, 4);
  assert.equal(timedReport(state).given, 4);

  const settled = state;
  const wrong = wrongValue({ ...settled.question, answer: entryDigits(settled.question) });
  state = answerNumber(settled, topic, wrong, 6_000);
  assert.equal(state.phase, "flash");
  assert.equal(state.stats.xp, 5);
  assert.equal(state.stats.multiplier, 1);
  assert.equal(state.stats.wrong, 1);
  assert.equal(questionKey(state.question), questionKey(settled.question));
  assert.equal(timedReport(state).given, 5);
  assert.equal(timedReport(state).correct, 4);

  const expiredAt = state.clock.exampleDeadline;
  const runDeadline = state.clock.runDeadline;
  const beforeKey = questionKey(state.question);
  const beforeDone = state.primaryDone;
  const beforeBar = exampleBarPercent(state.clock, state.now);
  assert.ok(beforeBar > 0);
  const midBar = exampleBarPercent(state.clock, state.now + (state.clock.exampleDeadline - state.now) / 2);
  assert.ok(midBar < beforeBar && midBar > 0);
  state = reduceSession(state, { type: "tick-clock", now: expiredAt }, topic);
  assert.equal(state.phase, "answer");
  assert.equal(questionKey(state.question), beforeKey);
  assert.equal(state.primaryDone, beforeDone);
  assert.equal(state.stats.multiplier, 1);
  assert.equal(state.stats.xp, 5);
  assert.equal(state.answers.length, 5);
  assert.equal(state.clock.runDeadline, runDeadline);
  assert.equal(state.clock.exampleDeadline, expiredAt);
  assert.equal(state.clock.barStopped, true);
  assert.equal(exampleBarPercent(state.clock, state.now), 0);
  const held = reduceSession(state, { type: "tick-clock", now: state.now + 3_000 }, topic);
  assert.equal(held.clock.exampleDeadline, expiredAt);
  assert.equal(held.clock.runDeadline, runDeadline);
  assert.equal(exampleBarPercent(held.clock, held.now), 0);
  assert.equal(questionKey(held.question), beforeKey);
  assert.equal(held.stats.xp, 5);
  let moved = answerNumber(state, topic, state.question.answer, state.now + 500);
  if (moved.phase === "reveal") moved = reduceSession(moved, { type: "tick-reveal", now: state.now + 500 }, topic);
  assert.equal(moved.clock.barStopped, false);
  assert.equal(exampleBarPercent(moved.clock, moved.now), 100);
  assert.notEqual(questionKey(moved.question), beforeKey);

  state = reduceSession(state, { type: "tick-clock", now: runDeadline }, topic);
  assert.equal(state.phase, "done");
  const report = timedReport(state);
  assert.equal(report.points, 5);
  assert.equal(report.correct, 4);
  assert.equal(report.given, 5);
  assert.equal(report.averageMs, state.answers.reduce((sum, item) => sum + item.ms, 0) / 5);
  assert.equal(state.answers.length, 5);

  const memory = new Map();
  globalThis.localStorage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
  };
  const first = rememberRecord(1, topic.id, report.points);
  assert.equal(first.next, 5);
  assert.equal(first.prev, 0);
  const lower = rememberRecord(1, topic.id, 2);
  assert.equal(lower.next, 5);
  assert.equal(readRecords()[`${1}:${topic.id}`], 5);
  const beaten = rememberRecord(1, topic.id, 8);
  assert.equal(beaten.prev, 5);
  assert.equal(beaten.next, 8);

  let longer = initSession(topic, undefined, { exampleSeconds: 30, totalSeconds: 300, now: 0 });
  for (let step = 0; step < RUN_LENGTH; step += 1) {
    longer = answerNumber(longer, topic, longer.question.answer, (step + 1) * 1000);
    assert.notEqual(longer.phase, "done");
  }
  longer = reduceSession(longer, { type: "tick-clock", now: longer.clock.runDeadline }, topic);
  assert.equal(longer.phase, "done");
  assert.equal(timedReport(longer).correct, RUN_LENGTH);
});

test("меньший заход не затирает рекорд тренажёра", () => {
  const topic = everyTopic().find((item) => item.topic.id === "slozhenie-v-predelah-10").topic;
  const memory = new Map();
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: (key) => memory.delete(key),
  };
  try {
    const id = `1:${topic.id}`;
    let best = initSession(topic, undefined, { exampleSeconds: 10, totalSeconds: 80, now: 1_000 });
    for (let step = 0; step < 3; step += 1) {
      best = answerNumber(best, topic, best.question.answer, 2_000 + step * 1_000);
    }
    best = reduceSession(best, { type: "tick-clock", now: best.clock.runDeadline }, topic);
    const bestReport = timedReport(best);
    assert.equal(bestReport.points, 3);
    assert.equal(rememberRecord(1, topic.id, bestReport.points).next, 3);

    let weaker = initSession(topic, undefined, { exampleSeconds: 10, totalSeconds: 80, now: 20_000 });
    weaker = answerNumber(weaker, topic, weaker.question.answer, 21_000);
    weaker = reduceSession(weaker, { type: "tick-clock", now: weaker.clock.runDeadline }, topic);
    const weakerReport = timedReport(weaker);
    assert.equal(weakerReport.points, 1);
    const kept = rememberRecord(1, topic.id, weakerReport.points);
    assert.equal(kept.prev, 3);
    assert.equal(kept.next, 3);
    assert.equal(readRecords()[id], 3);
    assert.notEqual(weakerReport.points, readRecords()[id]);
  } finally {
    globalThis.localStorage = previousStorage;
  }
});
