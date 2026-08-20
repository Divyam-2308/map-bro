"use client";

import { CheckIcon, ChevronDownIcon, LayersIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { BASEMAPS, TOPO_OVERLAY, type BasemapId } from "@/components/map/layers";
import {
  CADASTRAL_STATES,
  CADASTRAL_STATE_IDS,
  type CadastralStateId,
} from "@/components/map/cadastrals";

export interface MapControlsProps {
  basemap: BasemapId;
  onBasemapChange: (basemap: BasemapId) => void;
  overlayVisible: boolean;
  onOverlayVisibleChange: (visible: boolean) => void;
  overlayOpacity: number;
  onOverlayOpacityChange: (opacity: number) => void;
  cadastralStates: CadastralStateId[];
  onCadastralStatesChange: (states: CadastralStateId[]) => void;
  cadastralVisible: boolean;
  onCadastralVisibleChange: (visible: boolean) => void;
  cadastralOpacity: number;
  onCadastralOpacityChange: (opacity: number) => void;
}

export function MapControls({
  basemap,
  onBasemapChange,
  overlayVisible,
  onOverlayVisibleChange,
  overlayOpacity,
  onOverlayOpacityChange,
  cadastralStates,
  onCadastralStatesChange,
  cadastralVisible,
  onCadastralVisibleChange,
  cadastralOpacity,
  onCadastralOpacityChange,
}: MapControlsProps) {
  const activeLayers = [overlayVisible, cadastralVisible].filter(Boolean).length;

  const toggleState = (id: CadastralStateId) => {
    onCadastralStatesChange(
      cadastralStates.includes(id)
        ? cadastralStates.filter((s) => s !== id)
        : [...cadastralStates, id],
    );
  };

  return (
    <Collapsible
      defaultOpen
      className="absolute right-3 top-3 z-[1100] w-64 overflow-hidden rounded-2xl border bg-background/85 shadow-xl shadow-black/10 backdrop-blur-md supports-[backdrop-filter]:bg-background/70"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="group flex w-full items-center gap-3 rounded-t-2xl px-3.5 py-3 text-left hover:bg-accent/60"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
            <LayersIcon className="size-4" />
          </span>
          <span className="flex-1 text-sm font-semibold tracking-tight">
            Layers
          </span>
          <span className="flex items-center gap-1.5">
            {activeLayers > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary tabular-nums">
                {activeLayers}
              </span>
            )}
            <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <Separator />
        <div className="grid gap-5 p-4">
          <div className="grid gap-2.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Basemap
            </Label>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/70 p-1">
              {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onBasemapChange(id)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all",
                    basemap === id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {basemap === id && <CheckIcon className="size-3" />}
                  {BASEMAPS[id].label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <Label
                htmlFor="topo-overlay"
                className="flex flex-col gap-0.5 text-xs font-medium"
              >
                {TOPO_OVERLAY.label}
                <span className="font-normal text-muted-foreground">
                  Georeferenced overlay
                </span>
              </Label>
              <Switch
                id="topo-overlay"
                checked={overlayVisible}
                onCheckedChange={onOverlayVisibleChange}
                aria-label={`Toggle ${TOPO_OVERLAY.label} overlay`}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="topo-opacity"
                  className="text-xs text-muted-foreground"
                >
                  Opacity
                </Label>
                <span className="text-xs tabular-nums">
                  {Math.round(overlayOpacity * 100)}%
                </span>
              </div>
              <Slider
                id="topo-opacity"
                min={0}
                max={100}
                step={1}
                value={[Math.round(overlayOpacity * 100)]}
                onValueChange={([value]) =>
                  onOverlayOpacityChange((value ?? 0) / 100)
                }
                disabled={!overlayVisible}
                aria-label="Overlay opacity"
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <Label
                htmlFor="cadastral-overlay"
                className="flex flex-col gap-0.5 text-xs font-medium"
              >
                Cadastral
                <span className="font-normal text-muted-foreground">
                  Village parcels (vector)
                </span>
              </Label>
              <Switch
                id="cadastral-overlay"
                checked={cadastralVisible}
                onCheckedChange={onCadastralVisibleChange}
                aria-label="Toggle cadastral overlay"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
                    "hover:bg-accent/60 data-[state=open]:bg-accent/60",
                    !cadastralVisible && "opacity-50"
                  )}
                >
                  <span className="flex flex-col items-start gap-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-blue-500" />
                      {cadastralStates.length === 0
                        ? "No state selected"
                        : cadastralStates.length === 1
                          ? CADASTRAL_STATES[cadastralStates[0]].name
                          : `${cadastralStates.length} states`}
                    </span>
                    <span className="text-[10px] font-normal text-muted-foreground">
                      {cadastralStates.length === 0
                        ? "Choose one or more states"
                        : cadastralStates.length === 1
                          ? CADASTRAL_STATES[cadastralStates[0]].coverage
                          : cadastralStates
                              .map((id) => CADASTRAL_STATES[id].name)
                              .slice(0, 3)
                              .join(", ") +
                            (cadastralStates.length > 3 ? "…" : "")}
                    </span>
                  </span>
                  <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-y-auto">
                <DropdownMenuLabel className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  States
                  <span className="flex items-center gap-2 font-normal normal-case tracking-normal">
                    <button
                      type="button"
                      onClick={() => onCadastralStatesChange(CADASTRAL_STATE_IDS)}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => onCadastralStatesChange([])}
                      className="text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Clear
                    </button>
                    <span className="tabular-nums text-muted-foreground">
                      {cadastralStates.length}/{CADASTRAL_STATE_IDS.length}
                    </span>
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {CADASTRAL_STATE_IDS.map((id) => {
                  const state = CADASTRAL_STATES[id];
                  const selected = cadastralStates.includes(id);
                  return (
                    <DropdownMenuItem
                      key={id}
                      onSelect={(event) => {
                        event.preventDefault();
                        toggleState(id);
                      }}
                      className="flex items-start gap-2"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-sm border",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        )}
                      >
                        {selected && <CheckIcon className="size-3" />}
                      </span>
                      <span className="flex flex-col items-start gap-0.5">
                        <span>{state.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {state.coverage}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="cadastral-opacity"
                  className="text-xs text-muted-foreground"
                >
                  Opacity
                </Label>
                <span className="text-xs tabular-nums">
                  {Math.round(cadastralOpacity * 100)}%
                </span>
              </div>
              <Slider
                id="cadastral-opacity"
                min={0}
                max={100}
                step={1}
                value={[Math.round(cadastralOpacity * 100)]}
                onValueChange={([value]) =>
                  onCadastralOpacityChange((value ?? 0) / 100)
                }
                disabled={!cadastralVisible}
                aria-label="Cadastral overlay opacity"
              />
            </div>
          </div>
        </div>

        <Separator />
        <div className="bg-muted/30 px-4 py-2.5">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            {TOPO_OVERLAY.label} ·{" "}
            <a
              href="https://indianopenmaps.com/"
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-2 hover:text-foreground"
            >
              indianopenmaps
            </a>
            {cadastralVisible && cadastralStates.length > 0 && (
              <>
                {" "}· Cadastral{" "}
                <a
                  href={CADASTRAL_STATES[cadastralStates[0]].sources[0]?.sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  {cadastralStates
                    .map((id) => CADASTRAL_STATES[id].name)
                    .join(", ")}
                </a>
              </>
            )}
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}