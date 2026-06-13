import { ChildProcess, spawn, SpawnOptions } from "child_process";
import { existsSync } from "fs";
import { MiMoCodeProcess } from "./MiMoCodeProcess";

export class PosixProcess implements MiMoCodeProcess {
  start(
    command: string,
    args: string[],
    options: SpawnOptions
  ): ChildProcess {
    return spawn(command, args, {
      ...options,
      detached: true,
    });
  }

  async stop(process: ChildProcess): Promise<void> {
    const pid = process.pid;
    if (!pid) {
      return;
    }

    console.log("[MiMoCode] Stopping server process tree, PID:", pid);

    await this.killProcessGroup(pid, "SIGTERM");
    const gracefulExited = await this.waitForExit(process, 2000);

    if (gracefulExited) {
      console.log("[MiMoCode] Server stopped gracefully");
      return;
    }

    console.log("[MiMoCode] Process didn't exit gracefully, sending SIGKILL");

    await this.killProcessGroup(pid, "SIGKILL");
    const forceExited = await this.waitForExit(process, 3000);

    if (forceExited) {
      console.log("[MiMoCode] Server stopped with SIGKILL");
    } else {
      console.error("[MiMoCode] Failed to stop server within timeout");
    }
  }

  async verifyCommand(command: string): Promise<string | null> {
    if (command.startsWith("/") || command.startsWith("./")) {
      const fs = require("fs");
      try {
        fs.accessSync(command, fs.constants.X_OK);
        return null;
      } catch (err: any) {
        if (existsSync(command)) {
          return `'${command}' exists but is not executable. Run: chmod +x ${command}`;
        }
        return `Executable not found at '${command}'. Check Settings → MiMo Code path, or click "Autodetect"`;
      }
    }
    return null;
  }

  private async killProcessGroup(
    pid: number,
    signal: "SIGTERM" | "SIGKILL"
  ): Promise<void> {
    try {
      process.kill(-pid, signal);
    } catch (error) {
      console.log(`[MiMoCode] Signal ${signal} failed (process may already be gone)`);
    }
  }

  private async waitForExit(
    process: ChildProcess,
    timeoutMs: number
  ): Promise<boolean> {
    if (process.exitCode !== null || process.signalCode !== null) {
      return true;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        cleanup();
        resolve(false);
      }, timeoutMs);

      const onExit = () => {
        cleanup();
        resolve(true);
      };

      const cleanup = () => {
        clearTimeout(timeout);
        process.off("exit", onExit);
        process.off("error", onExit);
      };

      process.once("exit", onExit);
      process.once("error", onExit);
    });
  }
}
