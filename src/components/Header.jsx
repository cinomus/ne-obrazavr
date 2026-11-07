import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="site-header">
      <div className="brand-bar">
        <Link to="/2" className="brand">
          <span className="mark-frame">
            <img className="mark" src={`${import.meta.env.BASE_URL}bobrazavr.png`} alt="Бобр" width="88" height="88" />
          </span>
          <span className="wordmark">
            <span className="wordmark-kicker">Математика · 1–4 класс</span>
            <span className="wordmark-name">Бобразавр</span>
          </span>
        </Link>
      </div>
      <svg className="header-wave" viewBox="0 0 1440 56" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 28c80 22 160 22 240 0s160-22 240 0 160 22 240 0 160-22 240 0 160 22 240 0 160-22 240 0v28H0Z" />
      </svg>
    </header>
  );
}
