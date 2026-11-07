function Apple() {
  return (
    <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M33 16c2-7 8-10 12-8" fill="none" stroke="#2d6a38" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="42" cy="16" rx="8" ry="4" fill="#3c9a48" transform="rotate(-32 42 16)" />
      <path d="M32 18c-13 1-21 11-21 23 0 11 9 19 21 19s21-8 21-19c0-12-8-22-21-23z" fill="#e23b32" />
      <path d="M23 30c0 8 2 14 6 18" fill="none" stroke="#ffd2cb" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Star() {
  return (
    <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true">
      <polygon
        points="32,6 39,24 58,24 43,36 49,54 32,43 15,54 21,36 6,24 25,24"
        fill="#f5b42a"
        stroke="#1c2b24"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Cube() {
  return (
    <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true">
      <polygon points="10,24 32,12 54,24 32,36" fill="#ffe3a3" stroke="#1c2b24" strokeWidth="3" strokeLinejoin="round" />
      <polygon points="10,24 32,36 32,56 10,44" fill="#f0b14a" stroke="#1c2b24" strokeWidth="3" strokeLinejoin="round" />
      <polygon points="32,36 54,24 54,44 32,56" fill="#c4840a" stroke="#1c2b24" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

const SHAPES = { apple: Apple, star: Star, cube: Cube };

const DIE = {
  2: [[30, 32], [70, 68]],
  3: [[28, 30], [50, 52], [72, 74]],
  4: [[30, 32], [70, 32], [30, 68], [70, 68]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[30, 26], [70, 26], [30, 50], [70, 50], [30, 74], [70, 74]],
};

export default function PictureGroups({ picture, showCounts = false }) {
  const { groups, each, kind, container = "plate" } = picture;
  const Shape = SHAPES[kind] || Apple;
  const spots = DIE[each] || DIE[2];
  return (
    <div className={`picture-mul is-${container}`} data-groups={groups} data-each={each} data-kind={kind}>
      {Array.from({ length: groups }, (_, group) => (
        <div className="picture-group" key={group}>
          <div className={`picture-box is-${container}`} aria-hidden="true">
            {spots.map(([x, y], item) => (
              <span key={item} className="picture-item" style={{ left: `${x}%`, top: `${y}%` }}>
                <Shape />
              </span>
            ))}
          </div>
          {showCounts ? <span className="picture-count">{each}</span> : <span className="picture-count is-empty" />}
        </div>
      ))}
    </div>
  );
}
