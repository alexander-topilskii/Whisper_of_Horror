export interface ActionPoolState {
  remaining: number;
  total: number;
}

export interface TurnState {
  number: number;
  actions: ActionPoolState;
}

export interface PlayerDeckState {
  draw: number;
  discard: number;
}

export interface EventDeckState {
  draw: number;
  discard: number;
  next: string | null;
}

export interface DeckCollectionState {
  player: PlayerDeckState;
  event: EventDeckState;
}

export interface CardDefinition {
  id: string;
  name: string;
  description: string;
  costs: string[];
  actionCost?: number;
  tooltip?: string;
  playable: boolean;
}

export interface StatusEffect {
  id: string;
  name: string;
  description: string;
  tone: "positive" | "negative" | "neutral";
}

export interface NpcTimerState {
  current: number;
  max: number;
}

export interface NpcDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  tooltip: string;
  timer: NpcTimerState;
}

export interface TrackState {
  id: string;
  label: string;
  value: number;
  max: number;
  type: "victory" | "doom" | "generic";
  criticalThreshold?: number;
}

export interface CharacterStatState {
  id: string;
  label: string;
  value: number;
  max: number;
  criticalThreshold?: number;
}

export interface StatDelta {
  statId: string;
  delta: number;
}

export interface EventChoiceEffect {
  logType?: string;
  doomDelta?: number;
  victoryDelta?: number;
  statDeltas?: StatDelta[];
  actionsDelta?: number;
  cluesGained?: number;
}

export interface EventChoiceState {
  id: string;
  label: string;
  result: string;
  resolved?: boolean;
  effects?: EventChoiceEffect;
}

export interface EventCardState {
  title: string;
  flavor: string;
  effect: string;
  type?: string;
  choices: EventChoiceState[];
}

export interface LogEntry {
  id: string;
  type: string;
  body: string;
}

export interface GameState {
  turn: TurnState;
  decks: DeckCollectionState;
  hand: CardDefinition[];
  phase: {
    icon: string;
    name: string;
    subtitle: string;
  };
  worldTracks: TrackState[];
  characterStats: CharacterStatState[];
  statuses: StatusEffect[];
  npcs: NpcDefinition[];
  event: EventCardState;
  log: LogEntry[];
  autoScrollLog: boolean;
  soundEnabled: boolean;
}

export interface GameCommand {
  readonly type: string;
  readonly description?: string;
  execute(state: GameState): GameState;
}

export type GameStateListener = (state: GameState) => void;

export function cloneState<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

const LOG_LIMIT = 20;

function generateLogId(): string {
  return `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function pushLogEntry(state: GameState, type: string, body: string) {
  const entry: LogEntry = {
    id: generateLogId(),
    type,
    body,
  };

  state.log = [entry, ...state.log].slice(0, LOG_LIMIT);
}
