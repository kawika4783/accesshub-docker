export const SPEED_OF_LIGHT = 299792458;

export const coaxPresets = {
  RG6: { 55: 1.5, 211: 2.8, 550: 4.8, 750: 5.6, 1000: 6.5 },
  RG11: { 55: 0.96, 211: 1.8, 550: 3.1, 750: 3.65, 1000: 4.25 },
  QR540: { 55: 0.45, 211: 0.9, 550: 1.5, 750: 1.78, 1000: 2.08 },
  QR715: { 55: 0.34, 211: 0.66, 550: 1.12, 750: 1.31, 1000: 1.54 },
  QR860: { 55: 0.28, 211: 0.55, 550: 0.93, 750: 1.09, 1000: 1.28 },
};

export const passivePresets = {
  "2-way splitter": { "Output": 3.5 },
  "3-way balanced splitter": { "Any output": 5.5 },
  "3-way unbalanced splitter": { "-3.5 dB port": 3.5, "-7 dB port": 7 },
  "4-way splitter": { "Any output": 7 },
  "6-way splitter": { "Any output": 9 },
  "8-way splitter": { "Any output": 11 },
  "Directional coupler": { "Through": 1, "Tap": 8 },
  "Ground block": { "Through": 0.5 },
  "MoCA filter": { "Through": 1 },
  "Custom passive device": { "Custom": 0 },
};

export const fiberPresets = {
  "Single-mode": { 1310: 0.35, 1490: 0.25, 1550: 0.22 },
  Multimode: { 850: 3.5, 1310: 1.5 },
};

export const opticalSplitterPresets = {
  2: 3.7, 4: 7.3, 8: 10.5, 16: 13.8, 32: 17.1, 64: 20.5,
};

export const merSnrProfiles = {
  QPSK: { failing: 10, marginal: 13, acceptable: 16, excellent: 20 },
  "16-QAM": { failing: 16, marginal: 19, acceptable: 22, excellent: 26 },
  "64-QAM": { failing: 23, marginal: 26, acceptable: 29, excellent: 33 },
  "256-QAM": { failing: 28, marginal: 31, acceptable: 34, excellent: 38 },
  OFDM: { failing: 25, marginal: 28, acceptable: 32, excellent: 36 },
};

export const wireResistanceOhmPer1000Ft = {
  Copper: { 18: 6.385, 16: 4.016, 14: 2.525, 12: 1.588, 10: 0.999, 8: 0.6282, 6: 0.3951 },
  Aluminum: { 18: 10.5, 16: 6.6, 14: 4.15, 12: 2.61, 10: 1.64, 8: 1.03, 6: 0.65 },
};

export const calculatorDefinitions = [
  ["coax-loss", "Coaxial Cable Loss", "Estimate loss by cable, frequency, and length.", "Coax"],
  ["passive-loss", "Splitter & Passive Loss", "Model cumulative splitter and passive-device loss.", "Coax"],
  ["combined-coax", "Combined Coax Signal Path", "Model cable and passive devices from source to outlet.", "Coax"],
  ["rf-converter", "RF Voltage & Power Converter", "Convert dBmV, dBµV, voltage, dBm, and power.", "RF"],
  ["signal-change", "Signal-Level Change", "Compare two measured signal readings.", "RF"],
  ["mer-snr", "MER & SNR Reference", "Compare measured MER or SNR with reference profiles.", "RF"],
  ["return-loss", "Return Loss, Reflection & VSWR", "Convert return loss, reflection coefficient, and VSWR.", "RF"],
  ["fiber-budget", "Fiber-Optic Loss Budget", "Estimate optical loss, received power, and margin.", "Fiber"],
  ["optical-splitter", "Optical Splitter Loss", "Compare theoretical and expected splitter loss.", "Fiber"],
  ["ohms-law", "Ohm’s Law & Electrical Power", "Solve voltage, current, resistance, and power.", "Electrical"],
  ["voltage-drop", "Voltage Drop", "Estimate two-conductor circuit voltage drop.", "Electrical"],
  ["cable-length", "Cable-Length Estimator", "Estimate cable length from attenuation or delay.", "General"],
  ["wavelength", "Frequency, Wavelength & Propagation", "Convert frequency to wavelength and propagation speed.", "General"],
  ["latency-distance", "Network Latency & Distance", "Estimate a maximum path distance from latency.", "Network"],
].map(([id, name, description, category]) => ({ id, name, description, category }));

export const calculatorCategories = ["All", "Coax", "RF", "Fiber", "Electrical", "Network", "General"];

