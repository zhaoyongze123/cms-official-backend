import { notFound } from "next/navigation";
import { ManagedPageEditor } from "../../../../components/pages/page-editor";
import { fetchServerPage } from "../../../../lib/server-pages";

export default async function ManagedPageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  try {
    return <div className="page-stack"><ManagedPageEditor page={await fetchServerPage(id)} /></div>;
  } catch {
    notFound();
  }
}
