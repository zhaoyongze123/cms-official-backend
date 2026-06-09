import type { RefObject } from "react";

type ImageToolbarProps = {
  buttonRef: RefObject<HTMLButtonElement | null>;
  showMenu: boolean;
  onToggleMenu: () => void;
  onUpload: () => void;
  onSelectLibrary: () => void;
};

export function ImageToolbar({
  buttonRef,
  showMenu,
  onToggleMenu,
  onUpload,
  onSelectLibrary,
}: ImageToolbarProps) {
  return (
    <>
      <button
        ref={buttonRef}
        className={`tiptap-toolbar-button tiptap-media-toolbar-button${showMenu ? " is-active" : ""}`}
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onClick={onToggleMenu}
        title="图片"
        type="button"
      >
        <span aria-hidden="true" className="tiptap-toolbar-icon">
          <span className="toolbar-image">▣</span>
        </span>
        <span className="tiptap-media-toolbar-label">图片</span>
      </button>
      {showMenu ? (
        <div className="tiptap-image-source-menu">
          <button className="tiptap-context-action" onClick={onUpload} type="button">
            本地上传
          </button>
          <button className="tiptap-context-action" onClick={onSelectLibrary} type="button">
            从媒体库选择
          </button>
        </div>
      ) : null}
    </>
  );
}
