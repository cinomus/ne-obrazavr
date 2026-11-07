function resultNumber(steps) {
  return steps
    .filter((step) => step.kind === "result")
    .reduce((sum, step) => sum + Number(step.value) * 10 ** step.offset, 0);
}

function pack(work) {
  const answer = work.steps.map((step) => step.value).join("");
  if (!answer) throw new Error("empty written steps");
  if (resultNumber(work.steps.filter((step) => step.kind === "result" || step.kind === "quotient")) !== work.result && work.op !== "÷") {
    throw new Error(`written ${work.a} ${work.op} ${work.b}`);
  }
  return work;
}

export function additionWork(a, b, c) {
  const terms = [a, b, c].filter((value) => value != null);
  const sum = terms.reduce((total, value) => total + value, 0);
  const width = Math.max(...terms.map((value) => String(value).length));
  const rows = terms.map((value) => String(value).padStart(width, "0"));
  const steps = [];
  let carry = 0;
  const answerLength = String(sum).length;
  for (let offset = 0; offset < Math.max(width, answerLength); offset += 1) {
    const total = rows.reduce((acc, row) => acc + Number(row[width - 1 - offset] || 0), carry);
    const digit = total % 10;
    carry = Math.floor(total / 10);
    if (offset < answerLength) steps.push({ kind: "result", row: "answer", offset, value: String(digit), stage: offset });
    if (carry && offset + 1 < width) steps.push({ kind: "carry", row: "carry", offset: offset + 1, value: String(carry), stage: offset });
  }
  const work = { op: "+", a, b, c, terms, width: answerLength, steps, result: sum };
  if (resultNumber(steps) !== sum) throw new Error(`add ${terms.join("+")}`);
  return pack(work);
}

export function subtractionWork(a, b) {
  const width = String(a).length;
  const top = String(a).padStart(width, "0").split("").map(Number);
  const bottom = String(b).padStart(width, "0").split("").map(Number);
  const steps = [];
  const marks = [];
  for (let offset = 0; offset < width; offset += 1) {
    const index = width - 1 - offset;
    if (top[index] < bottom[index]) {
      let donor = index - 1;
      while (donor >= 0 && top[donor] === 0) donor -= 1;
      top[donor] -= 1;
      marks.push({ offset: width - 1 - donor, step: 0 });
      const note = (place, value, stage) => {
        if (steps.some((step) => step.row === "borrow" && step.offset === place)) return;
        steps.push({ kind: "borrow", row: "borrow", offset: place, value, stage });
      };
      note(width - 1 - donor, String(top[donor]), `donor-${offset}`);
      for (let cursor = donor + 1; cursor < index; cursor += 1) {
        top[cursor] = 9;
        note(width - 1 - cursor, "9", `mid-${offset}-${cursor}`);
      }
      top[index] += 10;
      note(offset, "10", `ten-${offset}`);
    }
    const digit = top[index] - bottom[index];
    if (offset < String(a - b).length) steps.push({ kind: "result", row: "answer", offset, value: String(digit), stage: `ans-${offset}` });
  }
  if (resultNumber(steps) !== a - b) throw new Error(`sub ${a}-${b}`);
  return pack({ op: "−", a, b, width: String(a).length, steps, marks, result: a - b });
}

function multiplyDigit(digits, factor, shift, row, carryRow) {
  const steps = [];
  let carry = 0;
  if (factor === 0) {
    steps.push({ kind: "partial", row, offset: shift, value: "0", band: shift });
    return steps;
  }
  digits.forEach((digit, offset) => {
    const total = digit * factor + carry;
    carry = Math.floor(total / 10);
    const last = offset === digits.length - 1;
    steps.push({ kind: row === "answer" ? "result" : "partial", row, offset: offset + shift, value: String(total % 10), band: shift, stage: offset + shift });
    if (carry) {
      steps.push({
        kind: last ? (row === "answer" ? "result" : "partial") : "carry",
        row: last ? row : carryRow,
        offset: offset + shift + 1,
        value: String(carry),
        band: shift,
        stage: offset + shift,
      });
    }
  });
  return steps;
}

export function multiplyWork(a, b) {
  const digits = String(a).split("").map(Number).reverse();
  if (b < 10) {
    const steps = multiplyDigit(digits, b, 0, "answer", "carry").map((step) => ({
      ...step,
      kind: step.row === "answer" ? "result" : "carry",
    }));
    if (resultNumber(steps) !== a * b) throw new Error(`mul ${a}*${b}`);
    return pack({ op: "×", a, b, width: String(a * b).length, steps, result: a * b });
  }
  const ones = b % 10;
  const tens = Math.floor(b / 10);
  const steps = [
    ...multiplyDigit(digits, ones, 0, "p0", "c0"),
    ...multiplyDigit(digits, tens, 1, "p1", "c1"),
  ];
  const partialValue = (row) =>
    steps.filter((step) => step.row === row).reduce((sum, step) => sum + Number(step.value) * 10 ** step.offset, 0);
  let carry = 0;
  const width = String(a * b).length;
  for (let offset = 0; offset < width; offset += 1) {
    const piece = (row) => steps.filter((step) => step.row === row && step.offset === offset).reduce((sum, step) => sum + Number(step.value), 0);
    const total = piece("p0") + piece("p1") + carry;
    carry = Math.floor(total / 10);
    steps.push({ kind: "result", row: "answer", offset, value: String(total % 10) });
    if (carry && offset < width - 1) steps.push({ kind: "carry", row: "sumcarry", offset: offset + 1, value: String(carry) });
  }
  if (partialValue("p0") + partialValue("p1") !== a * b || resultNumber(steps) !== a * b) throw new Error(`mul2 ${a}*${b}`);
  return pack({ op: "×", a, b, width, steps, result: a * b });
}

export function divisionWork(n, d) {
  const digits = String(n).split("").map(Number);
  const steps = [];
  let partial = 0;
  let started = false;
  digits.forEach((digit, end) => {
    partial = partial * 10 + digit;
    if (!started && partial < d) return;
    started = true;
    const quotient = Math.floor(partial / d);
    const product = quotient * d;
    const remainder = partial - product;
    steps.push({ kind: "quotient", row: "quotient", offset: end, value: String(quotient), partial });
    steps.push({ kind: "product", row: "product", offset: end, value: String(product), partial });
    steps.push({ kind: "remainder", row: "remainder", offset: end, value: String(remainder), partial });
    partial = remainder;
  });
  const quotient = Math.floor(n / d);
  const written = Number(steps.filter((step) => step.kind === "quotient").map((step) => step.value).join(""));
  if (written !== quotient || partial !== n % d) throw new Error(`div ${n}/${d}`);
  return { op: "÷", a: n, b: d, width: String(n).length, steps, result: quotient, remainder: n % d };
}

export function writtenQuestion(work) {
  return {
    type: "steps",
    work,
    steps: work.steps,
    answer: work.steps.map((step) => step.value).join(""),
    result: work.result,
  };
}
