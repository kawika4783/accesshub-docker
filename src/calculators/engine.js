import {
  coaxPresets, fiberPresets, merSnrProfiles, opticalSplitterPresets,
  passivePresets, SPEED_OF_LIGHT, wireResistanceOhmPer1000Ft,
} from "./config.js";
import {
  currentToAmps, dbmToWatts, dbmvToMv, finite, frequencyToHz, lengthToMeters,
  metersTo, mvToDbmv, positive, powerToWatts, propagationSpeed, resistanceToOhms,
  round, timeToSeconds, voltageToVolts, wattsToDbm,
} from "./units.js";

export const interpolate = (points, frequencyMHz) => {
  const entries = Object.entries(points).map(([x, y]) => [Number(x), Number(y)]).sort((a, b) => a[0] - b[0]);
  if (frequencyMHz <= entries[0][0]) return entries[0][1];
  if (frequencyMHz >= entries.at(-1)[0]) return entries.at(-1)[1];
  const highIndex = entries.findIndex(([x]) => x >= frequencyMHz);
  const [x1, y1] = entries[highIndex - 1], [x2, y2] = entries[highIndex];
  return y1 + ((frequencyMHz - x1) / (x2 - x1)) * (y2 - y1);
};
const result = (primary, secondary, formula, summary, breakdown = [], warnings = [], status) => ({
  primary, secondary, formula, summary, breakdown, warnings, status,
});
const attenuation = (cable, frequencyMHz, customRate, presets = coaxPresets) =>
  cable === "Custom" ? positive(customRate, "Custom attenuation") : interpolate(presets[cable], frequencyMHz);

