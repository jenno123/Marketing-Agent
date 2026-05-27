import { InspirationManager } from "@/components/inspiration-manager";

export default function NyhedsbrevInspirationPage() {
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-stone-800">Nyhedsbrev — Inspiration</h1>
        <p className="text-sm text-stone-500 mt-1">
          Agenten lærer tone, stil og opbygning fra disse eksempler.
        </p>
      </div>
      <InspirationManager platform="nyhedsbrev" label="nyhedsbrev" />
    </div>
  );
}
