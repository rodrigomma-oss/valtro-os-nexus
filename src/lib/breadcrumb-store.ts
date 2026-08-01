import { useSyncExternalStore } from "react";

type Labels = Record<string, string>;

let labels: Labels = {};
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Registra um rótulo amigável para um segmento dinâmico do breadcrumb. */
export function setBreadcrumbLabel(segment: string, label: string) {
  if (labels[segment] === label) return;
  labels = { ...labels, [segment]: label };
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return labels;
}

export function useBreadcrumbLabels(): Labels {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
