import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { BlockPalette } from "./BlockPalette";
import { BlockEditor } from "./BlockEditor";

export default function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex gap-4 p-4">
        <BlockPalette />
        <BlockEditor />
      </div>
    </DndProvider>
  );
}
