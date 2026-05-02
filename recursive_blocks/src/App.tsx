import { useEffect, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { BlockEditor } from "./BlockEditor";
import { BlockEditorProvider } from "./BlockEditorContext";
import DocsPage from "./DocsPage";

function getCurrentView(): "editor" | "docs" {
  return window.location.hash === "#docs" ? "docs" : "editor";
}

export default function App() {
  const [view, setView] = useState<"editor" | "docs">(getCurrentView);

  useEffect(() => {
    const handleHashChange = () => {
      setView(getCurrentView());
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (view === "docs") {
    return <DocsPage />;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app-container">
        <BlockEditorProvider>
          <BlockEditor />
        </BlockEditorProvider>
      </div>
    </DndProvider>
  );
}
