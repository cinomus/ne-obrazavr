import { useEffect, useState } from "react";
import { Scene } from "./Scene";

function Cube({ color = "#f0b14a", pale = "#ffe3a3", dark = "#c4840a" }) {
  return (
    <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true">
      <polygon points="10,24 32,12 54,24 32,36" fill={pale} stroke="#1c2b24" strokeWidth="3" strokeLinejoin="round" />
      <polygon points="10,24 32,36 32,56 10,44" fill={color} stroke="#1c2b24" strokeWidth="3" strokeLinejoin="round" />
      <polygon points="32,36 54,24 54,44 32,56" fill={dark} stroke="#1c2b24" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

const COLORS = {
  blue: ["#7eb6e0", "#d7ecf8", "#3d7eae"],
  orange: ["#f0a04b", "#ffd7a8", "#c56a12"],
  yellow: ["#f0b14a", "#ffe3a3", "#c4840a"],
  pink: ["#e58aa8", "#ffd0de", "#b85a78"],
};

function Cubes({ count, tone, faded = 0 }) {
  return (
    <div className="count-row">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={index >= count - faded ? "is-faded" : ""}>
          <Cube color={COLORS[tone][0]} pale={COLORS[tone][1]} dark={COLORS[tone][2]} />
        </span>
      ))}
    </div>
  );
}

function CheckButton({ phase, onClick, label = "Проверить" }) {
  return (
    <button type="button" className="btn" disabled={phase !== "answer"} onClick={onClick}>
      {label}
    </button>
  );
}

export function CubeWays({ question, phase, dispatch }) {
  const { total, blue, orange } = question.scene;
  const [mineBlue, setMineBlue] = useState(0);
  const [mineOrange, setMineOrange] = useState(0);
  useEffect(() => {
    if (phase === "reveal") {
      const [b, o] = question.answer.split("+").map(Number);
      setMineBlue(b);
      setMineOrange(o);
    } else {
      setMineBlue(0);
      setMineOrange(0);
    }
  }, [question.answer, phase]);
  const room = total - mineBlue - mineOrange;
  function add(tone) {
    if (phase !== "answer" || room <= 0) return;
    if (tone === "blue") setMineBlue((n) => n + 1);
    else setMineOrange((n) => n + 1);
  }
  return (
    <div className="cube-build">
      <p className="prompt">{question.prompt}</p>
      <p className="caption">Показанный способ</p>
      <div className="pair-rows">
        <Cubes count={blue} tone="blue" />
        <Cubes count={orange} tone="orange" />
      </div>
      <p className="caption">Другой способ</p>
      <div className="pair-rows">
        <button type="button" className="cube-add" aria-label="синий" disabled={phase !== "answer" || room <= 0} onClick={() => add("blue")}>
          {mineBlue ? <Cubes count={mineBlue} tone="blue" /> : <span className="cube-empty">синий</span>}
        </button>
        <button type="button" className="cube-add" aria-label="оранжевый" disabled={phase !== "answer" || room <= 0} onClick={() => add("orange")}>
          {mineOrange ? <Cubes count={mineOrange} tone="orange" /> : <span className="cube-empty">оранжевый</span>}
        </button>
      </div>
      <div className="paint-actions">
        <CheckButton phase={phase} onClick={() => dispatch({ type: "build-check", blue: mineBlue, orange: mineOrange })} />
        <button type="button" className="btn secondary" disabled={phase !== "answer"} onClick={() => { setMineBlue(0); setMineOrange(0); }}>
          Очистить
        </button>
      </div>
    </div>
  );
}

export function CubeEquation({ scene, shown, phase }) {
  const minus = scene.kind === "cubes-sub";
  if (scene.sentence) {
    const colors = scene.colors || ["#7b4bb7", "#e2b43a"];
    return (
      <div className="cube-eq">
        <p className="prompt">{scene.sentence} <button type="button" className="btn secondary" onClick={() => say(scene.sentence)}>Прослушать</button></p>
        <div className="cube-train" role="img" aria-label="поезд из кубиков">
          {Array.from({ length: scene.a }, (_, index) => <span key={`a${index}`} className="train-cube" style={{ background: colors[0] }} />)}
          {Array.from({ length: scene.b }, (_, index) => <span key={`b${index}`} className="train-cube" style={{ background: colors[1] }} />)}
        </div>
        <p className="prompt">{scene.question} <button type="button" className="btn secondary" onClick={() => say(scene.question)}>Прослушать</button></p>
        <div className="eq">
          <span className="num">{scene.a}</span>
          <span className="op">+</span>
          <span className="num">{scene.b}</span>
          <span className="op">=</span>
          <span className={`blank ${phase === "reveal" ? "is-show" : ""}`}>{phase === "reveal" ? shown : "?"}</span>
          <button type="button" className="btn secondary" onClick={() => say(`${scene.a} плюс ${scene.b} равно`)}>Прослушать</button>
        </div>
      </div>
    );
  }
  return (
    <div className="cube-eq">
      <Cubes count={scene.a} tone={minus ? "yellow" : "yellow"} faded={minus ? scene.b : 0} />
      {minus ? null : <Cubes count={scene.b} tone="pink" />}
      <div className="eq">
        <span className="num">{scene.a}</span>
        <span className="op">{minus ? "−" : "+"}</span>
        <span className="num">{scene.b}</span>
        <span className="op">=</span>
        <span className={`blank ${phase === "flash" ? "is-bad" : ""} ${phase === "reveal" ? "is-show" : ""}`}>{shown || "\u00a0"}</span>
      </div>
    </div>
  );
}

function Thing({ kind }) {
  if (kind === "ball") {
    return (
      <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="34" r="20" fill="#e23b32" stroke="#1c2b24" strokeWidth="3" />
        <path d="M16 28c8 4 24 4 32 0" fill="none" stroke="#1c2b24" strokeWidth="3" />
      </svg>
    );
  }
  if (kind === "book") {
    return (
      <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M10 16h20c4 6 4 26 0 32H10z" fill="#7eb6e0" stroke="#1c2b24" strokeWidth="3" />
        <path d="M54 16H34c-4 6-4 26 0 32h20z" fill="#f5d76a" stroke="#1c2b24" strokeWidth="3" />
      </svg>
    );
  }
  if (kind === "машина") {
    return <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="28" width="48" height="16" rx="4" fill="#7eb6e0" stroke="#1c2b24" strokeWidth="3" /><circle cx="20" cy="46" r="5" fill="#1c2b24" /><circle cx="44" cy="46" r="5" fill="#1c2b24" /></svg>;
  }
  if (kind === "барабан") {
    return <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="28" rx="18" ry="8" fill="#f3a6c8" stroke="#1c2b24" strokeWidth="3" /><path d="M14 28 v16 q18 12 36 0 V28" fill="#e07a1f" stroke="#1c2b24" strokeWidth="3" /></svg>;
  }
  if (kind === "ракета") {
    return <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 8 l10 20 v16 h-20 V28 z" fill="#d7f3ff" stroke="#1c2b24" strokeWidth="3" /><path d="M22 44 l-8 10 h10 z M42 44 l8 10 h-10 z" fill="#e23b32" stroke="#1c2b24" strokeWidth="3" /></svg>;
  }
  if (kind === "лейка") {
    return <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true"><path d="M16 28 h22 v16 H16 z" fill="#7ec8e3" stroke="#1c2b24" strokeWidth="3" /><path d="M38 32 h12 l4 8" fill="none" stroke="#1c2b24" strokeWidth="3" /></svg>;
  }
  if (kind === "flower") {
    return (
      <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="28" r="7" fill="#f5d76a" stroke="#1c2b24" strokeWidth="3" />
        <circle cx="20" cy="24" r="8" fill="#e58aa8" stroke="#1c2b24" strokeWidth="3" />
        <circle cx="44" cy="24" r="8" fill="#e58aa8" stroke="#1c2b24" strokeWidth="3" />
        <circle cx="26" cy="38" r="8" fill="#e58aa8" stroke="#1c2b24" strokeWidth="3" />
        <circle cx="40" cy="38" r="8" fill="#e58aa8" stroke="#1c2b24" strokeWidth="3" />
      </svg>
    );
  }
  return (
    <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M12 30h40v16H12z" fill="#f3d2b3" stroke="#1c2b24" strokeWidth="3" />
      <path d="M18 30c2-10 26-10 28 0" fill="#f7efe4" stroke="#1c2b24" strokeWidth="3" />
      <rect x="28" y="36" width="8" height="6" fill="#e23b32" stroke="#1c2b24" strokeWidth="2" />
    </svg>
  );
}

