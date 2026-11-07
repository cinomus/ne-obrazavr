function cellText(step, index, state) {
  if (state.phase === "reveal" || index < (state.step || 0)) return step.value;
  if (index === (state.step || 0)) return state.input || state.flashValue || "";
  return "";
}

function look(step, index, steps, state) {
  if (!step) return { mode: "gap" };
  const cursor = state.phase === "reveal" ? steps.length : state.step || 0;
  const current = steps[Math.min(cursor, steps.length - 1)];
  const sameStage = current && step.stage != null && step.stage === current.stage && cursor < steps.length;
  if (
    step.kind === "carry" &&
    step.band != null &&
    current &&
    current.band !== step.band &&
    state.phase !== "reveal"
  ) {
    return { mode: "gap" };
  }
  const small = step.kind === "carry" || step.kind === "borrow" || step.row === "sumcarry";
  if (index < cursor) return { mode: "digit", text: step.value, small };
  if (index === cursor && state.phase !== "reveal") {
    return {
      mode: "box",
      text: state.input || state.flashValue || "",
      active: true,
      bad: Boolean(state.flashValue && !state.input),
      small,
    };
  }
  if (sameStage && index > cursor && state.phase !== "reveal") return { mode: "box", text: "", small };
  if (step.kind === "result" || step.kind === "partial") return { mode: "dot" };
  return { mode: "gap" };
}

function Glyph({ view }) {
  if (!view || view.mode === "gap") return <span />;
  if (view.mode === "dot") return <span className="wdigit is-pending">·</span>;
  if (view.mode === "digit") return <span className={`wdigit ${view.small ? "is-small" : ""}`}>{view.text}</span>;
  return (
    <span className={`wcell ${view.active ? "is-active" : ""} ${view.bad ? "is-wrong" : ""} ${view.small ? "is-small" : ""}`}>
      {view.text || "\u00a0"}
    </span>
  );
}

function byRow(steps, row, offset) {
  const index = steps.findIndex((step) => step.row === row && step.offset === offset);
  return index < 0 ? [null, -1] : [steps[index], index];
}

function Row({ columns, steps, state, row, sign }) {
  return (
    <div className="wrow">
      <span className="wop">{sign || ""}</span>
      {columns.map((offset) => {
        const [step, index] = byRow(steps, row, offset);
        return <Glyph key={offset} view={look(step, index, steps, state)} />;
      })}
    </div>
  );
}

function Stacked({ question, state }) {
  const { work, steps } = question;
  const terms = work.terms || [work.a, work.b];
  const high = Math.max(0, ...steps.map((step) => step.offset), ...terms.map((value) => String(value).length - 1));
  const columns = Array.from({ length: high + 1 }, (_, index) => high - index);
  const digit = (value, offset) => {
    const text = String(value);
    const index = text.length - 1 - offset;
    return index >= 0 ? text[index] : "";
  };
  const has = (row) => steps.some((step) => step.row === row);
  const partials = ["p0", "p1"].filter(has);
  const cursor = state.phase === "reveal" ? steps.length : state.step || 0;
  const mark = (offset) => (work.marks || []).find((item) => item.offset === offset && cursor >= item.step);
  return (
    <div className="written" data-op={work.op} style={{ "--digits": columns.length }}>
      {has("borrow") || (work.marks || []).length ? (
        <div className="wrow">
          <span className="wop" />
          {columns.map((offset) => {
            const [step, index] = byRow(steps, "borrow", offset);
            if (step) return <Glyph key={offset} view={look(step, index, steps, state)} />;
            return <span key={offset} className="wdigit is-small">{mark(offset) ? "·" : ""}</span>;
          })}
        </div>
      ) : null}
      {has("carry") ? <Row columns={columns} steps={steps} state={state} row="carry" /> : null}
      {terms.map((value, index) => (
        <div className="wrow" key={value + index}>
          <span className="wop">{index === terms.length - 1 ? work.op : ""}</span>
          {columns.map((offset) => (
            <span key={offset} className="wdigit">{index === 0 && mark(offset) ? <i className="borrow-dot">·</i> : null}{digit(value, offset)}</span>
          ))}
        </div>
      ))}
      <div className="wline" />
      {has("c0") ? <Row columns={columns} steps={steps} state={state} row="c0" /> : null}
      {has("c1") ? <Row columns={columns} steps={steps} state={state} row="c1" /> : null}
      {has("sumcarry") ? <Row columns={columns} steps={steps} state={state} row="sumcarry" /> : null}
      {partials.map((row) => (
        <Row key={row} columns={columns} steps={steps} state={state} row={row} />
      ))}
      {partials.length ? <div className="wline" /> : null}
      <Row columns={columns} steps={steps} state={state} row="answer" />
    </div>
  );
}

