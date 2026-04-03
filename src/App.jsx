import { useState, useMemo } from "react";

const R = {
  sp500:{1990:-3.10,1991:30.47,1992:7.62,1993:10.08,1994:1.32,1995:37.58,1996:22.96,1997:33.36,1998:28.58,1999:21.04,2000:-9.10,2001:-11.89,2002:-22.10,2003:28.68,2004:10.88,2005:4.91,2006:15.79,2007:5.49,2008:-37.00,2009:26.46,2010:15.06,2011:2.11,2012:16.00,2013:32.39,2014:13.69,2015:1.38,2016:11.96,2017:21.83,2018:-4.38,2019:31.49,2020:18.40,2021:28.71,2022:-18.11,2023:26.29,2024:25.02,2025:17.88},
  nasdaq:{1990:-9.71,1991:65.69,1992:9.57,1993:11.28,1994:2.20,1995:43.24,1996:43.24,1997:21.33,1998:86.01,1999:102.65,2000:-36.14,2001:-31.95,2002:-36.88,2003:49.82,2004:11.14,2005:2.19,2006:7.49,2007:19.37,2008:-41.19,2009:54.24,2010:19.92,2011:3.40,2012:17.52,2013:35.69,2014:18.64,2015:9.13,2016:6.59,2017:32.22,2018:-0.34,2019:38.66,2020:48.28,2021:27.33,2022:-32.27,2023:54.51,2024:25.58,2025:20.87},
  msci_world:{1990:-16.50,1991:19.00,1992:-4.70,1993:23.10,1994:5.60,1995:21.30,1996:14.00,1997:16.20,1998:24.80,1999:25.30,2000:-12.90,2001:-16.50,2002:-19.50,2003:33.80,2004:15.20,2005:10.00,2006:20.70,2007:9.60,2008:-40.30,2009:30.80,2010:12.30,2011:-5.00,2012:16.54,2013:27.37,2014:5.50,2015:-0.32,2016:8.15,2017:23.07,2018:-8.20,2019:28.40,2020:16.50,2021:22.35,2022:-17.73,2023:24.42,2024:19.19,2025:21.60},
  msci_em:{1990:-10.60,1991:59.90,1992:11.40,1993:74.80,1994:-7.30,1995:-5.20,1996:6.00,1997:-11.60,1998:-25.30,1999:66.40,2000:-30.60,2001:-2.40,2002:-6.00,2003:56.30,2004:26.00,2005:34.50,2006:32.60,2007:39.80,2008:-53.20,2009:79.00,2010:19.20,2011:-18.20,2012:18.63,2013:-2.27,2014:-1.82,2015:-14.60,2016:11.60,2017:37.75,2018:-14.24,2019:18.88,2020:18.69,2021:-2.22,2022:-19.74,2023:10.27,2024:8.05,2025:34.36},
  stoxx600:{2000:-1.20,2001:-17.40,2002:-31.30,2003:16.60,2004:12.30,2005:25.40,2006:20.30,2007:2.80,2008:-43.70,2009:32.00,2010:11.60,2011:-8.60,2012:18.10,2013:20.80,2014:7.20,2015:9.60,2016:1.70,2017:10.60,2018:-10.60,2019:27.60,2020:-1.99,2021:24.90,2022:-10.60,2023:15.80,2024:9.50,2025:8.20},
  msci_acwi:{1990:-16.20,1991:19.60,1992:-4.30,1993:23.90,1994:5.30,1995:21.00,1996:14.20,1997:16.00,1998:22.00,1999:27.00,2000:-13.90,2001:-15.90,2002:-19.00,2003:34.60,2004:15.80,2005:11.40,2006:21.50,2007:12.20,2008:-41.80,2009:35.40,2010:13.20,2011:-6.90,2012:16.80,2013:23.44,2014:4.71,2015:-1.84,2016:8.48,2017:24.62,2018:-8.93,2019:27.30,2020:16.82,2021:19.04,2022:-17.96,2023:22.81,2024:18.02,2025:22.87},
  btc:{2014:-29.99,2015:34.47,2016:123.83,2017:1368.90,2018:-73.56,2019:92.20,2020:303.16,2021:59.67,2022:-64.27,2023:155.42,2024:121.05,2025:-6.34},
  eth:{2016:753.00,2017:9162.00,2018:-82.70,2019:-2.05,2020:464.00,2021:399.20,2022:-67.50,2023:91.40,2024:46.30,2025:-44.20},
  gold:{1990:-1.50,1991:-10.10,1992:-5.70,1993:17.70,1994:-2.20,1995:1.00,1996:-4.60,1997:-21.40,1998:-0.80,1999:0.90,2000:-5.40,2001:0.70,2002:24.40,2003:19.90,2004:5.60,2005:18.00,2006:23.00,2007:31.00,2008:5.80,2009:24.00,2010:29.60,2011:10.20,2012:7.00,2013:-28.30,2014:-1.50,2015:-10.40,2016:8.10,2017:13.10,2018:-1.60,2019:18.30,2020:25.10,2021:-3.60,2022:-0.30,2023:13.10,2024:27.20,2025:27.00},
  us_bond:{1990:6.24,1991:15.00,1992:9.36,1993:14.21,1994:-8.04,1995:23.48,1996:1.43,1997:9.94,1998:14.92,1999:-8.25,2000:16.66,2001:5.57,2002:15.12,2003:0.38,2004:4.49,2005:2.87,2006:1.96,2007:10.21,2008:20.10,2009:-11.12,2010:8.46,2011:16.04,2012:2.97,2013:-9.10,2014:10.75,2015:1.28,2016:0.69,2017:2.80,2018:-0.02,2019:9.64,2020:11.33,2021:-4.42,2022:-17.83,2023:3.97,2024:-1.64,2025:3.50},
  reits:{2000:26.36,2001:13.93,2002:3.82,2003:37.13,2004:31.58,2005:11.95,2006:35.06,2007:-15.69,2008:-37.73,2009:27.99,2010:27.58,2011:8.28,2012:17.67,2013:2.86,2014:30.38,2015:2.37,2016:8.52,2017:5.07,2018:-5.95,2019:28.91,2020:-4.64,2021:40.33,2022:-26.21,2023:12.36,2024:8.10,2025:-2.50},
  cash:{2000:5.89,2001:3.83,2002:1.65,2003:1.02,2004:1.20,2005:3.01,2006:4.68,2007:4.66,2008:1.60,2009:0.10,2010:0.12,2011:0.03,2012:0.05,2013:0.07,2014:0.05,2015:0.21,2016:0.51,2017:1.39,2018:2.37,2019:2.28,2020:0.67,2021:0.15,2022:2.02,2023:5.26,2024:5.35,2025:4.50},
  apple:{2005:123.26,2006:18.01,2007:133.47,2008:-56.91,2009:146.90,2010:53.07,2011:25.56,2012:31.40,2013:5.42,2014:37.72,2015:-4.64,2016:10.03,2017:46.11,2018:-6.79,2019:86.16,2020:80.75,2021:33.82,2022:-26.83,2023:48.18,2024:30.07,2025:8.56},
  nvidia:{2005:2.50,2006:6.00,2007:-9.50,2008:-76.00,2009:145.00,2010:-7.00,2011:-18.50,2012:8.50,2013:30.00,2014:21.50,2015:65.00,2016:224.00,2017:81.00,2018:-31.00,2019:76.00,2020:122.00,2021:125.30,2022:-50.26,2023:239.01,2024:171.25,2025:38.92},
  microsoft:{2005:-0.94,2006:15.80,2007:20.82,2008:-44.39,2009:60.53,2010:-6.63,2011:-4.55,2012:6.13,2013:43.69,2014:27.24,2015:22.68,2016:15.01,2017:40.02,2018:20.82,2019:57.56,2020:42.04,2021:52.48,2022:-28.02,2023:56.80,2024:12.15,2025:-3.60},
  tesla:{2013:344.00,2014:48.00,2015:7.30,2016:-10.97,2017:45.70,2018:6.89,2019:25.70,2020:743.44,2021:49.76,2022:-65.03,2023:101.72,2024:-7.16,2025:-30.20},
  amazon:{2005:4.27,2006:-16.29,2007:134.77,2008:-44.65,2009:162.32,2010:33.81,2011:-3.83,2012:44.93,2013:58.96,2014:-22.18,2015:117.78,2016:10.95,2017:55.96,2018:28.43,2019:23.03,2020:76.26,2021:2.38,2022:-49.62,2023:80.88,2024:44.39,2025:-5.80},
  google:{2005:115.24,2006:11.82,2007:50.28,2008:-55.54,2009:101.49,2010:-4.24,2011:9.67,2012:9.44,2013:58.39,2014:-4.81,2015:46.60,2016:1.72,2017:32.93,2018:-0.80,2019:28.18,2020:30.85,2021:65.30,2022:-39.09,2023:58.32,2024:36.10,2025:-10.50},
  coca_cola:{2005:1.49,2006:19.79,2007:27.58,2008:-25.27,2009:28.80,2010:19.21,2011:9.30,2012:6.50,2013:12.39,2014:5.20,2015:3.89,2016:-3.80,2017:13.70,2018:-4.00,2019:24.10,2020:-0.91,2021:8.30,2022:7.37,2023:-7.20,2024:5.50,2025:12.00},
  meta:{2013:105.00,2014:42.83,2015:34.15,2016:9.93,2017:53.38,2018:-25.71,2019:56.57,2020:33.09,2021:23.13,2022:-64.22,2023:194.13,2024:65.17,2025:-1.20},
};

