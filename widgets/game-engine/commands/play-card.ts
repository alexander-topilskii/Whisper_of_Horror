import type { GameCommand, GameState } from "../state";
import { clamp, pushLogEntry } from "../state";
import { adjustActions } from "../effects/event-choice-effects";

export class PlayCardCommand implements GameCommand {
  public readonly type = "play-card";

  constructor(private readonly cardId: string) {}

  execute(state: GameState): GameState {
    const cardIndex = state.hand.findIndex((card) => card.id === this.cardId);
    if (cardIndex === -1) {
      pushLogEntry(state, "[Система]", "Карты уже нет на руке.");
      return state;
    }

    const card = state.hand[cardIndex];
    if (!card.playable) {
      pushLogEntry(state, "[Действие]", `Карта «${card.name}» пока заблокирована.`);
      return state;
    }

    const actionCost = card.actionCost ?? 1;
    if (state.turn.actions.remaining < actionCost) {
      pushLogEntry(state, "[Действие]", "Недостаточно очков действия для розыгрыша карты.");
      return state;
    }

    state.hand.splice(cardIndex, 1);
    adjustActions(state, -actionCost);

    if (state.decks.player.draw > 0) {
      state.decks.player.draw = clamp(state.decks.player.draw - 1, 0, Number.MAX_SAFE_INTEGER);
    }
    state.decks.player.discard += 1;

    pushLogEntry(state, "[Действие]", `Сыграна карта «${card.name}». ${card.description}`);
    return state;
  }
}
