import { buildGrades } from "./full-catalog.js";

function ri(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function plural(n, one, few, many) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

function qty(n, forms) {
  return `${n} ${plural(n, forms[0], forms[1], forms[2])}`;
}

const THINGS = [
  ["карандаш", "карандаша", "карандашей"],
  ["мяч", "мяча", "мячей"],
  ["гриб", "гриба", "грибов"],
  ["шарик", "шарика", "шариков"],
  ["кубик", "кубика", "кубиков"],
  ["фломастер", "фломастера", "фломастеров"],
  ["значок", "значка", "значков"],
];

function was(n, forms) {
  return `${plural(n, "Был", "Было", "Было")} ${qty(n, forms)}`;
}

function applyOp(a, op, b) {
  if (op === "+") return a + b;
  if (op === "−") return a - b;
  if (op === "×") return a * b;
  if (op === "÷") {
    if (b === 0 || a % b !== 0) throw new Error("division");
    return a / b;
  }
  throw new Error(op);
}

function binary(a, op, b) {
  const answer = applyOp(a, op, b);
  if (!Number.isInteger(answer) || answer < 0) throw new Error("binary");
  return {
    type: "number",
    tokens: [String(a), op, String(b)],
    answer: String(answer),
  };
}

function tokens(parts, answer) {
  if (!Number.isInteger(answer) || answer < 0) throw new Error("tokens");
  return { type: "number", tokens: parts, answer: String(answer), expect: answer };
}

function ask(prompt, expect) {
  if (!Number.isInteger(expect) || expect < 0) throw new Error(prompt);
  return { type: "number", prompt, tokens: [], answer: String(expect), expect };
}

function lead(text, expect) {
  if (!Number.isInteger(expect) || expect < 0) throw new Error(text);
  return { type: "number", lead: text, tokens: [], answer: String(expect), expect };
}

function compare(left, right) {
  const answer = left < right ? "<" : left > right ? ">" : "=";
  return { type: "compare", left, right, answer };
}

function choice(prompt, answer, options) {
  return { type: "choice", prompt, answer, choices: shuffle(options) };
}

function column(a, b, op) {
  const answer = op === "+" ? a + b : a - b;
  return { type: "column", column: { a, b, op }, answer: String(answer) };
}

function digitCarry(a, b) {
  const width = Math.max(String(a).length, String(b).length);
  const as = String(a).padStart(width, "0");
  const bs = String(b).padStart(width, "0");
  let carry = 0;
  let happened = false;
  for (let i = width - 1; i >= 0; i -= 1) {
    const sum = Number(as[i]) + Number(bs[i]) + carry;
    if (sum >= 10) happened = true;
    carry = sum >= 10 ? 1 : 0;
  }
  return happened;
}

function digitBorrow(a, b) {
  const as = String(a);
  const bs = String(b).padStart(as.length, "0");
  let borrow = 0;
  let happened = false;
  for (let i = as.length - 1; i >= 0; i -= 1) {
    let digit = Number(as[i]) - borrow;
    borrow = 0;
    if (digit < Number(bs[i])) {
      happened = true;
      borrow = 1;
    }
  }
  return happened;
}

function pairAdd(digits, withCarry) {
  const low = 10 ** (digits - 1);
  const high = 10 ** digits - 1;
  for (let i = 0; i < 80; i += 1) {
    const a = ri(low, high);
    const b = ri(low, high);
    if (digitCarry(a, b) === withCarry) return column(a, b, "+");
  }
  const fallback = {
    2: withCarry ? [27, 15] : [24, 13],
    3: withCarry ? [256, 147] : [246, 132],
    4: withCarry ? [2568, 1473] : [2341, 1234],
  }[digits];
  return column(fallback[0], fallback[1], "+");
}

function pairSub(digits, withBorrow) {
  const low = 10 ** (digits - 1);
  const high = 10 ** digits - 1;
  for (let i = 0; i < 80; i += 1) {
    const a = ri(low + 1, high);
    const b = ri(low, a - 1);
    if (digitBorrow(a, b) === withBorrow) return column(a, b, "−");
  }
  const fallback = {
    2: withBorrow ? [52, 17] : [57, 23],
    3: withBorrow ? [523, 118] : [523, 112],
    4: withBorrow ? [5234, 1186] : [5234, 1123],
  }[digits];
  return column(fallback[0], fallback[1], "−");
}

function addWithin(max, minTerm = 0) {
  const a = ri(minTerm, max - minTerm);
  const b = ri(minTerm, max - a);
  return binary(a, "+", b);
}

function subWithin(max) {
  const a = ri(0, max);
  const b = ri(0, a);
  return binary(a, "−", b);
}

function tableProduct(factor) {
  const a = factor || ri(2, 9);
  const b = ri(2, 9);
  return binary(a, "×", b);
}

function tableQuotient(divisor) {
  const b = divisor || ri(2, 9);
  const q = ri(2, 9);
  return binary(b * q, "÷", b);
}

function productAtMost(limit) {
  for (let i = 0; i < 30; i += 1) {
    const a = ri(2, 9);
    const b = ri(2, 9);
    if (a * b <= limit) return binary(a, "×", b);
  }
  return binary(3, "×", 4);
}

function nextNumber(max) {
  const n = ri(0, max - 1);
  return ask(`Какое число стоит сразу после ${n}?`, n + 1);
}

function prevNumber(max) {
  const n = ri(1, max);
  return ask(`Какое число стоит прямо перед ${n}?`, n - 1);
}

function oneMore(max) {
  const n = ri(0, max - 1);
  return ask(`Какое число на 1 больше, чем ${n}?`, n + 1);
}

function oneLess(max) {
  const n = ri(1, max);
  return ask(`Какое число на 1 меньше, чем ${n}?`, n - 1);
}

function compareRange(max, equalChance = 0.22) {
  const left = ri(0, max);
  const right = Math.random() < equalChance ? left : ri(0, max);
  return compare(left, right);
}

function complement(target) {
  const a = ri(0, target);
  return ask(`Какое число нужно добавить к ${a}, чтобы получилось ${target}?`, target - a);
}

function taskTo(max) {
  const thing = pick(THINGS);
  if (Math.random() < 0.5) {
    const a = ri(0, max - 1);
    const b = ri(1, max - a);
    return ask(
      `${was(a, thing)}. Добавили ${qty(b, thing)}. Сколько ${thing[2]} стало?`,
      a + b,
    );
  }
  const a = ri(1, max);
  const b = ri(1, a);
  return ask(
    `${was(a, thing)}. Убрали ${qty(b, thing)}. Сколько ${thing[2]} осталось?`,
    a - b,
  );
}

function operationChoice(max) {
  const thing = pick(THINGS);
  const a = ri(1, max);
  if (Math.random() < 0.5) {
    const b = ri(1, max);
    return choice(
      `${was(a, thing)}. Принесли ещё ${qty(b, thing)}. Что сделать, чтобы узнать, сколько стало?`,
      "Сложить",
      ["Сложить", "Вычесть"],
    );
  }
  const b = ri(1, a);
  return choice(
    `${was(a, thing)}. Отдали ${qty(b, thing)}. Что сделать, чтобы узнать, сколько осталось?`,
    "Вычесть",
    ["Сложить", "Вычесть"],
  );
}

const SHAPES = [
  ["У какой фигуры три стороны?", "Треугольник", ["Треугольник", "Круг", "Прямоугольник"]],
  ["У какой фигуры нет углов?", "Круг", ["Круг", "Квадрат", "Треугольник"]],
  ["Какая фигура похожа на мяч?", "Шар", ["Шар", "Куб", "Квадрат"]],
  ["У какой фигуры четыре равные стороны и четыре угла?", "Квадрат", ["Квадрат", "Треугольник", "Круг"]],
  ["Как называется фигура, у которой все точки края одинаково далеки от середины?", "Круг", ["Круг", "Овал", "Прямоугольник"]],
  ["Какая фигура похожа на игральный кубик?", "Куб", ["Куб", "Шар", "Круг"]],
];

function shapeChoice() {
  const [prompt, answer, options] = pick(SHAPES);
  return choice(prompt, answer, options);
}

function shapeCount() {
  const bank = [
    ["Сколько сторон у треугольника?", 3],
    ["Сколько углов у квадрата?", 4],
    ["Сколько сторон у прямоугольника?", 4],
    ["Сколько прямых сторон у круга?", 0],
    ["Сколько вершин у треугольника?", 3],
  ];
  const [prompt, expect] = pick(bank);
  return ask(prompt, expect);
}

function clockHour() {
  const kind = ri(1, 4);
  if (kind === 1) {
    const hour = ri(1, 12);
    return ask(`Часовая стрелка на ${hour}, минутная на 12. Который час?`, hour);
  }
  if (kind === 2) return ask("Сколько минут в четверти часа?", 15);
  if (kind === 3) return ask("Сколько минут в половине часа?", 30);
  const hour = ri(1, 11);
  return ask(`Сейчас ${hour}:00. Который час будет через 1 час?`, hour + 1);
}

function placeValue() {
  const kind = ri(1, 3);
  if (kind === 1) {
    const n = ri(10, 99);
    return ask(`Сколько десятков в числе ${n}?`, Math.floor(n / 10));
  }
  if (kind === 2) {
    const n = ri(10, 99);
    return ask(`Сколько единиц в числе ${n}?`, n % 10);
  }
  const tens = ri(1, 9);
  const ones = ri(0, 9);
  return ask(
    `Какое число составляют ${tens} ${plural(tens, "десяток", "десятка", "десятков")} и ${ones} ${plural(ones, "единица", "единицы", "единиц")}?`,
    tens * 10 + ones,
  );
}

function convenientSum() {
  if (Math.random() < 0.45) {
    const part = ri(2, 18) * 5;
    return binary(part, "+", 100 - part);
  }
  const ones = ri(1, 9);
  const tens = ri(1, 8);
  return binary(tens * 10 + ones, "+", 10 - ones);
}

function twoStep(max) {
  const thing = pick(THINGS);
  const a = ri(8, max - 5);
  const b = ri(1, Math.min(12, a - 1));
  const room = max - (a - b);
  const c = ri(1, Math.max(1, Math.min(12, room)));
  return ask(
    `${was(a, thing)}. Убрали ${qty(b, thing)}, потом добавили ${qty(c, thing)}. Сколько ${thing[2]} стало?`,
    a - b + c,
  );
}

function timesOrDivide() {
  const thing = pick(THINGS);
  if (Math.random() < 0.5) {
    const each = ri(2, 9);
    const boxes = ri(2, 9);
    return choice(
      `Коробок ${boxes}, в каждой ${qty(each, thing)}. Как узнать, сколько ${thing[2]} всего?`,
      "Умножить",
      ["Умножить", "Разделить"],
    );
  }
  const boxes = ri(2, 9);
  const each = ri(2, 9);
  return choice(
    `${qty(each * boxes, thing)} разложили поровну в ${qty(boxes, ["коробку", "коробки", "коробок"])}. Как узнать, сколько в одной?`,
    "Разделить",
    ["Умножить", "Разделить"],
  );
}

function lengthGrade2() {
  const kind = ri(1, 3);
  if (kind === 1) {
    const n = ri(1, 9);
    return ask(`Сколько сантиметров в ${qty(n, ["дециметре", "дециметрах", "дециметрах"])}?`, n * 10);
  }
  if (kind === 2) {
    const n = ri(1, 9);
    return ask(`Сколько миллиметров в ${qty(n, ["сантиметре", "сантиметрах", "сантиметрах"])}?`, n * 10);
  }
  const n = ri(1, 5);
  return ask(`Сколько сантиметров в ${qty(n, ["метре", "метрах", "метрах"])}?`, n * 100);
}

function perimeterRect() {
  const length = ri(2, 15);
  const width = ri(2, 12);
  return ask(
    `Прямоугольник: длина ${length} см, ширина ${width} см. Найди периметр в сантиметрах.`,
    2 * (length + width),
  );
}

function threeTerms() {
  const a = ri(2, 40);
  const b = ri(2, 30);
  const c = ri(1, a + b);
  return tokens([String(a), "+", String(b), "−", String(c)], a + b - c);
}

function bracketsAdd() {
  if (Math.random() < 0.5) {
    const a = ri(2, 20);
    const b = ri(1, 15);
    const c = ri(1, a + b);
    return tokens(["(", String(a), "+", String(b), ")", "−", String(c)], a + b - c);
  }
  const c = ri(1, 12);
  const b = ri(c, c + 15);
  const a = ri(1, 20);
  return tokens([String(a), "+", "(", String(b), "−", String(c), ")"], a + (b - c));
}

function withTimes() {
  if (Math.random() < 0.5) {
    const a = ri(1, 20);
    const b = ri(2, 9);
    const c = ri(2, 9);
    return tokens([String(a), "+", String(b), "×", String(c)], a + b * c);
  }
  const b = ri(2, 9);
  const c = ri(2, 6);
  const a = ri(b * c, b * c + 25);
  return tokens([String(a), "−", String(b), "×", String(c)], a - b * c);
}

function equation(level) {
  const kind = ri(1, level >= 3 ? 4 : 3);
  if (kind === 1) {
    const x = ri(1, level === 2 ? 40 : 80);
    const a = ri(1, 30);
    return lead(`x + ${a} = ${x + a},    x =`, x);
  }
  if (kind === 2) {
    const a = ri(1, 20);
    const x = ri(a + 1, a + 40);
    return lead(`x − ${a} = ${x - a},    x =`, x);
  }
  if (kind === 3) {
    const x = ri(1, 30);
    const b = ri(1, 20);
    return lead(`${x + b} − x = ${b},    x =`, x);
  }
  const a = ri(2, 9);
  const x = ri(2, 9);
  return lead(`x × ${a} = ${x * a},    x =`, x);
}

function equationHard() {
  const kind = ri(1, 3);
  if (kind === 1) return equation(4);
  if (kind === 2) {
    const x = ri(2, 12);
    const a = ri(1, 9);
    const b = ri(2, 6);
    const c = (x + a) * b;
    return lead(`(x + ${a}) × ${b} = ${c},    x =`, x);
  }
  const a = ri(2, 9);
  const x = ri(2, 9);
  const b = ri(1, 20);
  return lead(`x × ${a} + ${b} = ${x * a + b},    x =`, x);
}

function orderGrade3() {
  const kind = ri(1, 3);
  if (kind === 1) return withTimes();
  if (kind === 2) {
    const a = ri(2, 9);
    const b = ri(2, 9);
    const c = ri(2, 9);
    return tokens(["(", String(a), "+", String(b), ")", "×", String(c)], (a + b) * c);
  }
  const a = ri(2, 8);
  const b = ri(2, 8);
  const c = ri(1, 12);
  return tokens([String(a), "×", String(b), "+", String(c)], a * b + c);
}

function orderGrade4Safe() {
  const kind = ri(1, 4);
  if (kind === 1) {
    const a = ri(1, 30);
    const b = ri(2, 9);
    const c = ri(2, 9);
    return tokens([String(a), "+", String(b), "×", String(c)], a + b * c);
  }
  if (kind === 2) {
    const a = ri(2, 12);
    const b = ri(1, 8);
    const c = ri(2, 9);
    return tokens(["(", String(a), "+", String(b), ")", "×", String(c)], (a + b) * c);
  }
  if (kind === 3) {
    const c = ri(2, 9);
    const q = ri(3, 12);
    const b = ri(1, 10);
    const a = c * q + b;
    return tokens(["(", String(a), "−", String(b), ")", "÷", String(c)], q);
  }
  const a = ri(2, 9);
  const b = ri(2, 9);
  const c = ri(2, 9);
  const d = ri(1, 15);
  return tokens([String(a), "×", String(b), "+", String(c), "×", String(d)], a * b + c * d);
}

function mentalTo1000(op) {
  if (op === "+") {
    if (Math.random() < 0.55) {
      const a = ri(1, 80) * 10;
      const b = ri(1, Math.floor((1000 - a) / 10)) * 10;
      return binary(a, "+", b);
    }
    const a = ri(100, 900);
    const b = ri(1, Math.min(99, 1000 - a));
    return binary(a, "+", b);
  }
  if (Math.random() < 0.55) {
    const a = ri(10, 100) * 10;
    const b = ri(1, a / 10) * 10;
    return binary(a, "−", b);
  }
  const a = ri(100, 999);
  const b = ri(1, Math.min(99, a));
  return binary(a, "−", b);
}

function times2by1(maxProduct) {
  for (let i = 0; i < 40; i += 1) {
    const a = ri(12, 99);
    const b = ri(2, 9);
    if (!maxProduct || a * b <= maxProduct) return binary(a, "×", b);
  }
  return binary(12, "×", 3);
}

function times2by2() {
  const a = ri(12, 36);
  const b = ri(12, 29);
  return binary(a, "×", b);
}

function exactDivision(maxDividend) {
  for (let i = 0; i < 40; i += 1) {
    const b = ri(2, 9);
    const q = ri(3, 12);
    if (b * q <= maxDividend) return binary(b * q, "÷", b);
  }
  return binary(24, "÷", 6);
}

function remainderQuestion() {
  const divisor = ri(2, 9);
  const quotient = ri(1, 12);
  const rest = ri(1, divisor - 1);
  const dividend = divisor * quotient + rest;
  if (Math.random() < 0.5) {
    return ask(`Найди неполное частное: ${dividend} ÷ ${divisor}`, quotient);
  }
  return ask(`Найди остаток от деления ${dividend} на ${divisor}.`, rest);
}

function areaPerimeter() {
  if (Math.random() < 0.5) return perimeterRect();
  const length = ri(2, 12);
  const width = ri(2, 12);
  return ask(
    `Прямоугольник ${length} см на ${width} см. Найди площадь в квадратных сантиметрах.`,
    length * width,
  );
}

function areaPerimeter4() {
  const kind = ri(1, 3);
  if (kind === 1) return areaPerimeter();
  if (kind === 2) {
    const side = ri(2, 20);
    return ask(`Периметр квадрата ${side * 4} см. Чему равна сторона? Ответ в сантиметрах.`, side);
  }
  const side = ri(2, 15);
  return ask(`Площадь квадрата ${side * side} кв. см. Чему равна сторона? Ответ в сантиметрах.`, side);
}

function money() {
  const thing = pick(THINGS);
  const price = ri(2, 40);
  const count = ri(2, 6);
  if (Math.random() < 0.5) {
    return ask(
      `Один ${thing[0]} стоит ${qty(price, ["рубль", "рубля", "рублей"])}. Сколько стоят ${qty(count, thing)}? Ответ в рублях.`,
      price * count,
    );
  }
  return ask(
    `${qty(count, thing)} стоят ${qty(price * count, ["рубль", "рубля", "рублей"])}. Сколько стоит один ${thing[0]}? Ответ в рублях.`,
    price,
  );
}

function massOrTime() {
  const kind = ri(1, 3);
  if (kind === 1) {
    const n = ri(1, 6);
    return ask(`Сколько граммов в ${qty(n, ["килограмме", "килограммах", "килограммах"])}?`, n * 1000);
  }
  if (kind === 2) {
    const n = ri(1, 5);
    return ask(`Сколько минут в ${qty(n, ["часе", "часах", "часах"])}?`, n * 60);
  }
  const rubles = ri(1, 6);
  const kopecks = ri(0, 9) * 10 + ri(0, 9);
  return ask(
    `${rubles} руб. ${kopecks} коп. — это сколько копеек?`,
    rubles * 100 + kopecks,
  );
}

function powersOfTen() {
  const base = pick([10, 100, 1000]);
  if (Math.random() < 0.5) {
    const n = ri(2, base === 1000 ? 20 : 90);
    return binary(n, "×", base);
  }
  const q = ri(2, base === 1000 ? 20 : 40);
  return binary(q * base, "÷", base);
}

function roundDivision() {
  const base = pick([10, 100]);
  const q = ri(2, 30);
  return binary(q * base, "÷", base);
}

function shareOf() {
  const d = ri(2, 8);
  const k = ri(2, 12);
  const n = d * k;
  if (Math.random() < 0.45) return ask(`Найди 1/${d} от числа ${n}.`, k);
  const num = ri(1, d - 1);
  return ask(`Найди ${num}/${d} от числа ${n}.`, k * num);
}

function lengthGrade4() {
  const kind = ri(1, 3);
  if (kind === 1) {
    const meters = ri(1, 6);
    const cm = ri(0, 9) * 10 + ri(1, 9);
    return ask(`${meters} м ${cm} см. Сколько это сантиметров?`, meters * 100 + cm);
  }
  if (kind === 2) {
    const cm = ri(150, 980);
    return ask(`Сколько полных метров в ${cm} см?`, Math.floor(cm / 100));
  }
  const km = ri(2, 7);
  return ask(`Сколько метров в ${qty(km, ["километре", "километрах", "километрах"])}?`, km * 1000);
}

function motion() {
  const kind = ri(1, 3);
  const speed = ri(4, 12);
  const hours = ri(2, 6);
  if (kind === 1) {
    return ask(
      `Автобус ехал ${qty(hours, ["час", "часа", "часов"])} со скоростью ${speed} км/ч. Какое расстояние он проехал? Ответ в километрах.`,
      speed * hours,
    );
  }
  if (kind === 2) {
    return ask(
      `До дачи ${speed * hours} км. Машина едет со скоростью ${speed} км/ч. Сколько часов займёт дорога?`,
      hours,
    );
  }
  return ask(
    `Лыжник прошёл ${speed * hours} км за ${qty(hours, ["час", "часа", "часов"])}. Какая была скорость? Ответ в км/ч.`,
    speed,
  );
}

function columnMixed(digits) {
  const op = Math.random() < 0.5 ? "+" : "−";
  const twist = Math.random() < 0.55;
  return op === "+" ? pairAdd(digits, twist) : pairSub(digits, twist);
}

function makeMixed(level, ops) {
  const op = pick(ops);
  if (level === 1) {
    return op === "+" ? addWithin(20, 0) : subWithin(20);
  }
  if (level === 2) {
    if (op === "+") return addWithin(100, 1);
    if (op === "−") return subWithin(100);
    if (op === "×") return tableProduct();
    return tableQuotient();
  }
  if (level === 3) {
    if (op === "+") return mentalTo1000("+");
    if (op === "−") return mentalTo1000("−");
    if (op === "×") return Math.random() < 0.5 ? tableProduct() : times2by1(400);
    return exactDivision(100);
  }
  if (op === "+") return addWithin(5000, 20);
  if (op === "−") return subWithin(5000);
  if (op === "×") return Math.random() < 0.5 ? times2by1() : powersOfTen();
  return Math.random() < 0.5 ? exactDivision(1000) : roundDivision();
}

function bounds(max) {
  return (q) => {
    const n = Number(q.answer);
    if (n > max) throw new Error(`above ${max}: ${q.prompt || q.answer}`);
  };
}

const OP_LABEL = {
  "+": "Сложение",
  "−": "Вычитание",
  "×": "Умножение",
  "÷": "Деление",
};

export const GRADES = buildGrades();

export function getGrade(id) {
  return GRADES.find((grade) => grade.id === Number(id)) || null;
}

export function gradeTopics(gradeId) {
  const grade = getGrade(gradeId);
  if (!grade) return [];
  return grade.chapters.flatMap((chapter, index) =>
    chapter.topics.map((topic) => ({ ...topic, chapter, chapterIndex: index + 1 })),
  );
}

export function findTopic(gradeId, topicId) {
  const grade = getGrade(gradeId);
  if (!grade) return null;
  for (let index = 0; index < grade.chapters.length; index += 1) {
    const chapter = grade.chapters[index];
    const topic = chapter.topics.find((item) => item.id === topicId);
    if (topic) return { grade, chapter, chapterIndex: index + 1, topic };
  }
  return null;
}

export function neighborTopics(gradeId, topicId) {
  const list = gradeTopics(gradeId);
  const index = list.findIndex((topic) => topic.id === topicId);
  return {
    prev: index > 0 ? list[index - 1] : null,
    next: index >= 0 ? list[index + 1] || null : null,
  };
}

export function everyTopic() {
  return GRADES.flatMap((grade) =>
    grade.chapters.flatMap((chapter) =>
      chapter.topics.map((topic) => ({ grade: grade.id, chapter: chapter.title, topic })),
    ),
  );
}

export function trainersWord(count) {
  return plural(count, "тренажёр", "тренажёра", "тренажёров");
}
