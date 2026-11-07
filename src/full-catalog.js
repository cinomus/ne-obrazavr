import { LIVE_GRADES } from "./live-grades.js";
import { additionWork, divisionWork, multiplyWork, subtractionWork, writtenQuestion } from "./written.js";

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
  ["значок", "значка", "значков"],
];

const HEARD = [
  "ноль", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять",
  "десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать",
  "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать", "двадцать",
];

const LABELS = { "+": "Сложение", "−": "Вычитание", "×": "Умножение", "÷": "Деление" };

function was(n, forms) {
  return `${plural(n, "Был", "Было", "Было")} ${qty(n, forms)}`;
}

function binary(a, op, b) {
  const answer = op === "+" ? a + b : op === "−" ? a - b : op === "×" ? a * b : a / b;
  if (!Number.isInteger(answer) || answer < 0) throw new Error("binary");
  return { type: "number", tokens: [String(a), op, String(b)], answer: String(answer) };
}

function tokens(parts, answer) {
  if (!Number.isInteger(answer) || answer < 0) throw new Error("tokens");
  return { type: "number", tokens: parts, answer: String(answer), expect: answer };
}

function ask(prompt, expect) {
  if (!Number.isInteger(expect) || expect < 0) throw new Error(prompt);
  return { type: "number", prompt, tokens: [], answer: String(expect), expect };
}

