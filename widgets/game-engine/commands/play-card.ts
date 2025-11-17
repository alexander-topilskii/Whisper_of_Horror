import type { GameCommand, GameState, LogEntryVariant, PlayerCardEffect, StatusEffect } from "../state";
import { pushLogEntry } from "../state";
import {
  adjustActions,
  applyEventChoiceEffects,
  adjustTrack,
  applyStatDeltas,
} from "../effects/event-choice-effects";
import { syncPlayerDeckCounters } from "../effects/turn-cycle";
import type { CardDefinition } from "../state";

type UseCounterKey = "successCount" | "failCount";

type CardBehavior = {
  onSuccess?: (state: GameState, card: CardDefinition) => string | null;
  onFailure?: (state: GameState, card: CardDefinition) => string | null;
};

function adjustStat(state: GameState, statId: string, delta: number): void {
  applyStatDeltas(state, [{ statId, delta }]);
}

function isPlayerCardEffect(effect: CardDefinition["effect"]): effect is PlayerCardEffect {
  return typeof effect === "object" && effect !== null;
}

function getNumericEffectValue(card: CardDefinition): number | null {
  return typeof card.effect === "number" ? card.effect : null;
}

function removeStatusById(state: GameState, statusId: string): StatusEffect | null {
  const index = state.statuses.findIndex((status) => status.id === statusId);
  if (index === -1) {
    return null;
  }

  const [removed] = state.statuses.splice(index, 1);
  return removed ?? null;
}

function removeFirstNegativeStatus(state: GameState): StatusEffect | null {
  const index = state.statuses.findIndex((status) => status.tone === "negative");
  if (index === -1) {
    return null;
  }

  const [removed] = state.statuses.splice(index, 1);
  return removed ?? null;
}

const CARD_BEHAVIORS: Record<string, CardBehavior> = {
  Исследование: {
    onSuccess: (state, card) => {
      const effectValue = getNumericEffectValue(card);
      if (effectValue === null) {
        return null;
      }

      adjustTrack(state, "victory", effectValue);
      return "[Улика]";
    },
  },
  Лечение: {
    onSuccess: (state, card) => {
      const healAmount = getNumericEffectValue(card) ?? 1;
      adjustStat(state, "health", healAmount);
      return "[Здоровье]";
    },
    onFailure: (state) => {
      adjustStat(state, "sanity", -1);
      return "[Рассудок]";
    },
  },
  Терапия: {
    onSuccess: (state, card) => {
      const calmAmount = getNumericEffectValue(card) ?? 1;
      adjustStat(state, "sanity", calmAmount);
      return "[Рассудок]";
    },
    onFailure: (state) => {
      adjustStat(state, "health", -1);
      return "[Здоровье]";
    },
  },
  Поддержка: {
    onSuccess: (state, card) => {
      const relief = Math.abs(getNumericEffectValue(card) ?? 1);
      adjustTrack(state, "doom", -relief);
      return "[Поддержка]";
    },
    onFailure: (state) => {
      adjustStat(state, "sanity", -1);
      return "[Рассудок]";
    },
  },
};

export class PlayCardCommand implements GameCommand {
  public readonly type = "play-card";

  constructor(private readonly cardId: string) {}

