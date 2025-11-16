import characterSettings from "./character-settings.json";
import eventCard from "./event-card.json";
import handCards from "./hand-cards.json";
import scenario from "./scenario.json";
import worldSettings from "./world-settings.json";
import type { GameState } from "../../widgets/game-engine/state";

const initialState = {
  ...worldSettings,
  ...characterSettings,
  ...handCards,
  ...eventCard,
  ...scenario,
} as GameState;

const firstTask = initialState.scenario?.firstTask;
const goal = firstTask?.technicalGoal;
const fail = firstTask?.technicalFailCondition;

initialState.worldTracks = [
  {
    id: "victory",
    label: goal?.label ?? "Улики",
    value: goal?.currentAmount ?? 0,
    max: goal?.requiredAmount ?? 0,
    type: "victory",
    criticalThreshold: goal?.requiredAmount ?? undefined,
  },
  {
    id: "doom",
    label: fail?.label ?? "Ужас",
    value: fail?.currentAmount ?? 0,
    max: fail?.requiredAmount ?? 0,
    type: "doom",
    criticalThreshold: fail?.requiredAmount ?? undefined,
  },
];

export default initialState;