function cap(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function oneVerb(n, one, many) {
  return n % 10 === 1 && n % 100 !== 11 ? one : many;
}

function tensOf(n) {
  return Math.floor(Math.abs(Number(n)) / 10) * 10;
}

function onesOf(n) {
  return Math.abs(Number(n)) % 10;
}

function breakAdd(a, b) {
  const left = Number(a);
  const right = Number(b);
  const total = left + right;
  if (left < 10 && right < 10) return `Складываем единицы: ${left} + ${right} = ${total}.`;
  const tens = tensOf(left) + tensOf(right);
  const ones = onesOf(left) + onesOf(right);
  return `Складываем десятки: ${tensOf(left)} + ${tensOf(right)} = ${tens}, единицы: ${onesOf(left)} + ${onesOf(right)} = ${ones}. Вместе: ${tens} + ${ones} = ${total}.`;
}

function breakSub(a, b) {
  const left = Number(a);
  const right = Number(b);
  const total = left - right;
  if (left < 10 && right < 10) return `Вычитаем единицы: ${left} − ${right} = ${total}.`;
  const tensLeft = tensOf(left);
  const tensRight = tensOf(right);
  const onesLeft = onesOf(left);
  const onesRight = onesOf(right);
  if (onesLeft >= onesRight) {
    const tens = tensLeft - tensRight;
    const ones = onesLeft - onesRight;
    return `Вычитаем десятки: ${tensLeft} − ${tensRight} = ${tens}, единицы: ${onesLeft} − ${onesRight} = ${ones}. Вместе: ${tens} + ${ones} = ${total}.`;
  }
  const tens = tensLeft - 10 - tensRight;
  const ones = 10 + onesLeft - onesRight;
  return `Вычитаем десятки: ${tensLeft} − ${tensRight} = ${tensLeft - tensRight}. Единицы: ${onesLeft} − ${onesRight}, занимаем десяток: ${10 + onesLeft} − ${onesRight} = ${ones}, десятки: ${tens}. Вместе: ${tens} + ${ones} = ${total}.`;
}

function explainOp(equation, left, right, op) {
  if (Number(left) < 10 && Number(right) < 10) return equation;
  const detail = op === "+" ? breakAdd(left, right) : breakSub(left, right);
  return `${equation} ${detail}`;
}

function solutionFor(mode, a, b, answer, extra) {
  const c = extra.c;
  const word = extra.forms ? plural(Number(answer), extra.forms[0], extra.forms[1], extra.forms[2]) : extra.unit;
  const unit = word ? ` ${word}` : "";
  const steps = extra.solution || (
    mode === "more" ? [`На ${b} больше — значит, столько же и ещё ${b}.`, explainOp(`Складываем: ${a} + ${b} = ${answer}.`, a, b, "+")]
      : mode === "less" ? [`На ${b} меньше — значит, столько же без ${b}.`, explainOp(`Вычитаем: ${a} − ${b} = ${answer}.`, a, b, "−")]
        : mode === "remove" ? ["Чтобы узнать, сколько осталось, вычитаем.", explainOp(`${a} − ${b} = ${answer}.`, a, b, "−")]
          : mode === "leave" ? (extra.unknown === "b" && extra.top != null
            ? [
              `Было ${extra.top}, осталось ${a}. Чтобы узнать, сколько ${extra.action || "ушло"}, вычитаем.`,
              explainOp(`${cap(extra.action || "ушло")}: ${extra.top} − ${a} = ${answer}.`, extra.top, a, "−"),
            ]
            : [
              `Осталось ${a}, убрали ${b}. Чтобы узнать, сколько было сначала, складываем.`,
              explainOp(`${a} + ${b} = ${answer}.`, a, b, "+"),
            ])
            : mode === "parts" ? (extra.unknown === "a"
              ? [
                `Стало ${extra.top}, добавили ${b}. Чтобы узнать, сколько было сначала, вычитаем.`,
                explainOp(`${extra.top} − ${b} = ${answer}.`, extra.top, b, "−"),
              ]
              : [
                `Всего ${extra.top}, известно ${a}. Чтобы узнать другую часть, вычитаем.`,
                explainOp(`${extra.top} − ${a} = ${answer}.`, extra.top, a, "−"),
              ])
          : mode === "compare" ? ["На сколько больше или меньше — это разница.", explainOp(`${Math.max(a, b)} − ${Math.min(a, b)} = ${answer}.`, Math.max(a, b), Math.min(a, b), "−")]
            : mode === "times" ? (extra.less
              ? [`В ${b} ${plural(b, "раз", "раза", "раз")} меньше — делим на ${b}.`, `${a} ÷ ${b} = ${answer}.`]
              : [`В ${b} ${plural(b, "раз", "раза", "раз")} больше — повторяем первое количество ${b} ${plural(b, "раз", "раза", "раз")}.`, `${a} × ${b} = ${answer}.`])
              : mode === "groups" ? [`Умножаем число в одной группе на число групп.`, `${a} × ${b} = ${answer}.`]
                : mode === "split" ? [`Делим всё количество поровну.`, `${extra.top ?? Number(a) * Number(b)} ÷ ${b} = ${answer}.`]
              : mode === "leave2" ? [
                  `Было ${a}. Сначала убрали ${b}.`,
                  explainOp(`${a} − ${b} = ${Number(a) - Number(b)}.`, a, b, "−"),
                  `Потом убрали ещё ${c}.`,
                  explainOp(`${Number(a) - Number(b)} − ${c} = ${answer}.`, Number(a) - Number(b), c, "−"),
                ]
                : mode === "twostep" ? [
                  `Сначала складываем ${a} и ${b}.`,
                  explainOp(`${a} + ${b} = ${Number(a) + Number(b)}.`, a, b, "+"),
                  `Потом вычитаем ${c}.`,
                  explainOp(`${Number(a) + Number(b)} − ${c} = ${answer}.`, Number(a) + Number(b), c, "−"),
                ]
                  : mode === "join3" ? [
                    `Складываем ${a} и ${b}.`,
                    explainOp(`${a} + ${b} = ${Number(a) + Number(b)}.`, a, b, "+"),
                    `Потом прибавляем ${c}.`,
                    explainOp(`${Number(a) + Number(b)} + ${c} = ${answer}.`, Number(a) + Number(b), c, "+"),
                  ]
                    : mode === "price" ? (extra.buy
                      ? [`Делим деньги на цену одной вещи.`, `${extra.money} ÷ ${a} = ${answer}.`]
                      : [`Умножаем цену на количество.`, `${a} × ${b} = ${answer}.`])
                      : mode === "work" ? (extra.unit === "ч"
                        ? [`Делим всю работу на то, сколько пекут за час.`, `${b} ÷ ${a} = ${answer}.`]
                        : [`Умножаем выпечку за час на время.`, `${a} × ${c} = ${answer}.`])
                        : mode === "route" ? [`Складываем два участка пути.`, `${extra.speeds[0]} × ${extra.times[0]} + ${extra.speeds[1]} × ${extra.times[1]} = ${answer}.`]
                          : mode === "chain" ? extra.chain
                            : Number(a) + Number(b) === Number(answer)
                              ? ["Чтобы найти, сколько всего, складываем.", explainOp(`${a} + ${b} = ${answer}.`, a, b, "+")]
                              : Number(a) - Number(b) === Number(answer)
                                ? ["Чтобы узнать, сколько осталось, вычитаем.", explainOp(`${a} − ${b} = ${answer}.`, a, b, "−")]
                                : extra.top != null && Number(extra.top) - Number(a) === Number(answer)
                                  ? [`Было ${extra.top}, известно ${a}. Вычитаем.`, explainOp(`${extra.top} − ${a} = ${answer}.`, extra.top, a, "−")]
                                  : extra.top != null && Number(extra.top) - Number(b) === Number(answer)
                                    ? [`Было ${extra.top}, известно ${b}. Вычитаем.`, explainOp(`${extra.top} − ${b} = ${answer}.`, extra.top, b, "−")]
                                    : Number(b) !== 0 && Number(a) * Number(b) === Number(answer)
                                      ? ["Одинаковые группы считают умножением.", explainOp(`${a} × ${b} = ${answer}.`, a, b, "×")]
                                      : Number(b) !== 0 && Number(a) / Number(b) === Number(answer)
                                        ? ["Делим известное количество поровну.", explainOp(`${a} ÷ ${b} = ${answer}.`, a, b, "÷")]
                                        : [`В задаче даны ${a} и ${b}.`, `Искомое число — ${answer}.`]
  );
  const line = `Ответ: ${answer}${unit}`;
  return { steps, answerLine: line.endsWith(".") ? line : `${line}.` };
}

function story(prompt, answer, a = 1, b = 1, mode = "join", extra = {}) {
  return {
    ...ask(prompt, answer),
    solution: solutionFor(mode, a, b, answer, extra),
    unit: extra.unit || (extra.forms ? plural(Number(answer), extra.forms[0], extra.forms[1], extra.forms[2]) : ""),
    listen: extra.listen !== false,
    scheme: extra.scheme !== false,
    inlineScheme: Boolean(extra.inlineScheme),
    scene: {
      kind: "story",
      mode,
      a,
      b,
      c: extra.c,
      picture: extra.picture || "apple",
      names: extra.names,
      diffText: extra.diffText,
      unknown: extra.unknown,
      top: extra.top,
      result: extra.result ?? answer,
      cells: extra.cells,
      speeds: extra.speeds,
      times: extra.times,
      chain: extra.chain,
    },
    keypad: true,
  };
}

const TALES = [
  { picture: "bird", gen: "птиц", where: "на дереве",
    be: (x) => `на дереве ${oneVerb(x, "сидела", "сидели")} ${qty(x, ["птица", "птицы", "птиц"])}`,
    add: (y) => `${oneVerb(y, "прилетела", "прилетели")} ещё ${qty(y, ["птица", "птицы", "птиц"])}`,
    rem: (y) => `${oneVerb(y, "улетела", "улетели")} ${qty(y, ["птица", "птицы", "птиц"])}`,
    someBe: "на дереве сидели птицы", someAdd: "прилетели ещё несколько птиц", addPast: "прилетело",
    someRem: "несколько птиц улетели", remPast: "улетело", bePast: "сидело" },
  { picture: "car", gen: "машин", where: "на стоянке",
    be: (x) => `на стоянке ${oneVerb(x, "стояла", "стояли")} ${qty(x, ["машина", "машины", "машин"])}`,
    add: (y) => `${oneVerb(y, "приехала", "приехали")} ещё ${qty(y, ["машина", "машины", "машин"])}`,
    rem: (y) => `${oneVerb(y, "уехала", "уехали")} ${qty(y, ["машина", "машины", "машин"])}`,
    someBe: "на стоянке стояли машины", someAdd: "приехали ещё несколько машин", addPast: "приехало",
    someRem: "несколько машин уехали", remPast: "уехало", bePast: "стояло" },
  { picture: "apple", gen: "яблок", where: "в корзине",
    be: (x) => `в корзине ${oneVerb(x, "лежало", "лежали")} ${qty(x, ["яблоко", "яблока", "яблок"])}`,
    add: (y) => `Миша положил ещё ${qty(y, ["яблоко", "яблока", "яблок"])}`,
    rem: (y) => `Миша взял ${qty(y, ["яблоко", "яблока", "яблок"])}`,
    someBe: "в корзине были яблоки", someAdd: "Миша положил ещё несколько яблок", addPast: "положил Миша",
    someRem: "Миша взял несколько яблок", remPast: "взял Миша", bePast: "было" },
  { picture: "candy", gen: "конфет", where: "в вазе",
    be: (x) => `в вазе ${oneVerb(x, "лежала", "лежали")} ${qty(x, ["конфета", "конфеты", "конфет"])}`,
    add: (y) => `мама положила ещё ${qty(y, ["конфета", "конфеты", "конфет"])}`,
    rem: (y) => `дети съели ${qty(y, ["конфета", "конфеты", "конфет"])}`,
    someBe: "в вазе лежали конфеты", someAdd: "мама положила ещё несколько конфет", addPast: "положила мама",
    someRem: "дети съели несколько конфет", remPast: "съели дети", bePast: "лежало" },
  { picture: "bus", gen: "пассажиров", where: "в автобусе",
    be: (x) => `в автобусе ${oneVerb(x, "ехал", "ехали")} ${qty(x, ["пассажир", "пассажира", "пассажиров"])}`,
    add: (y) => `на остановке ${oneVerb(y, "вошёл", "вошли")} ещё ${qty(y, ["пассажир", "пассажира", "пассажиров"])}`,
    rem: (y) => `на остановке ${oneVerb(y, "вышел", "вышли")} ${qty(y, ["пассажир", "пассажира", "пассажиров"])}`,
    someBe: "в автобусе ехали пассажиры", someAdd: "на остановке вошли ещё несколько пассажиров", addPast: "вошло",
    someRem: "на остановке несколько пассажиров вышли", remPast: "вышло", bePast: "ехало" },
  { picture: "book", gen: "книг", where: "на полке",
    be: (x) => `на полке ${oneVerb(x, "стояла", "стояли")} ${qty(x, ["книга", "книги", "книг"])}`,
    add: (y) => `Катя поставила ещё ${qty(y, ["книга", "книги", "книг"])}`,
    rem: (y) => `Катя взяла ${qty(y, ["книга", "книги", "книг"])}`,
    someBe: "на полке стояли книги", someAdd: "Катя поставила ещё несколько книг", addPast: "поставила Катя",
    someRem: "Катя взяла несколько книг", remPast: "взяла Катя", bePast: "стояло" },
  { picture: "balloon", gen: "шариков", where: "у Пети",
    be: (x) => `у Пети ${oneVerb(x, "был", "было")} ${qty(x, ["шарик", "шарика", "шариков"])}`,
    add: (y) => `ему подарили ещё ${qty(y, ["шарик", "шарика", "шариков"])}`,
    rem: (y) => `${oneVerb(y, "улетел", "улетели")} ${qty(y, ["шарик", "шарика", "шариков"])}`,
    someBe: "у Пети были шарики", someAdd: "ему подарили ещё несколько шариков", addPast: "ему подарили",
    someRem: "несколько шариков улетели", remPast: "улетело", bePast: "было" },
  { picture: "cone", gen: "шишек", where: "под сосной",
    be: (x) => `под сосной ${oneVerb(x, "лежала", "лежали")} ${qty(x, ["шишка", "шишки", "шишек"])}`,
    add: (y) => `с дерева ${oneVerb(y, "упала", "упали")} ещё ${qty(y, ["шишка", "шишки", "шишек"])}`,
    rem: (y) => `белка унесла ${qty(y, ["шишка", "шишки", "шишек"])}`,
    someBe: "под сосной лежали шишки", someAdd: "с дерева упали ещё несколько шишек", addPast: "упало",
    someRem: "белка унесла несколько шишек", remPast: "унесла белка", bePast: "лежало" },
  { picture: "duck", gen: "уток", where: "в пруду",
    be: (x) => `в пруду ${oneVerb(x, "плавала", "плавали")} ${qty(x, ["утка", "утки", "уток"])}`,
    add: (y) => `${oneVerb(y, "приплыла", "приплыли")} ещё ${qty(y, ["утка", "утки", "уток"])}`,
    rem: (y) => `${oneVerb(y, "уплыла", "уплыли")} ${qty(y, ["утка", "утки", "уток"])}`,
    someBe: "в пруду плавали утки", someAdd: "приплыли ещё несколько уток", addPast: "приплыло",
    someRem: "несколько уток уплыли", remPast: "уплыло", bePast: "плавало" },
  { picture: "bun", gen: "булочек", where: "на прилавке",
    be: (x) => `на прилавке ${oneVerb(x, "лежала", "лежали")} ${qty(x, ["булочка", "булочки", "булочек"])}`,
    add: (y) => `пекарь принёс ещё ${qty(y, ["булочка", "булочки", "булочек"])}`,
    rem: (y) => `покупатели купили ${qty(y, ["булочка", "булочки", "булочек"])}`,
    someBe: "на прилавке лежали булочки", someAdd: "пекарь принёс ещё несколько булочек", addPast: "принёс пекарь",
    someRem: "покупатели купили несколько булочек", remPast: "купили покупатели", bePast: "лежало" },
  { picture: "coin", gen: "рублей", where: "в копилке",
    be: (x) => `в копилке ${oneVerb(x, "был", "было")} ${qty(x, ["рубль", "рубля", "рублей"])}`,
    add: (y) => `Ваня положил ещё ${qty(y, ["рубль", "рубля", "рублей"])}`,
    rem: (y) => `Ваня взял ${qty(y, ["рубль", "рубля", "рублей"])}`,
    someBe: "в копилке были деньги", someAdd: "Ваня положил ещё несколько рублей", addPast: "положил Ваня",
    someRem: "Ваня взял несколько рублей", remPast: "взял Ваня", bePast: "было" },
  { picture: "stamp", gen: "марок", where: "у Оли",
    be: (x) => `у Оли ${oneVerb(x, "была", "было")} ${qty(x, ["марка", "марки", "марок"])}`,
    add: (y) => `ей подарили ещё ${qty(y, ["марка", "марки", "марок"])}`,
    rem: (y) => `она подарила другу ${qty(y, ["марка", "марки", "марок"])}`,
    someBe: "у Оли были марки", someAdd: "ей подарили ещё несколько марок", addPast: "ей подарили",
    someRem: "она подарила другу несколько марок", remPast: "она подарила", bePast: "было" },
];

const PAIRS = [
  { place: "В вазе", a: ["яблоко", "яблока", "яблок"], b: ["груша", "груши", "груш"], ask: "Сколько всего фруктов в вазе?", unit: "фруктов", picture: "apple", max: 20 },
  { place: "На лугу", a: ["бабочка", "бабочки", "бабочек"], b: ["жук", "жука", "жуков"], ask: "Сколько всего насекомых на лугу?", unit: "насекомых", picture: "butterfly", max: 30 },
  { place: "На клумбе", a: ["астра", "астры", "астр"], b: ["ромашка", "ромашки", "ромашек"], ask: "Сколько всего цветков на клумбе?", unit: "цветков", picture: "flower", max: 40 },
  { place: "В корзине", a: ["огурец", "огурца", "огурцов"], b: ["помидор", "помидора", "помидоров"], ask: "Сколько всего овощей в корзине?", unit: "овощей", picture: "tomato", max: 40 },
  { place: "На ветке", a: ["воробей", "воробья", "воробьёв"], b: ["синица", "синицы", "синиц"], ask: "Сколько всего птиц на ветке?", unit: "птиц", picture: "bird", max: 20 },
  { place: "В саду", a: ["яблоня", "яблони", "яблонь"], b: ["вишня", "вишни", "вишен"], ask: "Сколько всего деревьев в саду?", unit: "деревьев", picture: "tree", max: 100 },
  { place: "На полке", a: ["книга", "книги", "книг"], b: ["журнал", "журнала", "журналов"], ask: "Сколько всего книг и журналов на полке?", unit: "книг и журналов", picture: "book", max: 100 },
  { place: "В аквариуме", a: ["рыбка", "рыбки", "рыбок"], b: ["улитка", "улитки", "улиток"], ask: "Сколько всего рыбок и улиток в аквариуме?", unit: "рыбок и улиток", picture: "fish", max: 40 },
  { place: "На стоянке", a: ["легковая машина", "легковые машины", "легковых машин"], b: ["автобус", "автобуса", "автобусов"], ask: "Сколько всего машин и автобусов на стоянке?", unit: "машин и автобусов", picture: "bus", max: 100 },
];

const PLACES = [
  { names: ["1-я полка", "2-я полка"], first: "На первой полке", second: "на второй полке", short: "на второй", forms: ["книга", "книги", "книг"], ask: "книг", picture: "book" },
  { names: ["1-я корзина", "2-я корзина"], first: "В первой корзине", second: "во второй корзине", short: "во второй", forms: ["груша", "груши", "груш"], ask: "груш", picture: "pear" },
  { names: ["1-я грядка", "2-я грядка"], first: "На первой грядке", second: "на второй грядке", short: "на второй", forms: ["куст", "куста", "кустов"], tail: " клубники", ask: "кустов клубники", picture: "berry" },
  { names: ["1-й вагон", "2-й вагон"], first: "В первом вагоне", second: "во втором вагоне", short: "во втором", forms: ["пассажир", "пассажира", "пассажиров"], ask: "пассажиров", picture: "bus" },
  { names: ["1-я ваза", "2-я ваза"], first: "В первой вазе", second: "во второй вазе", short: "во второй", forms: ["роза", "розы", "роз"], ask: "роз", picture: "flower" },
  { names: ["Утро", "День"], first: "Утром пришло", second: "днём", short: "днём", forms: ["покупатель", "покупателя", "покупателей"], ask: "покупателей", picture: "bun" },
];

const PARTS = [
  { max: 40, picture: "apple", text: (s, a) => `В вазе ${qty(s, ["фрукт", "фрукта", "фруктов"])}: ${qty(a, ["яблоко", "яблока", "яблок"])}, остальные — груши. Сколько груш в вазе?` },
  { max: 40, picture: "butterfly", text: (s, a) => `На лугу ${qty(s, ["насекомое", "насекомых", "насекомых"])}: ${qty(a, ["бабочка", "бабочки", "бабочек"])}, остальные — жуки. Сколько жуков на лугу?` },
  { max: 40, picture: "tomato", text: (s, a) => `В корзине ${qty(s, ["овощ", "овоща", "овощей"])}: ${qty(a, ["огурец", "огурца", "огурцов"])}, остальные — помидоры. Сколько помидоров в корзине?` },
  { max: 30, picture: "bird", text: (s, a) => `На ветке ${qty(s, ["птица", "птицы", "птиц"])}: ${qty(a, ["воробей", "воробья", "воробьёв"])}, остальные — синицы. Сколько синиц на ветке?` },
  { max: 40, picture: "flower", text: (s, a) => `На клумбе ${qty(s, ["цветок", "цветка", "цветков"])}: ${qty(a, ["астра", "астры", "астр"])}, остальные — ромашки. Сколько ромашек на клумбе?` },
  { max: 100, picture: "tree", text: (s, a) => `В саду ${qty(s, ["дерево", "дерева", "деревьев"])}: ${qty(a, ["яблоня", "яблони", "яблонь"])}, остальные — вишни. Сколько вишен в саду?` },
];

function counted(prompt, answer, max, scene) {
  const limit = Math.max(Number(answer), 0, Math.min(max, 20));
  const choices = Array.from({ length: limit + 1 }, (_, index) => String(index));
  return { type: "choice", prompt, answer: String(answer), choices, scene };
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
  const unique = [...new Set(options)];
  if (!unique.includes(answer) || unique.length < 2) throw new Error(prompt);
  return { type: "choice", prompt, answer, choices: shuffle(unique) };
}

function column(a, b, op, c) {
  const work = op === "+" ? additionWork(a, b, c) : subtractionWork(a, b);
  return writtenQuestion(work);
}

function norm(title) {
  return title.toLowerCase().replaceAll("ё", "е").replaceAll("–", "-").replaceAll("—", "-");
}

function limitOf(title, fallback) {
  const found = title.match(/до (\d+)|пределах (\d+)/);
  if (!found) return fallback;
  return Number(found[1] || found[2]);
}

function gradeMax(grade) {
  return { 1: 20, 2: 100, 3: 1000, 4: 5000 }[grade];
}

function addWithin(max, minTerm = 0) {
  const upper = Math.max(minTerm, max - Math.max(minTerm, 0));
  const a = ri(minTerm, upper);
  const b = ri(0, max - a);
  return binary(a, "+", b);
}

function subWithin(max) {
  const a = ri(0, max);
  const b = ri(0, a);
  return binary(a, "−", b);
}

function crosses(a, b, op) {
  if (op === "+") return (a % 10) + (b % 10) >= 10;
  return (a % 10) < (b % 10);
}

function pairWithin(max, op, cross) {
  for (let i = 0; i < 80; i += 1) {
    if (op === "+") {
      const a = ri(1, Math.max(1, max - 1));
      const b = ri(1, Math.max(1, max - a));
      if (crosses(a, b, "+") === cross) return [a, b, a + b];
    } else {
      const a = ri(1, max);
      const b = ri(1, a);
      if (crosses(a, b, "−") === cross) return [a, b, a - b];
    }
  }
  if (op === "+") return cross ? [8, 7, 15] : [4, 3, 7];
  return cross ? [15, 7, 8] : [9, 4, 5];
}

function thingTask(a, b, op) {
  if (op === "+") {
    const pairs = PAIRS.filter((item) => a + b <= item.max && a >= 1 && b >= 1);
    if (pairs.length && Math.random() < 0.5) {
      const chosen = pick(pairs);
      return story(
        `${chosen.place} ${qty(a, chosen.a)} и ${qty(b, chosen.b)}. ${chosen.ask}`,
        a + b, a, b, "join", { picture: chosen.picture, unit: chosen.unit },
      );
    }
    const tale = pick(TALES);
    return story(
      `${cap(tale.be(a))}. ${cap(tale.add(b))}. Сколько ${tale.gen} стало ${tale.where}?`,
      a + b, a, b, "join", { picture: tale.picture, unit: tale.gen },
    );
  }
  const tale = pick(TALES);
  return story(
    `${cap(tale.be(a))}. ${cap(tale.rem(b))}. Сколько ${tale.gen} осталось ${tale.where}?`,
    a - b, a, b, "remove", { picture: tale.picture, unit: tale.gen },
  );
}

function hear(max) {
  const n = ri(0, Math.min(max, HEARD.length - 1));
  const pool = Array.from({ length: Math.min(max, HEARD.length - 1) + 1 }, (_, index) => String(index));
  const options = shuffle(pool).slice(0, Math.min(4, pool.length));
  if (!options.includes(String(n))) options[0] = String(n);
  return {
    type: "choice",
    prompt: "Послушай",
    answer: String(n),
    choices: shuffle([...new Set(options)]),
    scene: { kind: "hear", number: n, speech: HEARD[n] },
  };
}

function seenNumber(answer, scene) {
  return { type: "number", tokens: [], answer: String(answer), expect: answer, scene };
}

function dots(max) {
  const n = ri(0, Math.min(max, 10));
  return {
    ...counted(`Сколько здесь шляп?`, n, 10, { kind: "count", count: n, glyph: "hat" }),
    skipLabel: "Помощь",
    speak: true,
  };
}

function frame(max) {
  const need = ri(1, Math.min(5, Math.max(1, max)));
  const have = Math.max(need, Math.min(8, need + ri(0, 3)));
  return {
    type: "select",
    prompt: `Положи ${need} ${plural(need, "карандаш", "карандаша", "карандашей")} в рамку`,
    help: "Теперь нажми Проверить.",
    answer: Array.from({ length: need }, (_, index) => String(index)).join("|"),
    scene: { kind: "frame", have, need, glyph: "pencil" },
  };
}

function gaps(max) {
  if (max >= 100) {
    const hide = ri(1, 100);
    return {
      ...seenNumber(hide, {
        kind: "grid",
        columns: 10,
        values: Array.from({ length: 100 }, (_, index) => index + 1),
        hide,
      }),
      prompt: "Впиши пропущенное число в таблицу",
    };
  }
  const step = max >= 10 && Math.random() < 0.4 ? 2 : 1;
  const start = ri(0, Math.max(0, max - step * 4));
  const seq = [0, 1, 2, 3, 4].map((index) => start + index * step);
  const hide = ri(0, 4);
  const missing = seq[hide];
  const pool = [...new Set([String(missing), ...seq.map(String), String(Number(missing) + 1)])];
  return {
    type: "choice",
    prompt: "Заполни пропуски",
    answer: String(missing),
    choices: shuffle(pool),
    scene: { kind: "row", values: seq, hide },
  };
}

function orderSmallest(max) {
  const nums = [];
  while (nums.length < 3) {
    const next = ri(0, Math.min(max, 20));
    if (!nums.includes(next)) nums.push(next);
  }
  return {
    type: "select",
    prompt: "Расставь числа по возрастанию",
    answer: [...nums].sort((a, b) => a - b).join("|"),
    scene: { kind: "sort", values: nums },
  };
}

const ORDINALS = ["первой", "второй", "третьей", "четвертой", "пятой", "шестой", "седьмой", "восьмой", "девятой", "десятой"];

function ordinal(max) {
  const n = Math.min(Math.max(max, 3), 10);
  const mark = ri(1, n);
  const glyphs = ["яблоко", "мяч", "звезда", "кубик", "книга", "цветок", "гриб", "рыбка", "шарик", "флаг"].slice(0, n);
  return {
    type: "choice",
    prompt: `Какая картинка идет ${ORDINALS[mark - 1]} по счету?`,
    answer: glyphs[mark - 1],
    choices: glyphs,
    scene: { kind: "ordinal", glyphs },
  };
}

function around(max) {
  const kind = ri(1, 3);
  let prompt = "";
  let answer = 0;
  if (kind === 1) {
    const n = ri(0, Math.max(0, max - 1));
    prompt = `Какое число идет сразу после ${n}?`;
    answer = n + 1;
  } else if (kind === 2) {
    const n = ri(1, Math.max(1, max));
    prompt = `Какое число идет прямо перед ${n}?`;
    answer = n - 1;
  } else {
    const n = ri(0, Math.max(0, max - 2));
    prompt = `Какое число стоит между ${n} и ${n + 2}?`;
    answer = n + 1;
  }
  const cap = Math.min(Math.max(max, answer), 10);
  const near = [answer - 1, answer, answer + 1].filter((value) => value >= 0 && value <= cap);
  while (near.length < 3) {
    const extra = ri(0, cap);
    if (!near.includes(extra)) near.push(extra);
  }
  return {
    type: "choice",
    prompt,
    answer: String(answer),
    choices: shuffle(near.map(String)),
    scene: { kind: "row", values: Array.from({ length: cap + 1 }, (_, index) => index), hide: -1 },
  };
}

function oneMore(max) {
  const n = ri(0, Math.max(0, Math.min(max, 8) - 1));
  const left = Math.random() < 0.5;
  return {
    type: "choice",
    prompt: "Выбери, где на 1 больше",
    answer: left ? "left" : "right",
    choices: ["left", "right"],
    scene: { kind: "more", left: left ? n + 1 : n, right: left ? n : n + 1, leftGlyph: "cube", rightGlyph: "cube" },
  };
}

function oneLess(max) {
  const n = ri(1, Math.min(max, 8));
  const left = Math.random() < 0.5;
  return {
    type: "choice",
    prompt: "Выбери, где на 1 меньше",
    answer: left ? "left" : "right",
    choices: ["left", "right"],
    scene: { kind: "more", left: left ? n - 1 : n, right: left ? n : n - 1, leftGlyph: "cube", rightGlyph: "cube" },
  };
}

function whichCount(max, wantMore) {
  const limit = Math.max(1, Math.min(max, 8));
  let a = ri(0, limit);
  let b = ri(0, limit);
  if (a === b) b = a === limit ? a - 1 : a + 1;
  const leftWins = wantMore ? a > b : a < b;
  return {
    type: "choice",
    prompt: wantMore ? "Где больше?" : "Где меньше?",
    answer: leftWins ? "left" : "right",
    choices: ["left", "right"],
    scene: { kind: "more", left: a, right: b, leftGlyph: "apple", rightGlyph: "star" },
  };
}

function enough(max) {
  const animals = ri(1, Math.min(max, 8));
  const food = ri(0, Math.min(max, 8));
  const left = food - animals;
  const answer = food >= animals ? "Да, хватит" : "Нет, не хватит";
  return {
    type: "choice",
    prompt: "Хватит ли редисок для всех морских свинок?",
    answer,
    choices: ["Да, хватит", "Нет, не хватит"],
    help: food >= animals
      ? `Да, хватит. Считаем: ${animals} ${plural(animals, "морская свинка", "морские свинки", "морских свинок")} и ${food} ${plural(food, "редиска", "редиски", "редисок")}. Останется ещё ${left} ${plural(left, "редиска", "редиски", "редисок")}.`
      : `Нет, не хватит. Свинок ${animals}, а редисок только ${food}. Не хватает ${animals - food}.`,
    scene: { kind: "enough", boxes: animals, items: food, leftGlyph: "pig", rightGlyph: "radish" },
  };
}

function cubesNeed(target) {
  const have = ri(0, Math.max(0, target - 1));
  const need = target - have;
  return {
    ...counted(`Есть ${have} ${plural(have, "кубик", "кубика", "кубиков")}. Сколько нужно добавить, чтобы стало ${target}?`, need, Math.min(target, 10), { kind: "count", count: have, glyph: "cube" }),
    help: `До ${target} не хватает ${need}: ${have} + ${need} = ${target}.`,
  };
}

function cubeWays(max) {
  const total = ri(3, Math.max(3, Math.min(max, 5)));
  const blue = ri(1, total - 1);
  const orange = total - blue;
  const options = [];
  for (let next = 1; next < total; next += 1) if (next !== blue) options.push(next);
  const altBlue = pick(options);
  return {
    type: "build",
    prompt: `Из ${qty(blue, ["синего кубика", "синих кубиков", "синих кубиков"])} и ${qty(orange, ["оранжевого кубика", "оранжевых кубиков", "оранжевых кубиков"])} можно составить число ${total}. Покажи другой способ составить число ${total}.`,
    answer: `${altBlue}+${total - altBlue}`,
    help: `Собери ${total} кубика из двух цветов. В примере ${blue} + ${orange}, поэтому выбери другое сочетание.`,
    scene: { kind: "twocolor", total, blue, orange },
  };
}

function cubesEquation(op, max) {
  const cap = Math.max(2, Math.min(max, 5));
  const limit = Math.min(max, 10);
  if (op === "+") {
    const a = ri(1, cap - 1);
    const b = ri(1, cap - a);
    const colorWord = (n, one, many) => `${n} ${n === 1 ? one : many} ${plural(n, "кубик", "кубика", "кубиков")}`;
    return {
      type: "choice",
      prompt: "Сколько всего кубиков?",
      answer: String(a + b),
      choices: Array.from({ length: Math.min(limit, 5) }, (_, index) => String(index + 1)),
      scene: {
        kind: "cubes-add",
        a,
        b,
        colors: ["#7b4bb7", "#e2b43a"],
        sentence: `Есть ${colorWord(a, "фиолетовый", "фиолетовых")} и ${colorWord(b, "жёлтый", "жёлтых")}.`,
        question: "Сколько всего кубиков?",
      },
    };
  }
  const a = ri(1, cap);
  const b = ri(1, a);
  return {
    type: "choice",
    prompt: "Сколько кубиков осталось?",
    answer: String(a - b),
    choices: Array.from({ length: limit + 1 }, (_, index) => String(index)),
    scene: { kind: "cubes-sub", a, b },
  };
}

function cubesAdd(max) {
  const cap = Math.max(2, Math.min(max, 5));
  const a = ri(1, cap - 1);
  const b = ri(1, cap - a);
  const word = (n, one, many) => `${n} ${n === 1 ? one : many} ${plural(n, "кубик", "кубика", "кубиков")}`;
  return {
    type: "choice",
    prompt: `Есть ${word(a, "розовый", "розовых")}. Добавь ещё ${word(b, "фиолетовый", "фиолетовых")}.`,
    answer: String(a + b),
    choices: Array.from({ length: cap }, (_, index) => String(index + 1)),
    help: `Складываем кубики: ${a} + ${b} = ${a + b}.`,
    scene: { kind: "cubes-add", a, b, colors: ["#f3a6c8", "#7b4bb7"], sentence: `Есть ${word(a, "розовый", "розовых")}. Добавь ещё ${word(b, "фиолетовый", "фиолетовых")}.`, question: "Сколько всего кубиков?" },
  };
}

function cubesSub(max) {
  const cap = Math.max(1, Math.min(max, 5));
  const a = ri(1, cap);
  const b = ri(1, a);
  return {
    type: "choice",
    prompt: `Было ${a} ${plural(a, "кубик", "кубика", "кубиков")}. Убери ${b}. Сколько кубиков осталось?`,
    answer: String(a - b),
    choices: Array.from({ length: cap + 1 }, (_, index) => String(index)),
    help: `Вычитаем: ${a} − ${b} = ${a - b}.`,
    scene: { kind: "cubes-sub", a, b },
  };
}

function domino() {
  const a = ri(0, 6);
  const b = ri(0, 6);
  const sum = a + b;
  const near = [sum - 1, sum + 1].filter((value) => value >= 0 && value !== sum);
  while (near.length < 2) near.push(sum + near.length + 2);
  return {
    type: "choice",
    prompt: "Сколько всего точек на домино?",
    answer: String(sum),
    choices: shuffle([String(sum), ...near.slice(0, 2).map(String)]),
    speak: true,
    scene: { kind: "domino", a, b },
  };
}

function jump(max, forward) {
  const cap = Math.min(Math.max(max, 1), 10);
  if (forward) {
    const n = ri(0, cap - 1);
    const step = ri(1, cap - n);
    const word = step === 1 ? "прыжок" : step < 5 ? "прыжка" : "прыжков";
    return {
      type: "choice",
      prompt: `Бобёр сделает ${step} ${word} вперед. Где он окажется?`,
      answer: String(n + step),
      choices: Array.from({ length: cap + 1 }, (_, index) => String(index)),
      scene: { kind: "ticks", start: n },
    };
  }
  const n = ri(1, cap);
  const step = ri(1, n);
  const word = step === 1 ? "прыжок" : step < 5 ? "прыжка" : "прыжков";
  return {
    type: "choice",
    prompt: `Бобёр сделает ${step} ${word} назад. Где он окажется?`,
    answer: String(n - step),
    choices: Array.from({ length: cap + 1 }, (_, index) => String(index)),
    scene: { kind: "ticks", start: n },
  };
}

function pairs(max) {
  const groups = ri(1, Math.max(1, Math.min(6, Math.floor(max / 2))));
  const answer = groups * 2;
  const cap = Math.min(max, 20);
  const options = [answer, answer - 2, answer + 2, answer + 1].filter((value, index, list) => value >= 0 && value <= cap && list.indexOf(value) === index);
  return {
    type: "choice",
    prompt: "Сколько всего яблок? Считай по два.",
    answer: String(answer),
    choices: shuffle(options.map(String)),
    scene: { kind: "pairs", count: answer, glyph: "apple" },
  };
}

function learnCount(max) {
  const n = ri(0, Math.min(max, 10));
  return counted(`Сколько здесь лошадей?`, n, Math.min(max, 10), { kind: "count", count: n, glyph: "horse" });
}

function moreLessTask(max) {
  const place = pick(PLACES);
  const base = ri(1, Math.max(1, max - 1));
  const extra = ri(1, Math.max(1, max - base));
  if (Math.random() < 0.5) {
    return story(
      `${place.first} ${qty(base, place.forms)}${place.tail || ""}, а ${place.short} — на ${extra} больше. Сколько ${place.ask} ${place.second}?`,
      base + extra, base, extra, "more",
      { picture: place.picture, names: place.names, diffText: `на ${extra} больше`, forms: place.forms },
    );
  }
  const total = ri(extra, Math.max(extra, max));
  return story(
    `${place.first} ${qty(total, place.forms)}${place.tail || ""}, а ${place.short} — на ${extra} меньше. Сколько ${place.ask} ${place.second}?`,
    total - extra, total, extra, "less",
    { picture: place.picture, names: place.names, diffText: `на ${extra} меньше`, forms: place.forms },
  );
}

function diffTask(max) {
  const place = pick(PLACES);
  let a = ri(0, max);
  let b = ri(0, max);
  if (a === b) b = a === 0 ? 1 : a - 1;
  const bigSide = a > b ? place.first : place.second;
  const smallSide = a > b ? place.short : place.first.toLowerCase();
  const question = Math.random() < 0.5
    ? `На сколько больше ${place.ask} ${bigSide.charAt(0).toLowerCase()}${bigSide.slice(1)}, чем ${smallSide}?`
    : `На сколько меньше ${place.ask} ${smallSide}, чем ${bigSide.charAt(0).toLowerCase()}${bigSide.slice(1)}?`;
  return story(
    `${place.first} ${qty(a, place.forms)}${place.tail || ""}, а ${place.short} — ${qty(b, place.forms)}. ${question}`,
    Math.abs(a - b), a, b, "compare",
    { picture: place.picture, names: place.names, diffText: `на ${Math.abs(a - b)}`, forms: place.forms },
  );
}

function unknownAddend(max) {
  const sum = ri(2, Math.max(2, max));
  const known = ri(1, sum - 1);
  const roll = Math.random();
  if (roll < 0.45) {
    const part = pick(PARTS.filter((item) => item.max >= sum));
    return story(part.text(sum, known), sum - known, known, sum - known, "parts", { picture: part.picture, unknown: "b", top: sum, unit: "штук" });
  }
  const tale = pick(TALES);
  if (roll < 0.75) {
    return story(
      `${cap(tale.someBe)}. Потом ${tale.add(known)}, и их стало ${sum}. Сколько ${tale.gen} ${tale.bePast} ${tale.where} сначала?`,
      sum - known, sum - known, known, "parts",
      { picture: tale.picture, unknown: "a", top: sum, unit: tale.gen },
    );
  }
  return story(
    `${cap(tale.be(known))}. Потом ${tale.someAdd}, и их стало ${sum}. Сколько ${tale.gen} ${tale.addPast}?`,
    sum - known, known, sum - known, "parts",
    { picture: tale.picture, unknown: "b", top: sum, unit: tale.gen },
  );
}

function twoStep(max) {
  if (max >= 40 && Math.random() < 0.45) {
    const son = ri(4, 12);
    const older = ri(1, 8);
    const times = ri(2, 4);
    const brother = son + older;
    const mom = brother * times;
    return story(
      `Сыну ${qty(son, ["год", "года", "лет"])}. Его брат на ${qty(older, ["год", "года", "лет"])} старше, а мама в ${times} раза старше брата. Сколько лет маме?`,
      mom, son, older, "chain",
      {
        picture: "people",
        c: times,
        names: ["Сын", "Брат", "Мама"],
        unit: plural(mom, "год", "года", "лет"),
        chain: [
          `Брат старше на ${older}: ${son} + ${older} = ${brother}.`,
          `Мама в ${times} раза старше брата: ${brother} × ${times} = ${mom}.`,
        ],
      },
    );
  }
  const tale = pick(TALES);
  const kind = pick(["addRemove", "removeTwice", "addTwice", "pair"]);
  const room = Math.max(4, max);
  if (kind === "removeTwice") {
    const start = ri(Math.min(6, room), room);
    const first = ri(1, Math.max(1, start - 2));
    const second = ri(1, Math.max(1, start - first));
    return story(
      `${cap(tale.be(start))}. Сначала ${tale.rem(first)}, а потом ${tale.rem(second)}. Сколько ${tale.gen} осталось ${tale.where}?`,
      start - first - second, start, first, "leave2",
      { picture: tale.picture, c: second, top: start, unit: tale.gen },
    );
  }
  if (kind === "addTwice") {
    const a = ri(1, Math.max(1, room - 2));
    const b = ri(1, Math.max(1, room - a - 1));
    const c = ri(1, Math.max(1, room - a - b));
    return story(
      `${cap(tale.be(a))}. Сначала ${tale.add(b)}, а потом ${tale.add(c)}. Сколько ${tale.gen} стало ${tale.where}?`,
      a + b + c, a, b, "join3",
      { picture: tale.picture, c },
    );
  }
  if (kind === "pair") {
    const pair = pick(PAIRS.filter((item) => item.max >= 6));
    const a = ri(1, Math.max(1, Math.min(pair.max, room) - 2));
    const b = ri(1, Math.max(1, Math.min(pair.max, room) - a));
    const c = ri(1, a + b - 1);
    return story(
      `${pair.place} лежали ${qty(a, pair.a)} и ${qty(b, pair.b)}. Потом забрали ${qty(c, pair.a)}. Сколько осталось?`,
      a + b - c, a, b, "twostep",
      { picture: pair.picture, c, unit: plural(a + b - c, ...pair.a) },
    );
  }
  const a = ri(1, Math.max(1, room - 2));
  const b = ri(1, Math.max(1, room - a));
  const c = ri(1, a + b - 1);
  return story(
    `${cap(tale.be(a))}. Сначала ${tale.add(b)}, а потом ${tale.rem(c)}. Сколько ${tale.gen} стало ${tale.where}?`,
    a + b - c, a, b, "twostep",
    { picture: tale.picture, c },
  );
}

function opChoice() {
  const tale = pick(TALES);
  const place = pick(PLACES);
  const roll = Math.random();
  if (roll < 0.25) {
    const a = ri(2, 12);
    const b = ri(1, 8);
    return {
      ...choice(`${cap(tale.be(a))}. ${cap(tale.add(b))}. Что сделать, чтобы узнать, сколько ${tale.gen} стало?`, "Сложить", ["Сложить", "Вычесть"]),
      hideSkip: true,
      hideHint: true,
      choices: ["Сложить", "Вычесть"],
      scene: { kind: "story", mode: "join", a, b, picture: tale.picture, result: a + b, beside: true },
      solution: { steps: [`Было ${a}, стало ${a + b}.`, `${a} + ${b} = ${a + b}.`], answerLine: `Ответ: сложить, ${a + b} ${tale.gen}.` },
    };
  }
  if (roll < 0.5) {
    const taken = ri(1, 8);
    const left = ri(1, 12);
    return {
      ...choice(`${cap(tale.be(left + taken))}. ${cap(tale.rem(taken))}. Что сделать, чтобы узнать, сколько ${tale.gen} осталось?`, "Вычесть", ["Сложить", "Вычесть"]),
      hideSkip: true,
      hideHint: true,
      choices: ["Сложить", "Вычесть"],
      scene: { kind: "story", mode: "remove", a: left + taken, b: taken, picture: tale.picture, result: left, beside: true },
      solution: { steps: [`Было ${left + taken}, стало ${left}.`, `${left + taken} − ${taken} = ${left}.`], answerLine: `Ответ: вычесть, ${left} ${tale.gen}.` },
    };
  }
  if (roll < 0.75) {
    const a = ri(2, 9);
    const extra = ri(1, 6);
    return {
      ...choice(`${place.first} ${qty(a, place.forms)}${place.tail || ""}, а ${place.short} — на ${extra} больше. Что сделать, чтобы узнать, сколько ${place.ask} ${place.second}?`, "Сложить", ["Сложить", "Вычесть"]),
      hideSkip: true,
      hideHint: true,
      choices: ["Сложить", "Вычесть"],
      scene: { kind: "story", mode: "more", a, b: extra, picture: place.picture, names: place.names, diffText: `на ${extra} больше`, result: a + extra, beside: true },
      solution: { steps: [`На ${extra} больше — значит, столько же и ещё ${extra}.`, `${a} + ${extra} = ${a + extra}.`], answerLine: `Ответ: сложить, ${a + extra}.` },
    };
  }
  const left = ri(0, 8);
  const taken = ri(1, 8);
  return {
    ...choice(`${cap(tale.someBe)}. Потом ${tale.rem(taken)}, и осталось ${left}. Что сделать, чтобы узнать, сколько ${tale.gen} было сначала?`, "Сложить", ["Сложить", "Вычесть"]),
    hideSkip: true,
    hideHint: true,
    choices: ["Сложить", "Вычесть"],
    scene: { kind: "story", mode: "leave", a: left, b: taken, picture: tale.picture, unknown: "s", result: left + taken, beside: true },
    solution: { steps: [`Было неизвестно, осталось ${left}.`, `${left} + ${taken} = ${left + taken}.`], answerLine: `Ответ: сложить, ${left + taken} ${tale.gen}.` },
  };
}

function timesChoice() {
  const thing = pick(THINGS);
  const each = ri(2, 8);
  const boxes = ri(2, 8);
  if (Math.random() < 0.5) {
    return {
      ...choice(
        `По ${qty(each, thing)} взяли ${boxes} раз. Как узнать, сколько ${thing[2]} всего?`,
        "Умножить",
        ["Умножить", "Разделить"],
      ),
      scene: { kind: "story", mode: "groups", a: each, b: boxes, picture: "box", result: each * boxes },
      solution: { steps: [`По ${each} взяли ${boxes} раз — это умножение.`, `${each} ⋅ ${boxes} = ${each * boxes}.`], answerLine: `Ответ: умножить, ${each * boxes}.` },
    };
  }
  return {
    ...choice(
      `${qty(each * boxes, thing)} разложили поровну в ${boxes} коробки. Как узнать, сколько в одной?`,
      "Разделить",
      ["Умножить", "Разделить"],
    ),
    scene: { kind: "story", mode: "split", a: each, b: boxes, picture: "box", top: each * boxes, result: each },
    solution: { steps: [`Делим поровну — это деление.`, `${each * boxes} : ${boxes} = ${each}.`], answerLine: `Ответ: разделить, ${each}.` },
  };
}

function timesTask(max) {
  const thing = pick(THINGS);
  for (let i = 0; i < 30; i += 1) {
    const each = ri(2, 9);
    const groups = ri(2, 9);
    if (each * groups <= max) {
      if (Math.random() < 0.5) {
        return story(
          `В ${groups} коробках по ${qty(each, thing)}. Сколько ${thing[2]} всего?`,
          each * groups, each, groups, "groups", { picture: "box", forms: thing },
        );
      }
      return story(
        `${qty(each * groups, thing)} разложили поровну в ${groups} коробки. Сколько ${thing[2]} в одной?`,
        each, each, groups, "split", { picture: "box", top: each * groups, forms: thing },
      );
    }
  }
  return story(`В 2 коробках по ${qty(2, thing)}. Сколько ${thing[2]} всего?`, 4, 2, 2, "groups", { picture: "box", forms: thing });
}

function timesMore(max) {
  const place = pick(PLACES);
  const timesWord = (n) => `в ${n} ${plural(n, "раз", "раза", "раз")}`;
  const times = ri(2, Math.min(6, Math.max(2, Math.floor(max / 2))));
  const base = ri(2, Math.max(2, Math.floor(max / times)));
  if (base * times <= max && Math.random() < 0.5) {
    return story(
      `${place.first} ${qty(base, place.forms)}, а ${place.short} — ${timesWord(times)} больше. Сколько ${place.ask} ${place.second}?`,
      base * times, base, times, "times",
      { picture: place.picture, names: place.names, diffText: `${timesWord(times)} больше`, forms: place.forms },
    );
  }
  const product = Math.min(max, base * times);
  const safeTimes = Math.max(2, Math.round(product / base) || times);
  const whole = base * safeTimes;
  return story(
    `${place.first} ${qty(whole, place.forms)}, а ${place.short} — ${timesWord(safeTimes)} меньше. Сколько ${place.ask} ${place.second}?`,
    base, whole, safeTimes, "times",
    { picture: place.picture, names: place.names, diffText: `${timesWord(safeTimes)} меньше`, forms: place.forms, less: true },
  );
}

function howManyTimes() {
  const times = ri(2, 9);
  const base = ri(2, 9);
  return story(
    `Было ${base * times} шариков и ${base} шариков. Во сколько раз больше в первой кучке?`,
    times, base * times, base, "split",
    { picture: "ball", top: base * times, solution: [`Делим большее количество на меньшее.`, `${base * times} ÷ ${base} = ${times}.`] },
  );
}

function priceTask() {
  const goods = [
    { one: "Ручка", many: "ручек", forms: ["ручка", "ручки", "ручек"] },
    { one: "Карандаш", many: "карандашей", forms: ["карандаш", "карандаша", "карандашей"] },
    { one: "Тетрадь", many: "тетрадей", forms: ["тетрадь", "тетради", "тетрадей"] },
  ];
  const item = pick(goods);
  const price = ri(2, 20);
  const count = ri(2, 6);
  if (Math.random() < 0.5) {
    return story(
      `${item.one} стоит ${price} рублей. Сколько ${item.many} можно купить на ${price * count} рублей?`,
      count, price, count, "price",
      { picture: "pencil", unit: "шт.", buy: true, money: price * count, cells: [`${price} р.`, "?", `${price * count} р.`] },
    );
  }
  return story(
    `${item.one} стоит ${price} рублей. Сколько стоят ${qty(count, item.forms)}?`,
    price * count, price, count, "price",
    { picture: "pencil", unit: "р.", cells: [`${price} р.`, String(count), "?"] },
  );
}

function unitRate() {
  const packs = ri(2, 6);
  const each = ri(2, 8);
  const want = ri(1, 6);
  const used = packs * each;
  const need = each * want;
  return story(
    `На ${packs} ${plural(packs, "одинаковое платье", "одинаковых платья", "одинаковых платьев")} ушло ${used} м ткани. Сколько метров ткани нужно на ${want} ${plural(want, "такое платье", "таких платья", "таких платьев")}?`,
    need,
    packs,
    want,
    "rate",
    {
      picture: "cloth",
      unit: "м",
      solution: [
        `Сначала узнаем, сколько на одно платье: ${used} : ${packs} = ${each} м.`,
        `Затем — сколько в ${want}: ${each} ⋅ ${want} = ${need} м.`,
      ],
    },
  );
}

function reverseTask(max) {
  const tale = pick(TALES);
  if (Math.random() < 0.5) {
    const added = ri(1, Math.max(1, max - 1));
    const now = ri(added, max);
    return story(
      `${cap(tale.someBe)}. Потом ${tale.add(added)}, и их стало ${now}. Сколько ${tale.gen} ${tale.bePast} ${tale.where} сначала?`,
      now - added, now - added, added, "parts",
      { picture: tale.picture, unknown: "a", top: now, unit: tale.gen },
    );
  }
  const removed = ri(1, max);
  const left = ri(0, max - removed);
  return story(
    `${cap(tale.someBe)}. Потом ${tale.rem(removed)}, и осталось ${left}. Сколько ${tale.gen} ${tale.bePast} ${tale.where} сначала?`,
    left + removed, left, removed, "leave",
    { picture: tale.picture, unknown: "s", unit: tale.gen },
  );
}

function minuendTask(max) {
  const tale = pick(TALES);
  if (Math.random() < 0.5) {
    const sub = ri(1, Math.max(1, max - 1));
    const left = ri(0, max - sub);
    return story(
      `${cap(tale.someBe)}. Потом ${tale.rem(sub)}, и осталось ${left}. Сколько ${tale.gen} ${tale.bePast} ${tale.where} сначала?`,
      left + sub, left, sub, "leave",
      { picture: tale.picture, unknown: "s", unit: tale.gen },
    );
  }
  const start = ri(1, max);
  const left = ri(0, start);
  const taken = start - left;
  return story(
    `${cap(tale.be(start))}. Потом ${tale.someRem}, и осталось ${left}. Сколько ${tale.gen} ${tale.remPast}?`,
    taken, left, taken || 1, "leave",
    { picture: tale.picture, unknown: "b", top: start, unit: tale.gen, action: tale.remPast },
  );
}

function simpleTask(max) {
  const [a, b] = pairWithin(max, Math.random() < 0.5 ? "+" : "−", Math.random() < 0.5);
  const op = arguments.length ? (Math.random() < 0.5 ? "+" : "−") : "+";
  return thingTask(op === "+" ? a : Math.max(a, b), op === "+" ? b : Math.min(a, b) === a && a !== b ? b : Math.min(a, b), op);
}

function naturalTask() {
  const a = ri(20, 400);
  const b = ri(10, 200);
  const c = ri(1, 80);
  return story(
    `В библиотеке было ${a + b} книг. Выдали ${b}, потом привезли ${c}. Сколько книг стало?`,
    a + c, a + b, b, "join",
    { picture: "book", c, unit: "книг", solution: [`Сначала вычитаем выданные.`, `${a + b} − ${b} = ${a}.`, `Потом прибавляем привезённые.`, `${a} + ${c} = ${a + c}.`] },
  );
}

function geoTask() {
  if (Math.random() < 0.5) {
    const side = ri(3, 20);
    return {
      ...ask(`Периметр квадрата равен ${side * 4} см. Найдите его сторону.`, side),
      scene: { kind: "rect", w: side, h: side },
      unit: "см",
      keypad: true,
      solution: { steps: ["Сторона квадрата — это периметр, делённый на 4.", `${side * 4} : 4 = ${side}.`], answerLine: `Ответ: ${side} см.` },
    };
  }
  const length = ri(3, 15);
  const width = ri(2, 12);
  return {
    ...ask(`Найдите периметр прямоугольника. Длина ${length} м, ширина ${width} м.`, 2 * (length + width)),
    scene: { kind: "rect", w: length, h: width },
    unit: "м",
    solution: { steps: ["Складываем две соседние стороны и умножаем на 2.", `(${length} + ${width}) · 2 = ${2 * (length + width)}.`], answerLine: `Ответ: ${2 * (length + width)} м.` },
  };
}

function workTask() {
  const rate = ri(2, 12) * 5;
  const hours = ri(2, 8);
  if (Math.random() < 0.5) {
    return story(
      `Пекарь печет ${rate} булочек в час. Сколько булочек он испечет за ${hours} ч?`,
      rate * hours, rate, rate * hours, "work",
      { picture: "bun", unit: "булочек", c: hours, cells: [`${rate} бул./ч`, String(hours), "?"] },
    );
  }
  return story(
    `Пекарь печет ${rate} булочек в час. За сколько часов он испечет ${rate * hours} булочек?`,
    hours, rate, rate * hours, "work",
    { picture: "bun", unit: "ч", cells: [`${rate} бул./ч`, "?", `${rate * hours} бул.`] },
  );
}

function twoDiffs() {
  const hours = ri(2, 5);
  const second = ri(8, 16) * 5;
  const gap = ri(2, 8) * hours;
  const first = second + gap / hours;
  return story(
    `За ${hours} ч первый проехал на ${gap} км больше, чем второй. Второй ехал со скоростью ${second} км/ч. Какова скорость первого?`,
    first,
    second,
    gap,
    "diffs",
    {
      picture: "bus",
      unit: "км/ч",
      solution: [
        `Путь второго: ${second} ⋅ ${hours} = ${second * hours} км.`,
        `Путь первого больше на ${gap}: ${second * hours} + ${gap} = ${second * hours + gap} км.`,
        `Скорость первого: ${second * hours + gap} : ${hours} = ${first} км/ч.`,
      ],
    },
  );
}

function motionBasic() {
  const speed = ri(4, 12);
  const hours = ri(2, 6);
  const kind = ri(1, 3);
  if (kind === 1) {
    return story(
      `Велосипедист ехал ${hours} ч со скоростью ${speed} км/ч. Какое расстояние он проехал?`,
      speed * hours, speed, hours, "groups",
      { picture: "bus", unit: "км", solution: [`Умножаем скорость на время.`, `${speed} ⋅ ${hours} = ${speed * hours} км.`] },
    );
  }
  if (kind === 2) {
    return story(
      `Дорога ${speed * hours} км. Скорость ${speed} км/ч. Сколько часов займёт путь?`,
      hours, speed * hours, speed, "split",
      { picture: "bus", unit: "ч", top: speed * hours, solution: [`Делим расстояние на скорость.`, `${speed * hours} : ${speed} = ${hours}.`] },
    );
  }
  return story(
    `За ${hours} ч проехали ${speed * hours} км. Какая была скорость?`,
    speed, speed * hours, hours, "split",
    { picture: "bus", unit: "км/ч", top: speed * hours, solution: [`Делим расстояние на время.`, `${speed * hours} : ${hours} = ${speed}.`] },
  );
}

function motionTwo() {
  const v1 = ri(4, 12) * 5;
  const t1 = ri(1, 5);
  const v2 = ri(3, 10) * 5;
  const t2 = ri(1, 4);
  return story(
    `Сначала ехали ${t1} ч со скоростью ${v1} км/ч, потом ${t2} ч со скоростью ${v2} км/ч. Какой путь прошли?`,
    v1 * t1 + v2 * t2,
    t1,
    t2,
    "route",
    {
      picture: "bus",
      unit: "км",
      speeds: [v1, v2],
      times: [t1, t2],
      scheme: false,
      inlineScheme: true,
      solution: [
        `${v1} ⋅ ${t1} = ${v1 * t1} км.`,
        `${v2} ⋅ ${t2} = ${v2 * t2} км.`,
        `${v1 * t1} + ${v2 * t2} = ${v1 * t1 + v2 * t2} км.`,
      ],
    },
  );
}

function toward() {
  const v1 = ri(4, 10);
  const v2 = ri(3, 9);
  const hours = ri(2, 5);
  const distance = (v1 + v2) * hours;
  return story(
    `Два поезда едут навстречу со скоростями ${v1} км/ч и ${v2} км/ч. Между ними ${distance} км. Через сколько часов они встретятся?`,
    hours,
    v1,
    v2,
    "meet",
    {
      picture: "bus",
      unit: "ч",
      solution: [
        `Скорость сближения — сумма скоростей: ${v1} + ${v2} = ${v1 + v2} км/ч.`,
        `Время — расстояние делим на эту скорость: ${distance} : ${v1 + v2} = ${hours}.`,
      ],
    },
  );
}

function chase() {
  const slower = ri(4, 8);
  const faster = slower + ri(2, 5);
  const hours = ri(2, 5);
  const gap = (faster - slower) * hours;
  return story(
    `Первый автобус уже проехал на ${gap} км больше. Второй едет на ${faster - slower} км/ч быстрее. Через сколько часов второй его догонит?`,
    hours,
    slower,
    faster,
    "chase",
    {
      picture: "bus",
      unit: "ч",
      solution: [
        `Второй догоняет на ${faster - slower} км каждый час.`,
        `Отставание ${gap} км: ${gap} : ${faster - slower} = ${hours}.`,
      ],
    },
  );
}

function shapes() {
  const options = ["triangle", "circle", "square", "rectangle", "rhombus"];
  const names = { triangle: "Треугольник", circle: "Круг", square: "Квадрат", rectangle: "Прямоугольник", rhombus: "Ромб" };
  const answer = pick(options);
  return {
    type: "choice",
    prompt: names[answer],
    answer,
    choices: options,
    scene: { kind: "pick", options },
  };
}

function solids() {
  const options = ["sphere", "box", "cone", "pyramid"];
  const names = { sphere: "Шар", box: "Куб", cone: "Конус", pyramid: "Пирамида" };
  const answer = pick(options);
  return {
    type: "choice",
    prompt: names[answer],
    answer,
    choices: options,
    scene: { kind: "pick", options },
  };
}

function shapeLike() {
  const bank = [
    ["Что похоже на конус?", "рожок", ["рожок", "ведерко", "карандаш"]],
    ["Что похоже на шар?", "мяч", ["ведерко", "мяч", "рожок"]],
    ["Что похоже на куб?", "кубик", ["пирамидка", "кубик", "мяч"]],
  ];
  const [prompt, answer, options] = pick(bank);
  return { type: "choice", prompt, answer, choices: options, scene: { kind: "pick", options } };
}

function findShapes() {
  const items = shuffle(["square", "circle", "triangle", "square", "circle", "triangle"]).slice(0, 5);
  if (!items.includes("square")) items[0] = "square";
  const ids = items.map((kind, index) => (kind === "square" ? String(index) : null)).filter(Boolean);
  return {
    type: "select",
    prompt: "Найди все квадраты",
    answer: ids.join("|"),
    manualNext: true,
    scene: { kind: "find", items, seed: ri(1, 99999) },
  };
}

function lines() {
  const open = [
    "M12 50 C 40 10, 80 10, 108 28",
    "M16 20 L 70 50 L 108 18",
    "M18 16 C 40 40, 70 10, 104 48",
    "M14 18 L 100 18 L 40 54",
  ];
  const closed = [
    "M12 35 C 30 8, 90 8, 108 35 C 90 62, 30 62, 12 35 Z",
    "M16 16 L 104 16 L 104 54 L 16 54 Z",
    "M60 8 L 108 40 L 60 64 L 12 40 Z",
    "M20 20 L 100 20 L 80 58 L 20 50 Z",
  ];
  const hole = ri(0, 3);
  const paths = {};
  const labels = ["Линия 1", "Линия 2", "Линия 3", "Линия 4"];
  for (let index = 0; index < 4; index += 1) paths[labels[index]] = index === hole ? closed[index] : open[index];
  return {
    type: "choice",
    prompt: "Найди замкнутую линию",
    answer: labels[hole],
    choices: labels,
    manualNext: true,
    scene: { kind: "lines", paths, closed: labels[hole] },
  };
}

function segment() {
  const kind = pick(["cm", "cm", "longer", "shorter", "dm"]);
  let mm = 40;
  let prompt = "Начертите отрезок AB длиной 4 см.";
  let steps = ["Отрезок длиной 4 см. Точка A стоит на нуле линейки.", "Точку B ставим на отметке 4: 4 × 1 = 4 см."];
  let answerLine = "Ответ: 4 см.";
  if (kind === "cm") {
    const cm = ri(2, 12);
    mm = cm * 10;
    prompt = `Начертите отрезок AB длиной ${cm} см.`;
    steps = [`Отрезок длиной ${cm} см. Точка A стоит на нуле линейки.`, `Точку B ставим на отметке ${cm}: ${cm} × 1 = ${cm} см.`];
    answerLine = `Ответ: ${cm} см.`;
  } else if (kind === "longer" || kind === "shorter") {
    const base = ri(3, 8);
    const delta = ri(1, 3);
    const cm = kind === "longer" ? base + delta : base - delta;
    mm = cm * 10;
    prompt = `Начертите отрезок AB, который на ${delta} см ${kind === "longer" ? "длиннее" : "короче"} отрезка длиной ${base} см.`;
    steps = kind === "longer"
      ? [`Отрезок на ${delta} см длиннее. Складываем: ${base} + ${delta} = ${cm}.`, `Точка A на нуле, точка B на отметке ${cm} см.`]
      : [`Отрезок на ${delta} см короче. Вычитаем: ${base} − ${delta} = ${cm}.`, `Точка A на нуле, точка B на отметке ${cm} см.`];
    answerLine = `Ответ: ${cm} см.`;
  } else {
    const extra = ri(1, 4);
    const cm = 10 + extra;
    mm = cm * 10;
    prompt = `Начертите отрезок AB длиной 1 дм ${extra} см.`;
    steps = ["1 дм = 10 см.", `Складываем: 10 + ${extra} = ${cm} см.`, `Точка A на нуле, точка B на отметке ${cm} см.`];
    answerLine = `Ответ: ${cm} см.`;
  }
  return {
    type: "select",
    prompt,
    answer: String(mm),
    solution: { steps, answerLine },
    scene: { kind: "ruler", max: 15, step: 10, seed: ri(1, 99999) },
  };
}

function leftRight() {
  const items = shuffle(["машина", "барабан", "ракета", "лейка"]);
  const gen = { машина: "машины", барабан: "барабана", ракета: "ракеты", лейка: "лейки" };
  const index = ri(0, items.length - 2);
  return {
    type: "choice",
    prompt: `Что справа от ${gen[items[index]]}?`,
    answer: items[index + 1],
    choices: items,
    scene: { kind: "row-pick", items },
  };
}

function aboveBelow() {
  const top = pick(["ваза", "мяч", "книга"]);
  const bottom = pick(["машина", "кубик", "лейка"].filter((item) => item !== top));
  return {
    type: "choice",
    prompt: "Что стоит на верхней полке?",
    answer: top,
    choices: shuffle([top, bottom]),
    scene: { kind: "stack", top, bottom },
  };
}

function corners() {
  const spot = pick(["Вверху", "Внизу", "В углу"]);
  return {
    type: "choice",
    prompt: "Где стоит фигурка?",
    answer: spot,
    choices: ["Вверху", "Внизу", "В углу"],
    scene: { kind: "spot", spot },
  };
}

function whereGo() {
  const grid = [
    ["яблоко", "мяч", "звезда"],
    ["кубик", "книга", "цветок"],
  ];
  const plan = pick([
    { moves: ["вправо", "вправо"], row: 0, col: 2 },
    { moves: ["вниз"], row: 1, col: 0 },
    { moves: ["вправо", "вниз"], row: 1, col: 1 },
    { moves: ["вниз", "вправо", "вправо"], row: 1, col: 2 },
  ]);
  return {
    type: "choice",
    prompt: "Иди по стрелкам. К какой картинке придет фигурка?",
    answer: grid[plan.row][plan.col],
    choices: grid.flat(),
    scene: { kind: "path", grid, moves: plan.moves },
  };
}

function dictation() {
  const rows = 6;
  const cols = 8;
  const start = [1, 2];
  const commands = pick([
    [["вправо", 2], ["вниз", 1], ["вправо", 2], ["вверх", 1], ["вправо", 1]],
    [["вправо", 1], ["вниз", 2], ["вправо", 2], ["вверх", 1]],
    [["вниз", 1], ["вправо", 3], ["вверх", 1], ["вправо", 1]],
    [["вправо", 2], ["вверх", 1], ["вправо", 2], ["вниз", 1]],
    [["вправо", 3], ["вниз", 1], ["влево", 1], ["вниз", 1], ["вправо", 2]],
  ]);
  const steps = commands.flatMap(([dir, count]) => Array.from({ length: count }, () => dir));
  return {
    type: "select",
    prompt: "Рисуй по стрелкам. Начни с красной точки.",
    answer: steps.join("|"),
    manualNext: true,
    scene: { kind: "dict", rows, cols, start, commands, seed: ri(1, 99999) },
  };
}

function inside() {
  const inn = Math.random() < 0.5;
  return {
    type: "choice",
    prompt: "Точка внутри или снаружи?",
    answer: inn ? "Внутри" : "Снаружи",
    choices: ["Внутри", "Снаружи"],
    scene: { kind: "inside", inn },
  };
}

function whereStands() {
  const correct = "лейка, фигурка, телефон";
  return {
    ...choice(
      "Фигурка стоит справа от лейки и слева от телефона.",
      correct,
      [correct, "фигурка, лейка, телефон", "телефон, фигурка, лейка"],
    ),
  };
}

function longer() {
  const lengths = [];
  while (lengths.length < 3) {
    const next = ri(4, 22);
    if (!lengths.includes(next)) lengths.push(next);
  }
  const shortest = Math.random() < 0.5;
  const target = shortest ? Math.min(...lengths) : Math.max(...lengths);
  return {
    type: "choice",
    prompt: shortest ? "Какая ленточка самая короткая?" : "Какая ленточка самая длинная?",
    answer: String(lengths.indexOf(target)),
    choices: ["0", "1", "2"],
    scene: { kind: "ribbons", lengths },
  };
}

function measures() {
  const times = ri(2, 6);
  const options = [...new Set([times, Math.max(1, times - 1), times + 1])];
  return {
    type: "choice",
    prompt: "Сколько палочек уложилось вдоль ленточки?",
    answer: String(times),
    choices: shuffle(options.map(String)),
    scene: { kind: "measures", times },
  };
}

function oddOne() {
  const options = shuffle(["square", "rectangle", "triangle", "circle"]);
  return {
    type: "choice",
    prompt: "Какая фигура лишняя?",
    answer: "circle",
    choices: options,
    scene: { kind: "pick", options },
  };
}

function tableNext() {
  const shapes = shuffle(["triangle", "circle", "square"]);
  const colors = shuffle(["#e2b43a", "#d4533c", "#3c9a55"]);
  const hole = ri(0, 8);
  const row = Math.floor(hole / 3);
  const col = hole % 3;
  const cells = [];
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      cells.push(r === row && c === col ? null : { shape: shapes[c], color: colors[r] });
    }
  }
  const answer = `${shapes[col]}|${colors[row]}`;
  const pool = [];
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      const id = `${shapes[c]}|${colors[r]}`;
      if (id !== answer) pool.push(id);
    }
  }
  return {
    type: "choice",
    prompt: "Какой фигуры не хватает в таблице?",
    answer,
    choices: shuffle([answer, ...shuffle(pool).slice(0, 2)]),
    speak: true,
    scene: { kind: "matrix", cells },
  };
}

