import characterSettings from "./character-settings.json";
import eventCard from "./event-card.json";
import handCards from "./hand-cards.json";
import worldSettings from "./world-settings.json";
import type { GameState } from "../../widgets/game-engine/game-engine";

const initialState = {
  ...worldSettings,
  ...characterSettings,
  ...handCards,
  ...eventCard
} as GameState;

export default initialState;
