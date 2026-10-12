"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LocateFixed } from "lucide-react";

export function NearbyJewelers({ active }: { active: boolean }) {
  const router = useRouter(), params = useSearchParams();
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  function locate() {
    setError("");
    if (active) { const next = new URLSearchParams(params.toString()); next.delete("lat"); next.delete("lng"); next.delete("radius"); router.push(`/jewelers?${next}`); return; }
    if (!navigator.geolocation) { setError("Location is unavailable. Choose a city instead."); return; }
    setPending(true);
    navigator.geolocation.getCurrentPosition(position => {
      const next = new URLSearchParams(params.toString());
      next.set("lat", position.coords.latitude.toFixed(5)); next.set("lng", position.coords.longitude.toFixed(5)); next.set("radius", "50"); next.delete("city"); next.delete("country");
      setPending(false); router.push(`/jewelers?${next}`);
    }, () => { setPending(false); setError("Could not access your location. Allow location access or choose a city."); }, { timeout: 10000, maximumAge: 300000 });
  }
  return <div className="text-xs"><button type="button" onClick={locate} disabled={pending} aria-pressed={active} className="inline-flex min-h-10 items-center gap-2 rounded border border-line bg-porcelain px-3 text-ink disabled:opacity-60"><LocateFixed size={15} />{pending ? "Finding location…" : active ? "Clear nearby search" : "Near me"}</button>{error && <p role="alert" className="mt-2 max-w-64 text-rosewood">{error}</p>}</div>;
}
