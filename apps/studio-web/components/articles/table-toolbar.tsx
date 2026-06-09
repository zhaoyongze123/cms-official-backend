import type { Editor as TiptapRuntimeEditor } from "@tiptap/core";

type TableToolbarAction = {
  icon: string;
  label: string;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
};

type TableToolbarProps = {
  editor: TiptapRuntimeEditor | null;
  onInsertTable: () => void;
  onAddRowBefore: () => void;
  onAddRowAfter: () => void;
  onAddColumnBefore: () => void;
  onAddColumnAfter: () => void;
  onDeleteRow: () => void;
  onDeleteColumn: () => void;
  onDeleteTable: () => void;
};

function TableToolbarButton({ active = false, disabled = false, icon, label, onClick }: TableToolbarAction) {
  return (
    <button
      className={`tiptap-toolbar-button tiptap-table-toolbar-button${active ? " is-active" : ""}`}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={onClick}
      title={label}
      type="button"
    >
      <span aria-hidden="true" className="tiptap-toolbar-icon" dangerouslySetInnerHTML={{ __html: icon }} />
      <span className="tiptap-table-toolbar-label">{label}</span>
    </button>
  );
}

export function TableToolbar({
  editor,
  onInsertTable,
  onAddRowBefore,
  onAddRowAfter,
  onAddColumnBefore,
  onAddColumnAfter,
  onDeleteRow,
  onDeleteColumn,
  onDeleteTable,
}: TableToolbarProps) {
  const isTableActive = editor?.isActive("table") ?? false;
  const actions: TableToolbarAction[] = [
    {
      active: isTableActive,
      icon: "<span class='toolbar-code toolbar-html-mark'>表格</span>",
      label: "插入表格",
      onClick: onInsertTable,
    },
    {
      disabled: !isTableActive,
      icon: "<span class='toolbar-code toolbar-html-mark'>上插行</span>",
      label: "上插行",
      onClick: onAddRowBefore,
    },
    {
      disabled: !isTableActive,
      icon: "<span class='toolbar-code toolbar-html-mark'>下插行</span>",
      label: "下插行",
      onClick: onAddRowAfter,
    },
    {
      disabled: !isTableActive,
      icon: "<span class='toolbar-code toolbar-html-mark'>左插列</span>",
      label: "左插列",
      onClick: onAddColumnBefore,
    },
    {
      disabled: !isTableActive,
      icon: "<span class='toolbar-code toolbar-html-mark'>右插列</span>",
      label: "右插列",
      onClick: onAddColumnAfter,
    },
    {
      disabled: !isTableActive,
      icon: "<span class='toolbar-code toolbar-html-mark'>删行</span>",
      label: "删行",
      onClick: onDeleteRow,
    },
    {
      disabled: !isTableActive,
      icon: "<span class='toolbar-code toolbar-html-mark'>删列</span>",
      label: "删列",
      onClick: onDeleteColumn,
    },
    {
      disabled: !isTableActive,
      icon: "<span class='toolbar-code toolbar-html-mark'>删表</span>",
      label: "删表",
      onClick: onDeleteTable,
    },
  ];

  return (
    <div className="tiptap-toolbar-group tiptap-toolbar-group-divider tiptap-table-toolbar" role="toolbar" aria-label="表格工具条">
      {actions.map((action) => (
        <TableToolbarButton
          key={action.label}
          active={action.active}
          disabled={action.disabled}
          icon={action.icon}
          label={action.label}
          onClick={action.onClick}
        />
      ))}
    </div>
  );
}
