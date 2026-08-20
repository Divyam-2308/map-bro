import type { Metadata } from "next";

import { getPageForPath } from "@/lib/nav";
import { CADASTRAL_STATE_IDS, CADASTRAL_STATES } from "@/components/map/cadastrals";

export const metadata: Metadata = {
  title: getPageForPath("/help").title,
  description: getPageForPath("/help").description,
};

export default function HelpPage() {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-start justify-center gap-8 px-6 py-10">
      <div className="grid gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Help</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Everything you can do on the map page.
        </p>
      </div>

      <div className="grid w-full gap-6">
        <section className="grid gap-2">
          <h2 className="text-sm font-semibold">Layers panel</h2>
          <ul className="grid gap-1.5 text-sm leading-relaxed text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Basemap</span> —
              pick Satellite or Street imagery.
            </li>
            <li>
              <span className="font-medium text-foreground">SOI 1:50k topo</span>{" "}
              — toggle and fade the Survey of India topo overlay.
            </li>
            <li>
              <span className="font-medium text-foreground">Cadastral</span> —
              enable village-parcel vectors and pick a state to view.
            </li>
          </ul>
        </section>

        <section className="grid gap-2">
          <h2 className="text-sm font-semibold">Cadastral states</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {CADASTRAL_STATE_IDS.length} states are available:
          </p>
          <ul className="grid gap-1 text-sm">
            {CADASTRAL_STATE_IDS.map((id) => (
              <li key={id} className="flex items-baseline gap-2">
                <span className="w-28 shrink-0 font-medium">
                  {CADASTRAL_STATES[id].name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {CADASTRAL_STATES[id].coverage}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-2">
          <h2 className="text-sm font-semibold">Tips</h2>
          <ul className="grid gap-1.5 text-sm leading-relaxed text-muted-foreground">
            <li>
              Zoom in to around z13–z17 to see cadastral parcels and labels.
            </li>
            <li>Click any parcel to view its survey number, owner and area details.</li>
            <li>
              Parcels stream in on demand as you pan — coverage varies by state
              and provider.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}