import React, {useEffect, useRef} from "react";
import { useDrop } from "react-dnd";
import { BlockData } from "./BlockTypes";
import { v4 as uuidv4 } from "uuid";

interface Props {
  block: BlockData;
  onUpdate: (newBlock: BlockData) => void;
}

export function Block({ block, onUpdate }: Props) {
  const renderSlot = (slotName: string) => {
    const child = block.children[slotName];
    const dropRef = useRef<HTMLDivElement>(null);

    const [, drop] = useDrop(() => ({
      accept: "BLOCK",
      drop: (item: { type: string }) => {
        const newChild: BlockData = {
          id: uuidv4(),
          type: item.type as any,
          children: getDefaultChildren(item.type),
        };
        const newBlock = {
          ...block,
          children: {
            ...block.children,
            [slotName]: newChild,
          },
        };
        onUpdate(newBlock);
      },
    }));

    // UseEffect to connect drop functionality to the div
    useEffect(() => {
      if (dropRef.current) {
        drop(dropRef.current);
      }
    }, [drop]);

    return (
      <div ref={dropRef} className="p-2 border rounded mb-2 bg-gray-100">
        <strong>{slotName}:</strong>{" "}
        {child ? (
          <Block
            block={child}
            onUpdate={(newChild) => {
              const updated = {
                ...block,
                children: {
                  ...block.children,
                  [slotName]: newChild,
                },
              };
              onUpdate(updated);
            }}
          />
        ) : (
          <span className="text-gray-400">Drop block here</span>
        )}
      </div>
    );
  };

  return (
    <div className="p-2 border rounded bg-white">
      <div className="font-bold mb-2">{block.type.toUpperCase()}</div>
      <div className="ml-2">
        {Object.keys(block.children).map((slotName) => (
          <div key={slotName}>{renderSlot(slotName)}</div>
        ))}
      </div>
    </div>
  );
}

function getDefaultChildren(type: string): Record<string, BlockData | null> {
  if (type === "if") {
    return {
      condition: null,
      then: null,
      else: null
    };
  }
  return {} as Record<string, BlockData | null>;
}