function shapeNext() {
  const cycle = ["circle", "square", "triangle"];
  const start = ri(0, 2);
  const seq = [0, 1, 2, 3].map((index) => cycle[(start + index) % 3]);
  const next = cycle[(start + 4) % 3];
  return {
    type: "choice",
    prompt: "Какая фигура будет следующей?",
    answer: next,
    choices: cycle,
    scene: { kind: "figrow", seq },
  };
}

function dotsNext() {
  const start = ri(1, 4);
  const step = pick([1, 2]);
  const seq = [0, 1, 2].map((index) => start + index * step);
  const next = start + 3 * step;
  return {
    type: "choice",
    prompt: "Сколько точек будет на следующей карточке?",
    answer: String(next),
    choices: shuffle([String(next), String(next + 1), String(Math.max(1, next - 1))]),
    scene: { kind: "dots", counts: seq },
  };
}

function clockHands() {
  const hand = Math.random() < 0.5 ? "hour" : "minute";
  return {
    type: "choice",
    prompt: hand === "hour" ? "Нажми на часовую стрелку" : "Нажми на минутную стрелку",
    answer: hand,
    choices: ["hour", "minute"],
    scene: { kind: "clock-hands", hour: ri(1, 12) },
  };
}

function quarters() {
  const mark = pick([0, 15, 30, 45]);
  const hour = ri(1, 11);
  return {
    type: "choice",
    prompt: "Сколько показывает минутная стрелка?",
    answer: String(mark).padStart(2, "0"),
    choices: ["00", "15", "30", "45"],
    scene: { kind: "clock", hour, minute: mark },
  };
}

