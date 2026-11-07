import { useEffect, useRef, useState } from "react";

const MARKS = [0.12, 0.2, 0.28];
const MAX_MISSES = 3;
const MODE_KEY = "ne-obrazavr-drops-mode";
const KEYS_KEY = "ne-obrazavr-drops-keys";

function rand(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function addition(max) {
  const a = rand(2, Math.max(2, max));
  const b = rand(1, Math.max(1, max));
  return { top: a, bottom: b, sign: "+", answer: a + b };
}

function subtraction(max, allowNegative) {
  const a = rand(2, Math.max(2, max));
  const b = rand(1, Math.max(1, max));
  if (allowNegative || a >= b) return { top: a, bottom: b, sign: "−", answer: a - b };
  return { top: b, bottom: a, sign: "−", answer: b - a };
}

function multiplication(maxA, maxB) {
  const a = rand(2, Math.max(2, maxA));
  const b = rand(2, Math.max(2, maxB));
  return { top: a, bottom: b, sign: "×", answer: a * b };
}

function division(maxAnswer, maxDivisor) {
  const answer = rand(2, Math.max(2, maxAnswer));
  const divisor = rand(2, Math.max(2, maxDivisor));
  return { top: answer * divisor, bottom: divisor, sign: "÷", answer };
}

function makeProblem(difficulty, mode) {
  const all = mode === "all";
  const sumMax = Math.min(6 + difficulty * 3, all ? 60 : 80);
  const bag = [() => addition(sumMax)];
  if (difficulty >= 3) bag.push(() => addition(Math.min(16 + difficulty * (all ? 5 : 7), all ? 100 : 140)));
  if (difficulty >= 4) bag.push(() => subtraction(Math.min(14 + difficulty * (all ? 4 : 6), all ? 90 : 120), false));
  if (all && difficulty >= 2) {
    const maxFactor = difficulty < 5 ? 4 : Math.min(4 + Math.floor(difficulty / 2), 12);
    const make = () => multiplication(maxFactor, Math.min(maxFactor, 10));
    bag.push(make);
    if (difficulty >= 5) bag.push(make);
  }
  if (all && difficulty >= 3) {
    const maxAnswer = difficulty < 6 ? 6 : Math.min(5 + difficulty, 18);
    const maxDivisor = difficulty < 6 ? 4 : Math.min(4 + Math.floor(difficulty / 2), 12);
    const make = () => division(maxAnswer, maxDivisor);
    bag.push(make);
    if (difficulty >= 6) bag.push(make);
  }
  if (difficulty >= 11) bag.push(() => subtraction(Math.min(40 + difficulty * 12, 220), true));
  let problem = bag[rand(0, bag.length - 1)]();
  for (let guard = 0; Math.abs(problem.answer) > 260 && guard < 20; guard += 1) {
    problem = bag[rand(0, bag.length - 1)]();
  }
  return problem;
}

function cleanTyped(value) {
  const negative = String(value).replaceAll("−", "-").startsWith("-");
  let digits = String(value).replaceAll("−", "-").replace(/[^\d]/g, "");
  digits = digits.slice(0, negative ? 4 : 4);
  return negative ? `-${digits}` : digits;
}

export function DropBoard() {
  const fieldRef = useRef(null);
  const pressRef = useRef(() => {});
  const [drops, setDrops] = useState([]);
  const [typed, setTyped] = useState("");
  const [floor, setFloor] = useState(MARKS[0]);
  const [misses, setMisses] = useState(0);
  const [flash, setFlash] = useState("");
  const [over, setOver] = useState(false);
  const [runId, setRunId] = useState(0);
  const [mode, setMode] = useState(() => (localStorage.getItem(MODE_KEY) === "add_sub" ? "add_sub" : "all"));
  const [keysOn, setKeysOn] = useState(() => localStorage.getItem(KEYS_KEY) !== "0");

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return undefined;
    let alive = true;
    let frame = 0;
    let last = 0;
    let spawnTimer = 0;
    let nextId = 1;
    let solved = 0;
    let missed = 0;
    let sinceGold = 0;
    let stopped = false;
    let typedValue = "";
    const items = [];

    function difficulty() {
      return Math.min(12, 1 + Math.floor(solved / 5));
    }

    function floorRatio() {
      const mark = MARKS[Math.min(missed, MARKS.length - 1)];
      return missed >= MAX_MISSES ? mark + 0.025 : mark;
    }

    function publish() {
      if (!alive) return;
      setDrops(items.map((drop) => ({ ...drop })));
      setFloor(floorRatio());
      setMisses(missed);
      setTyped(typedValue);
      setOver(stopped);
    }

    function uniqueProblem() {
      let problem = makeProblem(difficulty(), mode);
      for (let attempt = 0; items.some((drop) => drop.answer === problem.answer) && attempt < 30; attempt += 1) {
        problem = makeProblem(difficulty(), mode);
      }
      return problem;
    }

    function spawn() {
      if (!alive || stopped || items.length >= 8) return;
      const problem = uniqueProblem();
      const visible = items.filter((drop) => !drop.golden && drop.y > -drop.height / 2).length;
      const golden = sinceGold >= 11 && visible >= 2 && !items.some((drop) => drop.golden);
      const width = Math.max(86, Math.min(124, 72 + Math.max(String(problem.top).length, String(problem.bottom).length) * 10));
      const height = golden ? Math.min(134, width + 14) : Math.max(96, Math.round(width * 1.18));
      const level = difficulty();
      const speed = (48 + (level - 1) * 3.2) * (golden ? 0.9 : 1);
      const padding = width / 2 + 18;
      const maxX = Math.max(padding, field.clientWidth - padding);
      let x = rand(Math.round(padding), Math.round(maxX));
      for (let attempt = 0; items.some((drop) => Math.abs(drop.x - x) < 90) && attempt < 24; attempt += 1) {
        x = rand(Math.round(padding), Math.round(maxX));
      }
      items.push({
        id: nextId,
        x,
        y: -height / 2,
        width,
        height,
        speed,
        golden,
        ...problem,
      });
      nextId += 1;
      sinceGold = golden ? 0 : sinceGold + 1;
      publish();
    }

    function removeDrop(id, className) {
      const drop = items.find((item) => item.id === id);
      if (!drop) return;
      drop.gone = className;
      publish();
      window.setTimeout(() => {
        const index = items.findIndex((item) => item.id === id);
        if (index >= 0) items.splice(index, 1);
        publish();
      }, 280);
    }

    function flashInput(kind) {
      setFlash(kind);
      window.setTimeout(() => setFlash(""), 280);
    }

    function checkTyped() {
      if (stopped || typedValue === "" || typedValue === "-") return;
      const value = Number.parseInt(typedValue, 10);
      if (Number.isNaN(value)) return;
      const matches = items.filter((drop) => !drop.gone && drop.answer === value);
      matches.sort((a, b) => Number(b.golden) - Number(a.golden) || b.y - a.y);
      if (matches[0]) {
        const drop = matches[0];
        if (drop.golden) {
          solved += 1;
          items.forEach((item) => {
            item.gone = "is-gone";
          });
          publish();
          window.setTimeout(() => {
            items.splice(0, items.length);
            publish();
          }, 280);
        } else {
          solved += 1;
          removeDrop(drop.id, "is-gone");
        }
        typedValue = "";
        flashInput("is-right");
        setTyped("");
        return;
      }
      const prefix = items.some((drop) => !drop.gone && String(drop.answer).startsWith(typedValue));
      if (!prefix) {
        typedValue = "";
        flashInput("is-wrong");
        setTyped("");
      }
    }

    function press(key) {
      if (stopped) return;
      if (key === "back") typedValue = typedValue.slice(0, -1);
      else if (key === "-") typedValue = typedValue.startsWith("-") ? typedValue.slice(1) : `-${typedValue}`;
      else if (/^\d$/.test(key)) typedValue = cleanTyped(typedValue + key);
      else return;
      setTyped(typedValue);
      if (key !== "back") checkTyped();
    }

    pressRef.current = press;

    function onKey(event) {
      const key = event.key;
      const handled = /^\d$/.test(key) || key === "Backspace" || key === "Delete" || key === "Escape" || key === "-" || key === "−" || key === " " || key === "Spacebar";
      if (!handled) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (key === " " || key === "Spacebar") return;
      if (key === "Backspace") press("back");
      else if (key === "Delete" || key === "Escape") {
        typedValue = "";
        setTyped("");
      } else if (key === "-" || key === "−") press("-");
      else press(key);
    }

    function missOne() {
      if (stopped) return;
      missed += 1;
      items.forEach((item) => {
        item.gone = "is-pop";
      });
      publish();
      window.setTimeout(() => {
        items.splice(0, items.length);
        publish();
      }, 240);
      if (missed >= MAX_MISSES) {
        stopped = true;
        window.clearTimeout(spawnTimer);
        setOver(true);
      }
    }

    function tick(now) {
      if (!alive) return;
      if (!last) last = now;
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      const floorTop = field.clientHeight * (1 - floorRatio());
      let hit = false;
      items.forEach((drop) => {
        if (drop.gone) return;
        drop.y += drop.speed * delta;
        if (drop.y + drop.height / 2 >= floorTop) hit = true;
      });
      if (hit) missOne();
      else setDrops(items.map((drop) => ({ ...drop })));
      frame = window.requestAnimationFrame(tick);
    }

    spawn();
    spawnTimer = window.setTimeout(function next() {
      spawn();
      const delay = Math.max(760, 1850 - (difficulty() - 1) * 45);
      spawnTimer = window.setTimeout(next, delay);
    }, 1850);
    frame = window.requestAnimationFrame(tick);
    window.addEventListener("keydown", onKey, true);

    return () => {
      alive = false;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(spawnTimer);
      window.removeEventListener("keydown", onKey, true);
      pressRef.current = () => {};
    };
  }, [mode, runId]);

  function chooseMode(next) {
    localStorage.setItem(MODE_KEY, next);
    setMode(next);
    setRunId((value) => value + 1);
  }

  function chooseKeys(shown) {
    localStorage.setItem(KEYS_KEY, shown ? "1" : "0");
    setKeysOn(shown);
  }

  return (
    <div className="drop-game">
      <div className="drop-field" ref={fieldRef} aria-label="Игровое поле" style={{ "--floor": floor }}>
        <div className="drop-marks" aria-label="Отметки уровня воды">
          {MARKS.map((mark, index) => (
            <span key={mark} className={index === Math.min(misses, MARKS.length - 1) ? "is-on" : ""} style={{ bottom: `${mark * 100}%` }} />
          ))}
        </div>
        <div className="drop-floor" />
        {drops.map((drop) => (
          <div
            key={drop.id}
            className={`drop-fall ${drop.golden ? "is-gold" : ""} ${drop.gone || ""}`}
            style={{ left: drop.x, top: drop.y, width: drop.width, height: drop.height }}
            aria-label={`${drop.sign} ${drop.top} ${drop.bottom}`}
          >
            {drop.golden ? <span className="drop-sun" /> : (
              <svg viewBox="0 0 100 118" aria-hidden="true">
                <path d="M50 4C66 26 90 48 94 70C104 100 80 114 50 114C20 114 -4 100 6 70C10 48 34 26 50 4Z" />
              </svg>
            )}
            <span className="drop-sign">{drop.sign}</span>
            <span className="drop-figs">
              <b>{drop.top}</b>
              <b>{drop.bottom}</b>
            </span>
          </div>
        ))}
        <label className={`drop-answer ${flash}`}>
          <input aria-label="Ответ" placeholder="Ваш ответ" value={typed.replace("-", "−")} readOnly />
        </label>
      </div>
      {keysOn ? (
        <div className="drop-keys" aria-label="Клавиатура">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "-", "0", "back"].map((key) => (
            <button key={key} type="button" className="drop-key" disabled={over} onClick={() => pressRef.current(key)}>
              {key === "-" ? "−" : key === "back" ? "⌫" : key}
            </button>
          ))}
        </div>
      ) : null}
      <div className="drop-setup">
        <p>Действия</p>
        <div>
          <button type="button" className={mode === "add_sub" ? "btn secondary is-on" : "btn secondary"} onClick={() => chooseMode("add_sub")}>Сложение и вычитание</button>
          <button type="button" className={mode === "all" ? "btn secondary is-on" : "btn secondary"} onClick={() => chooseMode("all")}>Все действия</button>
        </div>
        <p>Клавиатура</p>
        <div>
          <button type="button" className={keysOn ? "btn secondary is-on" : "btn secondary"} onClick={() => chooseKeys(true)}>Показать</button>
          <button type="button" className={!keysOn ? "btn secondary is-on" : "btn secondary"} onClick={() => chooseKeys(false)}>Скрыть</button>
        </div>
        {over ? <button type="button" className="btn secondary" onClick={() => setRunId((value) => value + 1)}>Начать новую тренировку</button> : null}
      </div>
    </div>
  );
}
