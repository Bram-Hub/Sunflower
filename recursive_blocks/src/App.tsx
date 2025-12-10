import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { BlockPalette } from "./BlockPalette";
import { BlockEditor } from "./BlockEditor";
import { BlockEditorProvider } from "./BlockEditorContext";

export default function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app-container">
        <BlockEditor />
      </div>
    </DndProvider>
  );
}
