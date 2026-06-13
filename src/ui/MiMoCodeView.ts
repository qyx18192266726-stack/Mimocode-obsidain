import { App, WorkspaceLeaf, setIcon } from "obsidian";
import { MIMOCODE_VIEW_TYPE } from "../types";
import { MIMOCODE_ICON_NAME } from "../icons";
import type MiMoCodePlugin from "../main";
import type { ServerState } from "../server/types";

export class MiMoCodeView extends ItemView {
  plugin: MiMoCodePlugin;
  private iframeEl: HTMLIFrameElement | null = null;
  private currentState: ServerState = "stopped";
  private unsubscribeStateChange: (() => void) | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: MiMoCodePlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return MIMOCODE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "MiMo Code";
  }

  getIcon(): string {
    return MIMOCODE_ICON_NAME;
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("mimocode-container");

    this.unsubscribeStateChange = this.plugin.onServerStateChange((state: ServerState) => {
      this.currentState = state;
      this.updateView();
    });

    this.currentState = this.plugin.getServerState();
    this.updateView();

    if (this.currentState === "stopped") {
      this.plugin.startServer();
    }
  }

  async onClose(): Promise<void> {
    if (this.unsubscribeStateChange) {
      this.unsubscribeStateChange();
      this.unsubscribeStateChange = null;
    }

    if (this.iframeEl) {
      const iframeUrl = this.iframeEl.src;
      if (iframeUrl.includes("/session/")) {
        this.plugin.setCachedIframeUrl(iframeUrl);
      }
      this.iframeEl.src = "about:blank";
      this.iframeEl = null;
    }
  }

  private updateView(): void {
    switch (this.currentState) {
      case "stopped":
        this.renderStoppedState();
        break;
      case "starting":
        this.renderStartingState();
        break;
      case "running":
        this.renderRunningState();
        break;
      case "error":
        this.renderErrorState();
        break;
    }
  }

  private renderStoppedState(): void {
    this.contentEl.empty();

    const statusContainer = this.contentEl.createDiv({
      cls: "mimocode-status-container",
    });

    const iconEl = statusContainer.createDiv({ cls: "mimocode-status-icon" });
    setIcon(iconEl, "power-off");

    statusContainer.createEl("h3", { text: "MiMo Code is stopped" });
    statusContainer.createEl("p", {
      text: "Click the button below to start the MiMo Code server.",
      cls: "mimocode-status-message",
    });

    const startButton = statusContainer.createEl("button", {
      text: "Start MiMo Code",
      cls: "mod-cta",
    });
    startButton.addEventListener("click", () => {
      this.plugin.startServer();
    });
  }

  private renderStartingState(): void {
    this.contentEl.empty();

    const statusContainer = this.contentEl.createDiv({
      cls: "mimocode-status-container",
    });

    const loadingEl = statusContainer.createDiv({ cls: "mimocode-loading" });
    loadingEl.createDiv({ cls: "mimocode-spinner" });

    statusContainer.createEl("h3", { text: "Starting MiMo Code..." });
    statusContainer.createEl("p", {
      text: "Please wait while the server starts up.",
      cls: "mimocode-status-message",
    });
  }

  private renderRunningState(): void {
    this.contentEl.empty();

    const headerEl = this.contentEl.createDiv({ cls: "mimocode-header" });

    const titleSection = headerEl.createDiv({ cls: "mimocode-header-title" });
    const iconEl = titleSection.createSpan();
    setIcon(iconEl, MIMOCODE_ICON_NAME);
    titleSection.createSpan({ text: "MiMo Code" });

    const actionsEl = headerEl.createDiv({ cls: "mimocode-header-actions" });

    const reloadButton = actionsEl.createEl("button", {
      attr: { "aria-label": "Reload" },
    });
    setIcon(reloadButton, "refresh-cw");
    reloadButton.addEventListener("click", () => {
      this.reloadIframe();
    });

    const stopButton = actionsEl.createEl("button", {
      attr: { "aria-label": "Stop server" },
    });
    setIcon(stopButton, "square");
    stopButton.addEventListener("click", () => {
      this.plugin.stopServer();
    });

    const iframeContainer = this.contentEl.createDiv({
      cls: "mimocode-iframe-container",
    });

    const iframeUrl = this.plugin.getStoredIframeUrl() ?? this.plugin.getServerUrl();
    console.log("[MiMoCode] Loading iframe with URL:", iframeUrl);

    this.iframeEl = iframeContainer.createEl("iframe", {
      cls: "mimocode-iframe",
      attr: {
        src: iframeUrl,
        frameborder: "0",
        allow: "clipboard-read; clipboard-write",
      },
    });

    this.iframeEl.addEventListener("error", () => {
      console.error("Failed to load MiMo Code iframe");
    });

    this.iframeEl.addEventListener("focus", () => {
      this.plugin.refreshContextForView(this);
    });

    this.iframeEl.addEventListener("pointerdown", () => {
      this.plugin.refreshContextForView(this);
    });

    void this.plugin.ensureSessionUrl(this);
  }

  getIframeUrl(): string | null {
    return this.iframeEl?.src ?? null;
  }

  setIframeUrl(url: string): void {
    if (this.iframeEl && this.iframeEl.src !== url) {
      this.iframeEl.src = url;
    }
  }

  private renderErrorState(): void {
    this.contentEl.empty();

    const statusContainer = this.contentEl.createDiv({
      cls: "mimocode-status-container mimocode-error",
    });

    const iconEl = statusContainer.createDiv({ cls: "mimocode-status-icon" });
    setIcon(iconEl, "alert-circle");

    statusContainer.createEl("h3", { text: "Failed to start MiMo Code" });

    const errorMessage = this.plugin.getLastError();
    if (errorMessage) {
      statusContainer.createEl("p", {
        text: errorMessage,
        cls: "mimocode-status-message mimocode-error-message",
      });
    } else {
      statusContainer.createEl("p", {
        text: "There was an error starting the MiMo Code server.",
        cls: "mimocode-status-message",
      });
    }

    const buttonContainer = statusContainer.createDiv({
      cls: "mimocode-button-group",
    });

    const retryButton = buttonContainer.createEl("button", {
      text: "Retry",
      cls: "mod-cta",
    });
    retryButton.addEventListener("click", () => {
      this.plugin.startServer();
    });

    const settingsButton = buttonContainer.createEl("button", {
      text: "Open Settings",
    });
    settingsButton.addEventListener("click", () => {
      (this.app as any).setting.open();
      (this.app as any).setting.openTabById("obsidian-mimocode");
    });
  }

  private reloadIframe(): void {
    if (this.iframeEl) {
      const src = this.iframeEl.src;
      this.iframeEl.src = "about:blank";
      setTimeout(() => {
        if (this.iframeEl) {
          this.iframeEl.src = src;
        }
      }, 100);
    }
  }
}
