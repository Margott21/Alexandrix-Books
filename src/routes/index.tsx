import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alexandrix Books — Biblioteca Cósmica" },
      { name: "description", content: "Alexandrix Books — uma biblioteca online com curadoria estelar de obras clássicas e modernas." },
      { property: "og:title", content: "Alexandrix Books" },
      { property: "og:description", content: "Biblioteca cósmica online com obras clássicas e modernas." },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    window.location.replace("/alexandrix/index.html");
  }, []);
  return (
    <div style={{ minHeight: "100vh", background: "#03050f", color: "#e7ecff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      Carregando Alexandrix Books…
    </div>
  );
}
