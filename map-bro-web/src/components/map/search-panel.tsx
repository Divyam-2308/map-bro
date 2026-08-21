"use client";

import { useState, type FormEvent } from "react";
import { MapPinIcon, SearchIcon } from "lucide-react";

import {
  CADASTRAL_STATES,
  searchCadastralsBySurveyNumber,
  searchableCadastralStateIds,
  type CadastralSearchHit,
} from "@/components/map/cadastrals";

export interface CadastralSearchResult {
  stateId: CadastralSearchHit["stateId"];
  features: GeoJSON.Feature[];
}

export interface SearchPanelProps {
  onResult: (result: CadastralSearchResult) => void;
}

const SEARCHABLE_STATE_IDS = searchableCadastralStateIds();

type Status = "idle" | "loading" | "empty" | "error";

/**
 * Survey-number search: type a survey number and hit search. One match flies
 * straight to it; several matches (the same number can exist in many
 * villages/cities) render as a clickable list to pick from. Built with
 * daisyUI components per the project's UI, styled independently of the
 * shadcn-based `MapControls` panel it sits alongside.
 */
export function SearchPanel({ onResult }: SearchPanelProps) {
  const [surveyNumber, setSurveyNumber] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [hits, setHits] = useState<CadastralSearchHit[]>([]);

  if (SEARCHABLE_STATE_IDS.length === 0) return null;

  const canSearch = surveyNumber.trim() !== "" && status !== "loading";

  const selectHit = (hit: CadastralSearchHit) => {
    onResult({ stateId: hit.stateId, features: [hit.feature] });
    setHits([]);
    setStatus("idle");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSearch) return;

    setStatus("loading");
    setHits([]);
    try {
      const results = await searchCadastralsBySurveyNumber(surveyNumber);
      if (results.length === 0) {
        setStatus("empty");
        return;
      }
      if (results.length === 1) {
        selectHit(results[0]);
        return;
      }
      setHits(results);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="dy-card absolute left-3 top-3 z-[1100] w-72 bg-white/90 shadow-xl shadow-black/10 backdrop-blur-md">
      <form onSubmit={handleSubmit} className="dy-card-body gap-3 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-neutral-900">
          <SearchIcon className="size-4" />
          Find a survey number
        </h2>

        <div className="dy-join">
          <input
            type="text"
            placeholder="e.g. 45/2"
            className="dy-input dy-input-sm dy-join-item w-full"
            value={surveyNumber}
            onChange={(event) => {
              setSurveyNumber(event.target.value);
              setStatus("idle");
              setHits([]);
            }}
          />
          <button
            type="submit"
            className="dy-btn dy-btn-primary dy-btn-sm dy-join-item"
            disabled={!canSearch}
          >
            {status === "loading" ? (
              <span className="dy-loading dy-loading-spinner dy-loading-xs" />
            ) : (
              <SearchIcon className="size-3.5" />
            )}
          </button>
        </div>

        {status === "empty" && (
          <div className="dy-alert dy-alert-warning px-3 py-2 text-xs">
            No parcel matched that survey number.
          </div>
        )}
        {status === "error" && (
          <div className="dy-alert dy-alert-error px-3 py-2 text-xs">
            Search failed — try again.
          </div>
        )}

        {hits.length > 0 && (
          <div className="grid gap-1">
            <p className="text-[11px] font-medium text-neutral-500">
              {hits.length} matches — pick one
            </p>
            <ul className="dy-menu max-h-56 w-full flex-nowrap overflow-y-auto rounded-lg bg-neutral-100 p-1">
              {hits.map((hit, index) => (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => selectHit(hit)}
                    className="flex items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-white"
                  >
                    <MapPinIcon className="mt-0.5 size-3.5 shrink-0 text-neutral-400" />
                    <span>{hit.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[10px] leading-relaxed text-neutral-400">
          Live attribute search currently covers{" "}
          {SEARCHABLE_STATE_IDS.map((id) => CADASTRAL_STATES[id].name).join(
            ", ",
          )}
          . Other states only expose visual (non-searchable) parcel tiles.
        </p>
      </form>
    </div>
  );
}
