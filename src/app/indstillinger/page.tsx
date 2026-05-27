import { ApiKeySettings } from "@/components/api-key-settings";

export default function IndstillingerPage() {
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-stone-800">Indstillinger</h1>
        <p className="text-sm text-stone-500 mt-1">
          Global konfiguration for Push.ai
        </p>
      </div>
      <ApiKeySettings />
    </div>
  );
}
