import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { BlockEditor } from "./BlockEditor";
import { BlockEditorProvider } from "./BlockEditorContext";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Documentation from "./Documentation";

export default function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app-container">
        <BlockEditorProvider>
          <Router>
            <Routes>
              <Route path="/" element={<BlockEditor />} />
              <Route path="/docs" element={<Documentation />} />
            </Routes>
          </Router>
        </BlockEditorProvider>
      </div>
    </DndProvider>
  );
}
