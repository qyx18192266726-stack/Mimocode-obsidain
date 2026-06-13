import { ChildProcess, SpawnOptions } from "child_process";

export interface MiMoCodeProcess {
  start(
    command: string,
    args: string[],
    options: SpawnOptions
  ): ChildProcess;

  stop(process: ChildProcess): Promise<void>;

  verifyCommand(command: string): Promise<string | null>;
}
