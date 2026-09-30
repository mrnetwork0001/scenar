// Tiny global event bus for the RevenueCat inspector drawer (mounted once in the root layout).
export const INSPECTOR_EVENT = "scenar:inspector";

export type InspectorCommand = "open" | "close" | "toggle";

export function openInspector(command: InspectorCommand = "open") {
  window.dispatchEvent(new CustomEvent<InspectorCommand>(INSPECTOR_EVENT, { detail: command }));
}
