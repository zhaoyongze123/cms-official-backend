"use client";

import { useEffect, useState } from "react";

import {
  fetchAiGenerationSettings,
  updateAiGenerationSettings,
  type AiGenerationSettings,
} from "../../../lib/ai-settings";

const EMPTY_SETTINGS: AiGenerationSettings = {
  models: {
    review: "",
    generation: "",
  },
  api_key: {
    has_value: false,
    masked_value: "",
  },
  model_options: [],
  siliconflow_models: [],
  siliconflow_models_error: null,
  prompts: {
    review_prompt: "",
    metadata_prompt: "",
    faq_prompt: "",
    internal_links_prompt: "",
    alt_prompt: "",
    title_prompt: "",
    slug_prompt: "",
    tags_prompt: "",
    description_prompt: "",
  },
};

export default function AiSettingsPage() {
  const [settings, setSettings] = useState<AiGenerationSettings>(EMPTY_SETTINGS);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let active = true;
    void fetchAiGenerationSettings()
      .then((result) => {
        if (!active) {
          return;
        }
        setSettings(result);
        setApiKeyInput("");
      })
      .catch((loadError) => {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "加载模型配置失败");
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await updateAiGenerationSettings({
        models: settings.models,
        api_key: apiKeyInput.trim() ? { value: apiKeyInput.trim() } : undefined,
        model_options: settings.siliconflow_models,
        prompts: settings.prompts,
      });
      setSettings(result);
      setApiKeyInput("");
      setMessage("模型、API Key 与 Prompt 已保存。");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="page-stack">
        <section className="hero">
          <span className="eyebrow">AI Settings</span>
          <h1>正在加载模型管理配置</h1>
          <p>从 Django 真相源读取当前四项生成模型与 Prompt。</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="hero">
        <span className="eyebrow">AI Settings</span>
        <h1>模型管理</h1>
        <p>这里单独管理标题、Slug、标签、描述四项生成所使用的模型与 Prompt。保存后，后续生成请求会直接带上这套配置。</p>
      </section>

      <form className="panel ai-settings-panel" onSubmit={handleSubmit}>
        <div className="panel-heading">
          <div>
            <h2>硅基流动模型选择</h2>
            <p>模型列表来自 SiliconFlow `/v1/models`。前端改完保存后，FastAPI 下次调用按请求生效。</p>
          </div>
          <button className="cta primary" type="submit" disabled={isSaving}>
            {isSaving ? "保存中..." : "保存配置"}
          </button>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="siliconflow-api-key">
            硅基流动 API Key
          </label>
          <input
            id="siliconflow-api-key"
            type="password"
            autoComplete="off"
            placeholder={settings.api_key.has_value ? `已保存：${settings.api_key.masked_value}` : "请输入新的 SiliconFlow API Key"}
            value={apiKeyInput}
            onChange={(event) => setApiKeyInput(event.target.value)}
          />
          <p className="field-help">
            {settings.api_key.has_value
              ? "留空表示保留当前已保存的 Key；输入新值后会覆盖旧值。"
              : "保存后用于读取模型列表，以及后续 Django 侧 AI 配置请求。"}
          </p>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="ai-review-model">
            审核与扩展生成模型
          </label>
          <select
            id="ai-review-model"
            value={settings.models.review}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                models: { ...current.models, review: event.target.value },
              }))
            }
          >
            {settings.siliconflow_models.map((modelId) => (
              <option key={modelId} value={modelId}>
                {modelId}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="ai-generation-model">
            四项生成模型
          </label>
          <select
            id="ai-generation-model"
            value={settings.models.generation}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                models: { ...current.models, generation: event.target.value },
              }))
            }
          >
            {settings.siliconflow_models.map((modelId) => (
              <option key={modelId} value={modelId}>
                {modelId}
              </option>
            ))}
          </select>
        </div>

        {settings.siliconflow_models_error ? (
          <p className="status-message error">
            硅基流动模型列表读取失败：{settings.siliconflow_models_error}
          </p>
        ) : settings.api_key.has_value ? (
          <p className="status-message success">已检测到后台已配置 API Key，可直接切换模型并保存。</p>
        ) : null}

        <div className="grid ai-prompt-grid">
          <PromptField
            id="review-prompt"
            label="审核 Prompt"
            value={settings.prompts.review_prompt}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                prompts: { ...current.prompts, review_prompt: value },
              }))
            }
          />
          <PromptField
            id="metadata-prompt"
            label="Metadata Prompt"
            value={settings.prompts.metadata_prompt}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                prompts: { ...current.prompts, metadata_prompt: value },
              }))
            }
          />
          <PromptField
            id="faq-prompt"
            label="FAQ Prompt"
            value={settings.prompts.faq_prompt}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                prompts: { ...current.prompts, faq_prompt: value },
              }))
            }
          />
          <PromptField
            id="internal-links-prompt"
            label="内链推荐 Prompt"
            value={settings.prompts.internal_links_prompt}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                prompts: { ...current.prompts, internal_links_prompt: value },
              }))
            }
          />
          <PromptField
            id="alt-prompt"
            label="Alt Prompt"
            value={settings.prompts.alt_prompt}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                prompts: { ...current.prompts, alt_prompt: value },
              }))
            }
          />
          <PromptField
            id="title-prompt"
            label="标题生成 Prompt"
            value={settings.prompts.title_prompt}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                prompts: { ...current.prompts, title_prompt: value },
              }))
            }
          />
          <PromptField
            id="slug-prompt"
            label="Slug 生成 Prompt"
            value={settings.prompts.slug_prompt}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                prompts: { ...current.prompts, slug_prompt: value },
              }))
            }
          />
          <PromptField
            id="tags-prompt"
            label="标签生成 Prompt"
            value={settings.prompts.tags_prompt}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                prompts: { ...current.prompts, tags_prompt: value },
              }))
            }
          />
          <PromptField
            id="description-prompt"
            label="描述生成 Prompt"
            value={settings.prompts.description_prompt}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                prompts: { ...current.prompts, description_prompt: value },
              }))
            }
          />
        </div>

        {message ? <p className="status-message success">{message}</p> : null}
        {error ? <p className="status-message error">{error}</p> : null}
      </form>
    </div>
  );
}

type PromptFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function PromptField({ id, label, value, onChange }: PromptFieldProps) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        rows={10}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
