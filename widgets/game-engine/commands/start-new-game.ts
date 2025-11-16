import type { GameCommand, GameState } from "../state";
import { cloneState, pushLogEntry } from "../state";

export class StartNewGameCommand implements GameCommand {
  public readonly type = "start-new-game";
  public readonly description = "Сброс состояния к начальному снимку";

  constructor(private readonly snapshot: GameState) {}

  execute(_: GameState): GameState {
    const nextState = cloneState(this.snapshot);
    nextState.turn.number = 1;
    nextState.turn.actions.remaining = nextState.turn.actions.total;
    pushLogEntry(nextState, "[Система]", "Начата новая партия. Следопыты делают первый вдох.");
    return nextState;
  }
}