export function RowPick({ question, phase, dispatch, tried }) {
  return (
    <div>
      <p className="prompt">{question.prompt}</p>
      <div className="object-row">
        {question.scene.items.map((id) => (
          <button
            key={id}
            type="button"
            className={`shape-btn ${tried.includes(id) ? "is-wrong" : ""} ${phase === "reveal" && id === question.answer ? "is-right" : ""}`}
            disabled={phase !== "answer"}
            aria-label={id}
            onClick={() => dispatch({ type: "choice", value: id })}
          >
            <Thing kind={id} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function Ribbons({ question, phase, dispatch, tried }) {
  const max = Math.max(...question.scene.lengths);
  return (
    <div>
      <p className="prompt">{question.prompt}</p>
      <div className="ribbon-col">
        {question.scene.lengths.map((length, index) => {
          const id = String(index);
          return (
            <button
              key={id}
              type="button"
              className={`ribbon ${tried.includes(id) ? "is-wrong" : ""} ${phase === "reveal" && id === question.answer ? "is-right" : ""}`}
              style={{ width: `${Math.round((length / max) * 100)}%` }}
              disabled={phase !== "answer"}
              onClick={() => dispatch({ type: "choice", value: id })}
            />
          );
        })}
      </div>
    </div>
  );
}

function UnitLadder({ scene }) {
  return (
    <div className="unit-ladder" aria-label="Лестница единиц">
      {scene.units.map((unit, index) => {
        const role = scene.to?.includes(unit) ? "is-to" : scene.from?.includes(unit) ? "is-from" : "";
        return (
          <span key={`${unit}-${index}`} className="unit-step">
            <span className={`unit-chip ${role}`}>{unit}</span>
            {index < scene.factors.length ? <span className="unit-factor">×{scene.factors[index]}</span> : null}
          </span>
        );
      })}
    </div>
  );
}

function spot(cx, cy, radius, angle) {
  const turn = (angle * Math.PI) / 180;
  return [cx + Math.cos(turn) * radius, cy + Math.sin(turn) * radius];
}

export function CircleCenter({ question, phase, dispatch, tried }) {
  const scene = question.scene;
  if (scene.kind === "shapes") {
    return (
      <div>
        <p className="prompt">{question.prompt}</p>
        <div className="shape-row">
          {scene.shapes.map((shape) => (
            <button key={shape.id} type="button" className={`shape-btn ${tried.includes(shape.id) ? "is-wrong" : ""} ${phase === "reveal" && shape.id === question.answer ? "is-right" : ""}`} disabled={phase !== "answer"} aria-label={shape.label} onClick={() => dispatch({ type: "choice", value: shape.id })}>
              <svg viewBox="0 0 120 80" aria-hidden="true">
                {shape.id === "овал" ? <ellipse cx="60" cy="40" rx="46" ry="24" fill={shape.filled ? "#d7ecf8" : "none"} stroke="#1c2b24" strokeWidth="4" /> : <circle cx="60" cy="40" r="28" fill={shape.id === "круг" ? "#d7ecf8" : "none"} stroke="#1c2b24" strokeWidth="4" />}
              </svg>
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (scene.kind === "points") {
    return (
      <div>
        <p className="prompt">{question.prompt}</p>
        <div className="center-board">
          <svg viewBox="0 0 320 320" aria-hidden="true">
            <circle cx="160" cy="160" r="120" fill="none" stroke="#1c2b24" strokeWidth="4" />
            {scene.points.map((point) => <circle key={point.id} cx={point.x} cy={point.y} r="5" fill="#1c2b24" />)}
          </svg>
          {scene.points.map((point) => (
            <button key={point.id} type="button" className={`dot-btn ${tried.includes(point.id) ? "is-wrong" : ""} ${phase === "reveal" && point.id === question.answer ? "is-right" : ""}`} style={{ left: `${(point.x / 320) * 100}%`, top: `${(point.y / 320) * 100}%` }} disabled={phase !== "answer"} aria-label={point.label} onClick={() => dispatch({ type: "choice", value: point.id })} />
          ))}
        </div>
      </div>
    );
  }
  if (scene.kind === "segments") {
    const cx = 230;
    const cy = 160;
    const radius = 118;
    const ends = scene.segments.map((segment) => {
      const [x1, y1] = spot(cx, cy, radius * segment.r1, segment.a1);
      const [x2, y2] = spot(cx, cy, radius * segment.r2, segment.a2);
      return { ...segment, x1, y1, x2, y2 };
    });
    return (
      <div>
        <p className="prompt">{question.prompt}</p>
        <div className="center-board is-wide">
          <svg viewBox="0 0 460 320" aria-hidden="true">
            <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1c2b24" strokeWidth="4" />
            <circle cx={cx} cy={cy} r="5" fill="#1c2b24" />
            <text x={cx} y={cy - 14} textAnchor="middle" fontSize="18" fontWeight="700">O</text>
            {ends.map((segment) => (
              <g key={segment.id}>
                <line x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} stroke="transparent" strokeWidth="18" style={{ pointerEvents: phase === "answer" ? "stroke" : "none", cursor: "pointer" }} onClick={() => phase === "answer" && dispatch({ type: "choice", value: segment.id })} />
                <line x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} stroke={phase === "reveal" && segment.id === question.answer ? "#2f8f4e" : tried.includes(segment.id) ? "#d4533c" : "#1c2b24"} strokeWidth="4" style={{ pointerEvents: "none" }} />
                {segment.letters.map((letter, index) => {
                  const x = index === 0 ? segment.x1 : segment.x2;
                  const y = index === 0 ? segment.y1 : segment.y2;
                  if (letter === "O") return null;
                  const [lx, ly] = spot(cx, cy, radius + 22, index === 0 ? segment.a1 : segment.a2);
                  return <text key={letter} x={lx} y={ly} textAnchor="middle" fontSize="18" fontWeight="700">{letter}</text>;
                })}
              </g>
            ))}
          </svg>
          {ends.map((segment) => (
            <button key={segment.id} type="button" className={`dot-btn ${tried.includes(segment.id) ? "is-wrong" : ""} ${phase === "reveal" && segment.id === question.answer ? "is-right" : ""}`} style={{ left: `${((segment.x1 + segment.x2) / 2 / 460) * 100}%`, top: `${((segment.y1 + segment.y2) / 2 / 320) * 100}%` }} disabled={phase !== "answer"} aria-label={`отрезок ${segment.letters.join("")}`} onClick={() => dispatch({ type: "choice", value: segment.id })} />
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function PlaceTable({ question, phase, dispatch, tried }) {
  const text = question.scene.number;
  return (
    <div>
      <p className="prompt">{question.prompt}</p>
      <div className="place-digits">
        {text.split("").map((digit, index) => (
          <span key={index} className={question.scene.index != null ? (index === question.scene.index ? "place-digit is-mark" : "place-digit") : (digit === question.scene.digit ? "place-digit is-mark" : "place-digit")}>{digit}</span>
        ))}
      </div>
      <div className="choices place-names">
        {question.choices.map((name) => (
          <button
            key={name}
            type="button"
            className={`choice ${tried.includes(name) ? "is-wrong" : ""} ${phase === "reveal" && name === question.answer ? "is-right" : ""}`}
            disabled={phase !== "answer"}
            onClick={() => dispatch({ type: "choice", value: name })}
          >
            <strong>{name}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

export function CommitTask({ question, state, dispatch }) {
  const { phase, input, flashValue } = state;
  const shown = phase === "reveal" ? question.answer : phase === "flash" ? flashValue : input;
  return (
    <div className="commit-task">
      {question.scene?.kind === "bars" ? <Scene scene={question.scene} /> : null}
      {question.scene?.kind === "mass" || question.scene?.kind === "cubes-add" || question.scene?.kind === "cubes-sub" ? null : <p className="prompt">{question.prompt}</p>}
      {question.formula ? (
        <p className="formula">
          {question.formula.slice(0, question.formula.indexOf("?"))}
          <span className={`blank ${phase === "reveal" ? "is-show" : ""}`}>{shown || "\u00a0"}</span>
          {question.formula.slice(question.formula.indexOf("?") + 1)}
        </p>
      ) : null}
      {question.scene?.kind === "ladder" ? <UnitLadder scene={question.scene} /> : null}
      {question.formula || question.scene?.checkOnly || question.scene?.kind === "cubes-add" || question.scene?.kind === "cubes-sub" ? null : <div className="eq">
        {question.scene?.kind === "mass" ? <span className="num">{question.prompt.replace(/=\s*$/, "").trim()}</span> : null}
        {question.scene?.kind === "mass" ? <span className="op">=</span> : <span className="lead">Ответ</span>}
        <span className={`blank ${phase === "reveal" ? "is-show" : ""}`}>{shown || "\u00a0"}</span>
        {question.suffix ? <span className="num">{question.suffix}</span> : null}
      </div>}
      {question.scene?.kind === "cubes-add" || question.scene?.kind === "cubes-sub" ? (
        <>
          <p className="prompt">{question.prompt}</p>
          <CubeEquation scene={question.scene} shown={shown} phase={phase} />
        </>
      ) : null}
      {question.scales || question.scene?.kind === "mass" ? (
        <div className="paint-actions">
          {(question.scales || [10, 100, 1000]).map((factor) => (
            <button key={factor} type="button" className="btn secondary" disabled={phase !== "answer"} onClick={() => dispatch({ type: "scale", factor })}>
              ×{factor}
            </button>
          ))}
        </div>
      ) : null}
      {question.scene?.kind === "grow" ? (
        <div className="paint-actions">
          {question.scene.parts ? (
            <span className="stacked-frac" aria-label={`1/${question.scene.parts}`}>
              <b>1</b>
              <b>{question.scene.parts}</b>
            </span>
          ) : null}
          <div className="share-row">
            {Array.from({ length: Number(shown || question.scene.shown || 0) }, (_, index) => <span key={index} className="share-part is-on" />)}
          </div>
          <button type="button" className="btn secondary" disabled={phase !== "answer"} onClick={() => dispatch({ type: "nudge", delta: -1 })}>−</button>
          <button type="button" className="btn secondary" disabled={phase !== "answer"} onClick={() => dispatch({ type: "nudge", delta: 1 })}>+</button>
        </div>
      ) : null}
      <CheckButton phase={phase} label={question.checkLabel || "Проверить"} onClick={() => dispatch({ type: "commit" })} />
    </div>
  );
}

export function SelectTask({ question, phase, dispatch }) {
  const [picked, setPicked] = useState([]);
  useEffect(() => {
    setPicked(phase === "reveal" ? question.answer.split("|").filter(Boolean) : []);
  }, [question.answer, phase]);
  function toggle(id) {
    if (phase !== "answer") return;
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }
  if (question.scene.kind === "prefix") {
    const text = question.scene.number;
    return (
      <div>
        <p className="prompt">{question.prompt}</p>
        <div className="eq">
          {text.split("").map((digit, index) => {
            const id = String(index);
            return (
              <button key={id} type="button" className={`zero-digit ${picked.includes(id) ? "is-on" : ""}`} disabled={phase !== "answer"} onClick={() => toggle(id)}>
                {digit}
              </button>
            );
          })}
        </div>
        <CheckButton phase={phase} onClick={() => dispatch({ type: "select-check", ids: picked })} />
      </div>
    );
  }
  if (question.scene.kind === "share" && question.scene.shape === "circle") {
    const parts = question.scene.parts;
    const slice = (index) => {
      const start = (index / parts) * Math.PI * 2 - Math.PI / 2;
      const end = ((index + 1) / parts) * Math.PI * 2 - Math.PI / 2;
      const large = end - start > Math.PI ? 1 : 0;
      const x1 = 100 + 78 * Math.cos(start);
      const y1 = 100 + 78 * Math.sin(start);
      const x2 = 100 + 78 * Math.cos(end);
      const y2 = 100 + 78 * Math.sin(end);
      return `M100 100 L${x1} ${y1} A78 78 0 ${large} 1 ${x2} ${y2} Z`;
    };
    return (
      <div>
        <p className="prompt">{question.prompt}</p>
        <svg className="share-circle" viewBox="0 0 200 200" role="img" aria-label="Фигура, разделённая на части">
          <circle cx="100" cy="100" r="78" fill="#fffdf8" stroke="#1c2b24" strokeWidth="3" />
          {Array.from({ length: parts }, (_, index) => {
            const id = String(index);
            return (
              <path key={id} d={slice(index)} className={picked.includes(id) ? "is-on" : ""} onClick={() => toggle(id)} />
            );
          })}
        </svg>
        <CheckButton phase={phase} label={question.checkLabel || "Проверить"} onClick={() => dispatch({ type: "select-check", ids: picked })} />
      </div>
    );
  }
  if (question.scene.kind === "share" || question.scene.kind === "strip") {
    return (
      <div>
        <p className="prompt">{question.prompt}</p>
        <div className="share-row">
          {Array.from({ length: question.scene.parts }, (_, index) => {
            const id = String(index);
            return (
              <button key={id} type="button" className={`share-part ${picked.includes(id) ? "is-on" : ""}`} disabled={phase !== "answer"} onClick={() => toggle(id)} />
            );
          })}
        </div>
        <CheckButton phase={phase} label={question.checkLabel || "Проверить"} onClick={() => dispatch({ type: "select-check", ids: picked })} />
      </div>
    );
  }
  const rows = [
    ["делимое", question.scene.dividend, "n"],
    ["делитель", question.scene.divisor, "d"],
  ];
  return (
    <div>
      <p className="prompt">{question.prompt}</p>
      {rows.map(([label, text, prefix]) => (
        <div key={prefix} className="zero-row">
          <span>{label}</span>
          {text.split("").map((digit, index) => {
            const id = `${prefix}${index}`;
            return (
              <button key={id} type="button" className={`zero-digit ${picked.includes(id) ? "is-struck" : ""}`} disabled={phase !== "answer"} onClick={() => toggle(id)}>
                {digit}
              </button>
            );
          })}
        </div>
      ))}
      <CheckButton phase={phase} onClick={() => dispatch({ type: "select-check", ids: picked })} />
    </div>
  );
}

export function MeasureTask({ question, shown, phase }) {
  return (
    <div className="area-task">
      <div>
        <p className="prompt">{question.prompt}</p>
        <div className="eq">
          <span className="lead">Ответ</span>
          <span className={`blank ${phase === "flash" ? "is-bad" : ""} ${phase === "reveal" ? "is-show" : ""}`}>{shown || "\u00a0"}</span>
          <span className="op">{question.unit}</span>
        </div>
      </div>
      <Drawing scene={question.scene} />
    </div>
  );
}

function Drawing({ scene }) {
  if (scene.kind === "line") {
    let x = 40;
    let y = 78;
    const points = [[x, y]];
    scene.parts.forEach((part, index) => {
      x += 48 + part * 8;
      y = index % 2 === 0 ? 132 : 28;
      points.push([x, y]);
    });
    const labels = scene.parts.map((part, index) => {
      const [x1, y1] = points[index];
      const [x2, y2] = points[index + 1];
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const nx = -(y2 - y1) / len;
      const ny = (x2 - x1) / len;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const gapTo = (px, py) => {
        let best = Infinity;
        for (let i = 0; i < points.length - 1; i += 1) {
          const [ax, ay] = points[i];
          const [bx, by] = points[i + 1];
          const dx = bx - ax;
          const dy = by - ay;
          const span = dx * dx + dy * dy || 1;
          const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / span));
          best = Math.min(best, Math.hypot(px - ax - t * dx, py - ay - t * dy));
        }
        return best;
      };
      let placed = { x: mx, y: my, gap: 0 };
      for (const dist of [30, 46]) {
        for (const sign of [1, -1]) {
          const next = { x: mx + nx * sign * dist, y: my + ny * sign * dist, gap: 0 };
          next.gap = gapTo(next.x, next.y);
          if (next.gap > placed.gap) placed = next;
        }
      }
      return { ...placed, part };
    });
    for (let index = 1; index < labels.length; index += 1) {
      const prev = labels[index - 1];
      const label = labels[index];
      if (Math.hypot(label.x - prev.x, label.y - prev.y) >= 42) continue;
      const [x1, y1] = points[index];
      const [x2, y2] = points[index + 1];
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const nx = -(y2 - y1) / len;
      const ny = (x2 - x1) / len;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const flipped = { x: 2 * mx - label.x, y: 2 * my - label.y };
      const pushed = {
        x: mx + ((label.x - mx) / 30) * 52,
        y: my + ((label.y - my) / 30) * 52,
      };
      const flipAway = Math.hypot(flipped.x - prev.x, flipped.y - prev.y);
      const pushAway = Math.hypot(pushed.x - prev.x, pushed.y - prev.y);
      const chosen = flipAway > pushAway ? flipped : pushed;
      labels[index] = { ...label, x: chosen.x, y: chosen.y };
    }
    const xs = [...points.map((point) => point[0]), ...labels.map((label) => label.x)];
    const ys = [...points.map((point) => point[1]), ...labels.map((label) => label.y)];
    const minX = Math.min(...xs) - 36;
    const minY = Math.min(...ys) - 18;
    const maxX = Math.max(...xs) + 36;
    const maxY = Math.max(...ys) + 18;
    return (
      <svg className="measure-draw" viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} role="img" aria-label="ломаная">
        <polyline points={points.map((point) => point.join(",")).join(" ")} fill="none" stroke="#1c2b24" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
        {labels.map((label) => (
          <text key={label.part + label.x} x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" fontSize="16" fontWeight="700">{label.part} см</text>
        ))}
      </svg>
    );
  }
  if (scene.kind === "rect") {
    const w = 180;
    const h = scene.w === scene.h ? 140 : 100;
    return (
      <svg className="measure-draw" viewBox="0 0 240 180" role="img" aria-label="прямоугольник">
        <rect x="30" y="30" width={w} height={h} fill="#d9eef8" stroke="#1c2b24" strokeWidth="4" />
        <text x={30 + w / 2} y="22" textAnchor="middle" fontSize="16" fontWeight="700">{scene.hideW ? "?" : `${scene.w} ${scene.unit || "см"}`}</text>
        <text x={30 + w + 8} y={30 + h / 2} fontSize="16" fontWeight="700">{scene.hideH ? "?" : `${scene.h} ${scene.unit || "см"}`}</text>
      </svg>
    );
  }
  if (scene.kind === "poly-sides") {
    const count = scene.sides.length;
    const cx = 120;
    const cy = 90;
    const radius = 62;
    const points = scene.sides.map((_, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
      return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    });
    return (
      <svg className="measure-draw" viewBox="0 0 240 190" role="img" aria-label="многоугольник">
        <polygon points={points.map((point) => point.join(",")).join(" ")} fill="#d9eef8" stroke="#1c2b24" strokeWidth="4" />
        {scene.sides.map((side, index) => {
          const [x1, y1] = points[index];
          const [x2, y2] = points[(index + 1) % count];
          return <text key={index} x={(x1 + x2) / 2} y={(y1 + y2) / 2} textAnchor="middle" fontSize="14" fontWeight="700">{side}</text>;
        })}
      </svg>
    );
  }
  if (scene.kind === "radius") {
    return (
      <svg className="measure-draw" viewBox="0 0 220 160" role="img" aria-label="окружность">
        <circle cx="90" cy="80" r="52" fill="#e7f4ea" stroke="#1c2b24" strokeWidth="4" />
        <line x1="38" y1="80" x2="142" y2="80" stroke="#1c2b24" strokeWidth="3" />
        <line x1="90" y1="80" x2="142" y2="80" stroke="#d4533c" strokeWidth="4" />
        <text x="116" y="72" textAnchor="middle" fontSize="14" fontWeight="700">{scene.label}</text>
        {scene.other ? <text x="90" y="108" textAnchor="middle" fontSize="14" fontWeight="700">{scene.other}</text> : null}
      </svg>
    );
  }
  const { width, height, cutW, cutH } = scene;
  const scale = 16;
  const x = 36;
  const y = 28;
  const fullW = width * scale;
  const fullH = height * scale;
  const cutWidth = cutW * scale;
  const cutHeight = cutH * scale;
  const top = fullW - cutWidth;
  return (
    <svg className="measure-draw" viewBox={`0 0 ${fullW + 90} ${fullH + 70}`} role="img" aria-label="составная фигура">
      <path d={`M${x} ${y}h${top}v${cutHeight}h${cutWidth}v${fullH - cutHeight}h${-fullW}z`} fill="#d9eef8" stroke="#1c2b24" strokeWidth="4" />
      <text x={x + top / 2} y={y - 8} textAnchor="middle" fontSize="14" fontWeight="700">{width - cutW} см</text>
      <text x={x + fullW / 2} y={y + fullH + 20} textAnchor="middle" fontSize="14" fontWeight="700">{width} см</text>
      <text x={x - 8} y={y + fullH / 2} textAnchor="end" fontSize="14" fontWeight="700">{height} см</text>
      <text x={x + fullW + 8} y={y + cutHeight + (fullH - cutHeight) / 2} fontSize="14" fontWeight="700">{height - cutH} см</text>
    </svg>
  );
}

export function PythagorasTable({ question, shown, phase }) {
  const { row, col } = question.scene;
  const size = 10;
  const cells = [
    <div key="corner" className="pyth-cell pyth-head">×</div>,
  ];
  for (let header = 1; header <= size; header += 1) {
    cells.push(<div key={`c${header}`} className={`pyth-cell pyth-head ${header === col ? "is-on" : ""}`}>{header}</div>);
  }
  for (let r = 1; r <= size; r += 1) {
    cells.push(<div key={`r${r}`} className={`pyth-cell pyth-head ${r === row ? "is-on" : ""}`}>{r}</div>);
    for (let c = 1; c <= size; c += 1) {
      const blank = r === row && c === col;
      const value = phase === "reveal" ? row * col : shown;
      cells.push(
        <div key={`${r}-${c}`} className={`pyth-cell ${blank ? "is-blank" : ""} ${blank && phase === "flash" ? "is-bad" : ""} ${blank && phase === "reveal" ? "is-show" : ""}`} aria-label={blank ? `${r} умножить на ${c}` : undefined}>
          {blank ? value || "" : r * c}
        </div>,
      );
    }
  }
  return (
    <div className="pyth-task">
      <div className="pyth-top">
        <p className="prompt">{question.prompt}</p>
        <span className="pyth-level">1 пропуск</span>
      </div>
      <div className="pyth-wrap">
        <div className="pyth" role="grid" aria-label="Таблица умножения">{cells}</div>
      </div>
    </div>
  );
}

function MatrixFigure({ shape, color, label }) {
  const common = { fill: color, stroke: "#1c2b24", strokeWidth: 4 };
  return (
    <svg viewBox="0 0 80 80" className="matrix-figure" role="img" aria-label={label}>
      {shape === "circle" ? <circle cx="40" cy="40" r="24" {...common} /> : null}
      {shape === "square" ? <rect x="16" y="16" width="48" height="48" rx="4" {...common} /> : null}
      {shape === "triangle" ? <polygon points="40,12 68,66 12,66" {...common} /> : null}
    </svg>
  );
}

export function MatrixTask({ question, phase, dispatch, tried }) {
  const [shape, color] = question.answer.split("|");
  return (
    <div className="matrix-task">
      <p className="prompt">{question.prompt}</p>
      {question.speak ? <button type="button" className="btn secondary is-hidden" onClick={() => say(question.prompt)}>Прослушать задачу</button> : null}
      <div className="matrix-grid" role="img" aria-label="Таблица из фигур">
        {question.scene.cells.map((cell, index) => (
          <span key={index} className={`matrix-cell ${cell ? "" : "is-gap"} ${!cell && phase === "reveal" ? "is-filled" : ""}`}>
            {cell ? <MatrixFigure shape={cell.shape} color={cell.color} /> : phase === "reveal" ? <MatrixFigure shape={shape} color={color} /> : <span className="matrix-mark">?</span>}
          </span>
        ))}
      </div>
      <div className="matrix-choices">
        {question.choices.map((id) => {
          const [choiceShape, choiceColor] = id.split("|");
          return (
            <button
              key={id}
              type="button"
              className={`matrix-choice ${tried.includes(id) ? "is-wrong" : ""} ${phase === "reveal" && id === question.answer ? "is-right" : ""}`}
              disabled={phase !== "answer"}
              onClick={() => dispatch({ type: "choice", value: id })}
            >
              <MatrixFigure shape={choiceShape} color={choiceColor} label={id} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SchemeDots({ count, x, y, filled = true, crossedFrom = Infinity, start = 0 }) {
  const cols = Math.min(5, Math.max(count, 1));
  return Array.from({ length: count }, (_, index) => {
    const cx = x + 16 + (index % cols) * 26;
    const cy = y + 16 + Math.floor(index / cols) * 26;
    const gone = index >= crossedFrom;
    return (
      <g key={`${x}-${index}`}>
        <circle cx={cx} cy={cy} r="10" className={gone ? "scheme-gone" : filled ? "scheme-dot" : "scheme-dot is-second"} style={{ "--i": start + index }} />
        {gone ? <path d={`M${cx - 7} ${cy + 7} L${cx + 7} ${cy - 7}`} className="scheme-cross" /> : null}
      </g>
    );
  });
}

function NumberStrip({ parts, top, aria, topSolved = false }) {
  const sum = parts.reduce((total, part) => total + part.value, 0) || 1;
  const x0 = 28;
  const inner = 400;
  const min = 84;
  const spare = Math.max(0, inner - parts.length * min);
  const widths = parts.map((part) => min + spare * (part.value / sum));
  const y = 62;
  const height = 36;
  const end = x0 + inner;
  const brace = (x1, x2, line, tick) => `M${x1} ${line} H${x2} M${x1} ${line} V${tick} M${x2} ${line} V${tick}`;
  let cursor = x0;
  const placed = widths.map((width, index) => {
    const box = { ...parts[index], x: cursor, w: width };
    cursor += width;
    return box;
  });
  return (
    <svg className="scheme-draw" viewBox={`0 0 ${end + x0} 156`} role="img" aria-label={aria}>
      <path d={brace(x0, end, 32, 46)} className="scheme-brace" />
      <text x={(x0 + end) / 2} y="20" textAnchor="middle" className={`scheme-label ${topSolved ? "is-solved" : ""}`}>{top}</text>
      {placed.map((part, index) => (
        <g key={index}>
          <rect x={part.x} y={y} width={part.w} height={height} className={`scheme-frame is-bar ${part.tone || ""}`} style={{ "--i": index }} />
          <path d={brace(part.x + 6, part.x + part.w - 6, y + height + 18, y + height + 6)} className="scheme-brace" />
          <text x={part.x + part.w / 2} y={y + height + 42} textAnchor="middle" className={`scheme-label ${part.solved ? "is-solved" : ""}`}>{part.label}</text>
        </g>
      ))}
    </svg>
  );
}

export function StorySchemeButton({ scene, solved = false }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (solved) setOpen(true);
  }, [solved, scene.a, scene.b, scene.result]);
  const answer = solved ? String(scene.result ?? "") : "";
  return (
    <>
      <button type="button" className="btn secondary" aria-expanded={open} onClick={() => setOpen((value) => !value)}>Схема</button>
      {open ? <StoryScheme scene={scene} solved={answer} /> : null}
    </>
  );
}

function CompareScheme({ a, b, solved }) {
  const max = Math.max(a, b, 1);
  const scale = 300 / max;
  const widthA = Math.max(56, a * scale);
  const widthB = Math.max(56, b * scale);
  const longer = a >= b;
  const mark = solved || "?";
  return (
    <svg className="scheme-draw" viewBox="0 0 460 150" role="img" aria-label={solved ? `Схема: разница ${solved}` : `Схема: ${a} и ${b}, разница неизвестна`}>
      <text x="16" y="48" className="scheme-label">{a}</text>
      <rect x="64" y="28" width={widthA} height="28" className="scheme-frame is-bar" style={{ "--i": 0 }} />
      {longer && a !== b ? <text x={72 + widthA} y="48" className={`scheme-label ${solved ? "is-solved" : ""}`}>{mark}</text> : null}
      <text x="16" y="108" className="scheme-label">{b}</text>
      <rect x="64" y="88" width={widthB} height="28" className="scheme-frame is-bar is-second" style={{ "--i": 1 }} />
      {!longer && a !== b ? <text x={72 + widthB} y="108" className={`scheme-label ${solved ? "is-solved" : ""}`}>{mark}</text> : null}
    </svg>
  );
}

function JoinScheme({ a, b, c, solved }) {
  const parts = [
    { value: Math.max(a, 1), label: String(a) },
    { value: Math.max(b, 1), label: String(b), tone: "is-second" },
  ];
  if (c) parts.push({ value: Math.max(c, 1), label: String(c), tone: "is-dashed" });
  if (c || a > 10 || b > 10) {
    return (
      <NumberStrip
        top={solved || "?"}
        topSolved={Boolean(solved)}
        aria={solved ? `Схема: всего ${solved}` : `Схема: ${a} плюс ${b}, всего неизвестно`}
        parts={parts}
      />
    );
  }
  const box = (count) => ({ w: Math.min(5, Math.max(count, 1)) * 26 + 18, h: Math.ceil(Math.max(count, 1) / 5) * 26 + 18 });
  const left = box(a);
  const right = box(b);
  const gap = 54;
  const x0 = 36;
  const top = 58;
  const height = Math.max(left.h, right.h);
  const total = left.w + gap + right.w;
  const width = x0 + total + 36;
  const mid = x0 + left.w + gap / 2;
  return (
    <svg className="scheme-draw" viewBox={`0 0 ${width} ${top + height + 48}`} role="img" aria-label={solved ? `Схема: всего ${solved}` : `Схема: ${a} плюс ${b}, всего неизвестно`}>
      <path d={`M${x0} 36 H${x0 + total} M${x0} 36 V48 M${x0 + total} 36 V48`} className="scheme-brace" />
      <text x={x0 + total / 2} y="24" textAnchor="middle" className={`scheme-label ${solved ? "is-solved" : ""}`}>{solved || "?"}</text>
      <rect x={x0} y={top} width={left.w} height={left.h} rx="12" className="scheme-frame" />
      <rect x={x0 + left.w + gap} y={top + (height - right.h) / 2} width={right.w} height={right.h} rx="12" className="scheme-frame is-second" />
      <SchemeDots count={a} x={x0 + 4} y={top + 4} />
      <SchemeDots count={b} x={x0 + left.w + gap + 4} y={top + (height - right.h) / 2 + 4} filled={false} start={a} />
      <path d={`M${mid - 10} ${top + height / 2} h20 M${mid} ${top + height / 2 - 10} v20`} className="scheme-plus" />
      <text x={x0 + left.w / 2} y={top + height + 28} textAnchor="middle" className="scheme-label">{a}</text>
      <text x={x0 + left.w + gap + right.w / 2} y={top + height + 28} textAnchor="middle" className="scheme-label">{b}</text>
    </svg>
  );
}

function RemoveScheme({ total, taken, solved }) {
  const rest = Math.max(0, total - taken);
  const mark = solved || "?";
  const parts = [];
  if (rest > 0) parts.push({ value: rest, label: mark, solved: Boolean(solved) });
  if (taken > 0) parts.push({ value: taken, label: String(taken), tone: "is-dashed" });
  return <NumberStrip top={String(total)} aria={solved ? `Схема: осталось ${solved}` : `Схема: было ${total}, убрали ${taken}, осталось неизвестно`} parts={parts.length ? parts : [{ value: 1, label: mark, solved: Boolean(solved) }]} />;
}

function RelationScheme({ scene, solved }) {
  const names = scene.names || ["1-я", "2-я"];
  const a = Math.max(0, Number(scene.a) || 0);
  const extra = Math.max(0, Number(scene.b) || 0);
  const mode = scene.mode;
  const less = mode === "less" || scene.less;
  const times = mode === "times" ? Math.max(1, extra) : 0;
  const second = mode === "more" ? a + extra : mode === "less" ? Math.max(a - extra, 0) : mode === "compare" ? extra : mode === "times" ? (less ? Math.round(a / times) : a * times) : extra;
  const knownSecond = mode === "compare" ? extra : mode === "less" ? a : mode === "times" && less ? a : a;
  const max = Math.max(a, second, knownSecond, 1);
  const scale = 250 / max;
  const width = (value) => Math.max(28, value * scale);
  const mark = solved || "?";
  const phrase = scene.diffText || "";
  const barAt = (y, w, tone, i) => <rect x="148" y={y} width={w} height="30" className={`scheme-frame is-bar ${tone || ""}`} style={{ "--i": i }} />;
  let rows;
  if (mode === "less") {
    const whole = width(a);
    const left = width(Math.max(a - extra, 1));
    rows = (
      <>
        <text x="8" y="58" className="scheme-label scheme-name">{names[0]}</text>
        {barAt(36, whole, "", 0)}
        <text x={158 + whole} y="58" className="scheme-label">{a}</text>
        <text x="8" y="136" className="scheme-label scheme-name">{names[1]}</text>
        {barAt(114, left, "is-second", 1)}
        <path d={`M${148 + left} 108 H${148 + whole} M${148 + left} 108 V118 M${148 + whole} 108 V118`} className="scheme-brace" />
        <text x={148 + (left + whole) / 2} y="100" textAnchor="middle" className="scheme-label">{phrase}</text>
        <text x={158 + left} y="136" className={`scheme-label ${solved ? "is-solved" : ""}`}>{mark}</text>
      </>
    );
  } else if (mode === "more") {
    const base = width(a);
    const added = Math.max(24, width(extra));
    rows = (
      <>
        <text x="8" y="58" className="scheme-label scheme-name">{names[0]}</text>
        {barAt(36, base, "", 0)}
        <text x={158 + base} y="58" className="scheme-label">{a}</text>
        <text x="8" y="136" className="scheme-label scheme-name">{names[1]}</text>
        {barAt(114, base, "is-second", 1)}
        <rect x={148 + base} y="114" width={added} height="30" className="scheme-frame is-bar is-dashed" style={{ "--i": 2 }} />
        <path d={`M${148 + base} 156 H${148 + base + added} M${148 + base} 156 V146 M${148 + base + added} 156 V146`} className="scheme-brace" />
        <text x={148 + base + added / 2} y="174" textAnchor="middle" className="scheme-label">{phrase}</text>
        <text x={158 + base + added} y="136" className={`scheme-label ${solved ? "is-solved" : ""}`}>{mark}</text>
      </>
    );
  } else if (mode === "times") {
    const piece = width(less ? second : a);
    const copies = less ? times : times;
    rows = (
      <>
        <text x="8" y="58" className="scheme-label scheme-name">{names[0]}</text>
        {barAt(36, less ? piece * copies : piece, "", 0)}
        <text x={158 + (less ? piece * copies : piece)} y="58" className="scheme-label">{less ? a : a}</text>
        <text x="8" y="136" className="scheme-label scheme-name">{names[1]}</text>
        {Array.from({ length: less ? 1 : copies }, (_, index) => (
          <rect key={index} x={148 + index * (piece + 6)} y="114" width={piece} height="30" className="scheme-frame is-bar is-second" style={{ "--i": index + 1 }} />
        ))}
        <text x="300" y="174" textAnchor="middle" className="scheme-label">{phrase}</text>
        <text x={158 + (less ? piece : copies * (piece + 6))} y="136" className={`scheme-label ${solved ? "is-solved" : ""}`}>{mark}</text>
      </>
    );
  } else {
    const wa = width(a);
    const wb = width(extra);
    const longer = a >= extra ? wa : wb;
    const shorter = a >= extra ? wb : wa;
    const diff = Math.max(18, longer - shorter);
    const start = 148 + shorter;
    rows = (
      <>
        <text x="8" y="58" className="scheme-label scheme-name">{names[0]}</text>
        {barAt(36, wa, "", 0)}
        <text x={158 + wa} y="58" className="scheme-label">{a}</text>
        <text x="8" y="136" className="scheme-label scheme-name">{names[1]}</text>
        {barAt(114, wb, "is-second", 1)}
        <text x={158 + wb} y="136" className="scheme-label">{extra}</text>
        <path d={`M${start} 156 H${start + diff} M${start} 156 V146 M${start + diff} 156 V146`} className="scheme-brace" />
        <text x={start + diff / 2} y="176" textAnchor="middle" className={`scheme-label ${solved ? "is-solved" : ""}`}>{phrase ? `${phrase}: ${mark}` : mark}</text>
      </>
    );
  }
  return (
    <svg className="scheme-draw" viewBox="0 0 520 190" role="img" aria-label={solved ? `Схема: ${solved}` : "Схема сравнения"}>
      {rows}
    </svg>
  );
}

function FactTable({ heads, cells, solved }) {
  return (
    <table className="fact-table">
      <thead>
        <tr>{heads.map((head) => <th key={head}>{head}</th>)}</tr>
      </thead>
      <tbody>
        <tr>
          {cells.map((cell, index) => (
            <td key={index} className={cell === "?" ? (solved ? "is-solved" : "is-ask") : ""}>{cell === "?" ? (solved || "?") : cell}</td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function RouteScheme({ scene, solved }) {
  const speeds = scene.speeds || [0, 0];
  const times = scene.times || [0, 0];
  const mark = solved || "?";
  return (
    <svg className="scheme-draw" viewBox="0 0 520 150" role="img" aria-label="Схема пути">
      <path d="M40 78 H470" className="scheme-brace" />
      <path d="M40 78 l14 -8 M40 78 l14 8 M250 78 l14 -8 M250 78 l14 8 M470 78 l-14 -8 M470 78 l-14 8" className="scheme-brace" />
      <text x="145" y="58" textAnchor="middle" className="scheme-label">t = {times[0]} ч</text>
      <text x="145" y="108" textAnchor="middle" className="scheme-label">v = {speeds[0]} км/ч</text>
      <text x="360" y="58" textAnchor="middle" className="scheme-label">t = {times[1]} ч</text>
      <text x="360" y="108" textAnchor="middle" className="scheme-label">v = {speeds[1]} км/ч</text>
      <text x="250" y="28" textAnchor="middle" className={`scheme-label ${solved ? "is-solved" : ""}`}>s = {mark}</text>
    </svg>
  );
}

function ChainScheme({ scene, solved }) {
  const names = scene.names || ["Сын", "Брат", "Мама"];
  const son = Number(scene.a) || 0;
  const older = Number(scene.b) || 0;
  const times = Number(scene.c) || 1;
  const mark = solved || "?";
  const rows = [
    [names[0], String(son), 70],
    [names[1], "", 110],
    [names[2], mark, 160],
  ];
  return (
    <svg className="scheme-draw" viewBox="0 0 460 180" role="img" aria-label="Схема: сын, брат, мама">
      {rows.map(([name, label, width], index) => (
        <g key={name}>
          <text x="8" y={40 + index * 52} className="scheme-label scheme-name">{name}</text>
          <rect x="90" y={22 + index * 52} width={width} height="26" className="scheme-frame is-bar" style={{ "--i": index }} />
          <text x={100 + width} y={40 + index * 52} className={`scheme-label ${label === mark ? "is-solved" : ""}`}>{label}</text>
        </g>
      ))}
      <text x="230" y="92" className="scheme-label">на {older} старше</text>
      <text x="280" y="144" className="scheme-label">в {times} раза</text>
    </svg>
  );
}

function StoryScheme({ scene, solved }) {
  const a = Number(scene.a) || 0;
  const b = Number(scene.b) || 0;
  const c = Number(scene.c) || 0;
  const mode = scene.mode;
  if (mode === "more" || mode === "less" || mode === "compare" || mode === "times") return <RelationScheme scene={scene} solved={solved} />;
  if (mode === "remove") return <RemoveScheme total={a} taken={b} solved={solved} />;
  if (mode === "price") return <FactTable heads={["Цена", "Количество", "Стоимость"]} cells={scene.cells || ["?", "?", "?"]} solved={solved} />;
  if (mode === "work") return <FactTable heads={["Производительность", "Время", "Работа"]} cells={scene.cells || ["?", "?", "?"]} solved={solved} />;
  if (mode === "route") return <RouteScheme scene={scene} solved={solved} />;
  if (mode === "chain") return <ChainScheme scene={scene} solved={solved} />;
  if (mode === "leave2" || mode === "twostep" || mode === "join3") {
    const given = [a, b, c].filter((value) => value);
    return (
      <NumberStrip
        top={solved || "?"}
        topSolved={Boolean(solved)}
        aria={solved ? `Схема: ${solved}` : "Схема в два действия"}
        parts={given.map((value, index) => ({ value: Math.max(value, 1), label: String(value), tone: index ? "is-second" : "" }))}
      />
    );
  }
  if (mode === "parts") {
    return (
      <NumberStrip
        top={String(scene.top ?? a + b)}
        aria={solved ? `Схема: неизвестная часть ${solved}` : "Схема: одна часть неизвестна"}
        parts={[
          { value: Math.max(a, 1), label: scene.unknown === "a" ? (solved || "?") : String(a), solved: scene.unknown === "a" && Boolean(solved) },
          { value: Math.max(b, 1), label: scene.unknown !== "a" ? (solved || "?") : String(b), tone: "is-second", solved: scene.unknown !== "a" && Boolean(solved) },
        ]}
      />
    );
  }
  if (mode === "leave" && scene.unknown === "b" && scene.top != null) {
    const total = Number(scene.top);
    const known = a;
    const missing = Math.max(total - known, 0);
    return (
      <NumberStrip
        top={String(total)}
        aria={solved ? `Схема: ушло ${solved}` : `Схема: было ${total}, осталось ${known}, ушло неизвестно`}
        parts={[
          { value: Math.max(known, 1), label: String(known) },
          { value: Math.max(missing, 1), label: solved || "?", tone: "is-second", solved: Boolean(solved) },
        ]}
      />
    );
  }
  if (mode === "leave") {
    return (
      <NumberStrip
        top={solved || "?"}
        topSolved={Boolean(solved)}
        aria={solved ? `Схема: было ${solved}` : "Схема: было неизвестно"}
        parts={[
          { value: Math.max(a, 1), label: String(a) },
          { value: Math.max(b, 1), label: String(b), tone: "is-second" },
        ]}
      />
    );
  }
  if (mode === "groups" || mode === "split") {
    const count = Math.max(1, Math.min(b, 8));
    return (
      <NumberStrip
        top={mode === "split" ? String(scene.top ?? a * b) : (solved || "?")}
        topSolved={mode !== "split" && Boolean(solved)}
        aria={solved ? `Схема: ${solved}` : "Схема: произведение неизвестно"}
        parts={Array.from({ length: count }, () => ({
          value: Math.max(a, 1),
          label: mode === "split" ? (solved || "?") : String(a),
          solved: mode === "split" && Boolean(solved),
        }))}
      />
    );
  }
  return <JoinScheme a={a} b={b} c={c || undefined} solved={solved} />;
}

function say(text) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ru-RU";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

function StoryGlyph({ kind }) {
  const ink = { fill: "none", stroke: "#1c2b24", strokeWidth: 3, strokeLinejoin: "round", strokeLinecap: "round" };
  if (kind === "pear") {
    return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 14c8 0 10 8 8 14 8 4 10 16 2 24-8 8-22 8-28 0-6-8-2-20 6-24-2-8 2-14 12-14z" fill="#c6e27a" stroke="#1c2b24" strokeWidth="3" /><path d="M32 14c2-6 8-8 10-6" {...ink} /></svg>;
  }
  if (kind === "apple" || kind === "berry" || kind === "tomato") {
    const fill = kind === "apple" ? "#d23b32" : kind === "tomato" ? "#e23b32" : "#c4234a";
    return <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="36" r="16" fill={fill} stroke="#1c2b24" strokeWidth="3" /><path d="M32 20c2-6 8-8 12-6" {...ink} />{kind === "tomato" ? <path d="M24 22h16" {...ink} /> : null}</svg>;
  }
  if (kind === "bus" || kind === "car") {
    const body = kind === "bus" ? { x: 10, y: 18, w: 44, h: 22 } : { x: 8, y: 26, w: 48, h: 16 };
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect x={body.x} y={body.y} width={body.w} height={body.h} rx="4" fill={kind === "bus" ? "#f0b14a" : "#7eb6e0"} stroke="#1c2b24" strokeWidth="3" />
        {kind === "car" ? <path d="M18 26l6-8h16l6 8" fill="#d7f3ff" stroke="#1c2b24" strokeWidth="3" /> : <rect x="16" y="22" width="10" height="8" fill="#fff" stroke="#1c2b24" strokeWidth="2" />}
        <circle cx="22" cy="44" r="5" fill="#1c2b24" />
        <circle cx="44" cy="44" r="5" fill="#1c2b24" />
      </svg>
    );
  }
  if (kind === "flower") {
    return <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="26" r="7" fill="#f3a6c8" stroke="#1c2b24" strokeWidth="2" /><circle cx="32" cy="14" r="6" fill="#f3a6c8" stroke="#1c2b24" strokeWidth="2" /><circle cx="20" cy="22" r="6" fill="#f3a6c8" stroke="#1c2b24" strokeWidth="2" /><circle cx="44" cy="22" r="6" fill="#f3a6c8" stroke="#1c2b24" strokeWidth="2" /><circle cx="24" cy="34" r="6" fill="#f3a6c8" stroke="#1c2b24" strokeWidth="2" /><circle cx="40" cy="34" r="6" fill="#f3a6c8" stroke="#1c2b24" strokeWidth="2" /><circle cx="32" cy="26" r="4" fill="#f6c14b" stroke="#1c2b24" strokeWidth="2" /><path d="M32 40v14" {...ink} /></svg>;
  }
  if (kind === "bun") return <svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="36" rx="18" ry="12" fill="#f0b14a" stroke="#1c2b24" strokeWidth="3" /><path d="M18 34c6-8 22-8 28 0" {...ink} /></svg>;
  if (kind === "candy") return <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="22" y="24" width="20" height="16" rx="4" fill="#f3a6c8" stroke="#1c2b24" strokeWidth="3" /><path d="M22 32l-10-6v12zM42 32l10-6v12z" fill="#e15b49" stroke="#1c2b24" strokeWidth="3" /></svg>;
  if (kind === "people") return <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="18" r="8" fill="#f6c14b" stroke="#1c2b24" strokeWidth="3" /><path d="M18 50c2-14 8-18 14-18s12 4 14 18" fill="#7ec8e3" stroke="#1c2b24" strokeWidth="3" /></svg>;
  if (kind === "bird") return <svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="30" cy="34" rx="14" ry="10" fill="#7eb6e0" stroke="#1c2b24" strokeWidth="3" /><path d="M20 32c8-12 18-8 16 2" fill="#f6c14b" stroke="#1c2b24" strokeWidth="3" /><path d="M42 32h10l-5 5z" fill="#e07a1f" stroke="#1c2b24" strokeWidth="3" /><path d="M24 44v8M34 44v8" fill="none" stroke="#1c2b24" strokeWidth="3" /><circle cx="38" cy="32" r="2" fill="#1c2b24" /></svg>;
  if (kind === "fish") return <svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="34" cy="32" rx="16" ry="10" fill="#d7f3ff" stroke="#1c2b24" strokeWidth="3" /><path d="M18 32l-8-8v16z" fill="#7ec8e3" stroke="#1c2b24" strokeWidth="3" /><circle cx="42" cy="30" r="2" fill="#1c2b24" /></svg>;
  if (kind === "pencil") return <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="26" width="36" height="12" fill="#f6c14b" stroke="#1c2b24" strokeWidth="3" /><path d="M44 26l12 6-12 6z" fill="#f3a6c8" stroke="#1c2b24" strokeWidth="3" /></svg>;
  if (kind === "cloth") return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 18h40v22H12z" fill="#f3a6c8" stroke="#1c2b24" strokeWidth="3" /><path d="M12 40c8 8 32 8 40 0" fill="#e7c36a" stroke="#1c2b24" strokeWidth="3" /></svg>;
  if (kind === "box") return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 24h36v22H14z" fill="#e7c36a" stroke="#1c2b24" strokeWidth="3" /><path d="M14 24l18-8 18 8" {...ink} /></svg>;
  if (kind === "balloon") return <svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="26" rx="14" ry="16" fill="#e23b32" stroke="#1c2b24" strokeWidth="3" /><path d="M32 42v12M28 54h8" {...ink} /></svg>;
  if (kind === "cone") return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 12l16 36H16z" fill="#c4922e" stroke="#1c2b24" strokeWidth="3" /><path d="M22 30h20M24 40h16" {...ink} /></svg>;
  if (kind === "duck") return <svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="30" cy="38" rx="16" ry="10" fill="#f6c14b" stroke="#1c2b24" strokeWidth="3" /><circle cx="44" cy="28" r="8" fill="#f6c14b" stroke="#1c2b24" strokeWidth="3" /><path d="M50 28h8l-4 4z" fill="#e07a1f" stroke="#1c2b24" strokeWidth="3" /></svg>;
  if (kind === "coin") return <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="16" fill="#f0b14a" stroke="#1c2b24" strokeWidth="3" /><circle cx="32" cy="32" r="8" fill="none" stroke="#1c2b24" strokeWidth="3" /></svg>;
  if (kind === "stamp") return <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="16" y="16" width="32" height="32" fill="#fff" stroke="#1c2b24" strokeWidth="3" /><circle cx="32" cy="32" r="8" fill="#7eb6e0" stroke="#1c2b24" strokeWidth="3" /></svg>;
  if (kind === "butterfly") return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M30 32c-12-16-20-8-16 4s12 12 16 0zM34 32c12-16 20-8 16 4s-12 12-16 0z" fill="#f3a6c8" stroke="#1c2b24" strokeWidth="3" /><path d="M32 24v24" {...ink} /></svg>;
  if (kind === "tree") return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 10l16 20H16zM32 22l18 22H14z" fill="#3c9a48" stroke="#1c2b24" strokeWidth="3" /><path d="M28 44h8v10h-8z" fill="#c4922e" stroke="#1c2b24" strokeWidth="3" /></svg>;
  if (kind === "ball") return <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="16" fill="#e23b32" stroke="#1c2b24" strokeWidth="3" /><path d="M32 16v32M16 32h32" {...ink} /></svg>;
  return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 16h16c2 8 2 20 0 30H14z" fill="#7eb6e0" stroke="#1c2b24" strokeWidth="3" /><path d="M30 16h20v30H30c-2-8-2-22 0-30z" fill="#f6d98a" stroke="#1c2b24" strokeWidth="3" /></svg>;
}

export function StoryPicture({ kind, count = 4 }) {
  const total = Math.max(1, Math.min(Number(count) || 4, 6));
  return (
    <div className="story-picture" role="img" aria-label="Рисунок к задаче">
      {Array.from({ length: total }, (_, index) => <StoryGlyph key={index} kind={kind} />)}
    </div>
  );
}

export function SolutionBlock({ solution, onNext }) {
  const steps = solution?.steps || [];
  const line = solution?.answerLine || "";
  if (!steps.length && !line) return null;
  return (
    <div className="solution">
      <p className="solution-title"><strong>Решение</strong></p>
      <ol>
        {steps.map((step) => <li key={step}>{step}</li>)}
        {line ? <li className="solution-answer"><strong>{line}</strong></li> : null}
      </ol>
      {onNext ? <button type="button" className="btn secondary" onClick={onNext}>ДАЛЕЕ</button> : null}
    </div>
  );
}

export function StoryTask({ question, shown, phase, showSolution, dispatch }) {
  const scene = question.scene || {};
  const [open, setOpen] = useState(Boolean(question.inlineScheme));
  const solved = phase === "reveal" || showSolution ? String(scene.result ?? question.answer) : "";
  const steps = showSolution && question.solution ? question.solution : null;
  useEffect(() => setOpen(Boolean(question.inlineScheme)), [question.answer, question.prompt, question.inlineScheme]);
  useEffect(() => {
    if ((phase === "reveal" || showSolution) && question.scheme !== false) setOpen(true);
  }, [phase, showSolution, question.answer, question.prompt, question.scheme]);
  const pictureOn = !open && phase !== "reveal";
  return (
    <div className="story-task">
      {pictureOn ? <StoryPicture kind={scene.picture} count={Math.min(scene.a || 4, 6)} /> : null}
      <p className="prompt">{question.prompt}</p>
      <div className="story-tools">
        <button type="button" className="btn secondary is-hidden" onClick={() => say(question.prompt)}>Прослушать задачу</button>
        {question.scheme !== false ? <button type="button" className="btn secondary" aria-expanded={open} onClick={() => setOpen((value) => !value)}>Схема</button> : null}
        <button type="button" className="btn secondary" onClick={() => dispatch?.({ type: "explain" })}>Показать решение</button>
      </div>
      {open ? (
        <div className="story-scheme">
          <StoryScheme scene={scene} solved={solved} />
        </div>
      ) : null}
      {steps ? <SolutionBlock solution={steps} onNext={dispatch ? () => dispatch({ type: "next" }) : null} /> : null}
      <div className="eq">
        <span className="lead">Ответ</span>
        <span className={`blank ${phase === "flash" ? "is-bad" : ""} ${phase === "reveal" ? "is-show" : ""}`}>{shown || "\u00a0"}</span>
        {question.unit && (shown || phase === "reveal") ? <span className="num">{question.unit}</span> : null}
      </div>
    </div>
  );
}
