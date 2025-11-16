import initialState from "./data/initial-state";
import { GameEngine } from "../widgets/game-engine/game-engine";
import { GameLayout } from "../widgets/game-layout/game-layout";

const root = document.getElementById("app");

if (!root) {
  throw new Error("#app element not found");
}

const engine = new GameEngine(initialState);
const layout = new GameLayout(root);

layout.bind(engine);
layout.render(engine.getState());

engine.subscribe((state) => layout.render(state));