function betweenHours() {
  const hour = ri(1, 11);
  const minute = pick([15, 30, 45]);
  const mm = String(minute).padStart(2, "0");
  const label = `${hour}:${mm}`;
  const before = hour === 1 ? 12 : hour - 1;
  const choices = [label, `${before}:${mm}`, `${hour + 1}:${mm}`];
  return {
    type: "choice",
    prompt: "Который час?",
    answer: label,
    choices: shuffle(choices),
    scene: { kind: "clock", hour, minute },
  };
}

function minuteMark() {
  const digit = ri(1, 11);
  const minute = digit * 5;
  const near = [minute - 10, minute - 5, minute, minute + 5].map((value) => (value + 60) % 60);
  return {
    type: "choice",
    prompt: "Сколько показывает минутная стрелка?",
    answer: String(minute),
    choices: shuffle([...new Set(near)].map(String)),
    scene: { kind: "clock", hour: 12, minute },
  };
}

function whichHour() {
  const hour = ri(1, 11);
  const minute = pick([20, 25, 35, 40, 50, 55]);
  const mm = String(minute).padStart(2, "0");
  const label = `${hour}:${mm}`;
  const near = [minute - 5, minute + 5, minute + 10].map((value) => `${value >= 60 ? hour + 1 : hour}:${String((value + 60) % 60).padStart(2, "0")}`);
  return {
    type: "choice",
    prompt: "Какое время показывают часы?",
    answer: label,
    choices: shuffle([label, ...near]),
    scene: { kind: "clock", hour, minute },
  };
}

