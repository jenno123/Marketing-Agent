import { notFound } from "next/navigation";
import { getMuseum } from "@/lib/museums";
import { PostGenerator } from "@/components/post-generator";

export default async function MuseumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const museum = getMuseum(slug);
  if (!museum) notFound();

  return <PostGenerator museum={museum} />;
}
