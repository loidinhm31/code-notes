import React from "react";
import ReactDOM from "react-dom/client";
import { CodeNotesApp } from "@code-notes/ui/embed";
import "@code-notes/ui/styles";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CodeNotesApp />
  </React.StrictMode>,
);
