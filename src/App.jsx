import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import Catalog from "./components/Catalog";
import Trainer from "./components/Trainer";

export default function App() {
  useEffect(() => {
    document.title = "Бобразавр";
  }, []);

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Navigate to="/2" replace />} />
        <Route path="/:grade" element={<Catalog />} />
        <Route path="/:grade/:topicId" element={<Trainer />} />
      </Routes>
    </>
  );
}