function hour24() {
  const hour = ri(13, 23);
  const minute = pick([0, 15, 30, 45]);
  const hh = String(hour);
  const mm = String(minute).padStart(2, "0");
  return {
    type: "number",
    prompt: "Запишите время в 24-часовом формате",
    tokens: [],
    answer: `${hh}${mm}`,
    expect: Number(`${hh}${mm}`),
    entry: [hh, mm],
    scene: { kind: "clock", hour: hour - 12, minute, part: hour < 18 ? "День" : hour < 23 ? "Вечер" : "Ночь" },
  };
}

function elapsed() {
  const start = ri(1, 10);
  const hours = ri(1, 4);
  const end = start + hours;
  const from = `${start}:00`;
  const to = `${end}:00`;
  return {
    ...ask("Сколько времени прошло?", hours),
    scene: { kind: "clocks", clocks: [{ hour: start, minute: 0 }, { hour: end, minute: 0 }] },
    unit: "ч",
    keypad: true,
    solution: {
      steps: [`От ${from} до ${to}. Вычитаем часы: ${end} − ${start} = ${hours}.`],
      answerLine: `Ответ: ${hours} ч.`,
    },
  };
}

function place100() {
  const tens = ri(1, 9);
  const ones = ri(0, 9);
  const value = tens * 10 + ones;
  const words = ones
    ? `${qty(tens, ["десяток", "десятка", "десятков"])} и ${qty(ones, ["единица", "единицы", "единиц"])}`
    : qty(tens, ["десяток", "десятка", "десятков"]);
  return {
    ...ask(`Запишите число, в котором ${words}`, value),
    scene: { kind: "blocks", tens, ones },
    keypad: true,
    check: true,
    solution: {
      steps: [`${tens} ${plural(tens, "десяток", "десятка", "десятков")} и ${ones} ${plural(ones, "единица", "единицы", "единиц")}.`, `Умножаем десятки и прибавляем единицы: ${tens} × 10 + ${ones} = ${value}.`],
      answerLine: `Ответ: ${value}.`,
    },
  };
}

function placePhrase(hundreds, tens, ones) {
  const bits = [];
  if (hundreds) bits.push(qty(hundreds, ["сотня", "сотни", "сотен"]));
  if (tens) bits.push(qty(tens, ["десяток", "десятка", "десятков"]));
  if (ones || bits.length === 0) bits.push(qty(ones, ["единица", "единицы", "единиц"]));
  if (bits.length === 1) return bits[0];
  if (bits.length === 2) return `${bits[0]} и ${bits[1]}`;
  return `${bits[0]}, ${bits[1]} и ${bits[2]}`;
}

function place1000() {
  const hundreds = ri(1, 9);
  const tens = ri(0, 9);
  const ones = ri(0, 9);
  const value = hundreds * 100 + tens * 10 + ones;
  return {
    type: "commit",
    prompt: `Запиши число, в котором ${placePhrase(hundreds, tens, ones)}`,
    answer: String(value),
    expect: value,
    keypad: true,
    solution: {
      steps: [`${hundreds} сот., ${tens} дес. и ${ones} ед. Пустой разряд пишем нулём.`, `${hundreds} × 100 + ${tens} × 10 + ${ones} = ${value}.`],
      answerLine: `Ответ: ${value}.`,
    },
  };
}

function classes() {
  const places = ["единицы", "десятки", "сотни", "единицы тысяч", "десятки тысяч"];
  const number = ri(10000, 99999);
  const text = String(number);
  const index = ri(0, places.length - 1);
  const digit = text[text.length - 1 - index];
  const options = [digit];
  for (const extra of ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]) {
    if (!options.includes(extra)) options.push(extra);
    if (options.length === 4) break;
  }
  return {
    type: "choice",
    prompt: `Какая цифра стоит в разряде ${places[index]} в числе ${number}?`,
    answer: digit,
    choices: shuffle(options),
    scene: { kind: "places", number: text, index },
    solution: {
      steps: [`В числе ${number} разряд «${places[index]}» стоит на месте ${index + 1} справа.`, `Цифра ${digit} × ${10 ** index} = ${Number(digit) * 10 ** index}.`],
      answerLine: `Ответ: ${digit}.`,
    },
  };
}

function readBig() {
  const thousands = ri(1, 220);
  const rest = ri(0, 999);
  const value = thousands * 1000 + rest;
  return {
    type: "commit",
    prompt: `Запишите цифрами число, в котором ${thousands} тысяч и ${rest} единиц`,
    answer: String(value),
    expect: value,
    keypad: true,
    solution: {
      steps: [`${thousands} тысяч — это класс тысяч: ${thousands} × 1000 = ${thousands * 1000}.`, `Класс единиц — ${rest}. Складываем: ${thousands * 1000} + ${rest} = ${value}.`],
      answerLine: `Ответ: ${value}.`,
    },
  };
}

function convenientAdd() {
  const a = ri(1, 9);
  const b = ri(1, 3) * 10 - a;
  const c = ri(3, 40);
  const round = a + b;
  return {
    ...ask(`Вычислите удобным способом ${a} + ${c} + ${b}`, a + b + c),
    keypad: true,
    solution: { steps: [`Найдем слагаемые, которые вместе дают круглое число: ${a} + ${b} = ${round}.`, `Затем ${round} + ${c} = ${round + c}.`], answerLine: `Ответ: ${a + b + c}.` },
  };
}

function convenientMul() {
  const [a, b] = pick([[2, 5], [4, 5], [5, 2], [5, 4], [5, 6], [5, 8], [25, 4], [5, 8]]);
  const c = ri(2, 9);
  const round = a * b;
  return {
    type: "commit",
    prompt: `Вычислите удобным способом ${a} · ${b} · ${c}`,
    answer: String(round * c),
    expect: round * c,
    keypad: true,
    solution: { steps: [`Сначала ${a} ⋅ ${b} = ${round}.`, `Затем ${round} ⋅ ${c} = ${round * c}.`], answerLine: `Ответ: ${round * c}.` },
  };
}

function factorOf(title) {
  const found = title.match(/на (\d+)/);
  return found ? Number(found[1]) : null;
}

function tableMul(title) {
  const factor = factorOf(title) || ri(2, 9);
  const other = factor > 10 ? ri(2, 9) : ri(1, 10);
  return binary(factor, "×", other);
}

function tableDiv(title) {
  const factor = factorOf(title) || ri(2, 9);
  const q = factor > 10 ? ri(2, 9) : ri(1, 10);
  return binary(factor * q, "÷", factor);
}

function pythagoras() {
  const row = ri(2, 10);
  const col = ri(2, 10);
  return {
    type: "number",
    prompt: "Заполните пропуски в таблице умножения",
    tokens: [],
    answer: String(row * col),
    expect: row * col,
    scene: { kind: "pythagoras", row, col },
  };
}

const PICTURE_THINGS = [
  { kind: "apple", container: "plate", many: "яблок", one: "на одной тарелке", forms: ["тарелка", "тарелки", "тарелок"] },
  { kind: "star", container: "box", many: "звёзд", one: "в одной коробке", forms: ["коробка", "коробки", "коробок"] },
  { kind: "cube", container: "box", many: "кубиков", one: "в одной коробке", forms: ["коробка", "коробки", "коробок"] },
];

function pictureMul() {
  const groups = ri(2, 5);
  const each = ri(2, 6);
  const thing = pick(PICTURE_THINGS);
  const total = groups * each;
  const sum = `${Array(groups).fill(each).join(" + ")} = ${total}`;
  return {
    type: "number",
    tokens: [],
    prompt: `Сколько всего ${thing.many}?`,
    answer: String(total),
    expect: total,
    picture: {
      groups,
      each,
      kind: thing.kind,
      container: thing.container,
      many: thing.many,
      one: thing.one,
      forms: thing.forms,
      sum,
      entry: [String(each), String(groups), String(total)],
    },
  };
}

function productLimit(max) {
  for (let i = 0; i < 40; i += 1) {
    const a = ri(2, 12);
    const b = ri(2, 12);
    if (a * b <= max) return binary(a, "×", b);
  }
  return binary(3, "×", 4);
}

function times21(max) {
  for (let i = 0; i < 40; i += 1) {
    const a = ri(12, 99);
    const b = ri(2, 9);
    if (a * b <= max) return binary(a, "×", b);
  }
  return binary(12, "×", 2);
}

function timesRound() {
  const a = ri(2, 9) * 10;
  const b = ri(2, 9);
  return binary(a, "×", b);
}

function mulColumn(a, b) {
  return writtenQuestion(multiplyWork(a, b));
}

function divColumn(n, d) {
  return writtenQuestion(divisionWork(n, d));
}

function times22() {
  return mulColumn(ri(12, 40), ri(12, 30));
}

function times32() {
  return mulColumn(ri(100, 180), ri(12, 24));
}

function exactDiv(max) {
  for (let i = 0; i < 40; i += 1) {
    const d = ri(2, 9);
    const q = ri(2, 12);
    if (d * q <= max) return binary(d * q, "÷", d);
  }
  return binary(12, "÷", 3);
}

function remainder(max = 100) {
  for (let i = 0; i < 40; i += 1) {
    const d = ri(2, 9);
    const q = ri(1, 12);
    const rest = ri(1, d - 1);
    const n = d * q + rest;
    if (n <= max) {
      return {
        type: "number",
        prompt: `Выполните деление с остатком. ${n} : ${d} =`,
        tokens: [],
        answer: String(rest),
        expect: rest,
        entry: [String(q), String(rest)],
        scene: { kind: "remain" },
        solution: { steps: [`Ближайшее меньшее кратное ${d}: ${d} ⋅ ${q} = ${d * q}.`, `Неполное частное ${q}, остаток ${n} − ${d * q} = ${rest}.`], answerLine: `Ответ: ${q} ост. ${rest}.` },
      };
    }
  }
  return {
    type: "number",
    prompt: "Выполните деление с остатком. 17 : 5 =",
    tokens: [],
    answer: "2",
    expect: 2,
    entry: ["3", "2"],
    scene: { kind: "remain" },
    solution: { steps: ["Ближайшее меньшее кратное 5: 5 ⋅ 3 = 15.", "Неполное частное 3, остаток 17 − 15 = 2."], answerLine: "Ответ: 3 ост. 2." },
  };
}

function splitMul() {
  const tens = ri(1, 4) * 10;
  const ones = ri(1, 4);
  const factor = 2;
  const n = tens + ones;
  return {
    type: "number",
    prompt: `Вычислите ${n} · ${factor}`,
    tokens: [],
    answer: String(n * factor),
    expect: n * factor,
    entry: [String(tens), String(ones), String(tens * factor), String(ones * factor), String(n * factor)],
    scene: { kind: "split", factor },
    check: true,
  };
}

function drops() {
  const start = ri(1, 12);
  const n = ri(1, 6);
  const add = start + n <= 20 && Math.random() < 0.5;
  const op = add ? "+" : "−";
  const answer = add ? start + n : start - n;
  if (answer < 0) return drops();
  return {
    type: "number",
    tokens: [],
    prompt: `${start} ${op} ${n} =`,
    answer: String(answer),
    expect: answer,
    keypad: true,
    scene: { kind: "drop", start, op, n },
  };
}

function sameCount() {
  const n = ri(1, 6);
  const equal = Math.random() < 0.5;
  return {
    type: "choice",
    prompt: "Яблок столько же, сколько звёзд?",
    answer: equal ? "Да" : "Нет",
    choices: ["Да", "Нет"],
    scene: { kind: "same", left: n, right: equal ? n : n + 1, leftGlyph: "apple", rightGlyph: "star" },
  };
}

function divExactSpan(low, high) {
  const d = ri(2, 9);
  const q = ri(Math.max(2, Math.ceil(low / d)), Math.floor(high / d));
  return divColumn(d * q, d);
}

function zeroQuotient() {
  const d = ri(2, 9);
  const q = ri(1, 9) * 100 + ri(1, 9);
  return divColumn(d * q, d);
}

function divTwoDigit() {
  const d = ri(12, 25);
  const q = ri(3, 15);
  return divColumn(d * q, d);
}

function divRound() {
  const zeros = ri(1, 2);
  const divisor = ri(1, 9) * 10 ** zeros;
  const quotient = ri(2, 12);
  const dividend = String(divisor * quotient);
  const divisorText = String(divisor);
  const marks = [];
  for (let index = divisorText.length - 1; index >= 0 && divisorText[index] === "0"; index -= 1) marks.push(`d${index}`);
  let left = marks.length;
  for (let index = dividend.length - 1; index >= 0 && left > 0; index -= 1) {
    if (dividend[index] !== "0") break;
    marks.push(`n${index}`);
    left -= 1;
  }
  return {
    type: "select",
    prompt: "Зачеркни нули в конце делителя и столько же нулей в конце делимого",
    answer: marks.sort().join("|"),
    scene: { kind: "zeros", dividend, divisor: divisorText },
  };
}

function firstPartial(two) {
  const d = two ? ri(12, 40) : ri(2, 9);
  const n = two ? ri(1000, 9999) : ri(100, 999);
  const text = String(n);
  let take = 1;
  let group = Number(text.slice(0, take));
  while (group < d && take < text.length) {
    take += 1;
    group = Number(text.slice(0, take));
  }
  const choices = [];
  for (let index = 1; index <= text.length; index += 1) choices.push(text.slice(0, index));
  return {
    type: "choice",
    prompt: `Найдите первое неполное делимое. Делитель ${d}.`,
    answer: text.slice(0, take),
    choices,
    scene: { kind: "prefix-pick", number: text, divisor: String(d), seed: ri(1, 99999) },
  };
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
  for (let i = 0; i < 60; i += 1) {
    const a = ri(low, high);
    const b = ri(low, high);
    if (digitCarry(a, b) === withCarry) return column(a, b, "+");
  }
  return column(withCarry ? 27 : 24, withCarry ? 15 : 13, "+");
}

function pairSub(digits, withBorrow) {
  const low = 10 ** (digits - 1);
  const high = 10 ** digits - 1;
  for (let i = 0; i < 60; i += 1) {
    const a = ri(low + 1, high);
    const b = ri(low, a - 1);
    if (digitBorrow(a, b) === withBorrow) return column(a, b, "−");
  }
  return column(withBorrow ? 52 : 57, withBorrow ? 17 : 23, "−");
}

function subZeros() {
  const base = pick([100, 1000, 2000, 5000, 8000]);
  const b = ri(11, base - 1);
  return column(base, b, "−");
}

function threeSum() {
  return column(ri(10, 80), ri(10, 80), "+", ri(10, 80));
}

function powers() {
  const base = pick([10, 100, 1000]);
  if (Math.random() < 0.5) {
    const n = ri(2, 40);
    return {
      type: "commit",
    prompt: `Найдите произведение ${n} · ${base}`,
    answer: String(n * base),
    expect: n * base,
    keypad: true,
    solution: { steps: [`Умножаем на ${base}, к числу дописываем нули.`, `${n} × ${base} = ${n * base}.`], answerLine: `Ответ: ${n * base}.` },
  };
}
  const q = ri(2, 40);
  return {
    type: "commit",
    prompt: `Найдите частное ${q * base} : ${base}`,
    answer: String(q),
    expect: q,
    keypad: true,
    solution: { steps: [`Делим на ${base}, у числа становится меньше нулей.`, `${q * base} : ${base} = ${q}.`], answerLine: `Ответ: ${q}.` },
  };
}

function unitChoice(amount, from, to, factor, reverse) {
  const answerValue = reverse ? amount / factor : amount * factor;
  const leftUnit = reverse ? to : from;
  const rightUnit = reverse ? from : to;
  const answer = String(answerValue);
  const options = [];
  for (const item of [answer, String(answerValue * 10), String(amount), String(answerValue + 2), String(Math.max(1, answerValue - 2))]) {
    if (!options.includes(item)) options.push(item);
    if (options.length === 3) break;
  }
  return {
    ...choice(`${amount} ${leftUnit} =`, answer, options),
    layout: "units",
    suffix: rightUnit,
  };
}

function lengthPair(kind) {
  const table = { dm: ["дм", "см", 10], mm: ["см", "мм", 10], md: ["м", "дм", 10], mc: ["м", "см", 100] };
  const [from, to, factor] = table[kind];
  const reverse = Math.random() < 0.5;
  const amount = reverse ? ri(1, 9) * factor : ri(1, 9);
  return unitChoice(amount, from, to, factor, reverse);
}

function lengthMix() {
  return lengthPair(pick(["dm", "mm", "md", "mc"]));
}

function twoUnitsToOne() {
  const cm = ri(1, 9);
  const mm = ri(1, 9);
  const total = cm * 10 + mm;
  const options = [...new Set([String(total), String(cm + mm), String(cm * 10), String(total + 10)])];
  return choice(`${cm} см ${mm} мм = … мм`, String(total), options);
}

function oneUnitToTwo() {
  const cm = ri(1, 8);
  const mm = ri(0, 9);
  const total = cm * 10 + mm;
  const answer = `${cm} см ${mm} мм`;
  const options = [...new Set([answer, `${cm + 1} см ${mm} мм`, `${mm} см ${cm} мм`, `${total} мм`])];
  if (options.length < 2) options.push(`${cm} см ${mm + 1} мм`);
  return choice(`${total} мм = …`, answer, options);
}

function lengthCompare() {
  const cm = ri(1, 9);
  const mm = ri(1, 9) * 10;
  const left = cm * 10;
  const answer = left === mm ? "=" : left > mm ? ">" : "<";
  return {
    type: "choice",
    prompt: `${cm} см … ${mm} мм`,
    answer,
    choices: ["<", "=", ">"],
    scene: { kind: "signs" },
  };
}

function factorBetween(units, factors, from, to) {
  const start = units.indexOf(from);
  const end = units.indexOf(to);
  let factor = 1;
  for (let index = Math.min(start, end); index < Math.max(start, end); index += 1) factor *= factors[index];
  return factor;
}

