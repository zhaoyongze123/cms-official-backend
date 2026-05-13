export const EDITOR_PROTOCOL_PACKAGE_NAME = "@cms/editor-protocol";
export const EDITOR_PROTOCOL_VERSION = "v1";
export const TIPTAP_SCHEMA_VERSION = "v1";
export const PATCH_SCHEMA_VERSION = "v1";
export const BLOCK_ID_PATTERN = /^blk_[A-Za-z0-9_-]+$/;
export const ALLOWED_PATCH_OPERATIONS = [
  "insert_after",
  "delete",
  "replace_text",
  "alt_text",
] as const;

export type AllowedPatchOperation = (typeof ALLOWED_PATCH_OPERATIONS)[number];

