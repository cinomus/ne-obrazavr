export function evalTokens(tokens) {
  let i = 0;

  function parseExpr() {
    let left = parseTerm();
    while (tokens[i] === "+" || tokens[i] === "−") {
      const op = tokens[i++];
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm() {
    let left = parseFactor();
    while (tokens[i] === "×" || tokens[i] === "÷") {
      const op = tokens[i++];
      const right = parseFactor();
      if (op === "÷") {
        if (right === 0 || left % right !== 0) {
          throw new Error(`bad division ${left} ÷ ${right}`);
        }
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  }

  function parseFactor() {
    if (tokens[i] === "(") {
      i += 1;
      const value = parseExpr();
      if (tokens[i] !== ")") throw new Error("missing )");
      i += 1;
      return value;
    }
    const value = Number(tokens[i]);
    if (!Number.isInteger(value)) throw new Error(`bad token ${tokens[i]}`);
    i += 1;
    return value;
  }

  const value = parseExpr();
  if (i !== tokens.length) throw new Error("tail tokens");
  return value;
}

export function assertQuestion(q) {
  if (!q || typeof q.answer !== "string" || !q.answer.length) {
    throw new Error("empty answer");
  }
  if (q.type === "number" || q.type === "column") {
    if (!/^(0|[1-9]\d*)$/.test(q.answer)) {
      throw new Error(`answer format ${q.answer}`);
    }
  }
  if (q.type === "number") {
    if (q.picture) {
      const { groups, each, kind } = q.picture;
      if (!Number.isInteger(groups) || groups < 2) throw new Error("picture groups");
      if (!Number.isInteger(each) || each < 2) throw new Error("picture each");
      if (kind !== "apple" && kind !== "star" && kind !== "cube") throw new Error("picture kind");
      if (String(groups * each) !== q.answer) throw new Error("picture total");
      const entry = q.picture.entry;
      if (!entry || entry.join("") !== `${each}${groups}${q.answer}`) throw new Error("picture entry");
      if (!q.prompt || !q.prompt.startsWith("Сколько всего ")) throw new Error("picture prompt");
      if (!q.picture.one || !q.picture.sum || !q.picture.sum.endsWith(`= ${q.answer}`)) throw new Error("picture words");
      if (q.picture.container !== "plate" && q.picture.container !== "box") throw new Error("picture container");
    }
    if (q.tokens?.length) {
      const value = evalTokens(q.tokens);
      if (String(value) !== q.answer) {
        throw new Error(`${q.tokens.join(" ")} -> ${value}, not ${q.answer}`);
      }
    }
    if (q.expect != null && String(q.expect) !== q.answer) {
      throw new Error(`expect ${q.expect} != ${q.answer}`);
    }
    return;
  }
  if (q.type === "steps") {
    const joined = q.steps.map((step) => step.value).join("");
    if (joined !== q.answer) throw new Error("steps join");
    const { op, a, b, result } = q.work;
    const expect = op === "+" ? a + b + (q.work.c || 0) : op === "−" ? a - b : op === "×" ? a * b : Math.floor(a / b);
    if (expect !== result) throw new Error(`steps ${a} ${op} ${b}`);
    if (op === "÷") {
      const written = Number(q.steps.filter((step) => step.kind === "quotient").map((step) => step.value).join(""));
      if (written !== result) throw new Error("quotient");
    } else {
      const formed = q.steps
        .filter((step) => step.kind === "result")
        .reduce((sum, step) => sum + Number(step.value) * 10 ** step.offset, 0);
      if (formed !== result) throw new Error("formed result");
    }
    return;
  }
  if (q.type === "paint") {
    const key = [...q.needed].map((cell) => cell.join(":")).sort().join("|");
    if (!q.needed.length || key !== q.answer) throw new Error("paint");
    return;
  }
  if (q.type === "column") {
    const { a, b, op } = q.column;
    const value = op === "+" ? a + b : a - b;
    if (!Number.isInteger(value) || value < 0 || String(value) !== q.answer) {
      throw new Error(`column ${a} ${op} ${b} = ${value}`);
    }
    return;
  }
  if (q.type === "compare") {
    const sign = q.left < q.right ? "<" : q.left > q.right ? ">" : "=";
    if (sign !== q.answer) throw new Error("compare sign");
    if (!Number.isInteger(q.left) || !Number.isInteger(q.right)) {
      throw new Error("compare numbers");
    }
    return;
  }
  if (q.type === "choice") {
    if (!Array.isArray(q.choices) || q.choices.length < 2) throw new Error("choices");
    if (new Set(q.choices).size !== q.choices.length) throw new Error("duplicate choice");
    if (!q.choices.includes(q.answer)) throw new Error("answer missing from choices");
    if (!q.prompt) throw new Error("choice prompt");
    return;
  }
  if (q.type === "commit") {
    if (!/^(0|[1-9]\d*)$/.test(q.answer)) throw new Error(`commit ${q.answer}`);
    if (q.expect != null && String(q.expect) !== q.answer) throw new Error("commit expect");
    return;
  }
  if (q.type === "select") {
    if (!q.answer || !q.scene) throw new Error("select");
    return;
  }
  if (q.type === "build") {
    const [blue, orange] = q.answer.split("+").map(Number);
    if (blue + orange !== q.scene.total || blue < 1 || orange < 1) throw new Error("build");
    if (blue === q.scene.blue && orange === q.scene.orange) throw new Error("build same");
    return;
  }
  throw new Error(`unknown type ${q.type}`);
}

export function formatTokens(tokens) {
  let text = "";
  for (const token of tokens) {
    if (text && token !== ")" && !text.endsWith("(")) text += " ";
    text += token;
  }
  return text;
}

export function childFacingText(question) {
  if (!question) return "";
  if (question.type === "compare") {
    if (!Number.isInteger(question.left) || !Number.isInteger(question.right)) return "";
    return `${question.left} ? ${question.right}`;
  }
  if (question.type === "column") {
    const column = question.column;
    if (column?.a == null || column?.b == null || !column.op) return "";
    return `${column.a} ${column.op} ${column.b}`;
  }
  if (question.picture) return "";
  if (question.tokens?.length) return formatTokens(question.tokens);
  return String(question.prompt || question.lead || "").trim();
}

export function pastPrompt(q) {
  if (q.type === "compare") return `${q.left} □ ${q.right}`;
  if (q.type === "steps") {
    const terms = q.work.terms || [q.work.a, q.work.b];
    return terms.join(` ${q.work.op} `);
  }
  if (q.type === "column") return `${q.column.a} ${q.column.op} ${q.column.b}`;
  if (q.picture) return `${q.picture.groups} × ${q.picture.each}`;
  if (q.tokens?.length) return formatTokens(q.tokens);
  if (q.lead) return q.lead;
  return q.prompt || "";
}

export function questionKey(q) {
  return [
    q.type,
    q.prompt || "",
    q.lead || "",
    q.tokens?.join(" ") || "",
    q.column ? `${q.column.a}${q.column.op}${q.column.b}` : "",
    q.work ? `${q.work.a}${q.work.op}${q.work.b}` : "",
    q.left ?? "",
    q.right ?? "",
    q.choices?.join("|") || "",
    q.picture ? `${q.picture.kind}:${q.picture.groups}x${q.picture.each}` : "",
    q.scene ? JSON.stringify(q.scene) : "",
    q.answer,
  ].join("~");
}