function unitTask(prompt, formula, answer, suffix, units, factors, from, to) {
  const head = formula.split("=")[0].trim().replace(/\.+$/, "");
  const unit = String(suffix || "").replace(/\.+$/, "");
  const parts = [...head.matchAll(/(\d+)\s+(\S+)/g)].map((item) => [Number(item[1]), item[2].replace(/\.+$/, "")]);
  let equation = `${head} = ${answer}`;
  if (parts.length === 1) {
    const amount = parts[0][0];
    const factor = answer > amount ? answer / amount : amount / answer;
    equation = answer > amount ? `${amount} × ${factor} = ${answer}` : `${amount} : ${factor} = ${answer}`;
  } else if (parts.length === 2) {
    const [big, small] = parts;
    const factor = (answer - small[0]) / big[0];
    equation = `${big[0]} × ${factor} + ${small[0]} = ${answer}`;
  }
  return {
    type: "commit",
    prompt,
    formula,
    answer: String(answer),
    expect: answer,
    suffix,
    keypad: true,
    solution: { steps: [`Переводим: ${head}.`, `${equation} ${unit}.`], answerLine: `Ответ: ${answer} ${unit}.` },
    scene: { kind: "ladder", units, factors, from, to, shown: formula, seed: ri(1, 99999) },
  };
}

function mass() {
  const units = ["т", "ц", "кг", "г"];
  const factors = [10, 100, 1000];
  const names = { г: "граммы", кг: "килограммы", ц: "центнеры", т: "тонны" };
  const pair = pick([["кг", "г"], ["т", "кг"], ["ц", "кг"], ["т", "ц"]]);
  const [big, small] = pair;
  const factor = factorBetween(units, factors, big, small);
  const amount = ri(2, big === "т" ? 20 : 15);
  if (Math.random() < 0.45) {
    return unitTask(`Переведите в ${names[small]}.`, `${amount} ${big} = ? ${small}`, amount * factor, small, units, factors, [big], [small]);
  }
  if (Math.random() < 0.7) {
    return unitTask(`Переведите в ${names[big]}.`, `${amount * factor} ${small} = ? ${big}`, amount, big, units, factors, [small], [big]);
  }
  const rest = ri(1, Math.min(9, factor - 1));
  return unitTask(`Выразите массу в ${names[small]}.`, `${amount} ${big} ${rest} ${small} = ? ${small}`, amount * factor + rest, small, units, factors, [big, small], [small]);
}

function timeUnits() {
  const families = [
    { units: ["сут", "ч", "мин", "с"], factors: [24, 60, 60], pairs: [["сут", "ч"], ["ч", "мин"], ["мин", "с"]] },
    { units: ["нед.", "сут"], factors: [7], pairs: [["нед.", "сут"]] },
    { units: ["век", "год", "мес."], factors: [100, 12], pairs: [["век", "год"], ["год", "мес."]] },
  ];
  const family = pick(families);
  const [big, small] = pick(family.pairs);
  const factor = factorBetween(family.units, family.factors, big, small);
  const amount = ri(2, big === "век" ? 9 : 12);
  if (Math.random() < 0.6) {
    return unitTask("Переведите в более мелкие единицы.", `${amount} ${big} = ? ${small}`, amount * factor, small, family.units, family.factors, [big], [small]);
  }
  return unitTask("Переведите в более крупные единицы.", `${amount * factor} ${small} = ? ${big}`, amount, big, family.units, family.factors, [small], [big]);
}

function moneyUnits() {
  const rubles = ri(1, 6);
  const kopecks = ri(1, 99);
  const total = rubles * 100 + kopecks;
  return {
    type: "commit",
    prompt: `${rubles} р. ${kopecks} к. =`,
    suffix: "к.",
    answer: String(total),
    expect: total,
    keypad: true,
    solution: { steps: ["1 р. — это 100 к.", `${rubles} × 100 + ${kopecks} = ${total}.`], answerLine: `Ответ: ${total} к.` },
  };
}

function addMeasures() {
  const aM = ri(1, 4);
  const aC = ri(10, 80);
  const bM = ri(1, 3);
  const bC = ri(10, 40);
  const total = (aM + bM) * 100 + aC + bC;
  const meters = Math.floor(total / 100);
  const cm = total % 100;
  return {
    type: "number",
    prompt: `${aM} м ${aC} см + ${bM} м ${bC} см`,
    tokens: [],
    answer: String(total),
    expect: total,
    entry: [String(meters), String(cm).padStart(2, "0")],
    scene: { kind: "measures", left: `${aM} м ${aC} см + ${bM} м ${bC} см` },
    solution: {
      steps: [
        `${aM} м ${aC} см = ${aM} × 100 + ${aC} = ${aM * 100 + aC} см.`,
        `${bM} м ${bC} см = ${bM} × 100 + ${bC} = ${bM * 100 + bC} см.`,
        `Складываем: ${aM * 100 + aC} + ${bM * 100 + bC} = ${total} см = ${meters} м ${cm} см.`,
      ],
      answerLine: `Ответ: ${meters} м ${String(cm).padStart(2, "0")} см.`,
    },
  };
}

function mulMeasures() {
  const times = ri(2, 6);
  const meters = ri(1, 4);
  const cm = ri(0, 9) * 10;
  const part = meters * 100 + cm;
  const total = part * times;
  const totalM = Math.floor(total / 100);
  const totalC = total % 100;
  return {
    type: "number",
    prompt: `${totalM} м ${totalC} см : ${times}`,
    tokens: [],
    answer: String(part),
    expect: part,
    entry: [String(meters), String(cm).padStart(2, "0")],
    scene: { kind: "measures", left: `${totalM} м ${String(totalC).padStart(2, "0")} см : ${times}` },
    solution: {
      steps: [
        `${totalM} м ${String(totalC).padStart(2, "0")} см = ${totalM} × 100 + ${totalC} = ${total} см.`,
        `Делим: ${total} : ${times} = ${part} см.`,
        `${part} см = ${meters} м ${String(cm).padStart(2, "0")} см.`,
      ],
      answerLine: `Ответ: ${meters} м ${String(cm).padStart(2, "0")} см.`,
    },
  };
}

function rightAngle() {
  const names = shuffle(["K", "B", "M"]);
  return {
    type: "choice",
    prompt: "Нажмите на прямой угол треугольника",
    answer: names[1],
    choices: names,
    solution: { steps: ["Прямой угол проверяют угольником: его стороны совпадают со сторонами угла.", `Угол ${names[1]} прямой: ${names[1]} = 90°.`], answerLine: `Ответ: угол ${names[1]}.` },
    scene: { kind: "angle", names, seed: ri(1, 99999) },
  };
}

function polyline() {
  const parts = [ri(2, 12), ri(2, 12), ri(2, 12)];
  return {
    ...seenNumber(parts.reduce((sum, part) => sum + part, 0), { kind: "line", parts }),
    prompt: `Найдите длину ломаной со звеньями ${parts.join(" см, ")} см.`,
    unit: "см",
    keypad: true,
  };
}

function perimeter() {
  if (Math.random() < 0.5) {
    const side = ri(2, 12);
    return {
      ...ask(`Сторона квадрата равна ${side} см. Найдите его периметр.`, side * 4),
      scene: { kind: "rect", w: side, h: side },
      unit: "см",
      keypad: true,
    };
  }
  const width = ri(3, 12);
  const height = ri(2, 9);
  return {
    ...ask(`Стороны прямоугольника равны ${width} см и ${height} см. Найдите его периметр.`, 2 * (width + height)),
    scene: { kind: "rect", w: width, h: height },
    unit: "см",
    keypad: true,
  };
}

function areaCells() {
  const width = ri(4, 7);
  const height = ri(3, 5);
  const cutWidth = ri(1, width - 2);
  const cutHeight = ri(1, height - 1);
  const cells = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x < width - cutWidth || y >= cutHeight) cells.push([x, y]);
    }
  }
  return {
    ...seenNumber(cells.length, { kind: "poly", width, height, cells }),
    prompt: "Найди площадь закрашенной фигуры",
    caption: "Площадь клетки — 1 см²",
  };
}

function areaRect() {
  const length = ri(2, 15);
  const width = ri(2, 12);
  return {
    ...ask(`Длина прямоугольника ${length} см, ширина ${width} см. Найдите его площадь.`, length * width),
    scene: { kind: "rect", w: length, h: width },
    unit: "см²",
  };
}

function polyPerimeter() {
  const sides = [ri(2, 10), ri(2, 10), ri(2, 10), ri(2, 10), ri(2, 10)];
  const sum = sides.reduce((total, side) => total + side, 0);
  return {
    ...ask("Найди периметр многоугольника", sum),
    scene: { kind: "poly-sides", sides },
    unit: "см",
    solution: { steps: ["Периметр — сумма всех сторон.", `${sides.join(" + ")} = ${sum}.`], answerLine: `Ответ: ${sum} см.` },
  };
}

function sideFromPerimeter() {
  const known = ri(3, 12);
  const other = ri(2, 10);
  return {
    ...ask(`Периметр прямоугольника равен ${2 * (known + other)} см, одна сторона — ${known} см. Найдите соседнюю сторону.`, other),
    scene: { kind: "rect", w: known, h: other, hideH: true },
    unit: "см",
  };
}

function sideFromArea() {
  const known = ri(3, 12);
  const other = ri(2, 10);
  return {
    ...ask(`Площадь прямоугольника ${known * other} см². Одна сторона ${known} см. Найди другую.`, other),
    scene: { kind: "rect", w: known, h: other, hideH: true },
    unit: "см",
  };
}

function compoundArea() {
  const width = ri(6, 10);
  const height = ri(5, 8);
  const cutW = ri(2, width - 3);
  const cutH = ri(2, height - 2);
  return {
    ...ask("Найди площадь фигуры", width * height - cutW * cutH),
    scene: { kind: "compound", width, height, cutW, cutH },
    unit: "см²",
    keypad: true,
  };
}

function areaUnits() {
  const units = ["км²", "га", "а", "м²", "дм²", "см²", "мм²"];
  const factors = [100, 100, 100, 100, 100, 100];
  const span = Math.random() < 0.7 ? 1 : 2;
  const index = ri(0, units.length - 1 - span);
  const big = units[index];
  const small = units[index + span];
  const factor = factorBetween(units, factors, big, small);
  const amount = ri(2, span > 1 ? 9 : 30);
  if (Math.random() < 0.5) {
    return unitTask("Переведите в более мелкие единицы.", `${amount} ${big} = ? ${small}`, amount * factor, small, units, factors, [big], [small]);
  }
  return unitTask("Переведите в более крупные единицы.", `${amount * factor} ${small} = ? ${big}`, amount, big, units, factors, [small], [big]);
}

function rectBoth() {
  const w = ri(2, 4);
  const h = ri(2, 3);
  const a = "1:1";
  const b = `${w}:${h}`;
  return {
    type: "select",
    prompt: `Начертите прямоугольник с периметром ${2 * (w + h)} см, одна из сторон которого ${w} см. Сторона клетки — 1 см. Отметьте две противоположные вершины.`,
    answer: [a, b].sort().join("|"),
    solution: {
      steps: [
        `Периметр ${2 * (w + h)} см. Половина периметра — сумма двух соседних сторон: ${2 * (w + h)} : 2 = ${w + h}.`,
        `Соседняя сторона: ${w + h} − ${w} = ${h} см.`,
      ],
      answerLine: `Ответ: ${w} см и ${h} см.`,
    },
    scene: { kind: "corners", cols: 8, rows: 6 },
  };
}

function splitFigure() {
  const parts = Math.random() < 0.5 ? 2 : 4;
  if (parts === 2) {
    const axis = Math.random() < 0.5 ? "x" : "y";
    const at = pick([2, 3]);
    const span = at * 2;
    const other = 3;
    const width = axis === "x" ? span : other;
    const height = axis === "y" ? span : other;
    const ox = ri(0, 6 - width);
    const oy = ri(0, 6 - height);
    const cells = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) cells.push([x + ox, y + oy]);
    }
    const cut = axis === "x" ? ox + at : oy + at;
    return {
      type: "select",
      prompt: "Разделите фигуру на 2 равные по площади части",
      answer: `${axis}:${cut}`,
      scene: { kind: "half", parts, cells, seed: ri(1, 99999) },
    };
  }
  const atx = pick([2, 3]);
  const aty = pick([2, 3]);
  const width = atx * 2;
  const height = aty * 2;
  const ox = ri(0, 6 - width);
  const oy = ri(0, 6 - height);
  const cells = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) cells.push([x + ox, y + oy]);
  }
  return {
    type: "select",
    prompt: "Разделите фигуру на 4 равные по площади части",
    answer: [`x:${ox + atx}`, `y:${oy + aty}`].sort().join("|"),
    scene: { kind: "half", parts, cells, seed: ri(1, 99999) },
  };
}

function circleName() {
  const kind = pick(["radius", "diameter", "center", "shapes"]);
  if (kind === "shapes") {
    const askDisk = Math.random() < 0.5;
    const shapes = shuffle([
      { id: "окружность", label: "окружность" },
      { id: "круг", label: "круг" },
      { id: "овал", label: "овал", filled: Math.random() < 0.5 },
    ]);
    return {
      type: "choice",
      prompt: askDisk ? "Нажмите на круг." : "Нажмите на окружность.",
      answer: askDisk ? "круг" : "окружность",
      choices: shapes.map((shape) => shape.id),
      solution: { steps: ["Круг закрашен внутри, окружность — только линия.", askDisk ? "Закрашенная фигура — круг." : "Линия без внутренности — окружность."], answerLine: `Ответ: ${askDisk ? "круг" : "окружность"}.` },
      scene: { kind: "shapes", shapes, seed: ri(1, 99999) },
    };
  }
  if (kind === "center") {
    const points = shuffle([
      { id: "центр", x: 160, y: 160, label: "центр" },
      { id: "точка 1", x: 120, y: 130, label: "точка 1" },
      { id: "точка 2", x: 200, y: 150, label: "точка 2" },
      { id: "точка 3", x: 150, y: 210, label: "точка 3" },
    ]);
    return {
      type: "choice",
      prompt: "Нажмите на центр окружности.",
      answer: "центр",
      choices: points.map((point) => point.id),
      solution: { steps: ["Центр — точка, из которой все радиусы равны.", "На рисунке это точка в середине окружности."], answerLine: "Ответ: центр." },
      scene: { kind: "points", points, seed: ri(1, 99999) },
    };
  }
  const letters = shuffle(["A", "B", "C", "E", "K", "M", "N", "P"]).slice(0, 8);
  const segments = kind === "radius"
    ? [
      { id: "радиус", r1: 0, a1: 0, r2: 1, a2: 18, letters: ["O", "E"] },
      { id: "диаметр", r1: 1, a1: 140, r2: 1, a2: 320, letters: [letters[1], letters[2]] },
      { id: "хорда", r1: 1, a1: 230, r2: 1, a2: 280, letters: [letters[3], letters[4]] },
      { id: "внутри", r1: 0, a1: 0, r2: 0.58, a2: 78, letters: ["O", letters[5]] },
    ]
    : [
      { id: "диаметр", r1: 1, a1: 150, r2: 1, a2: 330, letters: [letters[0], letters[1]] },
      { id: "радиус", r1: 0, a1: 0, r2: 1, a2: 24, letters: ["O", letters[2]] },
      { id: "хорда", r1: 1, a1: 210, r2: 1, a2: 265, letters: [letters[3], letters[4]] },
      { id: "внутри", r1: 0.62, a1: 70, r2: 0.62, a2: 250, letters: [letters[5], letters[6]] },
    ];
  return {
    type: "choice",
    prompt: kind === "radius" ? "Нажмите на радиус окружности." : "Нажмите на диаметр окружности.",
    answer: kind === "radius" ? "радиус" : "диаметр",
    choices: segments.map((segment) => segment.id),
    solution: kind === "radius"
      ? { steps: ["Радиус — отрезок от центра окружности до точки на ней.", "На рисунке это OE. Диаметр вдвое длиннее: d = 2 × OE."], answerLine: "Ответ: радиус, отрезок OE." }
      : { steps: ["Диаметр проходит через центр и соединяет две точки окружности.", "Его длина — два радиуса: d = 2 × r."], answerLine: "Ответ: диаметр." },
    scene: { kind: "segments", segments, seed: ri(1, 99999) },
  };
}

function radius() {
  const r = ri(2, 30);
  const askDiameter = Math.random() < 0.5;
  if (askDiameter) {
    return {
      ...ask(`Радиус окружности ${r} м. Найдите ее диаметр.`, r * 2),
      scene: { kind: "radius", label: `${r} м`, other: `${r * 2} м` },
      unit: "м",
      check: true,
      solution: { steps: ["Диаметр — это два радиуса.", `${r} · 2 = ${r * 2}.`], answerLine: `Ответ: ${r * 2} м.` },
    };
  }
  return {
    ...ask(`Диаметр окружности ${r * 2} м. Найдите ее радиус.`, r),
    scene: { kind: "radius", label: `${r * 2} м`, other: `${r} м` },
    unit: "м",
    check: true,
    solution: { steps: ["Радиус — это половина диаметра.", `${r * 2} : 2 = ${r}.`], answerLine: `Ответ: ${r} м.` },
  };
}

function drawHalf() {
  const rows = 8;
  const cols = 8;
  const mid = cols / 2;
  const given = [];
  for (let row = 0; row < rows; row += 1) {
    const width = ri(1, mid - 1);
    for (let col = mid - width; col < mid; col += 1) given.push([row, col]);
  }
  const needed = given.map(([row, col]) => [row, cols - 1 - col]);
  const mask = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < mid; col += 1) {
      if (!given.some(([givenRow, givenCol]) => givenRow === row && givenCol === col)) mask.push([row, col]);
    }
  }
  return {
    type: "paint",
    prompt: "Дорисуй вторую половину картинки",
    rows,
    cols,
    given,
    needed,
    mask,
    answer: needed.map((cell) => cell.join(":")).sort().join("|"),
    manualNext: true,
    scene: { seed: ri(1, 99999) },
  };
}

function symmetry() {
  const rows = 8;
  const cols = 10;
  const mid = cols / 2;
  const given = [];
  const height = ri(3, 6);
  const top = ri(0, rows - height);
  for (let row = top; row < top + height; row += 1) {
    const width = ri(1, mid - 1);
    for (let col = mid - width; col < mid; col += 1) given.push([row, col]);
  }
  const needed = given.map(([row, col]) => [row, cols - 1 - col]);
  const sample = given[0];
  const mirror = needed[0];
  const source = sample[1] + 1;
  const reflected = mirror[1] + 1;
  return {
    type: "paint",
    prompt: "Закрасьте клетки так, чтобы рисунок стал симметричным относительно прямой.",
    rows,
    cols,
    given,
    needed,
    answer: needed.map((cell) => cell.join(":")).sort().join("|"),
    solution: {
      steps: [
        `Клетка в строке ${sample[0] + 1}, столбце ${source}. Прямая стоит посередине ${cols} столбцов.`,
        `Отражение столбца: ${cols} − ${source} + 1 = ${reflected}. Клетка переходит в (${sample[0] + 1}, ${reflected}).`,
      ],
      answerLine: "Ответ — отражённые клетки.",
    },
  };
}

