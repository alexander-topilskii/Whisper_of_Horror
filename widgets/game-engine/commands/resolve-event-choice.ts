import type { GameCommand, GameState } from "../state";
import { pushLogEntry } from "../state";
import { applyEventChoiceEffects } from "../effects/event-choice-effects";
import { completeEventPhase } from "../effects/turn-cycle";

export class ResolveEventChoiceCommand implements GameCommand {
  public readonly type = "resolve-event-choice";

  constructor(private readonly choiceId: string) {}

  execute(state: GameState): GameState {
    if (state.loopStage !== "event" || state.gameOutcome) {
      pushLogEntry(state, "[Событие]", "Сейчас не требуется выбирать развилку.");
      return state;
    }

    if (!state.eventResolutionPending) {
      pushLogEntry(state, "[Событие]", "Эффект уже завершён.");
      return state;
    }

    const choices = state.event.choices ?? [];
    const choice = choices.find((item) => item.id === this.choiceId);
    if (!choice) {
      pushLogEntry(state, "[Система]", "Выбор события не найден.");
      return state;
    }

    if (choice.resolved) {
      pushLogEntry(state, choice.effects?.logType ?? "[Событие]", "Эта развилка уже завершена.");
      return state;
    }

    choice.resolved = true;

    if (typeof choice.chance === "number") {
      const chance = Math.max(0, Math.min(1, choice.chance));
      const roll = Math.random();
      const success = roll < chance;
      choice.outcome = success ? "success" : "fail";

      const effects = success
        ? choice.successEffects ?? choice.effects
        : choice.failEffects ?? choice.effects;
      const fallbackResult = choice.result ?? (success ? "Испытание завершается успехом." : "Испытание провалено.");
      const narrative = success
        ? choice.successText ?? fallbackResult
        : choice.failText ?? fallbackResult;
      const logType = applyEventChoiceEffects(state, effects);
      const chanceSuffix = ` Шанс ${Math.round(chance * 100)}%, результат: ${success ? "успех" : "провал"}.`;
      pushLogEntry(state, logType, `${narrative}${chanceSuffix}`.trim());
    } else {
      const logType = applyEventChoiceEffects(state, choice.effects);
      pushLogEntry(state, logType, choice.result ?? "Эффект завершён.");
    }

    const unresolved = choices.some((item) => !item.resolved);
    state.eventResolutionPending = unresolved;
    if (!unresolved) {
      completeEventPhase(state);
    }
    return state;
  }
}
