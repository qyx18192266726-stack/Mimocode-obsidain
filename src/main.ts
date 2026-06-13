import { Plugin, WorkspaceLeaf, Notice, EventRef, MarkdownView } from "obsidian";
import { MiMoCodeSettings, DEFAULT_SETTINGS, MIMOCODE_VIEW_TYPE } from "./types";
import { MiMoCodeView } from "./ui/MiMoCodeView";
import { ViewManager } from "./ui/ViewManager";
import { MiMoCodeSettingTab } from "./settings/SettingsTab";
import { ServerManager, ServerState } from "./server/ServerManager";
import { registerMiMoCodeIcons, MIMOCODE_ICON_NAME } from "./icons";
import { MiMoCodeClient } from "./client/MiMoCodeClient";
import { ContextManager } from "./context/ContextManager";
import { ExecutableResolver } from "./server/ExecutableResolver";

export default class MiMoCodePlugin extends Plugin {
  settings: MiMoCodeSettings = DEFAULT_SETTINGS;
  private processManager: ServerManager;
  private stateChangeCallbacks: Array<(state: ServerState) => void> = [];
  private mimocodeClient: MiMoCodeClient;
  private contextManager: ContextManager;
  private viewManager: ViewManager;
  private cachedIframeUrl: string | null = null;
  private lastBaseUrl: string | null = null;

