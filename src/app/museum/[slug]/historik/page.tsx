import { notFound } from "next/navigation";
import { getMuseum } from "@/lib/museums";
import { HistoryList } from "@/components/history-list";

export default async function HistorikPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const museum = getMuseum(slug);
  if (!museum) notFound();

  return <HistoryList museum={museum} />;
}
