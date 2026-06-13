import { addIcon } from "obsidian";

export const MIMOCODE_ICON_NAME = "mimocode-logo";

const MIMOCODE_LOGO_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" stroke-width="2"/>
  <circle cx="8" cy="10" r="2" fill="currentColor"/>
  <circle cx="16" cy="10" r="2" fill="currentColor"/>
  <path d="M8 16C8 16 10 18 12 18C14 18 16 16 16 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`;

export function registerMiMoCodeIcons(): void {
  addIcon(MIMOCODE_ICON_NAME, MIMOCODE_LOGO_SVG);
}