const ASSETS = [
  {id:"sp500",name:"S&P 500",cat:"idx",f:5,s:15,uf:false},
  {id:"nasdaq",name:"Nasdaq 100",cat:"idx",f:7,s:20,uf:false},
  {id:"msci_world",name:"MSCI World",cat:"idx",f:6,s:15,uf:false},
  {id:"msci_em",name:"Emergentes",cat:"idx",f:7.5,s:20,uf:false},
  {id:"stoxx600",name:"Europa 600",cat:"idx",f:5.5,s:15,uf:false},
  {id:"msci_acwi",name:"MSCI ACWI",cat:"idx",f:6,s:15,uf:false},
  {id:"apple",name:"Apple",cat:"stk",f:10,s:30,uf:true},
  {id:"nvidia",name:"NVIDIA",cat:"stk",f:13,s:35,uf:true},
  {id:"microsoft",name:"Microsoft",cat:"stk",f:10,s:28,uf:true},
  {id:"tesla",name:"Tesla",cat:"stk",f:12,s:40,uf:true},
  {id:"amazon",name:"Amazon",cat:"stk",f:11,s:30,uf:true},
  {id:"google",name:"Alphabet",cat:"stk",f:10,s:28,uf:true},
  {id:"coca_cola",name:"Coca-Cola",cat:"stk",f:7,s:15,uf:true},
  {id:"meta",name:"Meta",cat:"stk",f:11,s:35,uf:true},
  {id:"us_bond",name:"Bonos USA 10Y",cat:"fi",f:4.5,s:8,uf:false},
  {id:"cash",name:"Monetario",cat:"fi",f:3,s:2,uf:false},
  {id:"btc",name:"Bitcoin",cat:"cry",f:15,s:60,uf:true},
  {id:"eth",name:"Ethereum",cat:"cry",f:12,s:65,uf:true},
  {id:"gold",name:"Oro",cat:"alt",f:5,s:15,uf:false},
  {id:"reits",name:"REITs",cat:"alt",f:6.5,s:15,uf:false},
];