  execute(state: GameState): GameState {
    if (state.loopStage !== "player" || state.gameOutcome) {
      pushLogEntry(state, "[Система]", "Сейчас нельзя играть карты.", "system");
      return state;
    }

    const cardIndex = state.hand.findIndex((card) => card.id === this.cardId);
    if (cardIndex === -1) {
      pushLogEntry(state, "[Система]", "Карты уже нет на руке.", "system");
      return state;
    }

    const card = state.hand[cardIndex];
    if (!card.playable) {
      pushLogEntry(state, "[Действие]", `Карта «${card.name}» пока заблокирована.`, "player");
      return state;
    }

    const actionCost = card.actionCost ?? 1;
    if (state.turn.actions.remaining < actionCost) {
      pushLogEntry(state, "[Действие]", "Недостаточно очков действия для розыгрыша карты.", "player");
      return state;
    }

    state.hand.splice(cardIndex, 1);
    adjustActions(state, -actionCost);

    const isSuccess = this.rollForCard(card);
    let logType: string = isSuccess ? "[Действие]" : "[Провал]";
    let logVariant: LogEntryVariant = "player";

    const behavior = card.type ? CARD_BEHAVIORS[card.type] : undefined;
    if (isSuccess) {
      const typeLog = behavior?.onSuccess?.(state, card) ?? null;
      if (typeLog) {
        logType = typeLog;
        logVariant = "effect";
      }

      this.applyPlayerCardEffect(state, card);

      if (card.effects) {
        const { type, variant } = applyEventChoiceEffects(state, card.effects);
        logType = type;
        logVariant = variant ?? "story";
      }
    } else if (behavior?.onFailure) {
      const failureLog = behavior.onFailure(state, card);
      if (failureLog) {
        logType = failureLog;
        logVariant = "effect";
      }
    }

    const narrative = isSuccess
      ? card.successText ?? `Карта «${card.name}» приносит пользу.`
      : card.failText ?? `Карта «${card.name}» не срабатывает.`;
    const emoji = isSuccess ? '✅' : '❌';
    const baseBody = `Карта «${card.name}». ${narrative}`;
    pushLogEntry(state, logType, `${baseBody} ${emoji}`, logVariant);

    const shouldRemove = this.shouldRemoveAfterUse(card, isSuccess ? "successCount" : "failCount");
    if (!shouldRemove) {
      state.decks.player.discardPile.push(card);
    } else {
      pushLogEntry(state, "[Колода]", `Карта «${card.name}» исчезает из вашей колоды.`, "system");
    }

    syncPlayerDeckCounters(state);
    return state;
  }

  private rollForCard(card: CardDefinition): boolean {
    const chance = typeof card.chance === "number" ? Math.max(0, Math.min(1, card.chance)) : 1;
    if (chance >= 1) {
      return true;
    }

    return Math.random() <= chance;
  }

  private shouldRemoveAfterUse(card: CardDefinition, key: UseCounterKey): boolean {
    const currentValue = card[key];
    if (currentValue === undefined || currentValue === null || currentValue === 0) {
      return false;
    }

    const nextValue = currentValue - 1;
    card[key] = nextValue;
    return nextValue <= 0;
  }

  private applyPlayerCardEffect(state: GameState, card: CardDefinition): void {
    if (!isPlayerCardEffect(card.effect)) {
      return;
    }

    const effect = card.effect;

    if (typeof effect.sanityRestore === "number" && effect.sanityRestore !== 0) {
      adjustStat(state, "sanity", effect.sanityRestore);
      pushLogEntry(
        state,
        "[Рассудок]",
        `«${card.name}» возвращает ${effect.sanityRestore} ед. рассудка.`,
        "effect",
      );
    }

    if (typeof effect.woundRestore === "number" && effect.woundRestore !== 0) {
      adjustStat(state, "health", effect.woundRestore);
      pushLogEntry(
        state,
        "[Здоровье]",
        `«${card.name}» залечивает ${effect.woundRestore} урона.`,
        "effect",
      );
      const removedWound = removeStatusById(state, "wounded");
      if (removedWound) {
        pushLogEntry(state, "[Состояние]", `Статус «${removedWound.name}» снят.`, "effect");
      }
    }

    if (effect.removeNegativeStatus) {
      const removedStatus = removeFirstNegativeStatus(state);
      if (removedStatus) {
        pushLogEntry(
          state,
          "[Состояние]",
          `«${card.name}» избавляет от состояния «${removedStatus.name}».`,
          "effect",
        );
      } else {
        pushLogEntry(state, "[Состояние]", "Негативных статусов не осталось.", "effect");
      }
    }

    const modifierValue = effect.modifier?.reduceSanityLoss ?? 0;
    if (modifierValue > 0) {
      const duration = Math.max(1, effect.duration ?? 1);
      const modifierId = `card-mod-${card.id}-${Date.now().toString(36)}`;
      state.modifiers.push({
        id: modifierId,
        sourceCardId: card.id,
        label: card.name ?? card.id,
        remainingTurns: duration,
        reduceSanityLoss: modifierValue,
      });
      pushLogEntry(
        state,
        "[Эффект]",
        `«${card.name}» укрепляет волю: потери рассудка уменьшаются на ${modifierValue} ещё ${duration} хода(ов).`,
        "effect",
      );
    }
  }
}
