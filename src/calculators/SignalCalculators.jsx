import React, { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDown, ArrowLeft, ArrowUp, Calculator, Cable, ChevronRight,
  CircleGauge, Clipboard, Copy, Download, Gauge, Heart, Network,
  Pencil, Plus, RotateCcw, Save, Search, Settings, Star, Trash2, Waves, Zap,
} from "lucide-react";
import { api } from "../api.js";
import {
  calculatorCategories, calculatorDefinitions, coaxPresets, fiberPresets,
  merSnrProfiles, opticalSplitterPresets, passivePresets, wireResistanceOhmPer1000Ft,
} from "./config.js";
import { calculate } from "./engine.js";
import "./calculators.css";

const icons = {
  Coax: Cable, RF: Waves, Fiber: Cable, Electrical: Zap, Network, General: Calculator,
};
const fields = {
  "coax-loss": [
    ["cableType","Cable type","select",["RG6","RG11","QR540","QR715","QR860","Custom"]],
    ["frequency","Frequency","number"],["frequencyUnit","Frequency unit","select",["MHz","GHz","kHz"]],
    ["length","Cable length","number"],["lengthUnit","Length unit","select",["ft","m"]],
    ["startingSignal","Starting signal (optional dBmV)","number"],["customRate","Custom attenuation (dB/100 ft)","number"],
  ],
  "rf-converter": [
    ["value","Value","number"],["from","Source unit","select",["dBmV","dBµV","mV RMS","V RMS","dBm","watts","milliwatts","microwatts"]],
    ["to","Destination unit","select",["dBmV","dBµV","mV RMS","V RMS","dBm","watts","milliwatts","microwatts"]],
    ["impedance","System impedance","select",["75","50","Custom"]],["customImpedance","Custom impedance (Ω)","number"],
  ],
  "signal-change": [
    ["originalValue","Original reading","number"],["newValue","New reading","number"],
    ["unit","Reading unit","select",["dBmV","dBm","MER","SNR"]],
  ],
  "mer-snr": [
    ["measured","Measured value (dB)","number"],["measurementType","Measurement type","select",["MER","SNR"]],
    ["profile","Modulation/profile","select",["QPSK","16-QAM","64-QAM","256-QAM","OFDM","Custom"]],
    ["signalPower","Average signal power (optional linear)","number"],["errorPower","Average error/noise power (optional linear)","number"],
    ["failing","Custom failing threshold","number"],["marginal","Custom marginal threshold","number"],
    ["acceptable","Custom acceptable threshold","number"],["excellent","Custom excellent threshold","number"],
  ],
  "return-loss": [
    ["source","Provided measurement","select",["Return loss","Reflection coefficient","VSWR"]],["value","Value","number"],
  ],
  "fiber-budget": [
    ["tx","Transmitter power (dBm)","number"],["sensitivity","Receiver sensitivity (dBm)","number"],
    ["fiberType","Fiber type","select",["Single-mode","Multimode","Custom"]],["wavelength","Wavelength (nm)","select",["850","1310","1490","1550"]],
    ["distance","Fiber distance","number"],["distanceUnit","Distance unit","select",["km","m","mi","ft"]],
    ["connectorCount","Connector count","number"],["connectorLoss","Loss per connector (dB)","number"],
    ["spliceCount","Splice count","number"],["spliceLoss","Loss per splice (dB)","number"],
    ["customLosses","Other custom losses (dB)","number"],["margin","Engineering margin (dB)","number"],
    ["customAttenuation","Custom attenuation (dB/km)","number"],
  ],
  "optical-splitter": [
    ["outputs","Output count","select",["2","4","8","16","32","64","Custom"]],["customOutputs","Custom output count","number"],["expectedLoss","Expected/manufacturer loss per stage (dB)","number"],
    ["stages","Number of stages","number"],
  ],
  "ohms-law": [
    ["voltage","Voltage (optional)","number"],["voltageUnit","Voltage unit","select",["V","mV"]],
    ["current","Current (optional)","number"],["currentUnit","Current unit","select",["A","mA"]],
    ["resistance","Resistance (optional)","number"],["resistanceUnit","Resistance unit","select",["Ω","kΩ"]],
    ["power","Power (optional)","number"],["powerUnit","Power unit","select",["W","mW"]],
  ],
  "voltage-drop": [
    ["sourceVoltage","Source voltage (V)","number"],["current","Current (A)","number"],
    ["length","One-way conductor length","number"],["lengthUnit","Length unit","select",["ft","m"]],
    ["material","Wire material","select",["Copper","Aluminum","Custom"]],["awg","Wire size (AWG)","select",["18","16","14","12","10","8","6"]],
    ["multiplier","System multiplier","number"],["customResistance","Custom Ω/1000 ft","number"],["warningThreshold","Warning threshold (%)","number"],
  ],
  "cable-length": [
    ["mode","Operating mode","select",["Attenuation","Propagation delay"]],
    ["startingLevel","Starting level (dBmV)","number"],["endingLevel","Ending level (dBmV)","number"],["passiveLoss","Known passive losses (dB)","number"],
    ["cableType","Cable type","select",["RG6","RG11","QR540","QR715","QR860","Custom"]],["frequency","Frequency","number"],["frequencyUnit","Frequency unit","select",["MHz","GHz"]],
    ["customRate","Custom attenuation (dB/100 ft)","number"],["delay","Measured delay","number"],["delayUnit","Delay unit","select",["ns","µs","ms"]],
    ["velocityFactor","Velocity factor","number"],["trip","Measurement direction","select",["One way","Round trip"]],["allowNegative","Continue with negative calculated loss","checkbox"],
  ],
  "wavelength": [
    ["frequency","Frequency","number"],["frequencyUnit","Frequency unit","select",["Hz","kHz","MHz","GHz"]],
    ["medium","Medium preset","select",["Free space","Coax","Fiber","Custom"]],
    ["mode","Propagation input","select",["Velocity factor","Refractive index"]],["velocityFactor","Velocity factor","number"],["refractiveIndex","Refractive index","number"],
  ],
  "latency-distance": [
    ["latency","Round-trip latency","number"],["latencyUnit","Latency unit","select",["ms","µs","s"]],
    ["processing","Processing-delay allowance","number"],["processingUnit","Allowance unit","select",["ms","µs","s"]],
    ["velocityFactor","Assumed propagation speed factor","number"],
  ],
};
const defaults = {
  "coax-loss": { cableType:"RG6",frequency:750,frequencyUnit:"MHz",length:100,lengthUnit:"ft",startingSignal:"",customRate:6 },
  "passive-loss": { startingSignal:10,components:[{type:"2-way splitter",port:"Output",quantity:1,override:""}] },
  "combined-coax": { startingSignal:10,frequency:750,frequencyUnit:"MHz",path:[{kind:"cable",label:"Drop cable",cableType:"RG6",length:100,lengthUnit:"ft",customRate:6}] },
  "rf-converter": { value:0,from:"dBmV",to:"mV RMS",impedance:"75",customImpedance:75 },
  "signal-change": { originalValue:10,newValue:7,unit:"dBmV" },
  "mer-snr": { measured:35,measurementType:"MER",profile:"256-QAM",signalPower:"",errorPower:"",failing:28,marginal:31,acceptable:34,excellent:38 },
  "return-loss": { source:"Return loss",value:20 },
  "fiber-budget": { tx:3,sensitivity:-18,fiberType:"Single-mode",wavelength:"1550",distance:10,distanceUnit:"km",connectorCount:2,connectorLoss:.5,spliceCount:4,spliceLoss:.1,splitters:[],customLosses:0,margin:3,customAttenuation:.35 },
  "optical-splitter": { outputs:"8",customOutputs:3,expectedLoss:"",stages:1 },
  "ohms-law": { voltage:12,voltageUnit:"V",current:2,currentUnit:"A",resistance:"",resistanceUnit:"Ω",power:"",powerUnit:"W" },
  "voltage-drop": { sourceVoltage:12,current:2,length:100,lengthUnit:"ft",material:"Copper",awg:"14",multiplier:2,customResistance:2.525,warningThreshold:3 },
  "cable-length": { mode:"Attenuation",startingLevel:10,endingLevel:4,passiveLoss:0,cableType:"RG6",frequency:750,frequencyUnit:"MHz",customRate:6,delay:500,delayUnit:"ns",velocityFactor:.85,trip:"Round trip",allowNegative:false },
  "wavelength": { frequency:750,frequencyUnit:"MHz",medium:"Coax",mode:"Velocity factor",velocityFactor:.85,refractiveIndex:1.5 },
  "latency-distance": { latency:20,latencyUnit:"ms",processing:5,processingUnit:"ms",velocityFactor:.67 },
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const resultText = (definition, output) =>
  [definition.name, output.primary, ...(output.secondary || []), output.summary, `Formula: ${output.formula}`].filter(Boolean).join("\n");

function ResultPanel({ definition, output, onSave }) {
  if (!output) return <aside className="calc-result empty-result"><CircleGauge/><h3>Results appear here</h3><p>Enter the field measurements, then select Calculate.</p></aside>;
  return (
    <aside className="calc-result">
      <header><div><small>Calculated result</small><h2>{output.primary}</h2></div>{output.status && <span className={`calc-status ${output.status.toLowerCase()}`}>{output.status}</span>}</header>
      <div className="secondary-results">{output.secondary?.filter(Boolean).map(item=><strong key={item}>{item}</strong>)}</div>
      <p>{output.summary}</p>
      {output.breakdown?.length>0 && <section><h3>Step-by-step breakdown</h3>{output.breakdown.map((item,index)=><div className="breakdown-row" key={index}>{item}</div>)}</section>}
      {output.warnings?.map(warning=><div className="calc-warning" key={warning}>⚠ {warning}</div>)}
      <section><h3>Formula</h3><code>{output.formula}</code></section>
      <div className="result-actions">
        <button className="outline" onClick={()=>navigator.clipboard.writeText(resultText(definition,output))}><Copy/> Copy</button>
        <button className="outline" onClick={onSave}><Save/> Save</button>
        <button className="outline" onClick={()=>window.print()}><Download/> Print</button>
      </div>
    </aside>
  );
}
function PassiveEditor({ value, onChange }) {
  const update=(index,patch)=>onChange(value.map((item,i)=>i===index?{...item,...patch}:item));
  const move=(index,direction)=>{const next=[...value],to=index+direction;if(to<0||to>=next.length)return;[next[index],next[to]]=[next[to],next[index]];onChange(next);};
  return <div className="path-editor"><header><h3>Signal-path components</h3><button className="outline" onClick={()=>onChange([...value,{type:"2-way splitter",port:"Output",quantity:1,override:""}])}><Plus/> Add component</button></header>
    {value.map((item,index)=>{const ports=Object.keys(passivePresets[item.type]||{Custom:0});return <article key={index}><span>{index+1}</span>
      <label>Component<select value={item.type} onChange={e=>update(index,{type:e.target.value,port:Object.keys(passivePresets[e.target.value])[0]})}>{Object.keys(passivePresets).map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Port<select value={item.port} onChange={e=>update(index,{port:e.target.value})}>{ports.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Quantity<input type="number" inputMode="decimal" value={item.quantity} onChange={e=>update(index,{quantity:e.target.value})}/></label>
      <label>Custom loss override<input type="number" inputMode="decimal" placeholder="Use preset" value={item.override} onChange={e=>update(index,{override:e.target.value})}/></label>
      <div className="path-actions"><button aria-label="Move up" onClick={()=>move(index,-1)}><ArrowUp/></button><button aria-label="Move down" onClick={()=>move(index,1)}><ArrowDown/></button><button aria-label="Delete" onClick={()=>onChange(value.filter((_,i)=>i!==index))}><Trash2/></button></div>
    </article>})}
    <p className="reference-note">Default loss values are configurable references. Verify the device label or company specification.</p>
  </div>;
}
function CombinedEditor({ value, onChange }) {
  const update=(index,patch)=>onChange(value.map((item,i)=>i===index?{...item,...patch}:item));
  const add=kind=>onChange([...value,kind==="cable"?{kind,label:"Cable",cableType:"RG6",length:100,lengthUnit:"ft",customRate:6}:{kind,label:"Passive device",loss:3.5}]);
  const move=(index,d)=>{const n=[...value],to=index+d;if(to<0||to>=n.length)return;[n[index],n[to]]=[n[to],n[index]];onChange(n);};
  return <div className="path-editor"><header><h3>Source → signal path → outlet</h3><div><button className="outline" onClick={()=>add("cable")}><Plus/> Cable</button><button className="outline" onClick={()=>add("passive")}><Plus/> Passive</button></div></header>
    {value.map((item,index)=><article key={index}><span>{index+1}</span><label>Step name<input value={item.label} onChange={e=>update(index,{label:e.target.value})}/></label>
      {item.kind==="cable"?<><label>Cable<select value={item.cableType} onChange={e=>update(index,{cableType:e.target.value})}>{[...Object.keys(coaxPresets),"Custom"].map(x=><option key={x}>{x}</option>)}</select></label><label>Length<input type="number" inputMode="decimal" value={item.length} onChange={e=>update(index,{length:e.target.value})}/></label><label>Unit<select value={item.lengthUnit} onChange={e=>update(index,{lengthUnit:e.target.value})}><option>ft</option><option>m</option></select></label></>:<label>Loss (dB)<input type="number" inputMode="decimal" value={item.loss} onChange={e=>update(index,{loss:e.target.value})}/></label>}
      <div className="path-actions"><button onClick={()=>move(index,-1)}><ArrowUp/></button><button onClick={()=>move(index,1)}><ArrowDown/></button><button onClick={()=>onChange([...value,item])}><Copy/></button><button onClick={()=>onChange(value.filter((_,i)=>i!==index))}><Trash2/></button></div>
    </article>)}
  </div>;
}
function SaveDialog({ definition, inputs, output, onClose, onSaved }) {
  const [form,setForm]=useState({name:`${definition.name} – ${new Date().toLocaleDateString()}`,property_reference:"",address:"",notes:"",shared_with_team:false});
  const [error,setError]=useState(""),[saving,setSaving]=useState(false);
  return <div className="calc-dialog-backdrop" onMouseDown={onClose}><form className="calc-dialog" onMouseDown={e=>e.stopPropagation()} onSubmit={async e=>{e.preventDefault();setSaving(true);try{const saved=await api.saveCalculation({...form,calculator_type:definition.id,inputs,outputs:output});onSaved(saved);onClose();}catch(x){setError(x.message)}finally{setSaving(false)}}}>
    <header><h2>Save calculation</h2><button type="button" onClick={onClose}>×</button></header>
    <label>Name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
    <label>Property or job reference<input value={form.property_reference} onChange={e=>setForm({...form,property_reference:e.target.value})}/></label>
    <label>Address<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label>
    <label>Notes<textarea rows="3" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
    <label className="check"><input type="checkbox" checked={form.shared_with_team} onChange={e=>setForm({...form,shared_with_team:e.target.checked})}/> Share with supervisors and administrators</label>
    {error&&<div className="error">{error}</div>}<button className="primary" disabled={saving}>{saving?"Saving…":"Save calculation"}</button>
  </form></div>;
}
function CalculatorWorkspace({ definition, favorite, toggleFavorite, initial, onBack, onSaved, config }) {
  const [inputs,setInputs]=useState(()=>clone(initial?.inputs||defaults[definition.id]||{}));
  const [output,setOutput]=useState(initial?.outputs||null),[error,setError]=useState(""),[saveOpen,setSaveOpen]=useState(false);
  const run=()=>{try{setOutput(calculate(definition.id,inputs,config));setError("")}catch(x){setOutput(null);setError(x.message)}};
  const set=(key,value)=>setInputs(current=>{
    if(key==="medium"){
      if(value==="Free space")return {...current,medium:value,mode:"Velocity factor",velocityFactor:1};
      if(value==="Coax")return {...current,medium:value,mode:"Velocity factor",velocityFactor:.85};
      if(value==="Fiber")return {...current,medium:value,mode:"Refractive index",refractiveIndex:1.468};
    }
    return {...current,[key]:value};
  });
  return <div className="calculator-workspace">
    <div className="page-head"><div><button className="calc-back" onClick={onBack}><ArrowLeft/> All calculators</button><h1>{definition.name}</h1><p>{definition.description}</p></div><button className={`favorite-large ${favorite?"active":""}`} onClick={toggleFavorite}><Heart/>{favorite?"Favorited":"Favorite"}</button></div>
    <div className="calculator-layout"><section className="calculator-form">
      {definition.id==="passive-loss"&&<label>Starting signal (dBmV)<input type="number" inputMode="decimal" value={inputs.startingSignal} onChange={e=>set("startingSignal",e.target.value)}/></label>}
      {definition.id==="passive-loss"&&<PassiveEditor value={inputs.components} onChange={value=>set("components",value)}/>}
      {definition.id==="combined-coax"&&<><div className="calc-input-grid"><label>Starting signal (dBmV)<input type="number" value={inputs.startingSignal} onChange={e=>set("startingSignal",e.target.value)}/></label><label>Frequency<input type="number" value={inputs.frequency} onChange={e=>set("frequency",e.target.value)}/></label><label>Unit<select value={inputs.frequencyUnit} onChange={e=>set("frequencyUnit",e.target.value)}><option>MHz</option><option>GHz</option></select></label></div><CombinedEditor value={inputs.path} onChange={value=>set("path",value)}/></>}
      {!["passive-loss","combined-coax"].includes(definition.id)&&<div className="calc-input-grid">{(fields[definition.id]||[]).filter(([key])=>{
        if(key==="customRate")return inputs.cableType==="Custom";if(key==="customImpedance")return inputs.impedance==="Custom";if(key==="customAttenuation")return inputs.fiberType==="Custom";if(key==="customOutputs")return inputs.outputs==="Custom";if(["failing","marginal","acceptable","excellent"].includes(key))return inputs.profile==="Custom";if(["startingLevel","endingLevel","passiveLoss","cableType","frequency","frequencyUnit","customRate","allowNegative"].includes(key))return inputs.mode==="Attenuation";if(["delay","delayUnit","velocityFactor","trip"].includes(key)&&definition.id==="cable-length")return inputs.mode==="Propagation delay";if(key==="refractiveIndex")return inputs.mode==="Refractive index";if(key==="velocityFactor"&&definition.id==="wavelength")return inputs.mode==="Velocity factor";return true;
      }).map(([key,label,type,options])=><label key={key} className={type==="checkbox"?"calc-check":""}>{type==="checkbox"?<><input type="checkbox" checked={Boolean(inputs[key])} onChange={e=>set(key,e.target.checked)}/>{label}</>:<>{label}{type==="select"?<select value={inputs[key]} onChange={e=>set(key,e.target.value)}>{options.map(option=><option key={option}>{option}</option>)}</select>:<input type="number" inputMode="decimal" value={inputs[key]} onChange={e=>set(key,e.target.value)}/>}</>}</label>)}</div>}
      {definition.id==="fiber-budget"&&<label>Splitter losses (comma separated dB)<input value={(inputs.splitters||[]).map(x=>x.loss).join(", ")} onChange={e=>set("splitters",e.target.value.split(",").map(loss=>({loss:loss.trim()})).filter(x=>x.loss!==""))}/></label>}
      <div className="calculator-actions"><button className="primary" onClick={run}><Calculator/> Calculate</button><button className="outline" onClick={()=>{setInputs(clone(defaults[definition.id]));setOutput(null);setError("")}}><RotateCcw/> Reset</button></div>
      {error&&<div className="error" role="alert">{error}</div>}
      <p className="field-disclaimer">Results are estimates and reference calculations. Confirm device labels, company specifications, and field conditions.</p>
    </section><ResultPanel definition={definition} output={output} onSave={()=>setSaveOpen(true)}/></div>
    {saveOpen&&output&&<SaveDialog definition={definition} inputs={inputs} output={output} onClose={()=>setSaveOpen(false)} onSaved={onSaved}/>}
  </div>;
}
function SavedPanel({ items, definitions, onOpen, onDelete, onRename, onDuplicate, currentUserId }) {
  const [search,setSearch]=useState(""),[type,setType]=useState("All");
  const shown=items.filter(x=>(type==="All"||x.calculator_type===type)&&`${x.name} ${x.property_reference||""} ${x.address||""}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="saved-panel"><div className="calc-toolbar"><label><Search/><input placeholder="Search saved calculations" value={search} onChange={e=>setSearch(e.target.value)}/></label><select value={type} onChange={e=>setType(e.target.value)}><option>All</option>{definitions.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></div>
    <div className="saved-list">{shown.map(item=><article key={item.id}><div><small>{definitions.find(x=>x.id===item.calculator_type)?.name}</small><h3>{item.name}</h3><p>{item.property_reference||item.address||"No job reference"} · {new Date(item.updated_at).toLocaleString()}</p>{item.shared_with_team&&<span>Shared by {item.owner_name}</span>}</div><button className="outline" onClick={()=>onOpen(item)}>Reopen</button><button className="icon-btn" aria-label="Duplicate" onClick={()=>onDuplicate(item)}><Copy/></button>{String(item.owner_user_id)===String(currentUserId)&&<><button className="icon-btn" aria-label="Rename" onClick={()=>onRename(item)}><Pencil/></button><button className="icon-btn" aria-label="Delete" onClick={()=>onDelete(item)}><Trash2/></button></>}</article>)}</div>
    {!shown.length&&<div className="calc-empty"><Save/><h3>No saved calculations found</h3><p>Save a result to reuse it later.</p></div>}
  </section>;
}
function AdminConfig({ config, setConfig }) {
  const defaultsMap={coax_presets:coaxPresets,passive_presets:passivePresets,fiber_presets:fiberPresets,optical_splitters:opticalSplitterPresets,mer_snr_profiles:merSnrProfiles,wire_resistance:wireResistanceOhmPer1000Ft,calculator_settings:{disabled:[],decimal_precision:3,default_units:{length:"ft",frequency:"MHz"},warning_thresholds:{voltage_drop_percent:3,fiber_margin_db:3}}};
  const [key,setKey]=useState("coax_presets"),[text,setText]=useState(JSON.stringify(config.coax_presets||coaxPresets,null,2)),[message,setMessage]=useState("");
  const choose=value=>{setKey(value);setText(JSON.stringify(config[value]||defaultsMap[value],null,2));setMessage("")};
  return <section className="admin-config"><header><div><h2>Administrator configuration</h2><p>Reference values are configurable and are not universal guarantees.</p></div></header><select value={key} onChange={e=>choose(e.target.value)}>{Object.keys(defaultsMap).map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select><textarea rows="18" value={text} onChange={e=>setText(e.target.value)} spellCheck="false"/>{message&&<div className="success-notice">{message}</div>}<div><button className="primary" onClick={async()=>{try{const value=JSON.parse(text);await api.updateCalculatorConfig(key,value);setConfig({...config,[key]:value});setMessage("Configuration saved.")}catch(x){setMessage(x.message)}}}>Save configuration</button><button className="outline" onClick={async()=>{await api.restoreCalculatorConfig(key);const next={...config};delete next[key];setConfig(next);setText(JSON.stringify(defaultsMap[key],null,2));setMessage("Safe defaults restored.")}}>Restore defaults</button></div></section>;
}
export default function SignalCalculators({ isAdmin, currentUserId, initialTab = "calculators" }) {
  const [state,setState]=useState({favorites:[],recent:[],saved:[],config:{}}),[open,setOpen]=useState(null),[tab,setTab]=useState(initialTab);
  const [query,setQuery]=useState(""),[category,setCategory]=useState("All"),[favoritesOnly,setFavoritesOnly]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
  useEffect(()=>{api.calculatorState().then(setState).catch(x=>setError(x.message)).finally(()=>setLoading(false))},[]);
  const openCalculator=(definition,saved=null)=>{setOpen({definition,saved});api.markCalculatorRecent(definition.id).catch(()=>{});setState(current=>({...current,recent:[{calculator_type:definition.id,last_opened_at:new Date().toISOString()},...current.recent.filter(x=>x.calculator_type!==definition.id)].slice(0,8)}));};
  const toggleFavorite=async id=>{const answer=await api.toggleCalculatorFavorite(id);setState(current=>({...current,favorites:answer.favorite?[...new Set([...current.favorites,id])]:current.favorites.filter(x=>x!==id)}))};
  if(open)return <CalculatorWorkspace definition={open.definition} initial={open.saved} config={state.config} favorite={state.favorites.includes(open.definition.id)} toggleFavorite={()=>toggleFavorite(open.definition.id)} onBack={()=>setOpen(null)} onSaved={saved=>setState(s=>({...s,saved:[saved,...s.saved]}))}/>;
  const enabledDefinitions=calculatorDefinitions.filter(x=>!(state.config.calculator_settings?.disabled||[]).includes(x.id));
  const shown=enabledDefinitions.filter(x=>(category==="All"||x.category===category)&&(!favoritesOnly||state.favorites.includes(x.id))&&`${x.name} ${x.description} ${x.category}`.toLowerCase().includes(query.toLowerCase()));
  const recent=state.recent.map(r=>calculatorDefinitions.find(x=>x.id===r.calculator_type)).filter(Boolean);
  return <div className="signal-calculators"><div className="page-head"><div><h1>Signal Calculators</h1><p>Field-ready RF, coax, fiber, electrical, and network calculation tools.</p></div></div>
    <div className="calc-tabs"><button className={tab==="calculators"?"active":""} onClick={()=>setTab("calculators")}><Calculator/> Calculators</button><button className={tab==="saved"?"active":""} onClick={()=>setTab("saved")}><Save/> Saved</button>{isAdmin&&<button className={tab==="admin"?"active":""} onClick={()=>setTab("admin")}><Settings/> Configuration</button>}</div>
    {error&&<div className="error">{error}</div>}{loading&&<div className="calc-loading">Loading calculators…</div>}
    {tab==="calculators"&&!loading&&<><div className="calc-toolbar"><label><Search/><input placeholder="Search calculators" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="category-filters">{calculatorCategories.map(x=><button className={category===x?"active":""} onClick={()=>setCategory(x)} key={x}>{x}</button>)}</div><button className={`favorites-filter ${favoritesOnly?"active":""}`} onClick={()=>setFavoritesOnly(!favoritesOnly)}><Heart/> Favorites</button></div>
      {recent.length>0&&!query&&category==="All"&&!favoritesOnly&&<section className="recent-calculators"><h2>Recently used</h2><div>{recent.map(def=><button key={def.id} onClick={()=>openCalculator(def)}><Activity/><span>{def.name}</span><ChevronRight/></button>)}</div></section>}
      <div className="calculator-card-grid">{shown.map(def=>{const Icon=icons[def.category]||Calculator;return <article className="calculator-card" key={def.id}><button className={`card-favorite ${state.favorites.includes(def.id)?"active":""}`} aria-label={`Favorite ${def.name}`} onClick={()=>toggleFavorite(def.id)}><Heart/></button><div className={`calculator-icon ${def.category.toLowerCase()}`}><Icon/></div><span>{def.category}</span><h2>{def.name}</h2><p>{def.description}</p><button className="primary" onClick={()=>openCalculator(def)}>Open calculator <ChevronRight/></button></article>})}</div>
      {!shown.length&&<div className="calc-empty"><Search/><h3>No calculators match your search</h3><p>Try another name or clear the filters.</p><button className="outline" onClick={()=>{setQuery("");setCategory("All");setFavoritesOnly(false)}}>Clear filters</button></div>}</>}
    {tab==="saved"&&<SavedPanel items={state.saved} definitions={calculatorDefinitions} currentUserId={currentUserId} onOpen={item=>openCalculator(calculatorDefinitions.find(x=>x.id===item.calculator_type),item)} onDuplicate={async item=>{const copy=await api.saveCalculation({calculator_type:item.calculator_type,name:`${item.name} copy`,inputs:item.inputs,outputs:item.outputs,property_reference:item.property_reference,address:item.address,notes:item.notes,shared_with_team:false});setState(s=>({...s,saved:[copy,...s.saved]}))}} onRename={async item=>{const name=prompt("Rename saved calculation",item.name);if(name?.trim()){const updated=await api.updateSavedCalculation(item.id,{...item,name:name.trim()});setState(s=>({...s,saved:s.saved.map(x=>x.id===item.id?{...x,...updated}:x)}))}}} onDelete={async item=>{if(confirm(`Delete “${item.name}”?`)){await api.deleteSavedCalculation(item.id);setState(s=>({...s,saved:s.saved.filter(x=>x.id!==item.id)}))}}}/>}
    {tab==="admin"&&isAdmin&&<AdminConfig config={state.config} setConfig={config=>setState(s=>({...s,config}))}/>}
  </div>;
}
