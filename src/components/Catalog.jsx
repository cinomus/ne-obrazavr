import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GRADES, getGrade, trainersWord } from "../curriculum";
import { readScores, readStars, starId } from "../storage";
import { RUN_LENGTH } from "../session";

function norm(value) {
  return value.toLowerCase().replaceAll("ё", "е").trim();
}

function Stars({ value }) {
  return (
    <span className="stars" aria-label={`Результат: ${value} из 3 звёзд`}>
      {[1, 2, 3].map((star) => (
        <span key={star} className={star <= value ? "on" : ""}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function Catalog() {
  const { grade: gradeParam } = useParams();
  const grade = getGrade(gradeParam);
  const [query, setQuery] = useState("");
  const stars = readStars();
  const scores = readScores();

  useEffect(() => {
    setQuery("");
  }, [gradeParam]);

  const chapters = useMemo(() => {
    if (!grade) return [];
    const needle = norm(query);
    return grade.chapters
      .map((chapter, index) => ({
        ...chapter,
        number: index + 1,
        topics: chapter.topics.filter((topic) => {
          if (!needle) return true;
          return norm(topic.title).includes(needle) || norm(chapter.title).includes(needle);
        }),
      }))
      .filter((chapter) => chapter.topics.length > 0);
  }, [grade, query]);

  if (!grade) {
    return (
      <main className="page">
        <h1>Такого класса нет</h1>
        <p className="lede">В тренажёре собраны 1–4 классы.</p>
        <div className="grade-links">
          {GRADES.map((item) => (
            <Link key={item.id} to={`/${item.id}`} className="grade-link">
              {item.id} класс
            </Link>
          ))}
        </div>
      </main>
    );
  }

  const total = grade.chapters.reduce((sum, chapter) => sum + chapter.topics.length, 0);
  const found = chapters.reduce((sum, chapter) => sum + chapter.topics.length, 0);

  return (
    <main className="page">
      <div className="catalog-head">
        <p className="eyebrow">Тренажёры</p>
        <h1>Математика</h1>
        <nav className="grade-switch" aria-label="Классы">
          {GRADES.map((item) => (
            <Link
              key={item.id}
              to={`/${item.id}`}
              className={item.id === grade.id ? "is-current" : ""}
              aria-current={item.id === grade.id ? "page" : undefined}
            >
              <b>{item.id}</b>
              <span>класс</span>
            </Link>
          ))}
        </nav>
        <p className="count">
          {total} {trainersWord(total)}
          {query ? ` · найдено ${found}` : ""}
        </p>
        <label className="search">
          <span className="visually-hidden">Поиск по тренажёрам</span>
          <input
            type="search"
            value={query}
            placeholder="Найти тренажёр"
            aria-label="Найти тренажёр"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      {chapters.length === 0 ? (
        <p className="empty">Ничего не нашлось. Попробуй другое слово.</p>
      ) : (
        <div className="section-grid">
          {chapters.map((chapter) => (
            <section
              key={chapter.number}
              id={`chapter-${chapter.number}`}
              className={`section-card tone-${chapter.number % 4}`}
            >
              <h2>
                <span>{chapter.number}</span>
                {chapter.title}
              </h2>
              <ul>
                {chapter.topics.map((topic, index) => {
                  const id = starId(grade.id, topic.id);
                  const best = scores[id] || 0;
                  const started = id in scores || (stars[id] || 0) > 0;
                  return (
                    <li key={topic.id}>
                      <Link to={`/${grade.id}/${topic.id}`}>
                        <span className={`row-mark ${index === 0 && !started ? "start" : ""}`} aria-hidden="true" />
                        <span className="row-copy">
                          {!started && index === 0 ? <em>Начать</em> : null}
                          <span className="train-title">{topic.title}</span>
                          <span className="row-meta">
                            <span className="ratio">
                              {best} / {RUN_LENGTH}
                            </span>
                            <Stars value={stars[id] || 0} />
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p className="footnote">Примеры каждый раз новые и написаны для этого тренажёра.</p>
    </main>
  );
}
