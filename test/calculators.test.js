import test from "node:test";
import assert from "node:assert/strict";
import { calculate, interpolate } from "../src/calculators/engine.js";
import {
  dbmToWatts, dbmvToMv, frequencyToHz, lengthToMeters, metersTo, mvToDbmv,
  wattsToDbm,
} from "../src/calculators/units.js";

const close = (actual, expected, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≈ ${expected}`);

test("length and frequency conversions", () => {
  close(lengthToMeters(100, "ft"), 30.48);
  close(metersTo(1609.344, "mi"), 1);
  assert.equal(frequencyToHz(1, "GHz"), 1e9);
});
test("dBmV and mV round trip", () => {
  close(dbmvToMv(0), 1);
  close(mvToDbmv(10), 20);
  close(mvToDbmv(dbmvToMv(13.7)), 13.7);
});
test("dBm and watts round trip", () => {
  close(dbmToWatts(30), 1);
  close(wattsToDbm(.001), 0);
  close(wattsToDbm(dbmToWatts(-12.3)), -12.3);
});
test("coax interpolation and loss", () => {
  close(interpolate({ 100: 2, 200: 4 }, 150), 3);
  const out = calculate("coax-loss", { cableType:"Custom",frequency:750,frequencyUnit:"MHz",length:200,lengthUnit:"ft",startingSignal:10,customRate:6 });
  assert.equal(out.primary, "12 dB");
  assert.match(out.secondary[0], /-2 dBmV/);
});
test("cumulative passive loss", () => {
  const out = calculate("passive-loss", { startingSignal:10,components:[
    {type:"2-way splitter",port:"Output",quantity:1,override:""},
    {type:"Ground block",port:"Through",quantity:2,override:""},
  ]});
  assert.equal(out.primary, "4.5 dB total loss");
});
test("return loss, reflection, VSWR and reflected percentage", () => {
  const out = calculate("return-loss", { source:"Return loss",value:20 });
  assert.match(out.primary, /20 dB/);
  assert.ok(out.secondary.some(x=>x.includes("0.1")));
  assert.ok(out.secondary.some(x=>x.includes("1.2222")));
  assert.ok(out.secondary.some(x=>x.includes("1%")));
});
test("fiber budget", () => {
  const out = calculate("fiber-budget", { tx:3,sensitivity:-18,fiberType:"Custom",customAttenuation:.35,wavelength:1550,distance:10,distanceUnit:"km",connectorCount:2,connectorLoss:.5,spliceCount:4,spliceLoss:.1,splitters:[],customLosses:0,margin:3 });
  assert.equal(out.primary, "-4.9 dBm received");
  assert.equal(out.status, "Pass");
});
test("optical splitter theoretical loss", () => {
  const out = calculate("optical-splitter", { outputs:8,expectedLoss:"",stages:1 });
  assert.ok(out.secondary[0].includes("9.031"));
});
test("Ohm's law", () => {
  const out = calculate("ohms-law", { voltage:12,voltageUnit:"V",current:2,currentUnit:"A",resistance:"",resistanceUnit:"Ω",power:"",powerUnit:"W" });
  assert.equal(out.primary, "12 V");
  assert.ok(out.secondary.includes("Resistance: 6 Ω"));
  assert.ok(out.secondary.includes("Power: 24 W"));
});
test("voltage drop", () => {
  const out = calculate("voltage-drop", { sourceVoltage:12,current:2,length:100,lengthUnit:"ft",material:"Copper",awg:14,multiplier:2,customResistance:2.525,warningThreshold:3 });
  assert.match(out.primary, /1.01 V drop/);
});
test("attenuation cable-length estimate", () => {
  const out = calculate("cable-length", { mode:"Attenuation",startingLevel:10,endingLevel:4,passiveLoss:0,cableType:"Custom",customRate:6,frequency:750,frequencyUnit:"MHz" });
  assert.equal(out.primary, "100 ft estimated");
});
test("propagation-delay cable-length estimate", () => {
  const out = calculate("cable-length", { mode:"Propagation delay",delay:1000,delayUnit:"ns",velocityFactor:1,trip:"Round trip" });
  assert.match(out.primary, /149.896 m estimated/);
});
test("wavelength", () => {
  const out = calculate("wavelength", { frequency:100,frequencyUnit:"MHz",mode:"Velocity factor",velocityFactor:1,refractiveIndex:1.5 });
  assert.match(out.primary, /2.997925 m/);
});
test("invalid and boundary inputs never return Infinity or NaN", () => {
  assert.throws(()=>calculate("rf-converter",{value:0,from:"dBmV",to:"watts",impedance:0}),/greater than zero/);
  assert.throws(()=>calculate("return-loss",{source:"Reflection coefficient",value:1}),/less than 1/);
  assert.throws(()=>calculate("ohms-law",{voltage:12,voltageUnit:"V",current:"",currentUnit:"A",resistance:0,resistanceUnit:"Ω",power:"",powerUnit:"W"}),/greater than zero|cannot be zero/);
});
test("unit switching preserves physical coax length", () => {
  const ft = calculate("coax-loss",{cableType:"Custom",frequency:750,frequencyUnit:"MHz",length:100,lengthUnit:"ft",startingSignal:"",customRate:6});
  const m = calculate("coax-loss",{cableType:"Custom",frequency:.75,frequencyUnit:"GHz",length:30.48,lengthUnit:"m",startingSignal:"",customRate:6});
  assert.equal(ft.primary,m.primary);
});
