import type { Metadata } from "next";
import Link from "next/link";

import { getPageForPath } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { CADASTRAL_STATE_IDS, CADASTRAL_STATES } from "@/components/map/cadastrals";
import { BASEMAPS, TOPO_OVERLAY } from "@/components/map/layers";

export const metadata: Metadata = {
  title: getPageForPath("/about").title,
  description: getPageForPath("/about").description,
};

export default function AboutPage() {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-start justify-center gap-8 px-6 py-10">
      <div className="grid gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">About</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {getPageForPath("/about").description}. Layers are streamed live from{" "}
          <a
            href="https://indianopenmaps.com/"
            target="_blank"
            rel="noreferrer noopener"
            className="underline underline-offset-2 hover:text-foreground"
          >
            indianopenmaps
          </a>{" "}
          — no downloads required.
        </p>
      </div>

      <div className="grid w-full gap-6 sm:grid-cols-2">
        <section className="grid gap-2">
          <h2 className="text-sm font-semibold">Basemap</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Switch between {Object.values(BASEMAPS).map((b) => b.label).join(" and ")}{" "}
            imagery under the overlays.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="text-sm font-semibold">Topographic overlay</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {TOPO_OVERLAY.label} — Survey of India Open Series 1:50k maps,
            georeferenced to align with the satellite base.
          </p>
        </section>

        <section className="grid gap-2 sm:col-span-2">
          <h2 className="text-sm font-semibold">Cadastral overlays</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Village-parcel boundaries rendered as vector data, grouped by state.
            Click any parcel to inspect its attributes (survey number, owner
            details, area, and more).
          </p>
          <ul className="mt-1 grid gap-1.5 sm:grid-cols-2">
            {CADASTRAL_STATE_IDS.map((id) => {
              const state = CADASTRAL_STATES[id];
              return (
                <li key={id} className="flex items-baseline gap-2 text-sm">
                  <span className="w-28 shrink-0 font-medium">{state.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {state.sources.map((s) => s.provider).join(" · ")}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <Button asChild variant="outline">
        <Link href="/map">Open the map</Link>
      </Button>
    </div>
  );
}