const CATS = [{id:"idx",name:"Indices"},{id:"stk",name:"Acciones"},{id:"fi",name:"Renta Fija"},{id:"cry",name:"Cripto"},{id:"alt",name:"Otros"}];
const CEIL = {cry:{s:150,l:15},stk:{s:100,l:15}};
const CATCO = {idx:"#3b82f6",stk:"#10b981",fi:"#1e40af",cry:"#f59e0b",alt:"#92400e"};

function getYears(id){const d=R[id];return d?Object.keys(d).map(Number).sort((a,b)=>a-b):[];}
function dataLen(id){return getYears(id).length;}
function getCeil(cat,h){const c=CEIL[cat];return c?c.l+(c.s-c.l)/(1+h/3):null;}
function rollingCAGRs(id,h){
  const d=R[id];if(!d)return[];const yrs=getYears(id);if(h<1||h>yrs.length-1)return[];
  const a=ASSETS.find(x=>x.id===id);const cap=a?getCeil(a.cat,h):null;const out=[];
  for(let i=0;i<=yrs.length-h;i++){let cum=1;for(let j=0;j<h;j++){const ret=d[yrs[i+j]];if(ret===undefined){cum=-1;break;}cum*=(1+ret/100);}if(cum>0){let cagr=(Math.pow(cum,1/h)-1)*100;if(cap!==null&&cagr>cap)cagr=cap;out.push(cagr);}}
  return out.sort((a,b)=>a-b);
}
function pctl(arr,p){if(!arr.length)return null;const i=(p/100)*(arr.length-1);const lo=Math.floor(i),hi=Math.ceil(i);return lo===hi?arr[lo]:arr[lo]+(arr[hi]-arr[lo])*(i-lo);}
function getSc(id,h){
  const a=ASSETS.find(x=>x.id===id);if(!a)return{p:0,e:0,o:0};
  const rolled=rollingCAGRs(id,h);const nD=dataLen(id);const ok=rolled.length>=3;let exp;
  if(a.uf){if(ok){const hm=pctl(rolled,50);let wH=1/(1+h/5);if(h>nD*0.5)wH=0.15;exp=wH*hm+(1-wH)*a.f;}else{exp=a.f;}}
  else{exp=ok?pctl(rolled,50):a.f;}
  const sp=a.s/Math.sqrt(Math.max(h,1));
  return{p:exp-sp,e:exp,o:exp+sp};
}
function calcProj(ini,mo,yrs,rate){
  const mr=rate/100/12;const d=[{y:0,v:ini,inv:ini}];let v=ini,inv=ini;
  for(let y=1;y<=yrs;y++){for(let m=0;m<12;m++){v=v*(1+mr)+mo;inv+=mo;}d.push({y,v,inv});}return d;
}

