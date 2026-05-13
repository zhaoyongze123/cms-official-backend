import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { studioProxyPath } from "../../lib/routes";
import { DJANGO_SESSION_COOKIE } from "../../lib/session";

export default async function StudioLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  if (!cookieStore.get(DJANGO_SESSION_COOKIE)?.value) {
    redirect(studioProxyPath("/login"));
  }

  return <main className="studio-editor-root">{children}</main>;
}