export function calculate(id, i, config = {}) {
  const coax = config.coax_presets || coaxPresets;
  const passives = config.passive_presets || passivePresets;
  const fibers = config.fiber_presets || fiberPresets;
  const optical = config.optical_splitters || opticalSplitterPresets;
  const thresholds = config.mer_snr_profiles || merSnrProfiles;
  const wires = config.wire_resistance || wireResistanceOhmPer1000Ft;
  switch (id) {
    case "coax-loss": {
      const mhz = frequencyToHz(i.frequency, i.frequencyUnit) / 1e6;
      const feet = metersTo(lengthToMeters(i.length, i.lengthUnit), "ft");
      const rate = attenuation(i.cableType, mhz, i.customRate, coax);
      const loss = rate * feet / 100;
      const ending = i.startingSignal === "" ? null : finite(i.startingSignal, "Starting signal") - loss;
      return result(`${round(loss)} dB`, ending === null ? [] : [`Ending level: ${round(ending)} dBmV`],
        "loss = attenuation per 100 ft × length ÷ 100",
        `${round(feet, 2)} ft of ${i.cableType} is estimated to lose ${round(loss)} dB at ${round(mhz)} MHz.`,
        [`Reference attenuation: ${round(rate)} dB/100 ft`, `Converted length: ${round(feet, 2)} ft`],
        ["Preset attenuation values are configurable references; verify company cable specifications."]);
    }
    case "passive-loss": {
      const start = finite(i.startingSignal, "Starting signal");
      const components = i.components || [];
      let running = start;
      const rows = components.map((c, index) => {
        const preset = passives[c.type]?.[c.port] ?? 0;
        const loss = (c.override === "" ? preset : finite(c.override, "Custom loss")) * positive(c.quantity || 1, "Quantity");
        running -= loss;
        return `${index + 1}. ${c.type} (${c.port}): -${round(loss)} dB → ${round(running)} dBmV`;
      });
      const total = start - running;
      return result(`${round(total)} dB total loss`, [`Final level: ${round(running)} dBmV`],
        "final dBmV = starting dBmV − Σ(component loss)", `The passive path ends at approximately ${round(running)} dBmV.`, rows,
        ["Verify actual loss from each device label or company specification."]);
    }
    case "combined-coax": {
      const start = finite(i.startingSignal, "Starting signal");
      const mhz = frequencyToHz(i.frequency, i.frequencyUnit) / 1e6;
      let running = start;
      const steps = (i.path || []).map((step, index) => {
        const loss = step.kind === "cable"
          ? attenuation(step.cableType, mhz, step.customRate, coax) * metersTo(lengthToMeters(step.length, step.lengthUnit), "ft") / 100
          : finite(step.loss, "Passive loss");
        running -= loss;
        return { label: `${index + 1}. ${step.label || (step.kind === "cable" ? step.cableType : "Passive")}`, loss, level: running };
      });
      const total = start - running, largest = steps.reduce((a, b) => !a || b.loss > a.loss ? b : a, null);
      return result(`${round(running)} dBmV final`, [`Total loss: ${round(total)} dB`, largest ? `Largest loss: ${largest.label} (${round(largest.loss)} dB)` : ""],
        "level after step = previous level − step loss", `The complete path loses approximately ${round(total)} dB.`,
        steps.map(s => `${s.label}: -${round(s.loss)} dB → ${round(s.level)} dBmV`));
    }
    case "rf-converter": {
      const impedance = positive(i.impedance === "Custom" ? i.customImpedance : i.impedance, "Impedance");
      let volts;
      if (i.from === "dBmV") volts = dbmvToMv(i.value) / 1000;
      else if (i.from === "dBµV") volts = dbmvToMv(finite(i.value) - 60) / 1000;
      else if (i.from === "mV RMS") volts = positive(i.value) / 1000;
      else if (i.from === "V RMS") volts = positive(i.value);
      else {
        const watts = i.from === "dBm" ? dbmToWatts(i.value) : powerToWatts(i.value, i.from === "watts" ? "W" : i.from === "milliwatts" ? "mW" : "µW");
        volts = Math.sqrt(watts * impedance);
      }
      const watts = volts ** 2 / impedance;
      const values = {
        "dBmV": mvToDbmv(volts * 1000), "dBµV": mvToDbmv(volts * 1000) + 60,
        "mV RMS": volts * 1000, "V RMS": volts, dBm: wattsToDbm(watts),
        watts, milliwatts: watts * 1000, microwatts: watts * 1e6,
      };
      return result(`${round(values[i.to], 6)} ${i.to}`, [`Voltage: ${round(volts, 8)} V RMS`, `Power: ${round(watts, 10)} W`, `Impedance: ${impedance} Ω`],
        "P = V² ÷ Z; dBmV = 20 log₁₀(mV); dBm = 10 log₁₀(mW)",
        "Voltage and power conversion uses the selected system impedance.",
        [], ["dBmV is a voltage level; dBm is a power level. Impedance is required between them."]);
    }
    case "signal-change": {
      const diff = finite(i.newValue, "New reading") - finite(i.originalValue, "Original reading");
      const direction = diff > 0 ? "increased" : diff < 0 ? "decreased" : "did not change";
      return result(`${round(Math.abs(diff))} dB ${direction}`, [`Signed difference: ${round(diff)} ${i.unit}`],
        "difference = new reading − original reading", `The signal ${direction}${diff ? ` by ${round(Math.abs(diff))} dB` : ""}.`);
    }
    case "mer-snr": {
      let measured = finite(i.measured, "Measured value");
      const helper = i.signalPower !== "" && i.errorPower !== "";
      if (helper)
        measured = 10 * Math.log10(positive(i.signalPower, "Signal power") / positive(i.errorPower, "Error/noise power"));
      const p = thresholds[i.profile] || { failing: i.failing, marginal: i.marginal, acceptable: i.acceptable, excellent: i.excellent };
      const status = measured >= p.excellent ? "Excellent" : measured >= p.acceptable ? "Acceptable" : measured >= p.marginal ? "Marginal" : "Failing";
      return result(`${round(measured)} dB ${i.measurementType}`, [`Reference status: ${status}`, `Distance from acceptable: ${round(measured - p.acceptable)} dB`],
        helper ? `${i.measurementType} = 10 log₁₀(signal power ÷ ${i.measurementType === "MER" ? "error" : "noise"} power)` : "Measured value compared with configured reference thresholds",
        `${i.profile} reference comparison: ${status}.`, [], ["Reference only. Acceptable values depend on equipment, modulation, operator standards, channel conditions, and test location."], status);
    }
    case "return-loss": {
      let gamma;
      if (i.source === "Return loss") gamma = i.value === "" ? 0 : 10 ** (-positive(i.value, "Return loss", true) / 20);
      else if (i.source === "Reflection coefficient") gamma = finite(i.value, "Reflection coefficient");
      else gamma = (positive(i.value, "VSWR") - 1) / (positive(i.value, "VSWR") + 1);
      if (gamma < 0 || gamma >= 1) throw new Error("Reflection coefficient must be at least 0 and less than 1");
      const rl = gamma === 0 ? Infinity : -20 * Math.log10(gamma), vswr = gamma === 0 ? 1 : (1 + gamma) / (1 - gamma);
      return result(gamma === 0 ? "Ideal match" : `${round(rl)} dB return loss`,
        [`Reflection coefficient: ${round(gamma, 6)}`, `VSWR: ${round(vswr, 4)}`, `Reflected power: ${round(gamma ** 2 * 100, 5)}%`],
        "Γ = 10^(−RL/20); VSWR = (1+Γ)/(1−Γ); reflected power = Γ²×100",
        gamma < 0.1 ? "Low reflected energy indicates a comparatively good match." : "Meaningful reflected energy is present; inspect the path and specifications.");
    }
    case "fiber-budget": {
      const tx = finite(i.tx, "Transmitter power"), sensitivity = finite(i.sensitivity, "Receiver sensitivity");
      const km = lengthToMeters(i.distance, i.distanceUnit) / 1000;
      const rate = i.fiberType === "Custom" ? positive(i.customAttenuation, "Fiber attenuation", true) : interpolate(fibers[i.fiberType], finite(i.wavelength));
      const fiber = rate * km, connectors = positive(i.connectorCount || 0, "Connector count", true) * positive(i.connectorLoss || 0, "Connector loss", true);
      const splices = positive(i.spliceCount || 0, "Splice count", true) * positive(i.spliceLoss || 0, "Splice loss", true);
      const splitters = (i.splitters || []).reduce((sum, x) => sum + positive(x.loss || 0, "Splitter loss", true), 0);
      const custom = positive(i.customLosses || 0, "Custom losses", true), engineering = positive(i.margin || 0, "Engineering margin", true);
      const total = fiber + connectors + splices + splitters + custom + engineering, received = tx - total, budget = tx - sensitivity, remaining = budget - total;
      const status = remaining >= 3 ? "Pass" : remaining >= 0 ? "Marginal" : "Fail";
      return result(`${round(received)} dBm received`, [`Total loss: ${round(total)} dB`, `Available budget: ${round(budget)} dB`, `Remaining margin: ${round(remaining)} dB`],
        "received dBm = transmitter dBm − total dB loss", `Estimated link status: ${status}.`,
        [`Fiber: ${round(fiber)} dB`, `Connectors: ${round(connectors)} dB`, `Splices: ${round(splices)} dB`, `Splitters: ${round(splitters)} dB`, `Custom + engineering: ${round(custom + engineering)} dB`], [], status);
    }
    case "optical-splitter": {
      const outputs = positive(i.outputs === "Custom" ? i.customOutputs : i.outputs, "Output count"), stages = positive(i.stages || 1, "Stages");
      const idealEach = 10 * Math.log10(outputs), configured = i.expectedLoss === "" ? (optical[outputs] ?? idealEach) : positive(i.expectedLoss, "Expected loss");
      return result(`${round(configured * stages)} dB expected cascaded loss`, [`Theoretical: ${round(idealEach * stages)} dB`, `Difference: ${round((configured - idealEach) * stages)} dB`],
        "ideal loss = 10 log₁₀(outputs); cascaded loss = loss per stage × stages",
        `${stages} stage(s) of 1:${outputs} splitting.`, [], ["Theoretical split loss is not actual field insertion loss; use manufacturer data."]);
    }
    case "ohms-law": {
      let V = i.voltage === "" ? null : voltageToVolts(i.voltage, i.voltageUnit), I = i.current === "" ? null : currentToAmps(i.current, i.currentUnit);
      let R = i.resistance === "" ? null : resistanceToOhms(i.resistance, i.resistanceUnit), P = i.power === "" ? null : powerToWatts(i.power, i.powerUnit);
      const known = [V, I, R, P].filter(v => v !== null).length;
      if (known < 2) throw new Error("Enter any two compatible known values");
      if (V !== null && I !== null) { R ??= V / I; P ??= V * I; }
      else if (V !== null && R !== null) { if (!R) throw new Error("Resistance cannot be zero"); I = V / R; P ??= V * I; }
      else if (I !== null && R !== null) { V = I * R; P ??= V * I; }
      else if (P !== null && V !== null) { if (!V) throw new Error("Voltage cannot be zero"); I = P / V; R ??= V / I; }
      else if (P !== null && I !== null) { if (!I) throw new Error("Current cannot be zero"); V = P / I; R ??= V / I; }
      else if (P !== null && R !== null) { V = Math.sqrt(P * R); I = V / R; }
      const warnings = [];
      if (i.voltage !== "" && i.current !== "" && i.power !== "" && Math.abs(V * I - P) > Math.max(.001, Math.abs(P) * .01)) warnings.push("The supplied values are contradictory by more than 1%.");
      return result(`${round(V, 6)} V`, [`Current: ${round(I, 6)} A`, `Resistance: ${round(R, 6)} Ω`, `Power: ${round(P, 6)} W`],
        "V=I×R; P=V×I; P=I²R; P=V²/R", "Values are normalized to base SI units.", [], warnings);
    }
    case "voltage-drop": {
      const source = positive(i.sourceVoltage, "Source voltage"), amps = positive(i.current, "Current", true);
      const feet = metersTo(lengthToMeters(i.length, i.lengthUnit), "ft");
      const per1000 = i.material === "Custom" ? positive(i.customResistance, "Custom resistance", true) : wires[i.material][i.awg];
      const multiplier = positive(i.multiplier || 2, "Circuit multiplier");
      const resistance = per1000 / 1000 * feet * multiplier, drop = amps * resistance, percent = drop / source * 100, ending = source - drop;
      return result(`${round(drop)} V drop`, [`Drop: ${round(percent)}%`, `Ending voltage: ${round(ending)} V`, `Circuit resistance: ${round(resistance, 6)} Ω`],
        "drop = current × resistance per length × one-way length × multiplier",
        `Estimated ending voltage is ${round(ending)} V.`, [], percent > positive(i.warningThreshold || 3, "Warning threshold") ? [`Voltage drop exceeds the configured ${i.warningThreshold || 3}% threshold.`] : [], percent > Number(i.warningThreshold || 3) ? "Warning" : "Acceptable");
    }
    case "cable-length": {
      if (i.mode === "Attenuation") {
        const loss = finite(i.startingLevel) - finite(i.endingLevel) - positive(i.passiveLoss || 0, "Passive loss", true);
        if (loss < 0 && !i.allowNegative) throw new Error("Calculated cable-only loss is negative");
        const mhz = frequencyToHz(i.frequency, i.frequencyUnit) / 1e6, rate = attenuation(i.cableType, mhz, i.customRate, coax);
        const feet = loss / rate * 100;
        return result(`${round(feet)} ft estimated`, [`${round(lengthToMeters(feet, "ft"))} m`, `Cable-only loss: ${round(loss)} dB`],
          "length = cable-only loss ÷ attenuation per 100 ft × 100", "This is an attenuation-based estimate.", [], ["Damage, fittings, temperature, mismatch, ingress, and measurement accuracy affect this estimate."]);
      }
      const speed = SPEED_OF_LIGHT * positive(i.velocityFactor, "Velocity factor"), seconds = timeToSeconds(i.delay, i.delayUnit);
      const meters = speed * seconds / (i.trip === "Round trip" ? 2 : 1);
      return result(`${round(meters)} m estimated`, [`${round(metersTo(meters, "ft"))} ft`, `${round(meters / 1000, 6)} km`],
        "distance = c × velocity factor × time" + (i.trip === "Round trip" ? " ÷ 2" : ""), "Propagation-delay distance estimate.");
    }
    case "wavelength": {
      const hz = positive(frequencyToHz(i.frequency, i.frequencyUnit), "Frequency");
      const speed = propagationSpeed(i.mode === "Refractive index" ? { refractiveIndex: i.refractiveIndex } : { velocityFactor: i.velocityFactor });
      const wavelength = speed / hz;
      return result(`${round(wavelength, 6)} m wavelength`, [`${round(metersTo(wavelength, "ft"), 6)} ft`, `Propagation speed: ${round(speed)} m/s`],
        "wavelength = propagation speed ÷ frequency", `Propagation uses the configured ${i.mode.toLowerCase()}.`);
    }
    case "latency-distance": {
      const rtt = positive(timeToSeconds(i.latency, i.latencyUnit), "Latency");
      const processing = positive(timeToSeconds(i.processing || 0, i.processingUnit || i.latencyUnit), "Processing allowance", true);
      const adjusted = Math.max(0, rtt - processing), speed = SPEED_OF_LIGHT * positive(i.velocityFactor, "Propagation speed factor"), meters = adjusted / 2 * speed;
      return result(`${round(meters / 1000)} km maximum one-way path`, [`Adjusted propagation time: ${round(adjusted * 1000, 6)} ms`, `${round(metersTo(meters, "mi"))} miles`],
        "maximum one-way distance = (RTT − processing allowance) ÷ 2 × assumed speed",
        "Rough educational upper-bound estimate only.", [], ["Internet latency includes routing, queuing, switching, processing, and indirect paths. It cannot determine an exact physical location."]);
    }
    default: throw new Error("Calculator is not available");
  }
}
