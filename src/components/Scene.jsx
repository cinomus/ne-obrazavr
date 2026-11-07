function Glyph({ kind }) {
  if (kind === "star") {
    return (
      <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true">
        <polygon points="32,6 39,24 58,24 43,36 49,54 32,43 15,54 21,36 6,24 25,24" fill="#f5b42a" stroke="#1c2b24" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "beaver" || kind === "fox" || kind === "hedgehog") {
    const fill = kind === "fox" ? "#e07a1f" : kind === "hedgehog" ? "#c4922e" : "#8a5a3a";
    return (
      <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="36" r="18" fill={fill} stroke="#1c2b24" strokeWidth="3" />
        <circle cx="25" cy="34" r="3" fill="#1c2b24" />
        <circle cx="39" cy="34" r="3" fill="#1c2b24" />
        <path d={kind === "fox" ? "M16 28 L24 18 L28 30 M48 28 L40 18 L36 30" : "M18 24 q6 -12 14 0 M32 24 q6 -12 14 0"} fill={fill} stroke="#1c2b24" strokeWidth="3" />
      </svg>
    );
  }
  if (kind === "horse") {
    return (
      <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M14 40 h28 l6 10 H18 z" fill="#c4922e" stroke="#1c2b24" strokeWidth="3" />
        <path d="M36 40 V22 h10 l4 10" fill="#e7c36a" stroke="#1c2b24" strokeWidth="3" />
        <circle cx="44" cy="24" r="2" fill="#1c2b24" />
      </svg>
    );
  }
  if (kind === "pig") {
    return (
      <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true">
        <ellipse cx="32" cy="36" rx="18" ry="14" fill="#f3a6c8" stroke="#1c2b24" strokeWidth="3" />
        <ellipse cx="32" cy="40" rx="6" ry="4" fill="#e58aa8" stroke="#1c2b24" strokeWidth="2" />
      </svg>
    );
  }
  if (kind === "radish") {
    return (
      <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 18 q14 10 8 28 q-8 12 -8 12 q0 0 -8 -12 q-6-18 8-28z" fill="#e23b32" stroke="#1c2b24" strokeWidth="3" />
        <path d="M28 18 q4 -10 10 -8" fill="none" stroke="#2d6a38" strokeWidth="3" />
      </svg>
    );
  }
  if (kind === "hat") {
    return (
      <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true">
        <ellipse cx="32" cy="40" rx="24" ry="8" fill="#3d4c8a" stroke="#1c2b24" strokeWidth="3" />
        <path d="M18 40 V28 q14 -16 28 0 V40" fill="#6d7cc4" stroke="#1c2b24" strokeWidth="3" />
      </svg>
    );
  }
  if (kind === "cube") {
    return (
      <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true">
        <polygon points="10,24 32,12 54,24 32,36" fill="#ffe3a3" stroke="#1c2b24" strokeWidth="3" strokeLinejoin="round" />
        <polygon points="10,24 32,36 32,56 10,44" fill="#f0b14a" stroke="#1c2b24" strokeWidth="3" strokeLinejoin="round" />
        <polygon points="32,36 54,24 54,44 32,56" fill="#c4840a" stroke="#1c2b24" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M33 16c2-7 8-10 12-8" fill="none" stroke="#2d6a38" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="42" cy="16" rx="8" ry="4" fill="#3c9a48" transform="rotate(-32 42 16)" />
      <path d="M32 18c-13 1-21 11-21 23 0 11 9 19 21 19s21-8 21-19c0-12-8-22-21-23z" fill="#e23b32" />
    </svg>
  );
}

function CountRow({ count, kind = "apple", ghost = 0 }) {
  return (
    <div className="count-row">
      {Array.from({ length: count }, (_, index) => (
        <Glyph key={index} kind={kind} />
      ))}
      {Array.from({ length: ghost }, (_, index) => (
        <span key={`g${index}`} className="ghost-slot" />
      ))}
    </div>
  );
}

function ClockFace({ hour, minute = 0, onHand }) {
  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const minuteAngle = minute * 6;
  const point = (angle, length) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return [110 + length * Math.cos(rad), 110 + length * Math.sin(rad)];
  };
  const [hx, hy] = point(hourAngle, 48);
  const [mx, my] = point(minuteAngle, 68);
  const numbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  return (
    <svg className="clock-face" viewBox="0 0 220 220" role="img" aria-label="Часы">
      <circle cx="110" cy="110" r="100" fill="#fffdf8" stroke="#1c2b24" strokeWidth="8" />
      {numbers.map((num, index) => {
        const [x, y] = point(index * 30, 78);
        return (
          <text key={num} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="16" fontWeight="800" fill="#1c2b24">
            {num}
          </text>
        );
      })}
      <line x1="110" y1="110" x2={hx} y2={hy} stroke="#1c2b24" strokeWidth="8" strokeLinecap="round" />
      <line x1="110" y1="110" x2={mx} y2={my} stroke="#1b7c8c" strokeWidth="5" strokeLinecap="round" />
      {onHand ? (
        <>
          <line className="hand-hit" x1="110" y1="110" x2={hx} y2={hy} stroke="transparent" strokeWidth="28" strokeLinecap="round" onClick={() => onHand("hour")} />
          <line className="hand-hit" x1="110" y1="110" x2={mx} y2={my} stroke="transparent" strokeWidth="22" strokeLinecap="round" onClick={() => onHand("minute")} />
        </>
      ) : null}
      <circle cx="110" cy="110" r="7" fill="#e15b49" />
    </svg>
  );
}

function ShapeIcon({ id }) {
  if (id === "circle") return <svg viewBox="0 0 80 80" className="shape-icon" aria-hidden="true"><circle cx="40" cy="40" r="26" fill="#f6c14b" stroke="#1c2b24" strokeWidth="4" /></svg>;
  if (id === "square") return <svg viewBox="0 0 80 80" className="shape-icon" aria-hidden="true"><rect x="16" y="16" width="48" height="48" fill="#7ec8e3" stroke="#1c2b24" strokeWidth="4" /></svg>;
  if (id === "rectangle") return <svg viewBox="0 0 80 80" className="shape-icon" aria-hidden="true"><rect x="10" y="24" width="60" height="32" fill="#f3a6c8" stroke="#1c2b24" strokeWidth="4" /></svg>;
  if (id === "triangle") return <svg viewBox="0 0 80 80" className="shape-icon" aria-hidden="true"><polygon points="40,12 70,66 10,66" fill="#8fd18a" stroke="#1c2b24" strokeWidth="4" strokeLinejoin="round" /></svg>;
  if (id === "rhombus") return <svg viewBox="0 0 80 80" className="shape-icon" aria-hidden="true"><polygon points="40,8 68,40 40,72 12,40" fill="#f3a6c8" stroke="#1c2b24" strokeWidth="4" strokeLinejoin="round" /></svg>;
  if (id === "pyramid") return <svg viewBox="0 0 80 80" className="shape-icon" aria-hidden="true"><polygon points="40,10 66,62 14,62" fill="#e7c36a" stroke="#1c2b24" strokeWidth="4" /><polygon points="40,10 66,62 40,50" fill="#c4922e" stroke="#1c2b24" strokeWidth="3" /></svg>;
  if (id === "sphere") return <svg viewBox="0 0 80 80" className="shape-icon" aria-hidden="true"><circle cx="40" cy="40" r="26" fill="#f28b82" stroke="#1c2b24" strokeWidth="4" /><ellipse cx="40" cy="40" rx="26" ry="8" fill="none" stroke="#1c2b24" strokeWidth="3" /></svg>;
  if (id === "box") return <svg viewBox="0 0 80 80" className="shape-icon" aria-hidden="true"><polygon points="18,30 40,18 62,30 40,42" fill="#ffe3a3" stroke="#1c2b24" strokeWidth="3" /><polygon points="18,30 40,42 40,64 18,52" fill="#f0b14a" stroke="#1c2b24" strokeWidth="3" /><polygon points="40,42 62,30 62,52 40,64" fill="#c4840a" stroke="#1c2b24" strokeWidth="3" /></svg>;
  if (id === "cone") return <svg viewBox="0 0 80 80" className="shape-icon" aria-hidden="true"><polygon points="40,10 66,62 14,62" fill="#f6c14b" stroke="#1c2b24" strokeWidth="4" strokeLinejoin="round" /><ellipse cx="40" cy="62" rx="26" ry="8" fill="#e0a020" stroke="#1c2b24" strokeWidth="3" /></svg>;
  if (id === "right") return <svg viewBox="0 0 80 80" className="shape-icon" aria-hidden="true"><path d="M18 62 V22 H58" fill="none" stroke="#1c2b24" strokeWidth="6" strokeLinejoin="round" /><rect x="18" y="46" width="16" height="16" fill="none" stroke="#1b7c8c" strokeWidth="3" /></svg>;
  if (id === "acute") return <svg viewBox="0 0 80 80" className="shape-icon" aria-hidden="true"><path d="M16 64 L40 14 L64 64" fill="none" stroke="#1c2b24" strokeWidth="6" strokeLinejoin="round" /></svg>;
  return <svg viewBox="0 0 80 80" className="shape-icon" aria-hidden="true"><path d="M10 28 H70 L48 64" fill="none" stroke="#1c2b24" strokeWidth="6" strokeLinejoin="round" /></svg>;
}

export function Scene({ scene }) {
  if (!scene) return null;
  if (scene.kind === "row") {
    return (
      <div className="seq-row">
        {scene.values.map((value, index) => (
          <span key={index} className={index === scene.hide ? "seq-gap" : "seq-cell"}>{index === scene.hide ? "" : value}</span>
        ))}
      </div>
    );
  }
  if (scene.kind === "grid") {
    return (
      <div className="num-grid" style={{ gridTemplateColumns: `repeat(${scene.columns}, minmax(0, 1fr))` }}>
        {scene.values.map((value) => (
          <span key={value} className={value === scene.hide ? "seq-gap" : "seq-cell"}>{value === scene.hide ? "" : value}</span>
        ))}
      </div>
    );
  }
  if (scene.kind === "count") return <CountRow count={scene.count} kind={scene.glyph || "apple"} ghost={scene.ghost || 0} />;
  if (scene.kind === "clock") {
    return (
      <div>
        {scene.part ? <p className="chart-title">{scene.part}</p> : null}
        <ClockFace hour={scene.hour} minute={scene.minute || 0} />
      </div>
    );
  }
  if (scene.kind === "poly") {
    return (
      <div className="cell-sheet" style={{ gridTemplateColumns: `repeat(${scene.width}, 22px)` }}>
        {Array.from({ length: scene.width * scene.height }, (_, index) => {
          const x = index % scene.width;
          const y = Math.floor(index / scene.width);
          const on = scene.cells.some((cell) => cell[0] === x && cell[1] === y);
          return <span key={index} className={on ? "filled-cell" : "empty-cell"} />;
        })}
      </div>
    );
  }
  if (scene.kind === "cells") {
    return (
      <div className="cell-sheet" style={{ gridTemplateColumns: `repeat(${scene.cols}, 22px)` }}>
        {Array.from({ length: scene.cols * scene.rows }, (_, index) => (
          <span key={index} className="filled-cell" />
        ))}
      </div>
    );
  }
  if (scene.kind === "parts") {
    return (
      <div className="part-bar">
        {Array.from({ length: scene.parts }, (_, index) => (
          <span key={index} className={index < scene.filled ? "part on" : "part"} />
        ))}
      </div>
    );
  }
  if (scene.kind === "clocks") {
    return (
      <div className="enough-row">
        {scene.clocks.map((clock, index) => <ClockFace key={index} hour={clock.hour} minute={clock.minute || 0} />)}
      </div>
    );
  }
  if (scene.kind === "drop") {
    return <p className="drop-op">{scene.start} {scene.op} {scene.n}</p>;
  }
  if (scene.kind === "bars") {
    const max = Math.max(...scene.items.map((item) => item.value), 1);
    const top = scene.top || max;
    const step = scene.step || (top > 6 ? 2 : 1);
    const ticks = [];
    for (let value = top; value >= 0; value -= step) ticks.push(value);
    return (
      <div className="chart">
        {scene.title ? <p className="chart-title">{scene.title}</p> : null}
        <div className="chart-scale">
          {ticks.map((value) => <span key={value}>{value}</span>)}
        </div>
        <div className="bars">
          {scene.items.map((item) => (
            <div key={item.label} className="bar-col">
              <div className="bar" style={{ height: `${(item.value / (scene.top || max)) * 120}px` }} data-value={item.value} />
              {item.glyph ? <Glyph kind={item.glyph} /> : null}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (scene.kind === "line") {
    return (
      <div className="poly-line">
        {scene.parts.map((part, index) => (
          <span key={index} className="poly-seg"><b>{part}</b></span>
        ))}
      </div>
    );
  }
  if (scene.kind === "mirror") {
    return (
      <div className="mirror">
        <div className="mirror-side">
          {Array.from({ length: scene.left }, (_, index) => <span key={index} className="filled-cell" />)}
        </div>
        <div className="mirror-side">
          {Array.from({ length: scene.right }, (_, index) => <span key={index} className="filled-cell" />)}
          {Array.from({ length: scene.left - scene.right }, (_, index) => <span key={`e${index}`} className="empty-cell" />)}
        </div>
      </div>
    );
  }
  if (scene.kind === "blocks") {
    return (
      <div className="blocks">
        <div className="rods">
          {Array.from({ length: scene.tens }, (_, index) => <span key={index} className="rod" />)}
        </div>
        <div className="ones">
          {Array.from({ length: scene.ones }, (_, index) => <span key={index} className="one-cube" />)}
        </div>
      </div>
    );
  }
  if (scene.kind === "equation") {
    return <p className="equation-line">{scene.line}</p>;
  }
  return null;
}

export function SceneChoices({ scene, phase, dispatch, tried, answer }) {
  if (!scene) return null;
  const click = (value) => {
    if (phase === "answer") dispatch({ type: "choice", value });
  };
  if (scene.kind === "clock-hands") {
    return <ClockFace hour={scene.hour} minute={0} onHand={click} />;
  }
  if (scene.kind === "pick") {
    const names = {
      triangle: "Треугольник", circle: "Круг", square: "Квадрат", rectangle: "Прямоугольник", rhombus: "Ромб",
      pyramid: "Пирамида", sphere: "Шар", box: "Куб", cone: "Конус",
    };
    return (
      <div className="shape-row">
        {scene.options.map((id) => (
          <button key={id} type="button" aria-label={names[id] || id} className={`shape-btn ${tried.includes(id) ? "is-wrong" : ""} ${phase === "reveal" && id === answer ? "is-right" : ""}`} disabled={phase !== "answer"} onClick={() => click(id)}>
            <ShapeIcon id={id} />
            <span>{names[id] || id}</span>
          </button>
        ))}
      </div>
    );
  }
  if (scene.kind === "more") {
    return (
      <div className="more-row">
        {[["left", scene.left], ["right", scene.right]].map(([side, count]) => (
          <button key={side} type="button" className={`more-btn ${tried.includes(side) ? "is-wrong" : ""} ${phase === "reveal" && side === answer ? "is-right" : ""}`} disabled={phase !== "answer"} onClick={() => click(side)}>
            <CountRow count={count} kind={side === "left" ? scene.leftGlyph || scene.glyph || "apple" : scene.rightGlyph || scene.glyph || "star"} />
          </button>
        ))}
      </div>
    );
  }
  return null;
}
