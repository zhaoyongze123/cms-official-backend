import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { StudioShell } from "../../components/studio/studio-shell";
import { MOCK_SESSION_COOKIE } from "../../lib/session";

export default async function StudioLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  if (cookieStore.get(MOCK_SESSION_COOKIE)?.value !== "authenticated") {
    redirect("/login");
  }

  return <StudioShell>{children}</StudioShell>;
}
