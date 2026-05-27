import { UsageDashboard } from "@/components/usage-dashboard";

export default function ForbrugPage() {
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-stone-800">Forbrug</h1>
        <p className="text-sm text-stone-500 mt-1">
          Overblik over API-forbrug og estimerede omkostninger
        </p>
      </div>
      <UsageDashboard />
    </div>
  );
}
