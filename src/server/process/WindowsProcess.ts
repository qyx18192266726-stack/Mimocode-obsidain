import { ChildProcess, spawn, SpawnOptions } from "child_process";
import { MiMoCodeProcess } from "./MiMoCodeProcess";

export class WindowsProcess implements MiMoCodeProcess {
  private static currentProcess: ChildProcess | null = null;
  private static cleanupHandlerRegistered = false;

  start(
    command: string,
    args: string[],
    options: SpawnOptions
  ): ChildProcess {
    const process = spawn(command, args, {
      ...options,
      shell: true,
      windowsHide: true,
    });

    WindowsProcess.currentProcess = process;
    WindowsProcess.registerCleanupHandler();

    return process;
  }

  async stop(process: ChildProcess): Promise<void> {
    const pid = process.pid;
    if (!pid) {
      WindowsProcess.currentProcess = null;
      return;
    }

    console.log("[MiMoCode] Stopping server process tree, PID:", pid);

    try {
      const { execSync } = require("child_process");
      const output = execSync(
        `powershell -Command "Get-CimInstance Win32_Process -Filter \\"ParentProcessId=${pid}\\" | Select-Object ProcessId"`,
        { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
      );

      const lines = output.split("\n").slice(3);
      for (const line of lines) {
        const childPid = line.trim();
        if (childPid && !isNaN(parseInt(childPid))) {
          try {
            execSync(`taskkill /F /PID ${childPid}`, { stdio: "ignore" });
          } catch {
            // Child may already be gone
          }
        }
      }
    } catch {
      // PowerShell lookup failed
    }

    try {
      await this.execAsync(`taskkill /F /PID ${pid}`);
    } catch {
      // Parent may already be gone
    }

    WindowsProcess.currentProcess = null;
    await this.waitForExit(process, 5000);
  }

  private static registerCleanupHandler(): void {
    if (WindowsProcess.cleanupHandlerRegistered) {
      return;
    }

    if (typeof window !== "undefined" && !process.env.CI) {
      window.addEventListener("beforeunload", () => {
        if (WindowsProcess.currentProcess?.pid) {
          WindowsProcess.killProcessSync(WindowsProcess.currentProcess.pid);
        }
      });
      WindowsProcess.cleanupHandlerRegistered = true;
    }
  }

  private static killProcessSync(pid: number): void {
    try {
      const { execSync } = require("child_process");

      try {
        const output = execSync(
          `powershell -Command "Get-CimInstance Win32_Process -Filter \\"ParentProcessId=${pid}\\" | Select-Object ProcessId"`,
          { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
        );

        const lines = output.split("\n").slice(3);
        for (const line of lines) {
          const childPid = line.trim();
          if (childPid && !isNaN(parseInt(childPid))) {
            try {
              execSync(`taskkill /F /PID ${childPid}`, { stdio: "ignore" });
            } catch {
              // Child may already be gone
            }
          }
        }
      } catch {
        // PowerShell lookup failed
      }

      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
      } catch {
        // Parent may already be gone
      }
    } catch {
      // Process may already be gone
    }
  }

  async verifyCommand(command: string): Promise<string | null> {
    try {
      await this.execAsync(`where "${command}"`);
      return null;
    } catch {
      return `Executable not found at '${command}'. Check Settings → MiMo Code path, or click "Autodetect"`;
    }
  }

  private async waitForExit(
    process: ChildProcess,
    timeoutMs: number
  ): Promise<void> {
    if (process.exitCode !== null || process.signalCode !== null) {
      return;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        cleanup();
        resolve();
      }, timeoutMs);

      const onExit = () => {
        cleanup();
        resolve();
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

  private execAsync(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const { exec } = require("child_process");
      exec(command, (error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}
