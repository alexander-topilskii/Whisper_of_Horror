import type { GameCommand, GameState, GameStateListener } from "./state";
import { cloneState } from "./state";

export class GameEngine {
  private readonly initialState: GameState;
  private state: GameState;
  private readonly listeners = new Set<GameStateListener>();
  private readonly history: GameCommand[] = [];

  constructor(initialState: GameState) {
    this.initialState = cloneState(initialState);
    this.state = cloneState(initialState);
  }

  public getState(): GameState {
    return cloneState(this.state);
  }

  public getInitialStateSnapshot(): GameState {
    return cloneState(this.initialState);
  }

  public subscribe(listener: GameStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public dispatch(command: GameCommand): void {
    const workingState = cloneState(this.state);
    const nextState = command.execute(workingState);
    this.state = nextState;
    this.history.push(command);
    this.emit();
  }

  private emit() {
    const snapshot = cloneState(this.state);
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
