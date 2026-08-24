export type ManagedPageRecord = {
  page_id: number;
  path: string;
  title: string;
  template_key: string;
  status: "draft" | "published";
  content_json: Record<string, unknown>;
  content_html: string;
  meta_description: string;
  canonical_url: string;
  robots: string;
  created_at: string;
  updated_at: string;
};
