import { notFound } from "next/navigation";
import { getMuseum } from "@/lib/museums";
import { KonfigurationPage } from "@/components/konfiguration-page";

export default async function Konfiguration({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const museum = getMuseum(slug);
  if (!museum) notFound();

  return <KonfigurationPage museum={museum} />;
}