function slots(value, typed, mode, bad) {
  const text = String(value);
  return text.split("").map((digit, index) => {
    if (mode === "done") return <span key={index} className="wdigit">{digit}</span>;
    const shown = mode === "active" ? typed[index] || "" : "";
    const here = mode === "active" && typed.length === index;
    return (
      <span key={index} className={`wcell ${here ? "is-active" : ""} ${here && bad ? "is-wrong" : ""}`}>
        {shown || "\u00a0"}
      </span>
    );
  });
}

function Division({ question, state }) {
  const { work, steps } = question;
  const dividend = String(work.a);
  const cols = dividend.length;
  const cursor = state.phase === "reveal" ? steps.length : state.step || 0;
  const groups = [];
  for (let index = 0; index < steps.length; index += 3) groups.push(steps.slice(index, index + 3));
  const stage = Math.floor(cursor / 3);
  const bad = Boolean(state.flashValue && !state.input);
  return (
    <div className="long-div">
      <div className="ld-left" style={{ "--digits": cols }}>
        {dividend.split("").map((digit, index) => (
          <span key={digit + index} className="wdigit" style={{ gridColumn: index + 1, gridRow: 1 }}>{digit}</span>
        ))}
        {groups.map((group, index) => {
          if (index > stage && state.phase !== "reveal") return null;
          const [quot, prod, rem] = group;
          const end = quot.offset;
          const at = index * 3;
          const productRow = 2 + index * 3;
          const place = (value, field, gridRow, sub) => {
            const text = String(value);
            const start = end - text.length + 2;
            const active = state.phase !== "reveal" && cursor === at + field;
            const done = state.phase === "reveal" || cursor > at + field;
            const mode = done ? "done" : active ? "active" : "wait";
            return (
              <span key={field} className={`ld-span ${sub ? "is-sub" : ""}`} style={{ gridColumn: `${start} / ${end + 2}`, gridRow }}>
                {slots(text, active ? state.input || state.flashValue || "" : "", mode, bad)}
              </span>
            );
          };
          const brought = index > 0 ? String(quot.partial) : "";
          const broughtStart = end - brought.length + 2;
          return (
            <span key={index} style={{ display: "contents" }}>
              {brought ? (
                <span className="ld-span" style={{ gridColumn: `${broughtStart} / ${end + 2}`, gridRow: productRow - 1 }}>
                  {brought.split("").map((digit, digitIndex) => <span key={digitIndex} className="wdigit">{digit}</span>)}
                </span>
              ) : null}
              {place(prod.value, 1, productRow, true)}
              {place(rem.value, 2, productRow + 1, false)}
            </span>
          );
        })}
      </div>
      <div className="ld-right">
        <span className="ld-div">{work.b}</span>
        <div className="ld-quot">
          {groups.map((group, index) => {
            const at = index * 3;
            if (state.phase === "reveal" || cursor > at) return <span key={index} className="wdigit">{group[0].value}</span>;
            if (index > stage) return <span key={index} className="wdigit is-pending">·</span>;
            return (
              <span key={index} className={`wcell is-active ${bad ? "is-wrong" : ""}`}>
                {state.input || state.flashValue || "\u00a0"}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function WrittenBoard({ question, state }) {
  if (question.work.op === "÷") return <Division question={question} state={state} />;
  return <Stacked question={question} state={state} />;
}
