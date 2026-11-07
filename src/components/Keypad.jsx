const ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

export default function Keypad({ disabled, onDigit, onBack, onClear }) {
  return (
    <div className={`keypad ${disabled ? "is-off" : ""}`}>
      {ROWS.map((row) =>
        row.map((digit) => (
          <button
            key={digit}
            type="button"
            className="key"
            disabled={disabled}
            onClick={() => onDigit(digit)}
          >
            {digit}
          </button>
        )),
      )}
      <button
        type="button"
        className="key key-tool"
        disabled={disabled}
        aria-label="Стереть всё"
        onClick={onClear}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 6h8l1 2h4v2H3V8h4l1-2z" />
          <path d="M6 10h12l-1 11H7L6 10z" />
        </svg>
      </button>
      <button
        type="button"
        className="key"
        disabled={disabled}
        onClick={() => onDigit("0")}
      >
        0
      </button>
      <button
        type="button"
        className="key key-tool"
        disabled={disabled}
        aria-label="Стереть цифру"
        onClick={onBack}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5h13v14H8l-6-7 6-7z" />
          <path d="M11 9l6 6M17 9l-6 6" stroke="#143f3b" strokeWidth="1.8" />
        </svg>
      </button>
    </div>
  );
}
