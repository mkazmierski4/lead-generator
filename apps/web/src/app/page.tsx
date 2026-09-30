import { getApiHealth } from "@/lib/api";

export default async function Home() {
  const health = await getApiHealth();
  const apiUp = health?.status === "ok";

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Lead Generation</h1>
      <p className="max-w-md text-neutral-600">
        Fundament projektu jest gotowy. Dashboard leadów, kampanii i wysyłek
        powstanie w kolejnym etapie.
      </p>
      <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm shadow-sm">
        <span
          className={`h-2.5 w-2.5 rounded-full ${apiUp ? "bg-emerald-500" : "bg-red-500"}`}
          aria-hidden
        />
        <span>{apiUp ? "Połączono z API" : "Brak połączenia z API"}</span>
      </div>
    </main>
  );
}
