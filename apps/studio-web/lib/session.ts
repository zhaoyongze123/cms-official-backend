export const DJANGO_SESSION_COOKIE = "sessionid";
export const DJANGO_CSRF_COOKIE = "csrftoken";

export function getCurrentStudioUser() {
  return {
    id: "django-session",
    name: "Django 已登录用户",
    role: "SEO Operator",
    email: "django-session@cms.local",
  };
}
