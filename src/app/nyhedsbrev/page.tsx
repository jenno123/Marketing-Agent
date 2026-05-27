import { NewsletterGenerator } from "@/components/newsletter-generator";

export default function NyhedsbrevPage() {
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-stone-800">Nyhedsbrev</h1>
        <p className="text-sm text-stone-500 mt-1">
          Generer HTML-sektioner til HeyLoyalty · Hjerl Hede Frilandsmuseum
        </p>
      </div>
      <NewsletterGenerator />
    </div>
  );
}
