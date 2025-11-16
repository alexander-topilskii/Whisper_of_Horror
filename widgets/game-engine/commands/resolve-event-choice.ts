import type { GameCommand, GameState } from "../state";
import { pushLogEntry } from "../state";
import { applyEventChoiceEffects } from "../effects/event-choice-effects";

export class ResolveEventChoiceCommand implements GameCommand {
  public readonly type = "resolve-event-choice";

  constructor(private readonly choiceId: string) {}

  execute(state: GameState): GameState {
    const choice = state.event.choices.find((item) => item.id === this.choiceId);
    if (!choice) {
      pushLogEntry(state, "[Система]", "Выбор события не найден.");
      return state;
    }

    if (choice.resolved) {
      pushLogEntry(state, choice.effects?.logType ?? "[Событие]", "Эта развилка уже завершена.");
      return state;
    }

    choice.resolved = true;

    const logType = applyEventChoiceEffects(state, choice.effects);
    pushLogEntry(state, logType, choice.result);
    return state;
  }
}