function shareFigure() {
  const parts = ri(2, 8);
  const need = ri(1, parts - 1);
  return {
    type: "select",
    prompt: `Выделите ${need}/${parts} фигуры.`,
    checkLabel: "ПРОВЕРИТЬ",
    answer: Array.from({ length: need }, (_, index) => String(index)).join("|"),
    scene: { kind: "share", parts, need, shape: "circle" },
  };
}

function shareSet() {
  const d = ri(2, 6);
  const k = ri(1, 3);
  return {
    type: "select",
    prompt: `Выделите 1/${d} всех предметов`,
    answer: Array.from({ length: k }, (_, index) => String(index)).join("|"),
    scene: { kind: "share", parts: d * k, need: k },
  };
}

function shareStrip() {
  const d = pick([2, 4]);
  const parts = d * ri(2, 3);
  const need = parts / d;
  return {
    type: "select",
    prompt: `Выделите 1/${d} полоски, начиная слева`,
    answer: Array.from({ length: need }, (_, index) => String(index)).join("|"),
    scene: { kind: "strip", parts, need },
  };
}

function wholeFromShare() {
  const d = ri(2, 6);
  return {
    type: "commit",
    prompt: "Достройте целую полоску.",
    answer: String(d),
    expect: d,
    checkLabel: "ПРОВЕРИТЬ",
    scene: { kind: "grow", shown: 1, parts: d, checkOnly: true },
  };
}

function shareNumber() {
  const d = ri(2, 6);
  const k = ri(2, 8);
  const whole = d * k;
  const minutes = (count) => `${count} ${plural(count, "минута", "минуты", "минут")}`;
  return {
    ...ask(`Разминка длилась ${minutes(k)} — это 1/${d} всего времени тренировки. Сколько минут длилась тренировка?`, whole),
    scene: { kind: "parts", parts: d, filled: 1 },
    keypad: true,
    check: true,
    solution: { steps: [`1/${d} — это ${k} ${plural(k, "минута", "минуты", "минут")}.`, `Всё время: ${k} · ${d} = ${whole}.`], answerLine: `Ответ: ${whole} мин.` },
  };
}

function chartRead() {
  const cast = [
    { label: "Бобёр", glyph: "beaver", verb: "прочитал" },
    { label: "Лиса", glyph: "fox", verb: "прочитала" },
    { label: "Ёж", glyph: "hedgehog", verb: "прочитал" },
  ];
  const values = [pick([4, 8, 12]), pick([4, 8, 16]), pick([8, 12, 20])];
  const index = ri(0, cast.length - 1);
  return {
    type: "commit",
    prompt: `Сколько книг ${cast[index].verb} ${cast[index].label} за год?`,
    answer: String(values[index]),
    expect: values[index],
    keypad: true,
    scene: {
      kind: "bars",
      title: "Сколько книг прочитали друзья за год",
      top: 20,
      step: 4,
      items: cast.map((person, item) => ({ ...person, value: values[item] })),
    },
  };
}

function chartBetween() {
  const low = ri(0, 3) * 4;
  const value = low + 2;
  return {
    type: "commit",
    prompt: "Какое значение у столбика между линиями?",
    answer: String(value),
    expect: value,
    keypad: true,
    scene: { kind: "bars", top: low + 4, step: 4, items: [{ label: "А", value }] },
  };
}

function chartTask() {
  const names = ["Пн", "Вт", "Ср", "Чт"];
  const values = names.map(() => ri(2, 8) * 2);
  const left = 0;
  const right = 1;
  const diff = Math.abs(values[left] - values[right]);
  const bigger = values[left] >= values[right] ? names[left] : names[right];
  const smaller = values[left] >= values[right] ? names[right] : names[left];
  const options = [...new Set([diff, diff + 2, Math.max(2, diff - 2), values[left]])].map(String);
  return {
    type: "choice",
    prompt: `На сколько больше у ${bigger}, чем у ${smaller}?`,
    answer: String(diff),
    choices: shuffle(options),
    scene: { kind: "bars", top: 20, step: 2, items: names.map((label, index) => ({ label, value: values[index] })) },
  };
}

function chartBuild() {
  const names = ["Пн", "Вт", "Ср", "Чт"];
  const heights = names.map(() => ri(1, 5));
  return {
    type: "select",
    prompt: "Постройте диаграмму по таблице. Нажмите столбик на нужной высоте или потяните его вверх.",
    solution: {
      steps: [
        "Цена деления шкалы — 1. Высота столбика равна числу в таблице.",
        ...names.map((name, index) => `${name}: ${heights[index]} × 1 = ${heights[index]}.`),
      ],
      answerLine: `Ответ: ${names.map((name, index) => `${name} — ${heights[index]}`).join(", ")}.`,
    },
    answer: heights.map((height, index) => `${index}:${height}`).sort().join("|"),
    scene: { kind: "columns", max: 5, title: "Сколько птиц прилетело к кормушке", items: names.map((label, index) => ({ label, value: heights[index] })) },
  };
}

function threeTerms() {
  const a = ri(2, 40);
  const b = ri(2, 30);
  const c = ri(1, a + b);
  return tokens([String(a), "+", String(b), "−", String(c)], a + b - c);
}

function brackets() {
  if (Math.random() < 0.5) {
    const a = ri(2, 20);
    const b = ri(1, 12);
    const c = ri(1, a + b);
    return tokens(["(", String(a), "+", String(b), ")", "−", String(c)], a + b - c);
  }
  const c = ri(1, 9);
  const b = ri(c, c + 12);
  const a = ri(1, 20);
  return tokens([String(a), "+", "(", String(b), "−", String(c), ")"], a + b - c);
}

function opsOrder(tokens, order) {
  return {
    type: "select",
    prompt: "Нажмите на знаки в том порядке, в котором выполняются действия",
    answer: order.join("|"),
    scene: { kind: "ops", tokens },
  };
}

function addSubBrackets() {
  const a = ri(2, 20);
  const b = ri(1, 12);
  const c = ri(1, 20);
  return opsOrder(["(", String(a), "+", String(b), ")", "−", String(c)], [2, 5]);
}

function threeActionsAdd() {
  const a = ri(10, 40);
  const b = ri(1, a);
  const c = ri(1, 15);
  const mid = a - b + c;
  const d = ri(0, mid);
  const value = mid - d;
  const afterFirst = a - b;
  return {
    type: "commit",
    prompt: `Найдите значение выражения ${a} − ${b} + ${c} − ${d}`,
    answer: String(value),
    expect: value,
    keypad: true,
    solution: {
      steps: [
        `Считаем слева направо. Вычитаем: ${a} − ${b} = ${afterFirst}.`,
        `Складываем: ${afterFirst} + ${c} = ${mid}.`,
        `Вычитаем: ${mid} − ${d} = ${value}.`,
      ],
      answerLine: `Ответ: ${value}.`,
    },
  };
}

function orderNoParen() {
  const a = ri(2, 30);
  const b = ri(2, 9);
  const c = ri(2, 9);
  return opsOrder([String(a), "+", String(b), "×", String(c)], [3, 1]);
}

function orderParen() {
  const a = ri(2, 9);
  const b = ri(1, 8);
  const c = ri(2, 9);
  return opsOrder(["(", String(a), "+", String(b), ")", "×", String(c)], [2, 5]);
}

function threeActions() {
  const a = ri(2, 20);
  const b = ri(1, 9);
  const c = ri(2, 9);
  const value = (a + b) * c;
  return {
    type: "commit",
    prompt: `Найдите значение выражения (${a} + ${b}) × ${c}`,
    answer: String(value),
    expect: value,
    keypad: true,
    solution: {
      steps: [`Сначала скобки. Складываем: ${a} + ${b} = ${a + b}.`, `Затем умножаем: ${a + b} × ${c} = ${value}.`],
      answerLine: `Ответ: ${value}.`,
    },
  };
}

function fourActions() {
  const a = ri(2, 9);
  const b = ri(2, 9);
  const c = ri(2, 6);
  const d = ri(2, 6);
  return opsOrder([String(a), "×", String(b), "+", String(c), "×", String(d)], [1, 5, 3]);
}

function equation(hard) {
  if (hard) {
    const x = ri(2, 40);
    const a = ri(20, 80);
    const b = ri(2, 9);
    const mid = x + a;
    return {
      type: "number",
      prompt: `(x + ${a}) × ${b} = ${mid * b}`,
      tokens: [],
      answer: String(x),
      expect: x,
      entry: [String(mid), String(x)],
      scene: { kind: "equation", line: `x + ${a} =` },
      check: true,
    };
  }
  const kind = ri(1, 3);
  if (kind === 1) {
    const x = ri(1, 40);
    const a = ri(1, 20);
    return { ...seenNumber(x, { kind: "equation", line: `x + ${a} = ${x + a}` }) };
  }
  if (kind === 2) {
    const a = ri(1, 15);
    const x = ri(a + 1, a + 30);
    return seenNumber(x, { kind: "equation", line: `x − ${a} = ${x - a}` });
  }
  const a = ri(2, 9);
  const x = ri(2, 9);
  return seenNumber(x, { kind: "equation", line: `x × ${a} = ${x * a}` });
}

function compareMax(max) {
  if (max >= 100) {
    const nums = [];
    while (nums.length < 4) {
      const next = ri(1, Math.min(max, 99999));
      if (!nums.includes(next)) nums.push(next);
    }
    return {
      type: "choice",
      prompt: "Выберите наибольшее число",
      answer: String(Math.max(...nums)),
      choices: nums.map(String),
    };
  }
  const left = ri(0, max);
  const right = Math.random() < 0.22 ? left : ri(0, max);
  return compare(left, right);
}

function taskControlled(max, op, cross) {
  const [a, b] = pairWithin(max, op, cross);
  return thingTask(a, b, op);
}

function taskEither(max, cross) {
  return taskControlled(max, Math.random() < 0.5 ? "+" : "−", cross);
}

let moreLessSide = false;

function moreLessCross(max) {
  const place = pick(PLACES);
  moreLessSide = !moreLessSide;
  const more = moreLessSide;
  for (let i = 0; i < 80; i += 1) {
    if (more) {
      const base = ri(11, Math.max(11, max - 11));
      const extra = ri(1, max - base);
      if (!crosses(base, extra, "+")) continue;
      return story(
        `${place.first} ${qty(base, place.forms)}${place.tail || ""}, а ${place.short} — на ${extra} больше. Сколько ${place.ask} ${place.second}?`,
        base + extra, base, extra, "more",
        { picture: place.picture, names: place.names, diffText: `на ${extra} больше`, forms: place.forms },
      );
    }
    const total = ri(11, max);
    const extra = ri(1, total - 1);
    if (!crosses(total, extra, "−")) continue;
    return story(
      `${place.first} ${qty(total, place.forms)}${place.tail || ""}, а ${place.short} — на ${extra} меньше. Сколько ${place.ask} ${place.second}?`,
      total - extra, total, extra, "less",
      { picture: place.picture, names: place.names, diffText: `на ${extra} меньше`, forms: place.forms },
    );
  }
  if (more) {
    return story(
      "На первой полке 28 книг, а на второй — на 15 больше. Сколько книг на второй полке?",
      43, 28, 15, "more",
      { picture: "book", names: ["1-я полка", "2-я полка"], diffText: "на 15 больше", forms: ["книга", "книги", "книг"] },
    );
  }
  return story(
    "На первой полке 62 книги, а на второй — на 39 меньше. Сколько книг на второй полке?",
    23, 62, 39, "less",
    { picture: "book", names: ["1-я полка", "2-я полка"], diffText: "на 39 меньше", forms: ["книга", "книги", "книг"] },
  );
}

function moreLessNoCross(max) {
  const place = pick(PLACES);
  moreLessSide = !moreLessSide;
  const more = moreLessSide;
  for (let i = 0; i < 80; i += 1) {
    if (more) {
      const base = ri(1, Math.max(1, max - 1));
      const extra = ri(1, Math.max(1, max - base));
      if (base + extra > max || crosses(base, extra, "+")) continue;
      return story(
        `${place.first} ${qty(base, place.forms)}${place.tail || ""}, а ${place.short} — на ${extra} больше. Сколько ${place.ask} ${place.second}?`,
        base + extra, base, extra, "more",
        { picture: place.picture, names: place.names, diffText: `на ${extra} больше`, forms: place.forms },
      );
    }
    const total = ri(2, max);
    const extra = ri(1, total - 1);
    if (crosses(total, extra, "−")) continue;
    return story(
      `${place.first} ${qty(total, place.forms)}${place.tail || ""}, а ${place.short} — на ${extra} меньше. Сколько ${place.ask} ${place.second}?`,
      total - extra, total, extra, "less",
      { picture: place.picture, names: place.names, diffText: `на ${extra} меньше`, forms: place.forms },
    );
  }
  if (more) {
    return story(
      "На первой полке 24 книги, а на второй — на 13 больше. Сколько книг на второй полке?",
      37, 24, 13, "more",
      { picture: "book", names: ["1-я полка", "2-я полка"], diffText: "на 13 больше", forms: ["книга", "книги", "книг"] },
    );
  }
  return story(
    "На первой полке 48 книг, а на второй — на 15 меньше. Сколько книг на второй полке?",
    33, 48, 15, "less",
    { picture: "book", names: ["1-я полка", "2-я полка"], diffText: "на 15 меньше", forms: ["книга", "книги", "книг"] },
  );
}

export function makeMixed(level, ops) {
  const op = pick(ops?.length ? ops : level === 1 ? ["+", "−"] : ["+", "−", "×", "÷"]);
  if (level === 1) return op === "+" ? addWithin(20) : subWithin(20);
  if (level === 2) {
    if (op === "+") return addWithin(100);
    if (op === "−") return subWithin(100);
    if (op === "×") return binary(ri(2, 9), "×", ri(2, 9));
    return exactDiv(80);
  }
  if (level === 3) {
    if (op === "+") return addWithin(1000, 10);
    if (op === "−") return subWithin(1000);
    if (op === "×") return Math.random() < 0.5 ? binary(ri(2, 9), "×", ri(2, 9)) : times21(400);
    return exactDiv(400);
  }
  if (op === "+") return addWithin(5000, 20);
  if (op === "−") return subWithin(5000);
  if (op === "×") return Math.random() < 0.5 ? times21(2000) : timesRound();
  return Math.random() < 0.5 ? exactDiv(1000) : divRound();
}

function columnNote() {
  return "";
}