const fm=n=>n>=1e6?(n/1e6).toFixed(1)+"M":n.toLocaleString("es-ES",{maximumFractionDigits:0});
const fp=n=>(n>=0?"+":"")+n.toFixed(1)+"%";
const COL=["#f87171","#10b981","#60a5fa"];

function LineChart({data,years}){
  if(!data||!data[0])return null;
  const W=580,H=200,pad={l:50,r:10,t:10,b:24};
  const w=W-pad.l-pad.r,h=H-pad.t-pad.b;
  const allVals=data.flatMap(d=>d.map(p=>p.v));
  const maxVal=Math.max(...allVals)*1.05;
  const scX=yr=>pad.l+(yr/years)*w;
  const scY=val=>pad.t+h-(val/maxVal)*h;
  const makeLine=pts=>pts.map((p,i)=>(i===0?"M":"L")+scX(p.y).toFixed(1)+","+scY(p.v).toFixed(1)).join(" ");
  const fmtTick=v=>v>=1e6?(v/1e6).toFixed(1)+"M":v>=1e3?(v/1e3).toFixed(0)+"k":v.toFixed(0);
  const gridLines=[0,0.25,0.5,0.75,1].map(f=>maxVal*f);
  return(
    <div>
      <svg viewBox={"0 0 "+W+" "+H} width="100%" style={{display:"block"}}>
        {gridLines.map((val,i)=>(<g key={i}><line x1={pad.l} y1={scY(val)} x2={W-pad.r} y2={scY(val)} stroke="#f0f0f0" strokeWidth="0.7"/><text x={pad.l-4} y={scY(val)+3} textAnchor="end" fontSize="9" fill="#bbb" fontFamily="monospace">{fmtTick(val)}</text></g>))}
        {Array.from({length:Math.min(years+1,8)},(_,i)=>{const yr=Math.round((i/Math.min(years,7))*years);return <text key={yr} x={scX(yr)} y={H-4} textAnchor="middle" fontSize="9" fill="#bbb">{yr}a</text>;})}
        <path d={data[0][0]?makeLine(data[0].map(p=>({y:p.y,v:p.inv}))):""} fill="none" stroke="#d1d5db" strokeWidth="1" strokeDasharray="5,4"/>
        <path d={makeLine(data[2])+data[0].slice().reverse().map(p=>"L"+scX(p.y).toFixed(1)+","+scY(p.v).toFixed(1)).join("")+"Z"} fill="#10b981" opacity="0.05"/>
        <path d={makeLine(data[0])} fill="none" stroke={COL[0]} strokeWidth="1.3" strokeDasharray="6,4"/>
        <path d={makeLine(data[1])} fill="none" stroke={COL[1]} strokeWidth="2.5"/>
        <path d={makeLine(data[2])} fill="none" stroke={COL[2]} strokeWidth="1.3" strokeDasharray="6,4"/>
      </svg>
      <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:4,fontSize:11,color:"#aaa"}}>
        {["Pesimista","Esperado","Optimista"].map((n,i)=>(<span key={i} style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:12,height:2,background:COL[i],display:"inline-block",borderRadius:1}}/>{n}</span>))}
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:12,height:0,borderTop:"1.5px dashed #d1d5db",display:"inline-block"}}/>Aportado</span>
      </div>
    </div>
  );
}

