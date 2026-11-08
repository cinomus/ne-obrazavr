import { useEffect, useReducer, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { beep } from "../beep";
import { findTopic, neighborTopics } from "../curriculum";
import { childFacingText } from "../question";
import { initSession, reduceSession, RUN_LENGTH } from "../session";
import {
  keypadPreferred,
  readRecords,
  rememberRecord,
  rememberScore,
  rememberStars,
  shownRecord,
  setKeypadPreferred,
  setSoundEnabled,
  soundEnabled,
  starId,
  starsFor,
} from "../storage";
import Keypad from "./Keypad";
import PictureGroups from "./PictureGroups";
import { Scene, SceneChoices } from "./Scene";
import WrittenBoard from "./WrittenBoard";
import { CircleCenter, CommitTask, CubeEquation, CubeWays, MatrixTask, MeasureTask, PlaceTable, PythagorasTable, Ribbons, RowPick, SelectTask, SolutionBlock, StoryTask } from "./LiveBoards";
import { ChoiceScene, ColumnBoard, CornerBoard, DictBoard, FindBoard, FrameBoard, HalfBoard, OpsBoard, RulerBoard, SortBoard, SplitEntry } from "./GradeBoards";
import { DropBoard } from "./DropBoard";

function Blank({ value, phase, active = false, label = "Поле ответа" }) {
  return (
    <span
      className={`blank ${phase === "flash" ? "is-bad" : ""} ${phase === "reveal" ? "is-show" : ""} ${active ? "is-active" : ""}`}
      aria-label={label}
    >
      {value || "\u00a0"}
    </span>
  );
}

function QuestionViewConnected({ state, dispatch }) {
  const { question, phase, flashValue, tried } = state;
  if (question.type === "compare") {
    return (
      <>
        <div className="eq">
          <span className="num">{question.left}</span>
          <span className={`sign ${phase === "reveal" ? "is-show" : ""}`}>
            {phase === "reveal" ? question.answer : "?"}
          </span>
          <span className="num">{question.right}</span>
        </div>
        <div className="compare-row">
          {[
            ["<", "меньше"],
            ["=", "равно"],
            [">", "больше"],
          ].map(([sign, label]) => (
            <button
              key={sign}
              type="button"
              className={choiceClass(phase, tried.includes(sign) || flashValue === sign, phase === "reveal" && question.answer === sign)}
              disabled={phase !== "answer"}
              onClick={() => dispatch({ type: "choice", value: sign })}
            >
              <strong>{sign}</strong>
              <small>{label}</small>
            </button>
          ))}
        </div>
      </>
    );
  }

  if (question.scene?.kind === "hear") {
    return (
      <>
        <HearButton speech={question.scene.speech} token={question.answer} />
        <div className="choices hear-choices">
          {question.choices.map((option) => (
            <button
              key={option}
              type="button"
              className={choiceClass(phase, tried.includes(option), phase === "reveal" && question.answer === option)}
              disabled={phase !== "answer"}
              onClick={() => dispatch({ type: "choice", value: option })}
            >
              <strong>{option}</strong>
            </button>
          ))}
        </div>
      </>
    );
  }

  if ((question.scene?.kind === "cubes-add" || question.scene?.kind === "cubes-sub") && question.type === "choice") {
    return (
      <>
        <p className="prompt">{question.prompt}</p>
        <CubeEquation scene={question.scene} shown={phase === "reveal" ? question.answer : ""} phase={phase} />
        <div className="choices hear-choices">
          {question.choices.map((option) => (
            <button
              key={option}
              type="button"
              className={choiceClass(phase, tried.includes(option), phase === "reveal" && question.answer === option)}
              disabled={phase !== "answer"}
              onClick={() => dispatch({ type: "choice", value: option })}
            >
              <strong>{option}</strong>
            </button>
          ))}
        </div>
      </>
    );
  }

  if (question.scene && ["count", "pairs", "row", "ordinal", "domino", "ticks", "prefix-pick", "clock", "clocks", "digits", "dots", "figrow", "drop", "enough", "same", "angle", "lines", "signs", "stack", "spot", "inside", "splits", "story", "path", "measures", "bars"].includes(question.scene.kind) && question.type === "choice") {
    return <ChoiceScene question={question} phase={phase} dispatch={dispatch} tried={tried} showSolution={state.showSolution} />;
  }
  if (question.scene?.kind === "matrix") return <MatrixTask question={question} phase={phase} dispatch={dispatch} tried={tried} />;
  if (question.scene?.kind === "row-pick") return <RowPick question={question} phase={phase} dispatch={dispatch} tried={tried} />;
  if (question.scene?.kind === "ribbons") return <Ribbons question={question} phase={phase} dispatch={dispatch} tried={tried} />;
  if (["center", "segments", "points", "shapes"].includes(question.scene?.kind)) return <CircleCenter question={question} phase={phase} dispatch={dispatch} tried={tried} />;
  if (question.scene?.kind === "places") return <PlaceTable question={question} phase={phase} dispatch={dispatch} tried={tried} />;
  if (question.scene?.kind === "max") {
    return (
      <div className="max-task">
        <p className="prompt">{question.prompt}</p>
        <div className="max-grid">
          {question.choices.map((option) => (
            <button
              key={option}
              type="button"
              className={choiceClass(phase, tried.includes(option), phase === "reveal" && question.answer === option)}
              disabled={phase !== "answer"}
              onClick={() => dispatch({ type: "choice", value: option })}
            >
              <strong>{option}</strong>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (question.scene && ["clock-hands", "pick", "more"].includes(question.scene.kind)) {
    return (
      <>
        {question.scene.kind === "more" ? (
          <div className="more-title">
            <HearButton speech={question.prompt} token={question.answer} compact />
            <p className="prompt">{question.prompt}</p>
          </div>
        ) : question.prompt ? (
          <p className="prompt">{question.prompt}</p>
        ) : null}
        <SceneChoices scene={question.scene} phase={phase} dispatch={dispatch} tried={tried} answer={question.answer} />
      </>
    );
  }

  if (question.layout === "units") {
    const shown = phase === "reveal" ? question.answer : "…";
    return (
      <>
        <div className="eq units-eq">
          <span className="num">{question.prompt.replace(/=\s*$/, "").trim()}</span>
          <span className="op">=</span>
          <span className={`blank ${phase === "reveal" ? "is-show" : ""}`}>{shown}</span>
          {question.suffix ? <span className="num">{question.suffix}</span> : null}
        </div>
        <div className="choices units-choices">
          {question.choices.map((option) => (
            <button
              key={option}
              type="button"
              className={choiceClass(phase, tried.includes(option), phase === "reveal" && question.answer === option)}
              disabled={phase !== "answer"}
              onClick={() => dispatch({ type: "choice", value: option })}
            >
              <strong>{option}</strong>
            </button>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <p className="prompt">{childFacingText(question)}</p>
      <div className="choices">
        {question.choices.map((option, index) => (
          <button
            key={option}
            type="button"
            className={choiceClass(
              phase,
              tried.includes(option) || flashValue === option,
              phase === "reveal" && question.answer === option,
            )}
            disabled={phase !== "answer"}
            onClick={() => dispatch({ type: "choice", value: option })}
          >
            <span className="idx">{index + 1}</span>
            <strong>{option}</strong>
          </button>
        ))}
      </div>
    </>
  );
}

function PlaceDigits({ heads, rows, mark, winner = -1, tone = "win" }) {
  return (
    <div className="place-board">
      <div className="place-heads">{heads.map((head) => <span key={head}>{head}</span>)}</div>
      {rows.map((row, rowIndex) => (
        <div key={`${row.join("")}-${rowIndex}`} className="place-row">
          {row.map((digit, index) => {
            const marked = index === mark;
            const klass = marked && tone === "zero" ? "is-zero" : marked && rowIndex === winner ? "is-winner" : marked ? "is-mark" : "";
            return <span key={`${rowIndex}-${index}`} className={klass}>{digit}</span>;
          })}
        </div>
      ))}
    </div>
  );
}

export function Worked({ question }) {
  const scene = question.scene || {};
  let table = null;
  if (scene.kind === "places-sum") {
    table = <PlaceDigits heads={["сотни", "десятки", "единицы"]} rows={[[String(scene.hundreds), String(scene.tens), String(scene.ones)]]} mark={scene.zero} tone="zero" />;
  }
  if (scene.kind === "max") {
    const width = Math.max(...scene.numbers.map((value) => String(value).length));
    const rows = scene.numbers.map((value) => String(value).padStart(width, "0").split(""));
    const winner = scene.numbers.findIndex((value) => String(value) === String(question.answer));
    table = <PlaceDigits heads={scene.placeNames} rows={rows} mark={scene.place} winner={winner} />;
  }
  return (
    <>
      {table}
      <SolutionBlock solution={question.solution} />
    </>
  );
}

function HearButton({ speech, token, compact = false }) {
  useEffect(() => {
    if (!window.speechSynthesis) return undefined;
    const utter = new SpeechSynthesisUtterance(speech);
    utter.lang = "ru-RU";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    return () => window.speechSynthesis.cancel();
  }, [speech, token]);
  return (
    <button
      type="button"
      className={`play-number speaker ${compact ? "is-inline" : ""}`}
      aria-label="Послушать"
      onClick={() => {
        if (!window.speechSynthesis) return;
        const utter = new SpeechSynthesisUtterance(speech);
        utter.lang = "ru-RU";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }}
    >
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M10 24h10l14-10v36L20 40H10z" />
        <path d="M42 22c4 4 4 16 0 20M48 16c8 8 8 24 0 32" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function PaintBoard({ question, phase, dispatch, badPaint }) {
  const [painted, setPainted] = useState([]);
  useEffect(() => {
    setPainted([]);
  }, [question.answer, question.rows, question.cols]);
  const given = new Set(question.given.map((cell) => cell.join(":")));
  const lockedEmpty = new Set((question.mask || []).map((cell) => cell.join(":")));
  const marks = new Set(painted);
  const extras = new Set((badPaint || []).map((cell) => cell.join(":")));
  function check() {
    dispatch({ type: "paint-check", cells: painted.map((key) => key.split(":").map(Number)) });
  }
  useEffect(() => {
    function onKey(event) {
      if (event.key !== "Enter" || phase !== "answer") return;
      event.preventDefault();
      check();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  function toggle(row, col) {
    if (phase !== "answer" || given.has(`${row}:${col}`) || lockedEmpty.has(`${row}:${col}`)) return;
    const key = `${row}:${col}`;
    setPainted((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }
  return (
    <>
      <p className="prompt">{question.prompt}</p>
      <div className="mirror-wrap">
      <div className="cell-sheet mirror-grid" style={{ gridTemplateColumns: `repeat(${question.cols}, 28px)` }}>
        {Array.from({ length: question.rows * question.cols }, (_, index) => {
          const col = index % question.cols;
          const row = Math.floor(index / question.cols);
          const key = `${row}:${col}`;
          const filled = given.has(key);
          const revealed = phase === "reveal" && (question.needed || []).some((cell) => cell.join(":") === key);
          const locked = filled || lockedEmpty.has(key);
          const painted = marks.has(key) || revealed;
          return (
            <button
              key={key}
              type="button"
              className={`paint-cell ${filled ? "is-given" : "empty-cell"} ${painted ? "is-shown" : ""} ${extras.has(key) ? "is-wrong" : ""} ${lockedEmpty.has(key) ? "is-locked" : ""}`}
              disabled={phase !== "answer" || locked}
              onClick={() => toggle(row, col)}
            />
          );
        })}
      </div>
      <span className="mirror-axis" aria-hidden="true" />
      </div>
      <div className="paint-actions">
        <button type="button" className="btn secondary" disabled={phase !== "answer"} onClick={check}>
          Проверить
        </button>
        <button type="button" className="btn secondary" disabled={phase !== "answer"} onClick={() => setPainted([])}>
          Очистить
        </button>
      </div>
      {phase === "reveal" ? <button type="button" className="btn secondary next-pill" onClick={() => dispatch({ type: "next" })}>ДАЛЕЕ</button> : null}
    </>
  );
}

function choiceClass(phase, selected, correct) {
  return ["choice", selected && !correct ? "is-wrong" : "", correct ? "is-right" : "", phase === "flash" && selected ? "shake" : ""]
    .filter(Boolean)
    .join(" ");
}

export function NumericQuestion({ state, dispatch }) {
  const { question, phase, flashValue, input } = state;
  const shown = phase === "reveal" ? question.answer : phase === "flash" ? flashValue : input;
  if (question.entry && ["split", "remain", "equation", "clock", "measures"].includes(question.scene?.kind)) {
    return <SplitEntry question={question} phase={phase} input={input} dispatch={dispatch} />;
  }
  if (question.picture?.entry) {
    const [each, groups, total] = question.picture.entry;
    const raw = phase === "reveal" ? question.picture.entry.join("") : input;
    const first = raw.slice(0, each.length);
    const second = raw.slice(each.length, each.length + groups.length);
    const third = raw.slice(each.length + groups.length);
    const typedEach = Number(first);
    const typedGroups = Number(second);
    const typedTotal = third === "" ? null : Number(third);
    const held = Boolean(state.pictureHint) && phase === "answer";
    const bad = [
      held && first.length === each.length && typedEach !== question.picture.each,
      held && second.length === groups.length && typedGroups !== question.picture.groups,
      held && third.length === total.length && typedTotal !== question.picture.each * question.picture.groups,
    ];
    const active = first.length < each.length ? 0 : second.length < groups.length ? 1 : 2;
    return (
      <div className="picture-task">
        <p className="prompt">{question.prompt}</p>
        <PictureGroups picture={question.picture} showCounts={phase === "reveal"} />
        <p className={`picture-note ${held ? "is-hint" : ""} ${phase === "reveal" ? "is-sum" : ""}`}>
          {phase === "reveal" ? question.picture.sum : state.pictureHint || "\u00a0"}
        </p>
        <div className="eq picture-eq">
          <Blank value={first} phase={bad[0] ? "flash" : phase} active={phase === "answer" && active === 0} label="Сколько в одной группе" />
          <span className="op">·</span>
          <Blank value={second} phase={bad[1] ? "flash" : phase} active={phase === "answer" && active === 1} label="Сколько групп" />
          <span className="op">=</span>
          <Blank value={third} phase={bad[2] ? "flash" : phase} active={phase === "answer" && active === 2} label="Сколько всего" />
        </div>
        {phase === "reveal" ? (
          <button type="button" className="btn secondary next-pill" onClick={() => dispatch({ type: "tick-reveal" })}>ДАЛЕЕ</button>
        ) : null}
      </div>
    );
  }
  if (question.scene?.kind === "drop") return <DropBoard />;
  if (question.type === "steps") return <WrittenBoard question={question} state={state} />;
  if (question.scene?.kind === "cubes-add" || question.scene?.kind === "cubes-sub") {
    return <CubeEquation scene={question.scene} shown={shown} phase={phase} />;
  }
  if (question.scene?.kind === "story") return <StoryTask question={question} shown={shown} phase={phase} showSolution={state.showSolution} dispatch={dispatch} />;
  if (question.scene && ["line", "rect", "compound", "poly-sides", "radius"].includes(question.scene.kind)) {
    return <MeasureTask question={question} shown={shown} phase={phase} />;
  }
  if (question.scene?.kind === "pythagoras") {
    return <PythagorasTable question={question} shown={shown} phase={phase} />;
  }
  if (question.scene?.kind === "grid" && question.scene.values?.length >= 100) {
    return (
      <div className="hundred-task">
        <p className="prompt">{question.prompt}</p>
        <div className="num-grid" style={{ gridTemplateColumns: `repeat(${question.scene.columns}, minmax(0, 1fr))` }}>
          {question.scene.values.map((value) => {
            const hole = value === question.scene.hide;
            const columns = question.scene.columns;
            const line = Math.floor((value - 1) / columns) === Math.floor((question.scene.hide - 1) / columns) || (value - 1) % columns === (question.scene.hide - 1) % columns;
            return (
              <span key={value} className={`seq-cell ${line ? "is-line" : ""} ${hole ? "seq-gap" : ""} ${hole && phase === "flash" ? "is-bad" : ""} ${hole && phase === "reveal" ? "is-show" : ""}`} aria-label={hole ? "Пропущенное число" : undefined}>
                {hole ? (shown || "?") : value}
              </span>
            );
          })}
        </div>
      </div>
    );
  }
  if (question.scene?.kind === "poly") {
    return (
      <div className="area-task">
        <div>
          <p className="prompt">{question.prompt}</p>
          <div className="eq">
            <span className="lead">Ответ</span>
            <Blank value={shown} phase={phase} />
            <span className="op">см²</span>
          </div>
        </div>
        <div>
          <Scene scene={question.scene} />
          {question.caption ? <p className="caption">{question.caption}</p> : null}
        </div>
      </div>
    );
  }
  if (question.type === "column") {
    return (
      <div className="column">
        <div>{question.column.a}</div>
        <div>
          <span>{question.column.op}</span>
          {question.column.b}
        </div>
        <div className="rule" />
        <Blank value={shown} phase={phase} />
      </div>
    );
  }
  if (question.tokens?.length) {
    return (
      <div className="eq">
        {question.tokens.map((token, index) => (
          <span key={`${token}-${index}`} className={/^\d+$/.test(token) ? "num" : "op"}>
            {token}
          </span>
        ))}
        <span className="op">=</span>
        <Blank value={shown} phase={phase} />
      </div>
    );
  }
  return (
    <>
      <Scene scene={question.scene} />
      {question.prompt ? <p className="prompt">{question.prompt}</p> : null}
      {question.caption ? <p className="caption">{question.caption}</p> : null}
      {!question.scene && childFacingText(question) && !question.prompt ? (
        <p className="prompt">{childFacingText(question)}</p>
      ) : null}
      <div className="eq">
        {question.scene?.kind === "equation" ? (
          <span className="lead">x =</span>
        ) : question.lead ? (
          <span className="lead">{question.lead}</span>
        ) : question.scene ? null : (
          <span className="op">Ответ</span>
        )}
        <Blank value={shown} phase={phase} />
      </div>
    </>
  );
}

function Run({ located, gradeId, ops, onAgain, onRetune }) {
  const { topic } = located;
  const [state, dispatch] = useReducer(
    (current, action) => reduceSession(current, action, topic, ops),
    undefined,
    () => initSession(topic, ops),
  );
  const [sound, setSound] = useState(soundEnabled);
  const [seconds, setSeconds] = useState(0);
  const [keypadOn, setKeypadOn] = useState(keypadPreferred);
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 760px)").matches);
  const [record, setRecord] = useState(null);
  const heard = useRef(null);
  const questionRef = useRef(state.question);
  questionRef.current = state.question;
  const dropGame = state.question.scene?.kind === "drop";
  const numeric = state.question.type === "number" || state.question.type === "column" || state.question.type === "steps" || state.question.type === "commit";
  const neighbors = neighborTopics(gradeId, topic.id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [topic.id]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const onChange = () => setNarrow(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (state.phase === "flash") {
      const id = window.setTimeout(() => dispatch({ type: "tick-flash" }), 450);
      return () => window.clearTimeout(id);
    }
    if (state.phase === "reveal" && !state.question.manualNext) {
      const id = window.setTimeout(() => dispatch({ type: "tick-reveal" }), 2500);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [state.phase, state.question]);

  useEffect(() => {
    if (!sound || !state.status || heard.current === state.status) return;
    heard.current = state.status;
    beep(state.status.kind);
  }, [sound, state.status]);

  useEffect(() => {
    if (state.phase !== "done" || record) return;
    const earned = starsFor(state.stats.firstCorrect, RUN_LENGTH);
    rememberScore(gradeId, topic.id, state.stats.firstCorrect);
    rememberRecord(gradeId, topic.id, state.stats.xp);
    setRecord(rememberStars(gradeId, topic.id, earned));
  }, [state.phase, state.stats.firstCorrect, gradeId, topic.id, record]);

  useEffect(() => {
    function onKey(event) {
      if (questionRef.current?.scene?.kind === "drop") return;
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || event.target?.isContentEditable) return;
      if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        dispatch({ type: "reveal" });
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        dispatch({ type: "back" });
        return;
      }
      if (event.key === "Escape") {
        dispatch({ type: "clear" });
        return;
      }
      if (/^[0-9<>=]$/.test(event.key)) {
        event.preventDefault();
        dispatch({ type: "key", key: event.key });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const story = state.question.scene?.kind === "story";
  useEffect(() => {
    if (!story || state.phase === "done") return undefined;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [story, state.phase]);
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const keypadNeeded = !dropGame && (numeric || state.question.keypad || state.question.entry || state.question.scene?.kind === "poly" || Boolean(state.question.picture) || state.question.scene?.kind === "pythagoras" || (state.question.scene?.kind === "grid" && state.question.scene.values?.length >= 100));
  const showKeys = keypadNeeded && (narrow || keypadOn);
  const doneCount = Math.min(state.primaryDone, RUN_LENGTH);

  return (
    <>
      <div className="trainer-top">
        <Link className="back" to={`/${gradeId}`}>
          К списку
        </Link>
        <div>
          <p className="crumb">
            Математика · {gradeId} класс
          </p>
          <h1>{topic.title}</h1>
        </div>
        {dropGame ? <span /> : <p className="progress-label">
          {state.question.isReplay
            ? "Повтор ошибки"
            : state.phase === "done"
              ? `${RUN_LENGTH} из ${RUN_LENGTH}`
              : `Пример ${Math.min(state.primaryDone + 1, RUN_LENGTH)} из ${RUN_LENGTH}`}
        </p>}
      </div>
      {topic.note ? <p className="note">{topic.note}</p> : null}

      {state.phase === "done" ? (
        <section className="results">
          <h2>Статистика тренировки</h2>
          {record && record.earned > record.prev && record.earned > 0 ? (
            <p className="record">Новый результат!</p>
          ) : null}
          <div className="result-grid">
            <article>
              <h3>Верных ответов</h3>
              <p>
                {state.stats.firstCorrect} из {RUN_LENGTH}
              </p>
            </article>
            <article>
              <h3>Точность</h3>
              <p>{Math.round((state.stats.firstCorrect / RUN_LENGTH) * 100)}%</p>
            </article>
            <article>
              <h3>Очки опыта</h3>
              <p>{state.stats.xp}</p>
            </article>
          </div>
          <p className="result-stars" aria-label={`Звёзды: ${record?.earned || 0} из 3`}>
            {[1, 2, 3].map((star) => (
              <span key={star} className={star <= (record?.earned || 0) ? "on" : ""}>
                ★
              </span>
            ))}
          </p>
          <button type="button" className="primary wide" onClick={onAgain}>
            Новая тренировка
          </button>
          {onRetune ? (
            <button type="button" className="secondary wide" onClick={onRetune}>
              Изменить набор
            </button>
          ) : null}
        </section>
      ) : (
        <div className="trainer-layout">
          <section className="board">
            {dropGame ? null : <div className="runbar" aria-hidden="true">
              <span style={{ width: `${(doneCount / RUN_LENGTH) * 100}%` }} />
            </div>}
            <div className="stage">
              {state.question.type === "paint" ? (
                <PaintBoard question={state.question} phase={state.phase} dispatch={dispatch} badPaint={state.badPaint} />
              ) : state.question.type === "build" ? (
                <CubeWays question={state.question} phase={state.phase} dispatch={dispatch} />
              ) : state.question.type === "select" && state.question.scene?.kind === "frame" ? (
                <FrameBoard question={state.question} phase={state.phase} dispatch={dispatch} />
              ) : state.question.type === "select" && state.question.scene?.kind === "sort" ? (
                <SortBoard question={state.question} phase={state.phase} dispatch={dispatch} tried={state.tried} />
              ) : state.question.type === "select" && state.question.scene?.kind === "ops" ? (
                <OpsBoard question={state.question} phase={state.phase} dispatch={dispatch} showSolution={state.showSolution} />
              ) : state.question.type === "select" && state.question.scene?.kind === "dict" ? (
                <DictBoard question={state.question} phase={state.phase} dispatch={dispatch} />
              ) : state.question.type === "select" && state.question.scene?.kind === "half" ? (
                <HalfBoard question={state.question} phase={state.phase} dispatch={dispatch} />
              ) : state.question.type === "select" && state.question.scene?.kind === "ruler" ? (
                <RulerBoard question={state.question} phase={state.phase} dispatch={dispatch} />
              ) : state.question.type === "select" && state.question.scene?.kind === "find" ? (
                <FindBoard question={state.question} phase={state.phase} dispatch={dispatch} />
              ) : state.question.type === "select" && state.question.scene?.kind === "columns" ? (
                <ColumnBoard question={state.question} phase={state.phase} dispatch={dispatch} />
              ) : state.question.type === "select" && state.question.scene?.kind === "corners" ? (
                <CornerBoard question={state.question} phase={state.phase} dispatch={dispatch} />
              ) : state.question.type === "select" ? (
                <SelectTask question={state.question} phase={state.phase} dispatch={dispatch} />
              ) : state.question.type === "commit" ? (
                <CommitTask question={state.question} state={state} dispatch={dispatch} />
              ) : numeric ? (
                <NumericQuestion state={state} dispatch={dispatch} />
              ) : (
                <QuestionViewConnected state={state} dispatch={dispatch} />
              )}
            </div>

            {state.question.scene?.kind !== "story" && (state.showSolution || (state.phase === "reveal" && state.question.revealExplains)) ? <Worked question={state.question} /> : null}
            {state.hintText ? <p className="hint">{state.hintText}</p> : null}

            <p className={`status status-${state.status?.kind || "idle"}`} role="status" aria-live="polite">
              {state.status?.text || "\u00a0"}
            </p>

            {!state.question.hideHint || state.question.rule || state.question.help || (state.question.check && state.phase === "answer") || (state.question.solution && state.question.scene?.kind !== "story") || !state.question.hideSkip ? <div className="hint-row">
              {state.question.hideHint ? null : <p className="hint">
                {numeric
                  ? "Используйте цифры на клавиатуре. Пробел — посмотреть ответ."
                  : state.question.type === "compare"
                    ? "Выберите знак сравнения с помощью кнопок."
                    : "Выберите ответ. Пробел — посмотреть ответ."}
              </p>}
              {state.question.rule ? <button type="button" className="text-btn" onClick={() => dispatch({ type: "hint", kind: "rule" })}>ПРАВИЛО</button> : null}
              {state.question.help ? <button type="button" className="text-btn" onClick={() => dispatch({ type: "hint", kind: "help" })}>ПОМОЩЬ</button> : null}
              {state.question.solution && state.question.scene?.kind !== "story" && !state.question.revealExplains ? <button type="button" className="text-btn" onClick={() => dispatch({ type: "explain" })}>Показать решение</button> : null}
              {state.question.check && state.phase === "answer" ? <button type="button" className="btn secondary" onClick={() => dispatch({ type: "commit" })}>ПРОВЕРИТЬ</button> : null}
              {state.question.hideSkip ? null : (
                <button type="button" className="text-btn" onClick={() => dispatch({ type: "reveal" })}>
                  {state.question.revealLabel || state.question.skipLabel || "Не знаю"}
                </button>
              )}
            </div> : null}

            {showKeys ? (
              <Keypad
                disabled={state.phase !== "answer"}
                onDigit={(digit) => dispatch({ type: "digit", digit })}
                onBack={() => dispatch({ type: "back" })}
                onClear={() => dispatch({ type: "clear" })}
              />
            ) : null}
          </section>

          <aside className="stats">
            <div>
              <span>Очки</span>
              <strong>{state.stats.xp}</strong>
            </div>
            {story ? (
              <>
                <div>
                  <span>Решено</span>
                  <strong>{state.stats.firstCorrect}</strong>
                </div>
                <div>
                  <span>Время</span>
                  <strong>{clock}</strong>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span>Верно</span>
                  <strong>{state.stats.firstCorrect}</strong>
                </div>
                <div>
                  <span>Множитель</span>
                  <strong>×{state.stats.multiplier}</strong>
                </div>
                <div>
                  <span>Рекорд</span>
                  <strong>{shownRecord(readRecords()[starId(gradeId, topic.id)], state.stats.xp)}</strong>
                </div>
              </>
            )}
            {story ? null : <div className="session-stat">
              <span>Текущая сессия</span>
              <strong>
                <b className="ok-count">{state.stats.firstCorrect}</b>
                <b className="bad-count">{state.stats.wrong}</b>
              </strong>
              <small>+{state.stats.multiplier} за верный ответ</small>
            </div>}
          </aside>
        </div>
      )}

      <div className="tools">
        <button
          type="button"
          className={sound ? "secondary on" : "secondary"}
          onClick={() => {
            const next = !sound;
            setSound(next);
            setSoundEnabled(next);
          }}
        >
          {sound ? "Звук включён" : "Звук выключен"}
        </button>
        {keypadNeeded && !narrow ? (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              const next = !keypadOn;
              setKeypadOn(next);
              setKeypadPreferred(next);
            }}
          >
            {keypadOn ? "Скрыть клавиатуру" : "Показать клавиатуру"}
          </button>
        ) : null}
      </div>

      <nav className="neighbors">
        {neighbors.prev ? (
          <Link to={`/${gradeId}/${neighbors.prev.id}`}>
            <small>Предыдущий тренажёр</small>
            {neighbors.prev.title}
          </Link>
        ) : (
          <span />
        )}
        {neighbors.next ? (
          <Link to={`/${gradeId}/${neighbors.next.id}`}>
            <small>Следующий тренажёр</small>
            {neighbors.next.title}
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}

function Setup({ topic, onStart }) {
  const [ops, setOps] = useState(topic.setup.ops);
  function toggle(op) {
    setOps((current) => {
      if (current.includes(op)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== op);
      }
      return [...current, op];
    });
  }
  return (
    <form
      className="setup"
      onSubmit={(event) => {
        event.preventDefault();
        onStart(ops);
      }}
    >
      <h2>Какие действия включать</h2>
      <div className="setup-ops">
        {topic.setup.ops.map((op) => (
          <label key={op} className={ops.includes(op) ? "on" : ""}>
            <input type="checkbox" checked={ops.includes(op)} onChange={() => toggle(op)} />
            <span>{topic.setup.labels[op]}</span>
          </label>
        ))}
      </div>
      <button type="submit" className="primary wide">
        Начать тренировку
      </button>
    </form>
  );
}

export default function Trainer() {
  const { grade, topicId } = useParams();
  const gradeId = Number(grade);
  const located = findTopic(gradeId, topicId);
  const [run, setRun] = useState(0);
  const [ops, setOps] = useState(null);

  useEffect(() => {
    setRun(0);
    setOps(null);
  }, [gradeId, topicId]);

  if (!located) {
    return (
      <main className="page">
        <h1>Такого тренажёра нет</h1>
        <Link className="primary inline" to={Number.isInteger(gradeId) && gradeId >= 1 && gradeId <= 4 ? `/${gradeId}` : "/2"}>
          К списку
        </Link>
      </main>
    );
  }

  return (
    <main className="page trainer-page">
      {located.topic.setup && ops == null ? (
        <>
          <div className="trainer-top">
            <Link className="back" to={`/${gradeId}`}>
              К списку
            </Link>
            <div>
              <p className="crumb">
                Математика · {gradeId} класс
              </p>
              <h1>{located.topic.title}</h1>
            </div>
          </div>
          {located.topic.note ? <p className="note">{located.topic.note}</p> : null}
          <Setup topic={located.topic} onStart={setOps} />
        </>
      ) : (
        <Run
          key={`${gradeId}-${topicId}-${run}-${(ops || []).join("")}`}
          located={located}
          gradeId={gradeId}
          ops={ops}
          onAgain={() => setRun((value) => value + 1)}
          onRetune={located.topic.setup ? () => setOps(null) : null}
        />
      )}
    </main>
  );
}
