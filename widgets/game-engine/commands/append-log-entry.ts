import type { GameCommand, GameState } from "../state";
import { pushLogEntry } from "../state";

export class AppendLogEntryCommand implements GameCommand {
  public readonly type = "append-log";

  constructor(private readonly entryType: string, private readonly body: string) {}

  execute(state: GameState): GameState {
    pushLogEntry(state, this.entryType, this.body);
    return state;
  }
}
