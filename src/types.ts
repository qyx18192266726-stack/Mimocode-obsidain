export type ViewLocation = "sidebar" | "main";

export interface MiMoCodeSettings {
  port: number;
  hostname: string;
  autoStart: boolean;
  mimocodePath: string;
  projectDirectory: string;
  startupTimeout: number;
  defaultViewLocation: ViewLocation;
  injectWorkspaceContext: boolean;
  maxNotesInContext: number;
  maxSelectionLength: number;
  customCommand: string;
  useCustomCommand: boolean;
}

export const DEFAULT_SETTINGS: MiMoCodeSettings = {
  port: 14096,
  hostname: "127.0.0.1",
  autoStart: false,
  mimocodePath: "mimo",
  projectDirectory: "",
  startupTimeout: 45000,
  defaultViewLocation: "sidebar",
  injectWorkspaceContext: false,
  maxNotesInContext: 20,
  maxSelectionLength: 2000,
  customCommand: "",
  useCustomCommand: false,
};

export const MIMOCODE_VIEW_TYPE = "mimocode-view";
