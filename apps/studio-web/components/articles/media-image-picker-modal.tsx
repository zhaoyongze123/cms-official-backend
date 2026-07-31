"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { MediaLibraryImageRecord } from "../../lib/api-client";

export type ImageCropSelection = {
  sourceX: number;
  sourceY: number;
  sourceSize: number;
};

type ImageDimensions = {
  width: number;
  height: number;
};

type StageSize = {
  width: number;
  height: number;
};

type CropPosition = {
  left: number;
  top: number;
};

type MediaImagePickerModalProps = {
  title: string;
  images: MediaLibraryImageRecord[];
  status: string;
  currentImageId?: number;
  allowCrop?: boolean;
  busy?: boolean;
  onClose: () => void;
  onSelect: (image: MediaLibraryImageRecord) => void | Promise<void>;
  onCropAndSelect?: (image: MediaLibraryImageRecord, selection: ImageCropSelection) => void | Promise<void>;
};

function getStageSize(dimensions: ImageDimensions | null): StageSize {
  if (!dimensions) {
    return { width: 360, height: 220 };
  }

  const maxWidth = 560;
  const maxHeight = 420;
  const scale = Math.min(maxWidth / dimensions.width, maxHeight / dimensions.height);
  return {
    width: Math.round(dimensions.width * scale),
    height: Math.round(dimensions.height * scale),
  };
}

