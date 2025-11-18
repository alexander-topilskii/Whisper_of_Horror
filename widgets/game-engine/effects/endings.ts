import type { GameState, ScenarioEndingState } from "../state";
import { pushLogEntry } from "../state";

export type ScenarioEndingKey = "health_depleted" | "sanity_depleted" | "doom_reached";

const FALLBACK_ENDINGS: Record<ScenarioEndingKey, ScenarioEndingState> = {
  health_depleted: {
    id: "health_depleted",
    title: "Поражение: тело не выдержало",
    text: "Ваше тело сдаётся, и расследование прекращается.",
  },
  sanity_depleted: {
    id: "sanity_depleted",
    title: "Поражение: разум разрушен",
    text: "Вы больше не отличаете себя от шёпота тумана.",
  },
  doom_reached: {
    id: "doom_reached",
    title: "Поражение: ужаса слишком много",
    text: "Туман поглощает Старый район, партия завершается.",
  },
};

function resolveEnding(state: GameState, endingId: ScenarioEndingKey): boolean {
  if (state.gameOutcome) {
    return false;
  }

  const ending = state.scenario?.endings?.[endingId] ?? FALLBACK_ENDINGS[endingId];
  state.gameOutcome = "defeat";
  state.loopStage = "finished";
  state.phase.icon = "☠️";
  state.phase.name = ending.title;
  state.phase.subtitle = "Исход расследования";
  state.turn.actions.remaining = 0;
  state.ending = ending;
  pushLogEntry(state, "[Финал]", ending.text, "story");
  return true;
}

export function checkStatEndings(state: GameState): boolean {
  if (state.gameOutcome) {
    return state.gameOutcome === "defeat";
  }

  const health = state.characterStats.find((stat) => stat.id === "health");
  if (health && health.value <= 0) {
    return resolveEnding(state, "health_depleted");
  }

  const sanity = state.characterStats.find((stat) => stat.id === "sanity");
  if (sanity && sanity.value <= 0) {
    return resolveEnding(state, "sanity_depleted");
  }

  return false;
}

export function checkDoomEnding(state: GameState): boolean {
  if (state.gameOutcome) {
    return state.gameOutcome === "defeat";
  }

  const doom = state.worldTracks.find((track) => track.id === "doom");
  if (!doom || doom.max <= 0) {
    return false;
  }

  if (doom.value >= doom.max) {
    return resolveEnding(state, "doom_reached");
  }

  return false;
}
