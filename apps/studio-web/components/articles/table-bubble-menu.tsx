import type { Editor as TiptapRuntimeEditor } from "@tiptap/core";
import { BubbleMenu } from "@tiptap/react/menus";

type TableBubbleMenuProps = {
  editor: TiptapRuntimeEditor;
  onAddRowBefore: () => void;
  onAddRowAfter: () => void;
  onAddColumnBefore: () => void;
  onAddColumnAfter: () => void;
  onDeleteRow: () => void;
  onDeleteColumn: () => void;
  onDeleteTable: () => void;
};

type TableBubbleAction = {
  label: string;
  onClick: () => void;
};

function TableBubbleButton({ label, onClick }: TableBubbleAction) {
  return (
    <button
      className="tiptap-table-bubble-button"
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

export function TableBubbleMenu({
  editor,
  onAddRowBefore,
  onAddRowAfter,
  onAddColumnBefore,
  onAddColumnAfter,
  onDeleteRow,
  onDeleteColumn,
  onDeleteTable,
}: TableBubbleMenuProps) {
  const actions: TableBubbleAction[] = [
    { label: "上插行", onClick: onAddRowBefore },
    { label: "下插行", onClick: onAddRowAfter },
    { label: "左插列", onClick: onAddColumnBefore },
    { label: "右插列", onClick: onAddColumnAfter },
    { label: "删行", onClick: onDeleteRow },
    { label: "删列", onClick: onDeleteColumn },
    { label: "删表", onClick: onDeleteTable },
  ];

  return (
    <BubbleMenu className="tiptap-table-bubble-menu" editor={editor} shouldShow={({ editor: currentEditor }) => currentEditor.isActive("table")}>
      {actions.map((action) => (
        <TableBubbleButton key={action.label} label={action.label} onClick={action.onClick} />
      ))}
    </BubbleMenu>
  );
}
