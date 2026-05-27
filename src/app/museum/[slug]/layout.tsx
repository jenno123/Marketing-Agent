import { notFound } from "next/navigation";
import { getMuseum } from "@/lib/museums";

export default async function MuseumLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const museum = getMuseum(slug);
  if (!museum) notFound();

  return (
    <div className="flex flex-col h-full">
      <div className="pb-5 border-b border-stone-200 shrink-0">
        <h1 className="text-lg font-semibold text-stone-900 tracking-tight">
          {museum.name}
        </h1>
        <p className="text-sm text-stone-400 mt-0.5">{museum.description}</p>
      </div>
      <div className="flex-1 pt-6 min-h-0">
        {children}
      </div>
    </div>
  );
}