export function MediaImagePickerModal({
  title,
  images,
  status,
  currentImageId,
  allowCrop = false,
  busy = false,
  onClose,
  onSelect,
  onCropAndSelect,
}: MediaImagePickerModalProps) {
  const [query, setQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<MediaLibraryImageRecord | null>(null);
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [cropPosition, setCropPosition] = useState<CropPosition>({ left: 0, top: 0 });
  const cropDragRef = useRef<{
    startX: number;
    startY: number;
    left: number;
    top: number;
  } | null>(null);

  const filteredImages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return images;
    }

    return images.filter((image) =>
      [image.title, image.alt_text, String(image.image_id)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [images, query]);

  const stageSize = useMemo(() => getStageSize(dimensions), [dimensions]);
  const cropSize = dimensions ? Math.min(stageSize.width, stageSize.height) : 0;
  const needsCrop = Boolean(allowCrop && dimensions && dimensions.width !== dimensions.height);

  useEffect(() => {
    const initialImage =
      images.find((image) => image.image_id === currentImageId) ?? images[0] ?? null;
    setSelectedImage(initialImage);
  }, [currentImageId, images]);

  useEffect(() => {
    if (!selectedImage) {
      setDimensions(null);
      setPreviewError("");
      return;
    }

    setDimensions(null);
    setPreviewError("");
    setCropPosition({ left: 0, top: 0 });
  }, [selectedImage]);

  useEffect(() => {
    if (!dimensions || !needsCrop) {
      setCropPosition({ left: 0, top: 0 });
      return;
    }

    setCropPosition({
      left: Math.max(0, (stageSize.width - cropSize) / 2),
      top: Math.max(0, (stageSize.height - cropSize) / 2),
    });
  }, [cropSize, dimensions, needsCrop, stageSize.height, stageSize.width]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose]);

  function handleCropPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!needsCrop || busy) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    cropDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      left: cropPosition.left,
      top: cropPosition.top,
    };
  }

  function handleCropPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = cropDragRef.current;
    if (!drag || !needsCrop) {
      return;
    }

    const maxLeft = Math.max(0, stageSize.width - cropSize);
    const maxTop = Math.max(0, stageSize.height - cropSize);
    setCropPosition({
      left: Math.min(maxLeft, Math.max(0, drag.left + event.clientX - drag.startX)),
      top: Math.min(maxTop, Math.max(0, drag.top + event.clientY - drag.startY)),
    });
  }

  function handleCropPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    cropDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function buildCropSelection(): ImageCropSelection | null {
    if (!selectedImage || !dimensions || !needsCrop || cropSize <= 0) {
      return null;
    }

    const scaleX = dimensions.width / stageSize.width;
    const scaleY = dimensions.height / stageSize.height;
    const sourceSize = Math.max(1, Math.round(cropSize * Math.min(scaleX, scaleY)));
    const maxSourceX = Math.max(0, dimensions.width - sourceSize);
    const maxSourceY = Math.max(0, dimensions.height - sourceSize);

    return {
      sourceX: Math.min(maxSourceX, Math.max(0, Math.round(cropPosition.left * scaleX))),
      sourceY: Math.min(maxSourceY, Math.max(0, Math.round(cropPosition.top * scaleY))),
      sourceSize: Math.min(sourceSize, dimensions.width, dimensions.height),
    };
  }

  async function handleUseImage() {
    if (!selectedImage || busy || !dimensions) {
      return;
    }

    const cropSelection = buildCropSelection();
    if (cropSelection && onCropAndSelect) {
      await onCropAndSelect(selectedImage, cropSelection);
      return;
    }

    await onSelect(selectedImage);
  }

  return (
    <div className="media-picker-backdrop" role="presentation">
      <div aria-labelledby="media-picker-title" aria-modal="true" className="media-picker-modal" role="dialog">
        <header className="media-picker-header">
          <div>
            <strong id="media-picker-title">{title}</strong>
            <small>{allowCrop ? "可预览图片；非 1:1 图片可拖动方框选择裁剪区域。" : "先预览，再确认使用图片。"}</small>
          </div>
          <button className="word-sidebar-mini-button is-muted" disabled={busy} onClick={onClose} type="button">
            关闭
          </button>
        </header>

        <div className="media-picker-toolbar">
          <input
            aria-label="搜索图片"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索图片名称、Alt 文本或 ID"
            value={query}
          />
          <span>{filteredImages.length} 张图片</span>
        </div>

        {status ? <div className="word-sidebar-media-status">{status}</div> : null}

        <div className="media-picker-layout">
          <section className="media-picker-results" aria-label="媒体库图片列表">
            {filteredImages.length > 0 ? (
              <div className="media-picker-grid">
                {filteredImages.map((image) => (
                  <button
                    aria-pressed={selectedImage?.image_id === image.image_id}
                    className={`media-picker-option${selectedImage?.image_id === image.image_id ? " is-selected" : ""}`}
                    key={image.image_id}
                    onClick={() => setSelectedImage(image)}
                    type="button"
                  >
                    <img alt={image.alt_text || image.title} src={image.file_url} />
                    <strong>{image.title || `图片 ${image.image_id}`}</strong>
                    <small>{image.alt_text || `image_id=${image.image_id}`}</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="word-sidebar-media-empty">没有匹配的图片。</div>
            )}
          </section>

          <section className="media-picker-preview" aria-label="图片预览">
            {selectedImage ? (
              <>
                <div className="media-picker-preview-head">
                  <div>
                    <strong>{selectedImage.title || `图片 ${selectedImage.image_id}`}</strong>
                    <small>
                      {dimensions ? `${dimensions.width} × ${dimensions.height}` : "正在读取图片尺寸..."}
                    </small>
                  </div>
                  {needsCrop ? <span className="media-picker-crop-badge">1:1 裁剪</span> : null}
                </div>
                <div
                  className="media-picker-stage"
                  style={{ height: stageSize.height, width: stageSize.width }}
                >
                  <img
                    alt={selectedImage.alt_text || selectedImage.title}
                    onError={() => setPreviewError("图片预览加载失败。")}
                    onLoad={(event) => {
                      setDimensions({
                        width: event.currentTarget.naturalWidth,
                        height: event.currentTarget.naturalHeight,
                      });
                    }}
                    src={selectedImage.file_url}
                  />
                  {needsCrop ? (
                    <div
                      aria-label="拖动选择正方形裁剪范围"
                      className="media-picker-crop-box"
                      onPointerDown={handleCropPointerDown}
                      onPointerMove={handleCropPointerMove}
                      onPointerUp={handleCropPointerUp}
                      role="slider"
                      style={{
                        height: cropSize,
                        left: cropPosition.left,
                        top: cropPosition.top,
                        width: cropSize,
                      }}
                      tabIndex={0}
                    >
                      <span>拖动选择范围</span>
                    </div>
                  ) : null}
                </div>
                {previewError ? <div className="field-error-text">{previewError}</div> : null}
                <div className="media-picker-preview-copy">
                  {needsCrop
                    ? "确认后会生成一张新的正方形图片并保存到媒体库，原图不会被修改。"
                    : dimensions
                      ? "当前图片会按原始比例使用，不会叠加 Yuncan Logo。"
                      : "图片加载完成后可以确认使用。"}
                </div>
                <div className="media-picker-actions">
                  <button className="word-sidebar-mini-button is-muted" disabled={busy} onClick={onClose} type="button">
                    取消
                  </button>
                  <button
                    className="word-sidebar-mini-button"
                    disabled={busy || !dimensions || Boolean(previewError)}
                    onClick={() => void handleUseImage()}
                    type="button"
                  >
                    {busy ? "处理中..." : needsCrop ? "确认裁剪并使用" : "使用此图片"}
                  </button>
                </div>
              </>
            ) : (
              <div className="media-picker-preview-empty">从左侧选择图片后，在这里预览。</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