export default function App(){
  const[ini,setIni]=useState(10000);
  const[mo,setMo]=useState(300);
  const[yr,setYr]=useState(15);
  const[sel,setSel]=useState(["msci_world","sp500","us_bond","gold"]);
  const[wt,setWt]=useState({msci_world:50,sp500:25,us_bond:20,gold:5});
  const[tab,setTab]=useState("idx");
  const[showMeth,setShowMeth]=useState(false);

  const tW=sel.reduce((s,id)=>s+(wt[id]||0),0);
  const nW=useMemo(()=>{if(tW===0)return{};const n={};sel.forEach(id=>{n[id]=((wt[id]||0)/tW)*100;});return n;},[sel,wt,tW]);
  const tog=id=>{if(sel.includes(id)){setSel(sel.filter(a=>a!==id));const w={...wt};delete w[id];setWt(w);}else{setSel([...sel,id]);setWt({...wt,[id]:0});}};

  const pS=useMemo(()=>{
    if(sel.length===0||tW===0)return null;
    let wP=0,wE=0,wO=0;const ld=[];
    sel.forEach(id=>{const nw=(nW[id]||0)/100;if(nw===0)return;const sc=getSc(id,yr);wP+=nw*sc.p;wE+=nw*sc.e;wO+=nw*sc.o;
    if(dataLen(id)>0&&yr>dataLen(id)*0.5){const a=ASSETS.find(x=>x.id===id);if(a)ld.push(a.name);}});
    return{p:wP,e:wE,o:wO,ld};
  },[sel,nW,yr,tW]);

  const scs=useMemo(()=>{if(!pS)return null;return[{l:"Pesimista",r:pS.p,d:calcProj(ini,mo,yr,pS.p)},{l:"Esperado",r:pS.e,d:calcProj(ini,mo,yr,pS.e)},{l:"Optimista",r:pS.o,d:calcProj(ini,mo,yr,pS.o)}];},[pS,ini,mo,yr]);
  const tI=ini+mo*12*yr;

  const rL=useMemo(()=>{if(!tW)return 0;let rs=0;const cr={idx:2,stk:3,fi:0.5,cry:4,alt:1.5};sel.forEach(id=>{const a=ASSETS.find(x=>x.id===id);rs+=((nW[id]||0)/100)*(cr[a?.cat]||1);});return rs<1?0:rs<2?1:rs<3?2:3;},[sel,nW,tW]);

  const cC=useMemo(()=>CATS.map(c=>({id:c.id,name:c.name,w:sel.filter(id=>ASSETS.find(a=>a.id===id)?.cat===c.id).reduce((s,id)=>s+(nW[id]||0),0)})).filter(c=>c.w>0),[sel,nW]);

  const catAssets=ASSETS.filter(a=>a.cat===tab);
  const cd={background:"#fff",borderRadius:12,padding:16,border:"1px solid #eee",marginBottom:12};
  const rlC=["#10b981","#f59e0b","#f97316","#ef4444"];
  const rlN=["Bajo","Moderado","Alto","Muy alto"];
  const rlD=["Conservadora","Equilibrada","Crecimiento","Agresiva"];

  return(
    <div style={{fontFamily:"system-ui,sans-serif",background:"#f5f7fa",minHeight:"100vh",color:"#1f2937"}}>
      <div style={{maxWidth:680,margin:"0 auto",padding:"20px 16px 40px"}}>

        <h1 style={{fontSize:22,fontWeight:800,marginBottom:4}}>Simulador de Cartera</h1>
        <p style={{fontSize:12,color:"#999",marginBottom:14}}>Rolling returns historicos + estimaciones de analistas</p>
        <div style={{background:"#ecfdf5",borderRadius:10,padding:"7px 14px",marginBottom:14,fontSize:12,color:"#065f46"}}>Ejemplo: Cartera equilibrada global - personaliza a tu gusto</div>

        {/* Params */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:10,marginBottom:14}}>
          {[{l:"Inversion inicial",v:ini,fn:setIni,mx:5000000,st:500,u:"EUR"},{l:"Aportacion mensual",v:mo,fn:setMo,mx:50000,st:25,u:"EUR/mes"},{l:"Horizonte",v:yr,fn:setYr,mx:50,st:1,u:"anos"}].map(p=>(
            <div key={p.l} style={cd}>
              <div style={{fontSize:11,color:"#aaa",marginBottom:4}}>{p.l}</div>
              <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                <input type="number" value={p.v} min={0} max={p.mx} step={p.st} onChange={e=>p.fn(Math.max(0,Math.min(p.mx,Number(e.target.value)||0)))} style={{width:"100%",border:"none",fontSize:20,fontWeight:800,outline:"none",fontFamily:"monospace",color:"#111"}}/>
                <span style={{fontSize:11,color:"#bbb",whiteSpace:"nowrap"}}>{p.u}</span>
              </div>
              <input type="range" min={0} max={p.mx} step={p.st} value={p.v} onChange={e=>p.fn(Number(e.target.value))} style={{width:"100%",marginTop:6}}/>
            </div>
          ))}
        </div>

        {/* Tabs + Chips */}
        <div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap"}}>
          {CATS.map(c=>{const n=sel.filter(id=>ASSETS.find(a=>a.id===id)?.cat===c.id).length;return(
            <button key={c.id} onClick={()=>setTab(c.id)} style={{padding:"6px 14px",borderRadius:8,border:"none",fontSize:12,fontWeight:700,cursor:"pointer",background:tab===c.id?"#fff":"transparent",color:tab===c.id?"#111":"#aaa",boxShadow:tab===c.id?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>{c.name}{n>0?" ("+n+")":""}</button>
          );})}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
          {catAssets.map(a=>{const on=sel.includes(a.id);return(
            <button key={a.id} onClick={()=>tog(a.id)} style={{padding:"6px 14px",borderRadius:20,border:on?"2px solid #10b981":"2px solid #e5e7eb",background:on?"#ecfdf5":"#fff",color:on?"#065f46":"#555",fontSize:13,fontWeight:600,cursor:"pointer"}}>{a.name}{on?" \u2713":""}</button>
          );})}
        </div>

        {/* Weights */}
        {sel.length>0&&<div style={cd}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <span style={{fontSize:13,fontWeight:700}}>Pesos: <span style={{color:Math.abs(tW-100)<1?"#10b981":"#f59e0b",fontFamily:"monospace"}}>{tW}%</span> / 100%</span>
            <button onClick={()=>{const w=Math.floor(100/sel.length);const rem=100-w*sel.length;const n={};sel.forEach((id,i)=>{n[id]=w+(i<rem?1:0);});setWt(n);}} style={{fontSize:11,background:"#f3f4f6",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>Equiponderar</button>
          </div>
          {sel.map(id=>{const a=ASSETS.find(x=>x.id===id);return(
            <div key={id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <span style={{width:100,fontSize:12,fontWeight:600}}>{a.name}</span>
              <input type="range" min={0} max={100} value={wt[id]||0} onChange={e=>setWt({...wt,[id]:Number(e.target.value)})} style={{flex:1}}/>
              <div style={{display:"flex",alignItems:"center",background:"#f9fafb",border:"1.5px solid #eee",borderRadius:8,width:56,flexShrink:0}}>
                <input type="number" min={0} max={100} value={wt[id]||0} onChange={e=>setWt({...wt,[id]:Math.max(0,Math.min(100,Number(e.target.value)||0))})} style={{width:34,border:"none",background:"transparent",textAlign:"right",fontSize:12,fontWeight:700,outline:"none",padding:"4px 0 4px 3px",fontFamily:"monospace",color:"#333"}}/>
                <span style={{fontSize:10,color:"#bbb",paddingRight:5}}>%</span>
              </div>
              <button onClick={()=>tog(id)} style={{background:"none",border:"none",color:"#ccc",cursor:"pointer",fontSize:16}}>x</button>
            </div>
          );})}
        </div>}

        {/* Results */}
        {scs&&<div>
          {pS.ld.length>0&&<div style={{padding:"8px 14px",borderRadius:10,background:"#fffbeb",border:"1px solid #fef3c7",fontSize:11,color:"#92400e",marginBottom:10}}>Datos limitados: {pS.ld.join(", ")}</div>}

          {/* Scenario cards */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:10,marginBottom:12}}>
            {scs.map((s,i)=>{const fin=s.d[s.d.length-1].v;const pr=fin-tI;const mu=tI>0?fin/tI:0;return(
              <div key={i} style={{...cd,marginBottom:0,border:i===1?"2px solid #10b98133":"1px solid #eee",background:i===1?"#f0fdf8":"#fff",position:"relative"}}>
                {i===1&&<div style={{position:"absolute",top:-1,left:"50%",transform:"translateX(-50%)",background:"#10b981",color:"#fff",fontSize:8,fontWeight:800,padding:"2px 8px",borderRadius:"0 0 6px 6px"}}>{s.l}</div>}
                <div style={{fontSize:10,fontWeight:700,color:COL[i],textTransform:"uppercase",marginBottom:5,marginTop:i===1?6:0}}>{s.l}</div>
                <div style={{fontSize:24,fontWeight:800,fontFamily:"monospace",color:"#111"}}>{fm(fin)} EUR</div>
                <div style={{fontSize:10,color:"#aaa",marginTop:2}}>{fp(s.r)} /ano</div>
                <div style={{fontSize:11,color:pr>=0?"#10b981":"#ef4444",fontWeight:600,marginTop:6,paddingTop:6,borderTop:"1px solid #f3f4f6"}}>{pr>=0?"+":""}{fm(pr)} | x{mu.toFixed(1)}</div>
              </div>
            );})}
          </div>

          {/* Chart */}
          <div style={cd}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>Evolucion</div>
            <LineChart data={[scs[0].d,scs[1].d,scs[2].d]} years={yr}/>
          </div>

          {/* Portfolio + Risk row */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:10,marginBottom:12}}>
            <div style={cd}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>Tu cartera</div>
              {cC.map(c=><div key={c.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                <div style={{width:8,height:8,borderRadius:2,background:CATCO[c.id]}}/>
                <span style={{flex:1,fontSize:12,color:"#777"}}>{c.name}</span>
                <span style={{fontSize:12,fontFamily:"monospace",fontWeight:600,color:"#999"}}>{Math.round(c.w)}%</span>
              </div>)}
            </div>
            <div style={cd}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>Riesgo</div>
              <div style={{display:"flex",gap:2,marginBottom:5}}>{rlC.map((c,i)=><div key={i} style={{flex:1,height:5,borderRadius:3,background:i<=rL?c:"#eee"}}/>)}</div>
              <div style={{fontSize:13,fontWeight:700,color:rlC[rL]}}>{rlN[rL]}</div>
              <div style={{fontSize:11,color:"#aaa"}}>{rlD[rL]}</div>
            </div>
          </div>

          {/* Invest vs Market */}
          <div style={{display:"flex",gap:10,marginBottom:12}}>
            <div style={{flex:1,background:"#f9fafb",borderRadius:10,padding:12,textAlign:"center"}}>
              <div style={{fontSize:10,color:"#aaa"}}>Tu aportas</div>
              <div style={{fontSize:16,fontWeight:800,fontFamily:"monospace"}}>{fm(tI)} EUR</div>
            </div>
            <div style={{flex:1,background:"#ecfdf5",borderRadius:10,padding:12,textAlign:"center"}}>
              <div style={{fontSize:10,color:"#aaa"}}>El mercado genera</div>
              <div style={{fontSize:16,fontWeight:800,fontFamily:"monospace",color:"#10b981"}}>+{fm(Math.max(0,scs[1].d[scs[1].d.length-1].v-tI))} EUR</div>
            </div>
          </div>

          {/* Methodology */}
          <div style={{...cd,padding:0}}>
            <button onClick={()=>setShowMeth(!showMeth)} style={{width:"100%",padding:"12px 16px",border:"none",background:"transparent",display:"flex",justifyContent:"space-between",cursor:"pointer",fontSize:12,fontWeight:600,color:"#999"}}>
              <span>Como se calcula?</span><span>{showMeth?"▲":"▼"}</span>
            </button>
            {showMeth&&<div style={{padding:"0 16px 14px",fontSize:11,color:"#aaa",lineHeight:1.7}}>Indices y RF usan mediana de rolling returns historicos. Acciones y cripto combinan historico con estimaciones forward (JP Morgan, Vanguard) y techo convergente. El spread pesimista/optimista se reduce con el horizonte (raiz cuadrada del tiempo).</div>}
          </div>

          {/* Warning */}
          <div style={{fontSize:11,color:"#92400e",background:"#fffbeb",padding:12,borderRadius:10,textAlign:"center",border:"1px solid #fef3c7",marginBottom:12}}>
            Rentabilidades pasadas no garantizan resultados futuros. Simulacion educativa.
          </div>

          {/* CTA */}
          <div style={{padding:18,borderRadius:14,background:"linear-gradient(135deg,#ecfdf5,#f0fdf4)",border:"1px solid #bbf7d0",textAlign:"center"}}>
            <div style={{fontSize:14,fontWeight:800,color:"#065f46",marginBottom:3}}>Quieres optimizar tu cartera?</div>
            <div style={{fontSize:11,color:"#888",marginBottom:10}}>Proximamente: optimizacion con IA, escenario de crisis, comparador de brokers.</div>
            <button onClick={()=>window.open("https://forms.gle/JMZg1w5eAUHnYVHw8","_blank")} style={{padding:"8px 20px",fontSize:12,background:"#10b981",color:"#fff",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer"}}>Avisarme</button>
          </div>
        </div>}

        <div style={{textAlign:"center",marginTop:24,fontSize:10,color:"#ddd"}}>Portfolio Simulator MVP 2026</div>
      </div>
    </div>
  );
}