export function makeQuestion(title, grade, ops) {
  const t = norm(title);
  const lim = limitOf(t, gradeMax(grade));
  if (t.startsWith("числа на слух")) return hear(lim);
  if (t.startsWith("учимся считать")) return learnCount(lim);
  if (t.startsWith("посчитай предметы")) return dots(lim);
  if (t.startsWith("положи в рамку")) return frame(lim);
  if (t.startsWith("заполни пропуски")) return gaps(lim);
  if (t.startsWith("расставь по порядку")) return orderSmallest(lim);
  if (t.startsWith("какая по счету")) return ordinal(lim);
  if (t.startsWith("перед, между, после")) return around(lim);
  if (t.startsWith("считаем парами")) return pairs(lim);
  if (t.startsWith("на один больше")) return oneMore(lim);
  if (t.startsWith("на один меньше")) return oneLess(lim);
  if (t.startsWith("где больше")) return whichCount(lim, true);
  if (t.startsWith("где меньше")) return whichCount(lim, false);
  if (t.startsWith("хватит ли")) return enough(lim);
  if (t.startsWith("больше или меньше")) return whichCount(lim, Math.random() < 0.5);
  if (t.startsWith("больше, меньше, равно")) return sameCount();
  if (t.startsWith("сравнение целых") || t.startsWith("сравнение чисел") || t.startsWith("сравнение многозначных")) {
    const cap = t.includes("1000") ? 1000 : t.includes("многознач") ? 99999 : lim;
    const left = ri(0, cap);
    const right = Math.random() < 0.22 ? left : ri(0, cap);
    return compare(left, right);
  }
  if (t.startsWith("сравнение длины")) return lengthCompare();
  if (t.startsWith("составь число из кубиков")) return cubeWays(lim);
  if (t.startsWith("сколько нужно добавить")) return cubesNeed(lim);
  if (t.startsWith("сложение на кубиках")) return cubesEquation("+", lim);
  if (t.startsWith("вычитание на кубиках")) return cubesEquation("−", lim);
  if (t.startsWith("добавь кубики")) return cubesAdd(lim);
  if (t.startsWith("убери кубики")) return cubesSub(lim);
  if (t.startsWith("домино")) return domino();
  if (t.startsWith("прыжки вперед")) return jump(lim, true);
  if (t.startsWith("прыжки назад")) return jump(lim, false);
  if (t.includes("на несколько больше")) return moreLessTask(lim);
  if (t.includes("на сколько больше")) return diffTask(lim);
  if (t.startsWith("неизвестное слагаемое")) return unknownAddend(lim);
  if (t.startsWith("неизвестное уменьшаемое")) return minuendTask(lim);
  if (t.startsWith("обратные задачи")) return reverseTask(Math.min(lim, 100));
  if (t.startsWith("сложить или вычесть")) return opChoice();
  if (t.startsWith("умножить или разделить")) return timesChoice();
  if (t.startsWith("задачи в два действия")) return twoStep(lim);
  if (t.startsWith("задачи до 20 без")) return taskEither(20, false);
  if (t.startsWith("задачи до 20 с")) return taskEither(20, true);
  if (t.includes("до 100") && t.includes("без перехода через десяток") && t.includes("сложение и вычитание")) {
    return moreLessNoCross(lim);
  }
  if (t.includes("без перехода через десяток") && t.includes("сложение и вычитание")) return taskEither(lim, false);
  if (t.includes("до 100") && t.includes("с переходом через десяток") && t.includes("сложение и вычитание")) {
    return moreLessCross(lim);
  }
  if (t.includes("с переходом через десяток") && t.includes("сложение и вычитание")) return taskEither(lim, true);
  if (t.includes("без перехода через десяток")) return taskControlled(lim, "+", false);
  if (t.includes("с переходом через десяток")) return taskControlled(lim, "+", true);
  if (t.startsWith("задачи на сложение до")) return taskControlled(lim, "+", false);
  if (t.startsWith("задачи на вычитание до")) return taskControlled(lim, "−", false);
  if (t.startsWith("задачи на сложение и вычитание до")) return taskEither(lim, false);
  if (t.startsWith("задачи на умножение и деление")) return timesTask(lim);
  if (t.startsWith("в несколько раз")) return timesMore(200);
  if (t.startsWith("во сколько раз")) return howManyTimes();
  if (t.startsWith("цена, количество")) return priceTask();
  if (t.startsWith("задачи на приведение")) return unitRate();
  if (t.startsWith("простые задачи")) return thingTask(...(() => {
    const op = Math.random() < 0.5 ? "+" : "−";
    const [a, b] = pairWithin(100, op, false);
    return [a, b, op];
  })());
  if (t.startsWith("составные задачи")) return twoStep(100);
  if (t.startsWith("задачи с натуральными")) return naturalTask();
  if (t.startsWith("геометрические задачи")) return geoTask();
  if (t.startsWith("задачи на работу")) return workTask();
  if (t.includes("двум разностям")) return twoDiffs();
  if (t.includes("скорость, время")) return motionBasic();
  if (t.includes("движение в два действия")) return motionTwo();
  if (t.includes("навстречу")) return toward();
  if (t.includes("вдогонку")) return chase();
  if (t.startsWith("найди лишнюю")) return oddOne();
  if (t.startsWith("заполни таблицу")) return tableNext();
  if (t.startsWith("ряд фигур")) return shapeNext();
  if (t.startsWith("сколько точек дальше")) return dotsNext();
  if (t.startsWith("основные фигуры")) return shapes();
  if (t.startsWith("объемные фигуры")) return solids();
  if (t.startsWith("отрезок заданной")) return segment();
  if (t.startsWith("на какую фигуру")) return shapeLike();
  if (t.startsWith("найди фигуры")) return findShapes();
  if (t.startsWith("замкнутые")) return lines();
  if (t.startsWith("слева и справа")) return leftRight();
  if (t.startsWith("выше и ниже")) return aboveBelow();
  if (t.startsWith("вверху, внизу")) return corners();
  if (t.startsWith("куда придет")) return whereGo();
  if (t.startsWith("графический диктант")) return dictation();
  if (t.startsWith("внутри и снаружи")) return inside();
  if (t.startsWith("где стоит")) return whereStands();
  if (t.startsWith("длиннее и короче")) return longer();
  if (t.startsWith("измерь мерками")) return measures();
  if (t.startsWith("знакомимся со стрелками")) return clockHands();
  if (t.startsWith("четверти")) return quarters();
  if (t.startsWith("между часами")) return betweenHours();
  if (t.startsWith("минуты на циферблате")) return minuteMark();
  if (t.startsWith("который час")) return whichHour();
  if (t.includes("24-часовом")) return hour24();
  if (t.startsWith("сколько времени прошло")) return elapsed();
  if (t.startsWith("настраиваемый")) return makeMixed(grade, ops);
  if (t === "капли") return drops();
  if (t.startsWith("примеры с тремя числами")) return threeTerms();
  if (t.startsWith("примеры со скобками")) return brackets();
  if (t.startsWith("порядок действий со скобками: сложение")) return addSubBrackets();
  if (t.startsWith("примеры в три действия на сложение")) return threeActionsAdd();
  if (t.startsWith("порядок действий без скобок")) return orderNoParen();
  if (t.startsWith("порядок действий со скобками")) return orderParen();
  if (t.startsWith("примеры в три действия")) return threeActions();
  if (t.includes("четырех действий")) return fourActions();
  if (t.startsWith("простые уравнения")) return equation(false);
  if (t.startsWith("уравнения со скобками")) return equation(true);
  if (t.startsWith("десятки и единицы")) return place100();
  if (t.startsWith("разрядные слагаемые")) return place1000();
  if (t.startsWith("разряды и классы")) return classes();
  if (t.startsWith("чтение и запись")) return readBig();
  if (t.startsWith("удобное сложение")) return convenientAdd();
  if (t.startsWith("удобное умножение")) return convenientMul();
  if (t.startsWith("таблица пифагора")) return pythagoras();
  if (t.startsWith("таблица умножения")) return tableMul(t);
  if (t.startsWith("таблица деления")) return tableDiv(t);
  if (t.startsWith("умножение по рисунку")) return pictureMul();
  if (t.includes("без промежуточных")) return timesRound();
  if (t.includes("в строчку")) return splitMul();
  if (t.startsWith("умножение в пределах")) return productLimit(lim);
  if (t.includes("трехзначного числа на двузначное")) return times32();
  if (t.includes("двузначных чисел в столбик") && t.startsWith("умножение")) return times22();
  if (t.includes("многозначного числа на однозначное")) return mulColumn(ri(1000, 4000), ri(2, 9));
  if (t.includes("умножение в столбик с переходом")) return mulColumn(ri(12, 40), ri(2, 9));
  if (t.includes("в столбик без перехода") && t.startsWith("умножение")) return mulColumn(ri(2, 9) * 10, ri(2, 9));
  if (t.includes("нулями в частном")) return zeroQuotient();
  if (t.includes("первое неполное делимое при делении на двузначное")) return firstPartial(true);
  if (t.includes("первое неполное делимое")) return firstPartial(false);
  if (t.includes("деление на двузначное")) return divTwoDigit();
  if (t.includes("четырехзначных чисел в столбик")) return divExactSpan(1000, 9999);
  if (t.includes("трехзначных чисел в столбик") && t.startsWith("деление")) return divExactSpan(100, 999);
  if (t.includes("двузначного числа на однозначное в столбик") && t.startsWith("деление")) return divExactSpan(10, 99);
  if (t.includes("с остатком") && t.includes("столбик")) {
    const d = ri(2, 9);
    const q = ri(1, 12);
    return divColumn(d * q + ri(1, d - 1), d);
  }
  if (t.startsWith("деление в пределах")) return exactDiv(lim);
  if (t.startsWith("деление с остатком")) return remainder(200);
  if (t.includes("оканчивающиеся нулями")) return divRound();
  if (t.includes("на 10, 100")) return powers();
  if (t.startsWith("сложение трех чисел")) return threeSum();
  if (t.includes("многозначных чисел в столбик") && t.startsWith("сложение")) return pairAdd(4, true);
  if (t.includes("трехзначных чисел в столбик") && t.startsWith("сложение")) return pairAdd(3, true);
  if (t.includes("без перехода") && t.startsWith("сложение") && t.includes("столбик")) return pairAdd(2, false);
  if (t.includes("с переходом") && t.startsWith("сложение") && t.includes("столбик")) return pairAdd(2, true);
  if (t.includes("через нули")) return subZeros();
  if (t.includes("многозначных чисел в столбик") && t.startsWith("вычитание")) return pairSub(4, true);
  if (t.includes("трехзначных чисел в столбик") && t.startsWith("вычитание")) return pairSub(3, true);
  if (t.includes("без перехода") && t.startsWith("вычитание") && t.includes("столбик")) return pairSub(2, false);
  if (t.includes("с переходом") && t.startsWith("вычитание") && t.includes("столбик")) return pairSub(2, true);
  if (t.startsWith("сложение в пределах")) return addWithin(lim, lim > 20 ? 1 : 0);
  if (t.startsWith("вычитание в пределах")) return subWithin(lim);
  if (t.startsWith("дециметры и сантиметры")) return lengthPair("dm");
  if (t.startsWith("сантиметры и миллиметры")) return lengthPair("mm");
  if (t.startsWith("метры и дециметры")) return lengthPair("md");
  if (t.startsWith("метры и сантиметры")) return lengthPair("mc");
  if (t.startsWith("перевод единиц длины")) return lengthMix();
  if (t.startsWith("из двух единиц")) return twoUnitsToOne();
  if (t.startsWith("из одной единицы")) return oneUnitToTwo();
  if (t.startsWith("единицы массы")) return mass();
  if (t.startsWith("единицы времени")) return timeUnits();
  if (t.startsWith("рубли и копейки")) return moneyUnits();
  if (t.startsWith("сложение и вычитание величин")) return addMeasures();
  if (t.startsWith("умножение и деление величин")) return mulMeasures();
  if (t.startsWith("прямой угол")) return rightAngle();
  if (t.startsWith("длина ломаной")) return polyline();
  if (t.startsWith("периметр прямоугольника")) return perimeter();
  if (t.startsWith("площадь по клеткам")) return areaCells();
  if (t.startsWith("площадь прямоугольника")) return areaRect();
  if (t.startsWith("периметр многоугольника")) return polyPerimeter();
  if (t.startsWith("сторона по периметру")) return sideFromPerimeter();
  if (t.startsWith("сторона по площади")) return sideFromArea();
  if (t.startsWith("площадь составной")) return compoundArea();
  if (t.startsWith("единицы площади")) return areaUnits();
  if (t.startsWith("прямоугольник по периметру")) return rectBoth();
  if (t.startsWith("разделите фигуру")) return splitFigure();
  if (t.startsWith("окружность и круг")) return circleName();
  if (t.startsWith("радиус и диаметр")) return radius();
  if (t.startsWith("дорисуй")) return drawHalf();
  if (t.startsWith("симметричный рисунок")) return symmetry();
  if (t.startsWith("доля фигуры")) return shareFigure();
  if (t.startsWith("доля набора")) return shareSet();
  if (t.startsWith("доля полоски")) return shareStrip();
  if (t.startsWith("целое по одной доле")) return wholeFromShare();
  if (t.startsWith("доля числа")) return shareNumber();
  if (t.startsWith("читаем столбчатую")) return chartRead();
  if (t.startsWith("столбец между")) return chartBetween();
  if (t.startsWith("задачи со столбчатыми")) return chartTask();
  if (t.startsWith("построение столбчатой")) return chartBuild();
  throw new Error(`нет генератора: ${title}`);
}

const MAP = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "j",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function slug(title) {
  const text = title
    .toLowerCase()
    .split("")
    .map((ch) => MAP[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return text.slice(0, 64) || "tema";
}

function publicTitle(title) {
  return title.replaceAll("Образавр", "фигурка");
}

function opsFor(grade) {
  return grade === 1 ? ["+", "−"] : ["+", "−", "×", "÷"];
}

function ruleLine(title, question) {
  const t = norm(title);
  const length = t.startsWith("дециметры") || t.startsWith("сантиметры и") || t.startsWith("метры и") || t.startsWith("перевод единиц длины") || t.startsWith("из двух единиц") || t.startsWith("из одной единицы") || t.startsWith("сравнение длины");
  if (!length) return "";
  if (t.startsWith("сравнение длины")) return "Сначала переведите обе длины в одну единицу, потом сравнивайте.";
  if (t.startsWith("из двух") || t.startsWith("из одной")) return "Сложите части в одной единице. В одном сантиметре 10 миллиметров.";
  const prompt = question.prompt || "";
  const found = prompt.match(/(\d+)\s*(дм|см|мм|м)/);
  const amount = Number(found?.[1] || 2);
  const unit = found?.[2] || "";
  const target = question.suffix || "";
  if (unit === "дм" || (unit === "см" && target === "мм")) {
    const name = unit === "дм" ? "дециметре 10 сантиметров" : "сантиметре 10 миллиметров";
    const out = unit === "дм" ? "см" : "мм";
    return `В одном ${name}. ${amount} ${unit} = ${Array.from({ length: Math.min(amount, 3) }, () => `10 ${out}`).join(" + ")} = ${amount * 10} ${out}.`;
  }
  if (unit === "м" && target === "см") return `В одном метре 100 сантиметров. ${amount} м = ${amount} · 100 = ${amount * 100} см.`;
  if (unit === "м") return `В одном метре 10 дециметров. ${amount} м = ${amount * 10} дм.`;
  return "Переведите величину в соседнюю единицу и запишите число.";
}

function helpLine(title, question) {
  const t = norm(title);
  if (question.help) return "";
  const answer = question.answer;
  if (t.startsWith("какая по счету")) return `Считаем предметы слева направо. Нужный по счёту — ${answer}.`;
  if (t.startsWith("перед, между, после")) return `Смотрим соседние числа. Ответ: ${answer}.`;
  if (t.startsWith("где больше") || t.startsWith("где меньше") || t.startsWith("больше или меньше")) return "Сравни две кучки. Где предметов больше или меньше — туда и ответ.";
  if (t.startsWith("больше, меньше, равно")) return "Если предметов поровну, ответ «Да». Если нет — «Нет».";
  if (t.startsWith("сложение на кубиках") || t.startsWith("вычитание на кубиках")) return `Посчитай кубики в поезде. Ответ: ${answer}.`;
  if (t.startsWith("заполни пропуски") && t.includes("100")) return `Пропущенное число — ${answer}.`;
  return "";
}

function explainTokens(parts) {
  const steps = [];
  let current = parts.filter((token) => token !== "");
  const verb = (op) => (op === "+" ? "Складываем" : op === "−" ? "Вычитаем" : op === "×" || op === "·" ? "Умножаем" : "Делим");
  function apply(a, op, b) {
    const left = Number(a);
    const right = Number(b);
    if (op === "+") return left + right;
    if (op === "−") return left - right;
    if (op === "×" || op === "·") return left * right;
    if (op === "÷" || op === ":") return left / right;
    return NaN;
  }
  function fold(list, ops, prefix) {
    const next = list.slice();
    let index = next.findIndex((token) => ops.includes(token));
    let first = true;
    while (index > 0) {
      const value = apply(next[index - 1], next[index], next[index + 1]);
      if (!Number.isFinite(value)) return null;
      steps.push(`${first && prefix ? `${prefix} ` : ""}${verb(next[index])}: ${next[index - 1]} ${next[index]} ${next[index + 1]} = ${value}.`);
      next.splice(index - 1, 3, String(value));
      index = next.findIndex((token) => ops.includes(token));
      first = false;
    }
    return next;
  }
  while (current.includes("(")) {
    const open = current.lastIndexOf("(");
    const close = current.indexOf(")", open);
    if (close < 0) break;
    let inner = fold(current.slice(open + 1, close), ["×", "·", "÷", ":"], "Сначала скобки.");
    if (!inner) return null;
    inner = fold(inner, ["+", "−"], "Сначала скобки.");
    if (!inner) return null;
    current = [...current.slice(0, open), ...inner, ...current.slice(close + 1)];
  }
  current = fold(current, ["×", "·", "÷", ":"], "");
  if (!current) return null;
  current = fold(current, ["+", "−"], "");
  if (!current || current.length !== 1 || !Number.isFinite(Number(current[0]))) return null;
  return { steps, value: Number(current[0]) };
}

function compareSolution(left, right) {
  const sign = Number(left) > Number(right) ? ">" : Number(left) < Number(right) ? "<" : "=";
  const a = String(left);
  const b = String(right);
  if (a.length !== b.length) {
    const longer = a.length > b.length ? left : right;
    const shorter = a.length > b.length ? right : left;
    return {
      steps: [
        `В числе ${longer} ${String(longer).length} цифр, в числе ${shorter} — ${String(shorter).length}.`,
        `Сравниваем число разрядов: ${String(longer).length} > ${String(shorter).length}, поэтому ${longer} > ${shorter}.`,
      ],
      answerLine: `Ответ: ${sign}.`,
    };
  }
  const names = ["единицы", "десятки", "сотни", "тысячи", "десятки тысяч", "сотни тысяч"];
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      const place = names[a.length - 1 - index] || "этот разряд";
      const cmp = a[index] > b[index] ? ">" : "<";
      return {
        steps: [
          `Сравниваем ${a} и ${b} слева направо.`,
          `В разряде «${place}» цифры ${a[index]} и ${b[index]}. ${a[index]} ${cmp} ${b[index]}, поэтому ${a} ${sign} ${b}.`,
        ],
        answerLine: `Ответ: ${sign}.`,
      };
    }
  }
  return { steps: [`${a} и ${b} совпадают по всем разрядам: ${a} = ${b}.`], answerLine: "Ответ: =." };
}

function buildSolution(title, question) {
  const t = norm(title);
  const expression = question.tokens?.length ? question.tokens : question.scene?.kind === "ops" ? question.scene.tokens : null;
  if (expression?.length) {
    const explained = explainTokens(expression);
    if (explained) return { steps: explained.steps, answerLine: `Ответ: ${explained.value}.` };
  }
  if ((t.startsWith("сравнение чисел") || t.startsWith("сравнение многозначных")) && question.left != null) return compareSolution(question.left, question.right);
  if (question.scene?.kind === "poly-sides") {
    const sides = question.scene.sides || [];
    return { steps: ["Периметр — сумма всех сторон.", `${sides.join(" + ")} = ${question.answer}.`], answerLine: `Ответ: ${question.answer} см.` };
  }
  return null;
}

function dress(question, title, grade) {
  if (!question) return question;
  const t = norm(title);
  if (t.startsWith("обратные задачи")) {
    question.scheme = false;
    question.check = true;
    question.revealLabel = "Показать ответ";
  }
  const help = helpLine(title, question);
  if (help) question.help = help;
  const rule = ruleLine(title, question);
  if (rule) question.rule = rule;
  if (question.help || question.rule) question.hideSkip = true;
  if (t.startsWith("таблица пифагора") || t.startsWith("доля фигуры") || t.startsWith("целое по одной")) question.hideSkip = true;
  if (["домино", "найди фигуры", "замкнутые", "куда придет", "где стоит", "графический диктант", "внутри и снаружи", "длиннее и короче", "измерь мерками", "найди лишнюю", "заполни таблицу", "ряд фигур", "сколько точек", "дорисуй", "умножение по рисунку", "в строчку", "первое неполное", "оканчивающиеся нулями", "уравнения со скобками", "задачи с натуральными", "столбец между", "задачи со столбчатыми", "на какую фигуру", "обратные задачи"].some((name) => t.startsWith(name) || t.includes(name))) {
    question.revealLabel = question.revealLabel || "Показать ответ";
  }
  if (["десятки и единицы", "сложение и вычитание величин", "периметр многоугольника", "радиус и диаметр", "умножение и деление величин", "доля числа"].some((name) => t.startsWith(name))) question.check = true;
  if (t.startsWith("домино") && question.scene) {
    question.solution = { steps: [`${question.scene.a} + ${question.scene.b} = ${question.answer}`], answerLine: `Ответ: ${question.answer}.` };
  }
  if (t.startsWith("умножение по рисунку") && question.picture) {
    question.pictureRevealSum = true;
    question.solution = { steps: [question.picture.sum], answerLine: "Знак умножения пока не записываем." };
  }
  if (!question.solution) {
    const built = buildSolution(title, question);
    if (built) question.solution = built;
  }
  return question;
}

export function buildGrades() {
  return [1, 2, 3, 4].map((id) => {
    const used = new Set();
    const chapters = LIVE_GRADES[String(id)].map((chapter) => ({
      title: chapter.title,
      topics: chapter.topics.map((raw) => {
        const title = publicTitle(raw);
        let topicId = slug(title);
        while (used.has(topicId)) topicId = `${topicId}-2`;
        used.add(topicId);
        const custom = norm(raw).startsWith("настраиваемый");
        const topic = {
          id: topicId,
          title,
          make(selected) {
            return dress(makeQuestion(raw, id, selected), raw, id);
          },
        };
        const note = columnNote(raw);
        if (note) topic.note = note;
        if (custom) {
          topic.note = "Выберите режимы в настройках.";
          topic.setup = { ops: opsFor(id), labels: LABELS };
        }
        return topic;
      }),
    }));
    return { id, chapters };
  });
}