  async onload(): Promise<void> {
    console.log("Loading MiMo Code plugin");

    registerMiMoCodeIcons();

    await this.loadSettings();

    await this.attemptAutodetect();

    const projectDirectory = this.getProjectDirectory();

    this.processManager = new ServerManager(this.settings, projectDirectory);
    this.processManager.on("stateChange", (state: ServerState) => {
      this.notifyStateChange(state);
    });

    this.processManager.on("projectDirectoryChanged", async (newDirectory: string) => {
      this.settings.projectDirectory = newDirectory;
      await this.saveData(this.settings);
      this.refreshClientState();
      if (this.getServerState() === "running") {
        await this.stopServer();
        await this.startServer();
      }
    });

    this.mimocodeClient = new MiMoCodeClient(
      this.getApiBaseUrl(),
      this.getServerUrl(),
      projectDirectory
    );
    this.lastBaseUrl = this.getServerUrl();

    this.contextManager = new ContextManager({
      app: this.app,
      settings: this.settings,
      client: this.mimocodeClient,
      getServerState: () => this.getServerState(),
      getCachedIframeUrl: () => this.cachedIframeUrl,
      setCachedIframeUrl: (url) => {
        this.cachedIframeUrl = url;
      },
      registerEvent: (ref) => this.registerEvent(ref),
    });

    this.viewManager = new ViewManager({
      app: this.app,
      settings: this.settings,
      client: this.mimocodeClient,
      contextManager: this.contextManager,
      getCachedIframeUrl: () => this.cachedIframeUrl,
      setCachedIframeUrl: (url) => {
        this.cachedIframeUrl = url;
      },
      getServerState: () => this.getServerState(),
    });

    console.log(
      "[MiMoCode] Configured with project directory:",
      projectDirectory
    );

    this.registerView(
      MIMOCODE_VIEW_TYPE,
      (leaf) => new MiMoCodeView(leaf, this)
    );
    this.addSettingTab(
      new MiMoCodeSettingTab(
        this.app,
        this,
        this.settings,
        this.processManager,
        () => this.saveSettings()
      )
    );

    this.addRibbonIcon(MIMOCODE_ICON_NAME, "MiMo Code", () => {
      void this.viewManager.activateView();
    });

    this.addCommand({
      id: "toggle-mimocode-view",
      name: "Toggle MiMo Code panel",
      callback: () => {
        void this.viewManager.toggleView();
      },
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: "m",
        },
      ],
    });

    this.addCommand({
      id: "start-mimocode-server",
      name: "Start MiMo Code server",
      callback: () => {
        this.startServer();
      },
    });

    this.addCommand({
      id: "stop-mimocode-server",
      name: "Stop MiMo Code server",
      callback: () => {
        this.stopServer();
      },
    });

    if (this.settings.autoStart) {
      this.app.workspace.onLayoutReady(async () => {
        await this.startServer();
      });
    }

    this.contextManager.updateSettings(this.settings);
    this.processManager.on("stateChange", (state: ServerState) => {
      if (state === "running") {
        void this.contextManager.handleServerRunning();
      }
    });

    this.registerCleanupHandlers();

    console.log("MiMo Code plugin loaded");
  }

  async onunload(): Promise<void> {
    this.contextManager.destroy();
    await this.stopServer();
    this.app.workspace.detachLeavesOfType(MIMOCODE_VIEW_TYPE);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  private async attemptAutodetect(): Promise<void> {
    if (this.settings.mimocodePath || this.settings.useCustomCommand) {
      return;
    }

    console.log("[MiMoCode] Attempting to autodetect mimocode executable...");

    const detectedPath = ExecutableResolver.resolve("mimocode");

    if (detectedPath && detectedPath !== "mimocode") {
      console.log("[MiMoCode] Autodetected mimocode at:", detectedPath);
      this.settings.mimocodePath = detectedPath;
      await this.saveData(this.settings);
      new Notice(`MiMo Code executable found at ${detectedPath}`);
    } else {
      console.log("[MiMoCode] Could not autodetect mimocode executable");
      new Notice("Could not find mimocode. Please check Settings");
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.processManager.updateSettings(this.settings);
    this.refreshClientState();
    this.contextManager.updateSettings(this.settings);
    this.viewManager.updateSettings(this.settings);
  }

  async startServer(): Promise<boolean> {
    const success = await this.processManager.start();
    if (success) {
      new Notice("MiMo Code server started");
      const initialized = await this.mimocodeClient.initializeProject();
      if (!initialized) {
        console.warn("[MiMoCode] Failed to initialize project on server");
      }
    } else {
      const error = this.processManager.getLastError();
      if (error) {
        new Notice(`MiMo Code failed to start: ${error}`, 10000);
      } else {
        new Notice("MiMo Code failed to start. Check Settings for details.", 5000);
      }
    }
    return success;
  }

  async stopServer(): Promise<void> {
    await this.processManager.stop();
    new Notice("MiMo Code server stopped");
  }

  getServerState(): ServerState {
    return this.processManager.getState() ?? "stopped";
  }

  getLastError(): string | null {
    return this.processManager.getLastError() ?? null;
  }

  getServerUrl(): string {
    return this.processManager.getUrl();
  }

  getApiBaseUrl(): string {
    return `http://${this.settings.hostname}:${this.settings.port}`;
  }

  getStoredIframeUrl(): string | null {
    return this.cachedIframeUrl;
  }

  setCachedIframeUrl(url: string | null): void {
    this.cachedIframeUrl = url;
  }

  onServerStateChange(callback: (state: ServerState) => void): () => void {
    this.stateChangeCallbacks.push(callback);
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateChangeCallbacks.splice(index, 1);
      }
    };
  }

  private notifyStateChange(state: ServerState): void {
    for (const callback of this.stateChangeCallbacks) {
      callback(state);
    }
  }

  private refreshClientState(): void {
    const nextUiBaseUrl = this.getServerUrl();
    const nextApiBaseUrl = this.getApiBaseUrl();
    const projectDirectory = this.getProjectDirectory();
    this.mimocodeClient.updateBaseUrl(nextApiBaseUrl, nextUiBaseUrl, projectDirectory);

    if (this.lastBaseUrl && this.lastBaseUrl !== nextUiBaseUrl) {
      this.cachedIframeUrl = null;
    }

    this.lastBaseUrl = nextUiBaseUrl;
  }

  refreshContextForView(view: MiMoCodeView): void {
    void this.contextManager.refreshContextForView(view);
  }

  async ensureSessionUrl(view: MiMoCodeView): Promise<void> {
    await this.viewManager.ensureSessionUrl(view);
  }

  getProjectDirectory(): string {
    if (this.settings.projectDirectory) {
      console.log("[MiMoCode] Using project directory from settings:", this.settings.projectDirectory);
      return this.settings.projectDirectory;
    }
    const adapter = this.app.vault.adapter as any;
    const vaultPath = adapter.basePath || "";
    if (!vaultPath) {
      console.warn("[MiMoCode] Warning: Could not determine vault path");
    }
    console.log("[MiMoCode] Using vault path as project directory:", vaultPath);
    return vaultPath;
  }

  private registerCleanupHandlers(): void {
    this.registerEvent(
      this.app.workspace.on("quit", () => {
        console.log("[MiMoCode] Obsidian quitting - performing sync cleanup");
        this.stopServer();
      })
    );
  }
}
