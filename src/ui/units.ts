// Display-only unit conversion. The engine and stored model always use meters;
// these helpers format for the UI based on the project's units setting.

import type { Units } from "../state/project";

const M_PER_FT = 0.3048;

export function metersToDisplay(meters: number, units: Units): number {
  return units === "imperial" ? meters / M_PER_FT : meters;
}

export function displayToMeters(value: number, units: Units): number {
  return units === "imperial" ? value * M_PER_FT : value;
}

export function unitLabel(units: Units): string {
  return units === "imperial" ? "ft" : "m";
}

export function formatLength(meters: number, units: Units, digits = 1): string {
  return `${metersToDisplay(meters, units).toFixed(digits)} ${unitLabel(units)}`;
}
