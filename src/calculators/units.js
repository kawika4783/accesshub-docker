import { SPEED_OF_LIGHT } from "./config.js";

export const finite = (value, label = "Value") => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} must be a valid number`);
  return number;
};
export const positive = (value, label = "Value", allowZero = false) => {
  const number = finite(value, label);
  if (allowZero ? number < 0 : number <= 0)
    throw new Error(`${label} must be ${allowZero ? "zero or greater" : "greater than zero"}`);
  return number;
};
export const lengthToMeters = (value, unit) => {
  const n = finite(value, "Length");
  return n * ({ ft: 0.3048, m: 1, km: 1000, mi: 1609.344 }[unit] ?? 1);
};
export const metersTo = (value, unit) =>
  value / ({ ft: 0.3048, m: 1, km: 1000, mi: 1609.344 }[unit] ?? 1);
export const frequencyToHz = (value, unit) =>
  finite(value, "Frequency") * ({ Hz: 1, kHz: 1e3, MHz: 1e6, GHz: 1e9 }[unit] ?? 1);
export const voltageToVolts = (value, unit) =>
  finite(value, "Voltage") * (unit === "mV" ? 1e-3 : 1);
export const currentToAmps = (value, unit) =>
  finite(value, "Current") * (unit === "mA" ? 1e-3 : 1);
export const resistanceToOhms = (value, unit) =>
  finite(value, "Resistance") * (unit === "kΩ" ? 1000 : 1);
export const powerToWatts = (value, unit) =>
  finite(value, "Power") * ({ W: 1, mW: 1e-3, µW: 1e-6 }[unit] ?? 1);
export const dbmvToMv = (dbmv) => 10 ** (finite(dbmv, "dBmV") / 20);
export const mvToDbmv = (mv) => 20 * Math.log10(positive(mv, "mV RMS"));
export const dbmToWatts = (dbm) => 10 ** ((finite(dbm, "dBm") - 30) / 10);
export const wattsToDbm = (watts) => 10 * Math.log10(positive(watts, "Power") * 1000);
export const timeToSeconds = (value, unit) =>
  finite(value, "Time") * ({ s: 1, ms: 1e-3, µs: 1e-6, ns: 1e-9 }[unit] ?? 1);
export const propagationSpeed = ({ velocityFactor, refractiveIndex }) =>
  refractiveIndex
    ? SPEED_OF_LIGHT / positive(refractiveIndex, "Refractive index")
    : SPEED_OF_LIGHT * positive(velocityFactor ?? 1, "Velocity factor");
export const round = (value, precision = 3) => {
  if (!Number.isFinite(value)) throw new Error("The result is outside the valid numeric range");
  return Number(value.toFixed(precision));
};

