import { useEffect, useState } from "react";
import { Scene } from "./Scene";
import { SolutionBlock, StoryPicture, StoryScheme, StorySchemeButton } from "./LiveBoards";

function BareChoices({ question, phase, dispatch, tried }) {
  return (
    <div className="choices hear-choices">
      {question.choices.map((option) => (
        <button
          key={option}
          type="button"
          className={["choice", tried.includes(option) ? "is-wrong" : "", phase === "reveal" && option === question.answer ? "is-right" : ""].filter(Boolean).join(" ")}
          disabled={phase !== "answer"}
          onClick={() => dispatch({ type: "choice", value: option })}
        >
          <strong>{option}</strong>
        </button>
      ))}
    </div>
  );
}

function speakLine(text) {
  if (!window.speechSynthesis || !text) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ru-RU";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

function Pips({ count, bare = false }) {
  const spots = {
    0: [],
    1: [[50, 50]],
    2: [[30, 30], [70, 70]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[30, 30], [70, 30], [30, 70], [70, 70]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[30, 26], [70, 26], [30, 50], [70, 50], [30, 74], [70, 74]],
  }[count] || [];
  return (
    <svg viewBox="0 0 100 100" className="domino-half" aria-hidden="true">
      {bare ? null : <rect x="4" y="4" width="92" height="92" rx="12" fill="#fffdf4" stroke="#1c2b24" strokeWidth="4" />}
      {spots.map(([x, y], index) => <circle key={index} cx={x} cy={y} r="8" fill="#1c2b24" />)}
    </svg>
  );
}

function OpChoice({ question, phase, dispatch, tried, showSolution }) {
  const scene = question.scene;
  const [scheme, setScheme] = useState(false);
  useEffect(() => setScheme(false), [question.prompt, question.answer]);
  useEffect(() => {
    if (phase === "reveal") setScheme(true);
  }, [phase, question.prompt, question.answer]);
  const solved = phase === "reveal" || showSolution ? String(scene.result ?? "") : "";
  return (
    <div className="op-choice">
      <div className="op-main">
        <p className="prompt">{question.prompt}</p>
        <div className="op-tools">
          <div className="op-fields">
            {question.choices.map((option) => (
              <button
                key={option}
                type="button"
                className={["btn secondary", tried.includes(option) ? "is-wrong" : "", phase === "reveal" && option === question.answer ? "is-right" : ""].filter(Boolean).join(" ")}
                disabled={phase !== "answer"}
                onClick={() => dispatch({ type: "choice", value: option })}
              >
                {option}
              </button>
            ))}
          </div>
          <button type="button" className="btn secondary op-scheme" aria-expanded={scheme} onClick={() => setScheme((value) => !value)}>Схема</button>
          <button type="button" className="btn secondary op-help" aria-label="Показать решение" onClick={() => dispatch({ type: "explain" })}>?</button>
        </div>
      </div>
      <div className="op-art">
        {scheme ? <StoryScheme scene={scene} solved={solved} /> : <StoryPicture kind={scene.picture} count={Math.min(scene.a || 4, 4)} />}
      </div>
      {showSolution ? <SolutionBlock solution={question.solution} onNext={() => dispatch({ type: "next" })} /> : null}
    </div>
  );
}

export function ChoiceScene({ question, phase, dispatch, tried, showSolution = false }) {
  const scene = question.scene;
  if (scene?.beside) return <OpChoice question={question} phase={phase} dispatch={dispatch} tried={tried} showSolution={showSolution} />;
  return (
    <div className="choice-scene">
      {scene.kind === "story" ? <StoryPicture kind={scene.picture} count={Math.min(scene.a || 4, 6)} /> : null}
      {question.speak ? <button type="button" className="btn secondary is-hidden" onClick={() => speakLine(question.prompt)}>Прослушать задачу</button> : null}
      {question.prompt && scene.kind !== "hear" ? <p className="prompt">{question.prompt}</p> : null}
      {scene.kind === "story" ? (
        <>
          <StorySchemeButton scene={scene} solved={phase === "reveal" || showSolution} />
          <button type="button" className="btn secondary" onClick={() => dispatch({ type: "explain" })}>Показать решение</button>
        </>
      ) : null}
      {scene.kind === "story" && showSolution ? <SolutionBlock solution={question.solution} onNext={() => dispatch({ type: "next" })} /> : null}
      {scene.kind === "count" || scene.kind === "pairs" ? <Scene scene={{ kind: "count", count: scene.count, glyph: scene.glyph || "apple" }} /> : null}
      {scene.kind === "row" ? <Scene scene={scene} /> : null}
      {scene.kind === "ordinal" ? (
        <div className="ordinal-row">
          {scene.glyphs.map((glyph, index) => (
            <button
              key={glyph}
              type="button"
              className={`ordinal-pick ${tried.includes(glyph) ? "is-wrong" : ""} ${phase === "reveal" && glyph === question.answer ? "is-right" : ""}`}
              disabled={phase !== "answer"}
              onClick={() => dispatch({ type: "choice", value: glyph })}
            >
              <span>{glyph}</span>
              <small>{index + 1}</small>
            </button>
          ))}
        </div>
      ) : null}
      {scene.kind === "path" ? (
        <div className="path-board">
          <p className="caption">Старт: фигурка в левом верхнем углу. Стрелки: {scene.moves.join(" → ")}</p>
          <div className="path-grid">
            {scene.grid.flat().map((name, index) => (
              <button
                key={name}
                type="button"
                className={`ordinal-pick ${index === 0 ? "is-start" : ""} ${tried.includes(name) ? "is-wrong" : ""} ${phase === "reveal" && name === question.answer ? "is-right" : ""}`}
                disabled={phase !== "answer"}
                onClick={() => dispatch({ type: "choice", value: name })}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {scene.kind === "measures" ? (
        <svg className="measure-draw" viewBox="0 0 280 90" role="img" aria-label="ленточка и палочки">
          <rect x="16" y="36" width="248" height="16" rx="8" fill="#f3d48a" stroke="#1c2b24" strokeWidth="3" />
          {Array.from({ length: scene.times }, (_, index) => {
            const x = 28 + index * (220 / scene.times);
            return <rect key={index} x={x} y="18" width="10" height="52" rx="3" fill="#e07a1f" stroke="#1c2b24" strokeWidth="2" />;
          })}
        </svg>
      ) : null}
      {scene.kind === "bars" ? <Scene scene={scene} /> : null}
      {scene.kind === "domino" ? (
        <div className="domino is-one" role="img" aria-label="домино">
          <Pips count={scene.a} bare />
          <Pips count={scene.b} bare />
        </div>
      ) : null}
      {scene.kind === "ticks" ? (
        <div className="tick-line">
          {question.choices.map((option) => (
            <button key={option} type="button" className={`tick ${option === String(scene.start) ? "is-start" : ""} ${tried.includes(option) ? "is-wrong" : ""} ${phase === "reveal" && option === question.answer ? "is-right" : ""}`} disabled={phase !== "answer"} onClick={() => dispatch({ type: "choice", value: option })}>
              {option}
            </button>
          ))}
        </div>
      ) : null}
      {scene.kind === "prefix-pick" ? (
        <div className="prefix-picks">
          <p className="eq">{scene.number} ∶ {scene.divisor}</p>
          <div className="choices">
            {question.choices.map((option) => (
              <button key={option} type="button" className={`choice ${tried.includes(option) ? "is-wrong" : ""} ${phase === "reveal" && option === question.answer ? "is-right" : ""}`} disabled={phase !== "answer"} aria-label={`Неполное делимое ${option}`} onClick={() => dispatch({ type: "choice", value: option })}>
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {scene.kind === "clock" || scene.kind === "clocks" ? <Scene scene={{ kind: "clock", hour: scene.hour, minute: scene.minute || 0 }} /> : null}
      {scene.kind === "clocks" ? <Scene scene={{ kind: "clock", hour: scene.hour2, minute: scene.minute2 || 0 }} /> : null}
      {scene.kind === "digits" ? <p className="eq digit-row">{scene.number}</p> : null}
      {scene.kind === "dots" ? (
        <div className="dot-row">
          {(scene.cards || scene.counts || []).map((count, index) => (
            <span key={index} className="dot-card">{Array.from({ length: count }, (_, dot) => <i key={dot} />)}</span>
          ))}
          <span className="dot-card is-gap">?</span>
        </div>
      ) : null}
      {scene.kind === "figrow" ? (
        <>
          <div className="fig-row">
            {(scene.row || scene.seq || []).map((id, index) => <span key={index} className="fig-cell">{id === "circle" ? "●" : id === "square" ? "■" : "▲"}</span>)}
            <span className="fig-cell is-gap">?</span>
          </div>
          <div className="shape-row">
            {question.choices.map((id) => (
              <button key={id} type="button" className={`shape-btn ${tried.includes(id) ? "is-wrong" : ""} ${phase === "reveal" && id === question.answer ? "is-right" : ""}`} disabled={phase !== "answer"} aria-label={id === "circle" ? "Круг" : id === "square" ? "Квадрат" : "Треугольник"} onClick={() => dispatch({ type: "choice", value: id })}>
                <span className="fig-cell">{id === "circle" ? "●" : id === "square" ? "■" : "▲"}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
      {scene.kind === "lines" ? (
        <>
          <div className="line-picks">
            {question.choices.map((option) => {
              const isClosed = option === scene.closed;
              const revealed = phase === "reveal";
              return (
                <button key={option} type="button" className={`line-pick ${tried.includes(option) ? "is-wrong" : ""} ${revealed ? (isClosed ? "is-closed" : "is-open") : ""}`} disabled={phase !== "answer"} onClick={() => dispatch({ type: "choice", value: option })}>
                  <svg viewBox="0 0 120 70" aria-hidden="true">
                    <path d={scene.paths[option]} fill="none" stroke={revealed ? (isClosed ? "#1d7a34" : "#c45a2a") : "#1c2b24"} strokeWidth="4" />
                  </svg>
                  <span>{option}</span>
                  {revealed ? <small className={isClosed ? "line-mark is-closed" : "line-mark is-open"}>{isClosed ? "замкнутая" : "незамкнутая"}</small> : null}
                </button>
              );
            })}
          </div>
          {phase === "reveal" ? <button type="button" className="btn secondary" onClick={() => dispatch({ type: "next" })}>ДАЛЕЕ</button> : null}
        </>
      ) : null}
      {scene.kind === "drop" ? <p className="drop-op">{scene.start} {scene.op} {scene.n}</p> : null}
      {scene.kind === "enough" ? (
        <div className="enough-row">
          <Scene scene={{ kind: "count", count: scene.boxes, glyph: scene.leftGlyph || "pig" }} />
          <Scene scene={{ kind: "count", count: scene.items, glyph: scene.rightGlyph || "radish" }} />
        </div>
      ) : null}
      {scene.kind === "same" ? (
        <div className="enough-row">
          <Scene scene={{ kind: "count", count: scene.left, glyph: scene.leftGlyph || "apple" }} />
          <Scene scene={{ kind: "count", count: scene.right, glyph: scene.rightGlyph || "star" }} />
        </div>
      ) : null}
      {scene.kind === "angle" ? (
        <svg viewBox="0 0 220 160" className="angle-board" role="img" aria-label="треугольник">
          <polygon points="30,130 190,130 30,24" fill="#e7f4ea" stroke="#1c2b24" strokeWidth="4" />
          <text x="18" y="148" fontSize="16" fontWeight="700">{scene.names?.[1] || "B"}</text>
          <text x="184" y="148" fontSize="16" fontWeight="700">{scene.names?.[0] || "K"}</text>
          <text x="18" y="20" fontSize="16" fontWeight="700">{scene.names?.[2] || "M"}</text>
        </svg>
      ) : null}
      {scene.kind === "stack" ? (
        <div className="stack-scene" role="img" aria-label="выше и ниже">
          <span>{scene.top}</span>
          <span>{scene.bottom}</span>
        </div>
      ) : null}
      {scene.kind === "spot" ? (
        <svg viewBox="0 0 220 140" className="angle-board" role="img" aria-label="где стоит">
          <rect x="16" y="16" width="188" height="108" fill="#fff7e8" stroke="#1c2b24" strokeWidth="4" />
          <circle cx={scene.spot === "Вверху" ? 110 : scene.spot === "Внизу" ? 110 : 28} cy={scene.spot === "Вверху" ? 36 : scene.spot === "Внизу" ? 104 : 104} r="12" fill="#e23b32" stroke="#1c2b24" strokeWidth="3" />
        </svg>
      ) : null}
      {scene.kind === "inside" ? (
        <svg viewBox="0 0 220 120" className="angle-board" role="img" aria-label="внутри и снаружи">
          <circle cx="90" cy="60" r="40" fill="#e7f4ea" stroke="#1c2b24" strokeWidth="4" />
          <circle cx={scene.inn ? 90 : 170} cy="60" r="7" fill="#1c2b24" />
        </svg>
      ) : null}
      {scene.kind === "splits" ? (
        <div className="line-picks">
          {question.choices.map((option) => (
            <button key={option} type="button" className={`line-pick ${tried.includes(option) ? "is-wrong" : ""} ${phase === "reveal" && option === question.answer ? "is-right" : ""}`} disabled={phase !== "answer"} onClick={() => dispatch({ type: "choice", value: option })}>
              <svg viewBox="0 0 120 70" aria-hidden="true">
                <rect x="8" y="8" width="104" height="54" fill="#d9eef8" stroke="#1c2b24" strokeWidth="4" />
                {option === scene.right ? <path d="M60 8 V62 M8 35 H112" stroke="#1c2b24" strokeWidth="3" /> : option === "Б" ? <path d="M40 8 V62" stroke="#1c2b24" strokeWidth="3" /> : <path d="M20 8 L100 62" stroke="#1c2b24" strokeWidth="3" />}
              </svg>
              <span>{option}</span>
            </button>
          ))}
        </div>
      ) : null}
      {scene.note ? <p className="caption">{scene.note}</p> : null}
      {scene.kind !== "ticks" && scene.kind !== "prefix-pick" && scene.kind !== "lines" && scene.kind !== "splits" && scene.kind !== "ordinal" && scene.kind !== "path" && scene.kind !== "figrow" ? <BareChoices question={question} phase={phase} dispatch={dispatch} tried={tried} /> : null}
    </div>
  );
}

export function FrameBoard({ question, phase, dispatch }) {
  const [inside, setInside] = useState([]);
  useEffect(() => setInside([]), [question.answer]);
  const { have, need } = question.scene;
  function move(id) {
    if (phase !== "answer") return;
    setInside((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }
  const item = question.scene.glyph === "milk" ? (
    <svg viewBox="0 0 48 64" aria-hidden="true">
      <path d="M14 8 h20 l6 14 v34 h-32 V22 z" fill="#fff" stroke="#1c2b24" strokeWidth="3" />
      <rect x="16" y="28" width="16" height="18" fill="#d7f3ff" stroke="#1c2b24" strokeWidth="2" />
    </svg>
  ) : (
    <svg viewBox="0 0 64 24" aria-hidden="true">
      <rect x="4" y="6" width="44" height="12" fill="#f6c14b" stroke="#1c2b24" strokeWidth="3" />
      <path d="M48 6 l12 6 l-12 6 z" fill="#f3a6c8" stroke="#1c2b24" strokeWidth="3" />
    </svg>
  );
  return (
    <div className="frame-task">
      {question.scene.numeral != null ? <p className="big-numeral" aria-label={`Нужно ${need}`}>{question.scene.numeral}</p> : null}
      <button type="button" className="btn secondary" onClick={() => speakLine(question.prompt)}>Озвучить задание</button>
      <div className="frame-box" aria-label="рамка">
        {inside.map((id) => <button key={id} type="button" className="frame-item" onClick={() => move(id)}>{item}</button>)}
        <span>{inside.length}/{need}</span>
      </div>
      <div className="frame-bank">
        {Array.from({ length: have }, (_, index) => {
          const id = String(index);
          if (inside.includes(id)) return null;
          return <button key={id} type="button" className="frame-item" disabled={phase !== "answer"} onClick={() => move(id)}>{item}</button>;
        })}
      </div>
      <button type="button" className="btn" disabled={phase !== "answer"} onClick={() => dispatch({ type: "select-check", ids: inside })}>Проверить</button>
    </div>
  );
}

export function SortBoard({ question, phase, dispatch, tried }) {
  const [order, setOrder] = useState([]);
  useEffect(() => setOrder([]), [question.answer]);
  function take(value) {
    if (phase !== "answer" || order.includes(value)) return;
    const next = [...order, value];
    setOrder(next);
  }
  return (
    <div>
      <p className="prompt">{question.prompt}</p>
      <p className="sort-line">{order.join("  ") || "…"}</p>
      <div className="choices hear-choices">
        {question.scene.values.map((value, index) => {
          const id = String(value);
          return (
            <button key={`${value}-${index}`} type="button" className={`choice ${tried.length ? "is-wrong" : ""}`} disabled={phase !== "answer" || order.includes(id)} onClick={() => take(id)}>
              <strong>{value}</strong>
          </button>
        );
        })}
      </div>
      <button type="button" className="btn" disabled={phase !== "answer"} onClick={() => dispatch({ type: "select-check", ids: order })}>Проверить</button>
    </div>
  );
}

export function OpsBoard({ question, phase, dispatch }) {
  const [picked, setPicked] = useState([]);
  useEffect(() => setPicked([]), [question.answer]);
  const ops = question.scene.tokens.map((token, index) => ({ token, index })).filter((item) => ["+", "−", "×", "÷", "·", ":"].includes(item.token));
  function take(index) {
    if (phase !== "answer" || picked.includes(String(index))) return;
    const next = [...picked, String(index)];
    setPicked(next);
    if (next.length === ops.length) dispatch({ type: "select-check", ids: next });
  }
  return (
    <div>
      <p className="prompt">{question.prompt}</p>
      <div className="eq ops-line">
        {question.scene.tokens.map((token, index) => {
          const op = ["+", "−", "×", "÷", "·", ":"].includes(token);
          if (!op) return <span key={index} className="num">{token}</span>;
          return (
            <button key={index} type="button" className={`op-btn ${picked.includes(String(index)) ? "is-on" : ""}`} disabled={phase !== "answer"} onClick={() => take(index)}>
              {token}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const DICT_STEP = { вправо: [1, 0], влево: [-1, 0], вверх: [0, -1], вниз: [0, 1] };

export function DictBoard({ question, phase, dispatch }) {
  const steps = question.answer.split("|");
  const [done, setDone] = useState(0);
  const [hint, setHint] = useState("");
  useEffect(() => {
    setDone(phase === "reveal" ? steps.length : 0);
    setHint("");
  }, [question.answer, phase, steps.length]);
  const { rows, cols, start, commands } = question.scene;
  const points = [start];
  let x = start[0];
  let y = start[1];
  for (let index = 0; index < done; index += 1) {
    const [dx, dy] = DICT_STEP[steps[index]];
    x += dx;
    y += dy;
    points.push([x, y]);
  }
  const size = 28;
  const pad = 16;
  const width = (cols - 1) * size + pad * 2;
  const height = (rows - 1) * size + pad * 2;
  const at = (point) => [pad + point[0] * size, pad + point[1] * size];
  let cursor = 0;
  const commandIndex = commands.findIndex(([, count]) => {
    if (done < cursor + count) return true;
    cursor += count;
    return false;
  });
  function press(dir) {
    if (phase !== "answer") return;
    if (steps[done] !== dir) {
      setHint("Посмотри на стрелку, которая выделена.");
      return;
    }
    setHint("");
    const next = done + 1;
    setDone(next);
    if (next === steps.length) dispatch({ type: "select-check", ids: steps });
  }
  return (
    <div className="dict-task">
      <p className="prompt">{question.prompt}</p>
      <div className="dict-commands" aria-label="Стрелки">
        {commands.map(([dir, count], index) => (
          <span key={`${dir}-${index}`} className={`dict-command ${index < commandIndex || (commandIndex < 0 && phase !== "answer") ? "is-done" : ""} ${index === commandIndex ? "is-now" : ""}`}>
            {Array.from({ length: count }, (_, arrow) => <Arrow key={arrow} dir={dir} />)}
          </span>
        ))}
      </div>
      <svg className="dict-board" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Поле в клетку">
        {Array.from({ length: cols }, (_, index) => <line key={`v${index}`} x1={pad + index * size} y1={pad} x2={pad + index * size} y2={height - pad} className="dict-grid-line" />)}
        {Array.from({ length: rows }, (_, index) => <line key={`h${index}`} x1={pad} y1={pad + index * size} x2={width - pad} y2={pad + index * size} className="dict-grid-line" />)}
        <polyline points={points.map((point) => at(point).join(",")).join(" ")} className="dict-ink" />
        <circle cx={at(start)[0]} cy={at(start)[1]} r="6" className="dict-start" />
        <circle cx={at(points.at(-1))[0]} cy={at(points.at(-1))[1]} r="5" className="dict-pen" />
      </svg>
      {hint ? <p className="status status-show">{hint}</p> : null}
      <div className="dict-controls">
        {[["вверх", "Вверх"], ["влево", "Влево"], ["вниз", "Вниз"], ["вправо", "Вправо"]].map(([dir, label]) => (
          <button key={dir} type="button" className={`btn secondary dict-arrow is-${dir}`} aria-label={label} disabled={phase !== "answer"} onClick={() => press(dir)}>
            <Arrow dir={dir} />
          </button>
        ))}
      </div>
      {phase === "reveal" ? <button type="button" className="btn secondary" onClick={() => dispatch({ type: "next" })}>ДАЛЕЕ</button> : null}
    </div>
  );
}

function Arrow({ dir }) {
  const turn = { вправо: 0, вниз: 90, влево: 180, вверх: 270 }[dir];
  return (
    <svg viewBox="0 0 24 24" className="arrow-icon" aria-hidden="true">
      <path d="M4 12h13M12 6l6 6-6 6" transform={`rotate(${turn} 12 12)`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RulerBoard({ question, phase, dispatch }) {
  const [mm, setMm] = useState(null);
  useEffect(() => setMm(null), [question.answer]);
  const max = question.scene.max || 15;
  const step = question.scene.step || 10;
  const width = 640;
  const left = 36;
  const right = width - 28;
  const span = right - left;
  const xOf = (value) => left + (value / (max * 10)) * span;
  const shown = phase === "reveal" ? Number(question.answer) : mm;
  function place(event) {
    if (phase !== "answer") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const raw = ((x - left) / span) * max * 10;
    const snapped = Math.max(step, Math.min(max * 10, Math.round(raw / step) * step));
    setMm(snapped);
  }
  return (
    <div className="ruler-task">
      <p className="prompt">{question.prompt}</p>
      <svg className="ruler-draw" viewBox={`0 0 ${width} 180`} role="img" aria-label="Линейка и отрезок из точки A" onClick={place}>
        <rect x="8" y="78" width={width - 16} height="70" rx="8" className="ruler-body" />
        {Array.from({ length: max * 2 + 1 }, (_, index) => {
          const value = index * 5;
          const x = xOf(value);
          const major = value % 10 === 0;
          return (
            <g key={value}>
              <line x1={x} y1="78" x2={x} y2={major ? 100 : 90} className="ruler-tick" />
              {major ? <text x={x} y="122" textAnchor="middle" className="ruler-num">{value / 10}</text> : null}
            </g>
          );
        })}
        <text x={right} y="142" textAnchor="end" className="ruler-num">см</text>
        <circle cx={xOf(0)} cy="48" r="6" className="ruler-point" />
        <text x={xOf(0)} y="28" textAnchor="middle" className="ruler-num">A</text>
        <line x1={xOf(0)} y1="48" x2={xOf(0)} y2="78" className="ruler-guide" />
        {shown ? (
          <>
            <line x1={xOf(0)} y1="48" x2={xOf(shown)} y2="48" className={`ruler-segment ${phase === "reveal" ? "is-show" : ""}`} />
            <line x1={xOf(shown)} y1="48" x2={xOf(shown)} y2="78" className="ruler-guide" />
            <circle cx={xOf(shown)} cy="48" r="8" className="ruler-point" />
            <text x={xOf(shown)} y="28" textAnchor="middle" className="ruler-num">B</text>
          </>
        ) : null}
      </svg>
      <button type="button" className="btn" disabled={phase !== "answer"} onClick={() => dispatch({ type: "select-check", ids: mm ? [String(mm)] : ["miss"] })}>Проверить</button>
    </div>
  );
}

export function HalfBoard({ question, phase, dispatch }) {
  const [picked, setPicked] = useState([]);
  useEffect(() => setPicked([]), [question.answer]);
  const filled = new Set(question.scene.cells.map((cell) => cell.join(":")));
  const letters = ["А", "Б", "В", "Г", "Д"];
  function toggle(id) {
    if (phase !== "answer") return;
    setPicked((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      const axis = id[0];
      const rest = question.scene.parts === 2 ? [] : current.filter((item) => item[0] !== axis);
      return [...rest, id];
    });
  }
  return (
    <div className="half-task">
      <p className="prompt">{question.prompt}</p>
      <svg className="half-plot" viewBox="0 0 300 300" role="img" aria-label="Фигура из квадратных клеток">
        {Array.from({ length: 36 }, (_, index) => {
          const x = index % 6;
          const y = Math.floor(index / 6);
          return <rect key={`${x}:${y}`} x={x * 50} y={y * 50} width="50" height="50" className={filled.has(`${x}:${y}`) ? "half-on" : "half-off"} />;
        })}
        {picked.filter((id) => id.startsWith("x:")).map((id) => <line key={id} x1={Number(id.slice(2)) * 50} y1="0" x2={Number(id.slice(2)) * 50} y2="300" className="half-line" />)}
        {picked.filter((id) => id.startsWith("y:")).map((id) => <line key={id} x1="0" y1={Number(id.slice(2)) * 50} x2="300" y2={Number(id.slice(2)) * 50} className="half-line" />)}
      </svg>
      <div className="half-cuts" role="group" aria-label="Выберите линию разреза">
        {[1, 2, 3, 4, 5].map((at) => {
          const id = `x:${at}`;
          return <button key={id} type="button" className={`btn secondary ${picked.includes(id) ? "is-on" : ""}`} aria-label={`Вертикальный разрез после столбца ${at}`} disabled={phase !== "answer"} onClick={() => toggle(id)}>{at}</button>;
        })}
        {letters.map((letter, index) => {
          const id = `y:${index + 1}`;
          return <button key={id} type="button" className={`btn secondary ${picked.includes(id) ? "is-on" : ""}`} aria-label={`Горизонтальный разрез после ряда ${index + 1}`} disabled={phase !== "answer"} onClick={() => toggle(id)}>{letter}</button>;
        })}
      </div>
      <button type="button" className="btn" disabled={phase !== "answer"} onClick={() => dispatch({ type: "select-check", ids: picked })}>Проверить</button>
    </div>
  );
}

export function FindBoard({ question, phase, dispatch }) {
  const [picked, setPicked] = useState([]);
  useEffect(() => setPicked([]), [question.answer]);
  function toggle(id) {
    if (phase !== "answer") return;
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }
  const answers = new Set((question.answer || "").split("|").filter(Boolean));
  return (
    <div>
      <p className="prompt">{question.prompt}</p>
      <div className="find-grid">
        {(question.scene.items || question.scene.shapes || []).map((shape, index) => {
          const id = String(index);
          const marked = picked.includes(id) || (phase === "reveal" && answers.has(id));
          return (
            <button key={id} type="button" className={`find-cell ${marked ? "is-on" : ""}`} disabled={phase !== "answer"} onClick={() => toggle(id)} aria-pressed={marked}>
              {shape === "square" ? "■" : shape === "circle" ? "●" : "▲"}
            </button>
          );
        })}
      </div>
      <button type="button" className="btn" disabled={phase !== "answer"} onClick={() => dispatch({ type: "select-check", ids: picked })}>Проверить</button>
      {phase === "reveal" ? <button type="button" className="btn secondary" onClick={() => dispatch({ type: "next" })}>ДАЛЕЕ</button> : null}
    </div>
  );
}

export function ColumnBoard({ question, phase, dispatch }) {
  const [heights, setHeights] = useState({});
  useEffect(() => setHeights({}), [question.answer]);
  const { items, max } = question.scene;
  function setHeight(index, height) {
    if (phase !== "answer") return;
    setHeights((current) => ({ ...current, [index]: height }));
  }
  function check() {
    const ids = items.map((_, index) => `${index}:${heights[index] ?? ""}`);
    dispatch({ type: "select-check", ids });
  }
  function drag(event, index) {
    if (phase !== "answer") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = 1 - (event.clientY - rect.top) / rect.height;
    setHeight(index, Math.max(0, Math.min(max, Math.round(ratio * max))));
  }
  return (
    <div>
      <p className="prompt">{question.prompt}</p>
      {question.scene.title ? <p className="chart-title">{question.scene.title}</p> : null}
      <table className="fact-table">
        <thead>
          <tr>{items.map((item) => <th key={item.label}>{item.label}</th>)}</tr>
        </thead>
        <tbody>
          <tr>{items.map((item) => <td key={item.label}>{item.value}</td>)}</tr>
        </tbody>
      </table>
      <div className="build-cols">
        {items.map((item, index) => (
          <div
            key={item.label}
            className="build-col"
            onPointerDown={(event) => drag(event, index)}
            onPointerMove={(event) => event.buttons === 1 && drag(event, index)}
          >
            {Array.from({ length: max }, (_, step) => {
              const height = max - step;
              return <button key={height} type="button" className={heights[index] >= height ? "is-on" : ""} disabled={phase !== "answer"} onClick={() => setHeight(index, height)} />;
            })}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="paint-actions">
        <button type="button" className="btn secondary" disabled={phase !== "answer"} onClick={() => setHeights({})}>Очистить</button>
        <button type="button" className="btn" disabled={phase !== "answer"} onClick={check}>Проверить</button>
      </div>
    </div>
  );
}

export function CornerBoard({ question, phase, dispatch }) {
  const [picked, setPicked] = useState([]);
  useEffect(() => setPicked([]), [question.answer]);
  const cols = question.scene.cols || 8;
  const rows = question.scene.rows || 6;
  function toggle(id) {
    if (phase !== "answer") return;
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(-2)));
  }
  return (
    <div>
      <p className="prompt">{question.prompt}</p>
      <div className="dict-grid" style={{ gridTemplateColumns: `repeat(${cols}, 28px)` }}>
        {Array.from({ length: rows * cols }, (_, index) => {
          const id = `${index % cols}:${Math.floor(index / cols)}`;
          return <button key={id} type="button" className={`dict-cell ${picked.includes(id) ? "is-on" : ""}`} disabled={phase !== "answer"} onClick={() => toggle(id)} />;
        })}
      </div>
      <div className="paint-actions">
        <button type="button" className="btn secondary" disabled={phase !== "answer"} onClick={() => setPicked([])}>Очистить</button>
        <button type="button" className="btn" disabled={phase !== "answer"} onClick={() => dispatch({ type: "select-check", ids: picked })}>Проверить</button>
      </div>
    </div>
  );
}

export function SplitEntry({ question, phase, input, dispatch }) {
  const parts = question.entry;
  let cursor = 0;
  const shown = phase === "reveal" ? parts.join("") : input || "";
  const fields = parts.map((part) => {
    const value = shown.slice(cursor, cursor + part.length);
    cursor += part.length;
    return value;
  });
  if (question.scene?.kind === "clock") {
    return (
      <div>
        <p className="prompt">{question.prompt}</p>
        <Scene scene={question.scene} />
        <div className="eq">
          <span className="lead">Часы</span>
          <span className={`blank ${phase === "reveal" ? "is-show" : ""}`}>{fields[0] || "\u00a0"}</span>
          <span className="lead">Минуты</span>
          <span className={`blank ${phase === "reveal" ? "is-show" : ""}`}>{fields[1] || "\u00a0"}</span>
        </div>
      </div>
    );
  }
  if (question.scene?.kind === "equation") {
    return (
      <div>
        <p className="prompt">{question.prompt}</p>
        <div className="eq">
          <span className="num">{question.scene.line}</span>
          <span className={`blank ${phase === "reveal" ? "is-show" : ""}`}>{fields[0] || "\u00a0"}</span>
        </div>
        <div className="eq">
          <span className="lead">x =</span>
          <span className={`blank ${phase === "reveal" ? "is-show" : ""}`}>{fields[1] || "\u00a0"}</span>
        </div>
        {question.check ? <button type="button" className="btn" disabled={phase !== "answer"} onClick={() => dispatch({ type: "commit" })}>Проверить</button> : null}
      </div>
    );
  }
  if (question.scene?.kind === "measures") {
    return (
      <div className="eq">
        <span className="num">{question.scene.left}</span>
        <span className="op">=</span>
        <span className={`blank ${phase === "reveal" ? "is-show" : ""}`}>{fields[0] || "\u00a0"}</span>
        <span className="num">м</span>
        <span className={`blank ${phase === "reveal" ? "is-show" : ""}`}>{fields[1] || "\u00a0"}</span>
        <span className="num">см</span>
      </div>
    );
  }
  if (question.scene?.kind === "remain") {
    return (
      <div className="eq">
        <span className="num">{question.prompt.replace(/=\s*$/, "").trim()}</span>
        <span className={`blank ${phase === "reveal" ? "is-show" : ""}`}>{fields[0] || "\u00a0"}</span>
        <span className="op">(ост.</span>
        <span className={`blank ${phase === "reveal" ? "is-show" : ""}`}>{fields[1] || "\u00a0"}</span>
        <span className="op">)</span>
      </div>
    );
  }
  return (
    <div className="split-entry">
      <p className="prompt">{question.prompt}</p>
      <div className="eq split-eq">
        {fields.map((value, index) => (
          <span key={index} className="split-bit">
            <span className={`blank ${phase === "reveal" ? "is-show" : ""}`}>{value || "\u00a0"}</span>
            {index === 0 ? <span className="op">· {question.scene.factor} +</span> : null}
            {index === 1 ? <span className="op">· {question.scene.factor} =</span> : null}
            {index === 2 ? <span className="op">+</span> : null}
            {index === 3 ? <span className="op">=</span> : null}
          </span>
        ))}
      </div>
      {question.check ? <button type="button" className="btn" disabled={phase !== "answer"} onClick={() => dispatch({ type: "commit" })}>Проверить</button> : null}
    </div>
  );
}
