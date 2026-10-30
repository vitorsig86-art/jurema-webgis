import { ColorMaterialProperty, JulianDate, type Entity } from "cesium";
import type { VectorPopupConfig } from "../projects/types";

export interface VectorPopupActionLink {
  label: string;
  url: string;
  target: "overlay" | "tab";
  flyTo: boolean;
}

// Returns the normalized URL when it is https and its origin is allowed.
export function allowedPageUrl(value: unknown, allowedOrigins: readonly string[] = []): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  let url: URL;
  try { url = new URL(value.trim()); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const allowed = allowedOrigins.some(origin => {
    try { return new URL(origin).origin === url.origin; } catch { return false; }
  });
  return allowed ? url.href : null;
}

const configurations = new WeakMap<Entity, VectorPopupConfig>();

export function registerVectorPopup(entity: Entity, config: VectorPopupConfig): void {
  configurations.set(entity, config);
}

// Ground geometry draw order is not consistently reflected in Scene.pick.
// Resolve overlapping configured vectors by their draw priority, leaving
// measurement and other non-vector selection targets untouched.
export function resolveVectorPopupSelection(current: Entity | undefined, candidates: Entity[], time = JulianDate.now()): Entity | undefined {
  if (!current || !configurations.has(current)) return current;
  let selected: Entity | undefined;
  let priority = -Infinity;
  for (const candidate of [current, ...candidates]) {
    if (!configurations.has(candidate) || !candidate.isShowing) continue;
    const graphics = candidate.polyline ?? candidate.polygon;
    const material = graphics?.material;
    if (material instanceof ColorMaterialProperty && material.color?.getValue(time)?.alpha === 0) continue;
    const zIndex = graphics?.zIndex?.getValue(time) ?? 0;
    if (zIndex > priority) {
      selected = candidate;
      priority = zIndex;
    }
  }
  return selected ?? current;
}

function present(value: unknown): boolean {
  return value !== null && value !== undefined && !(typeof value === "number" && !Number.isFinite(value));
}

export function readVectorPopup(entity: Entity | undefined, time = JulianDate.now(), allowedOrigins: readonly string[] = []) {
  const config = entity && configurations.get(entity);
  if (!config || !entity || !entity.isShowing) return null;
  const properties = entity.properties?.getValue(time) ?? {};
  const titleValue = config.titleProperty ? properties[config.titleProperty] : undefined;
  return {
    title: present(titleValue) ? `${config.titlePrefix ?? ""}${titleValue}${config.titleSuffix ?? ""}` : config.title ?? "Informações",
    fields: config.fields.filter(field => present(properties[field.property])).map(field => {
      const value = properties[field.property];
      const decimals = field.numberFormat?.decimalPlaces ?? (field.format === "integer" ? 0 : field.decimals);
      const formatted = typeof value === "number"
        ? new Intl.NumberFormat(field.numberFormat?.locale ?? "pt-BR", decimals === undefined ? {} : {
          minimumFractionDigits: decimals, maximumFractionDigits: decimals,
        }).format(value)
        : String(value);
      return { label: field.label, value: `${field.prefix ?? ""}${formatted}${field.suffix ?? ""}` };
    }),
    actions: (config.actions ?? []).flatMap((action): VectorPopupActionLink[] => {
      const url = allowedPageUrl(action.url ?? (action.urlProperty ? properties[action.urlProperty] : undefined), allowedOrigins);
      return url ? [{ label: action.label, url, target: action.target ?? "overlay", flyTo: action.flyTo ?? true }] : [];
    }),
  };
}
