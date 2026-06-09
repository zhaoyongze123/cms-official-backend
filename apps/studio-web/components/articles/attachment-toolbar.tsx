import type { RefObject } from "react";

type AttachmentToolbarProps = {
  buttonRef: RefObject<HTMLButtonElement | null>;
  showMenu: boolean;
  onToggleMenu: () => void;
  onUpload: () => void;
  onSelectLibrary: () => void;
};

export function AttachmentToolbar({
  buttonRef,
  showMenu,
  onToggleMenu,
  onUpload,
  onSelectLibrary,
}: AttachmentToolbarProps) {
  return (
    <>
      <button
        ref={buttonRef}
        className={`tiptap-toolbar-button tiptap-media-toolbar-button${showMenu ? " is-active" : ""}`}
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onClick={onToggleMenu}
        title="附件"
        type="button"
      >
        <span aria-hidden="true" className="tiptap-toolbar-icon">
          <span className="toolbar-code toolbar-html-mark">附件</span>
        </span>
        <span className="tiptap-media-toolbar-label">附件</span>
      </button>
      {showMenu ? (
        <div className="tiptap-image-source-menu tiptap-attachment-source-menu">
          <button className="tiptap-context-action" onClick={onUpload} type="button">
            本地上传附件
          </button>
          <button className="tiptap-context-action" onClick={onSelectLibrary} type="button">
            从附件库选择
          </button>
        </div>
      ) : null}
    </>
  );
}
