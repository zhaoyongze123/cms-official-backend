export function getFoundationStatus() {
  return {
    authMode: process.env.NEXT_PUBLIC_AUTH_MODE ?? "django-session",
    djangoBaseUrl: process.env.NEXT_PUBLIC_DJANGO_BASE_URL ?? "http://127.0.0.1:8001",
    editorBaseUrl: process.env.NEXT_PUBLIC_EDITOR_BASE_URL ?? "http://127.0.0.1:3000"
  };
}
