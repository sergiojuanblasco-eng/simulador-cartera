import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { supabase } from "./lib/supabase";

/* ══════════════════════════════════════════════
   ROUTING — pathname-based, multi-HTML
   ══════════════════════════════════════════════ */
function useRouter() {
  const raw = window.location.pathname;
  const simMatch = raw.match(/\/simulacion\/(.+)/);
  const path = simMatch ? "/simulacion"
    : raw.includes("interes-compuesto") ? "/interes-compuesto"
    : raw.includes("simulador-cartera") ? "/simulador-cartera"
    : raw.includes("login") ? "/login"
    : raw.includes("onboarding") ? "/onboarding"
    : raw.includes("dashboard") ? "/dashboard"
    : "/";
  const simSlug = simMatch ? simMatch[1].replace(/\/+$/,"") : null;
  const go = useCallback((p) => {
    window.history.pushState({},"",p);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);
  return { path, go, simSlug };
}

/* ══════════════════════════════════════════════
   DATA — imported from JSON
   ══════════════════════════════════════════════ */
import ASSETS from "./data/assets.json";
import R from "./data/returns.json";
import SIMS from "./data/simulations.json";

const CATS=[{id:"idx",name:{es:"Índices",en:"Indices"}},{id:"stk",name:{es:"Acciones",en:"Stocks"}},{id:"fi",name:{es:"Renta Fija",en:"Fixed Income"}},{id:"cry",name:{es:"Cripto",en:"Crypto"}},{id:"alt",name:{es:"Otros",en:"Others"}},{id:"etf",name:{es:"ETF Sect.",en:"Sector ETFs"}}];
const CATCO={idx:"#3b82f6",stk:"#16754E",fi:"#1e40af",cry:"#d97706",alt:"#92400e",etf:"#7c3aed"};
const COL=["#e05252","#16754E","#4a8fe7"];

/* ══ DESIGN TOKENS (matching Claude Design landing) ══ */
const TH={
  bg:"#FBFAF8",bg2:"#F2F0EB",card:"#fff",
  dark:"#1B1B18",text:"#272720",muted:"#71717A",light:"#A1A1AA",
  border:"#E4E4E0",border2:"#F4F4F5",
  green:"#16754E",greenLight:"#E8F5EF",greenText:"#14532D",
  red:"#B91C1C",redLight:"#FEF2F2",
  blue:"#1e40af",blueLight:"#EFF6FF",
  sans:"'Plus Jakarta Sans',system-ui,sans-serif",
  serif:"'Instrument Serif',Georgia,serif",
  r:12,r2:16
};

/* ══════════════════════════════════════════════
   I18N
   ══════════════════════════════════════════════ */
const T={
  es:{
    ci:"Interés Compuesto",sim:"Simulador de Cartera",
    ciSub:"Calcula cuánto crecerá tu dinero con el poder del interés compuesto",
    capIni:"Capital inicial",aport:"Aportación",intAnual:"Interés anual",horiz:"Horizonte",anos:"años",
    capFin:"Capital final",tuAp:"Tu aportas",intGen:"Intereses generados",sobreAp:"sobre lo aportado",
    evo:"Evolución",capital:"Capital",
    noSabes:"Los intereses fijos no existen",
    pruebaEl:"En la realidad los mercados suben Y bajan. Descubre qué habría pasado con tu dinero usando datos históricos reales.",
    verSim:"Ver simulador con datos reales",
    pess:"Pesimista",esp:"Esperado",opt:"Optimista",ano:"/año",
    preset:"Ejemplo: Cartera equilibrada global — personaliza a tu gusto",
    pesos:"Pesos",equi:"Equiponderar",tuCart:"Tu cartera",riesgo:"Riesgo",
    riskL:["Bajo","Moderado","Alto","Muy alto"],mktGen:"Mercado genera",
    desglose:"Desglose por activo",activo:"Activo",peso:"Peso",rendEsp:"Rend. esperado",contrib:"Contribución",
    como:"¿Cómo se calcula?",
    metodo:"1. Para cada año histórico se calcula el retorno de la cartera completa. Si un activo no existía ese año (ej. Bitcoin antes de 2014), se redistribuye su peso entre los demás activos proporcionalmente. Esto permite usar hasta 35 años de datos sin descartar información.\n\n2. Con esos retornos anuales, se generan ventanas rolling del horizonte elegido (ej. todas las ventanas de 10 años: 1990-1999, 1991-2000...) y se calcula el CAGR (rentabilidad anualizada compuesta) de cada una.\n\n3. Los escenarios salen de percentiles reales de esa distribución: P10 = pesimista, P50 (mediana) = esperado, P90 = optimista.\n\n4. La probabilidad de pérdida es el % de ventanas que terminaron en negativo. Si es 0 en la muestra, se muestra '< 1%' porque el riesgo cero no existe.\n\n5. Para activos con retornos extremos (crypto, growth stocks), se comprime la parte que supera el +50% anual para evitar que un año excepcional distorsione las proyecciones a futuro.\n\n6. Si el horizonte elegido supera los datos disponibles, se usan las tasas del horizonte máximo calculable y se proyectan al plazo deseado, indicándolo claramente.",
    warn:"Rentabilidades pasadas no garantizan resultados futuros. Simulación educativa.",
    optim:"Acceso anticipado al análisis con IA",
    prox:"Los primeros usuarios tendrán acceso gratuito",
    avisarme:"Quiero acceso",
    mes:"mes",anoF:"año",eurMes:"EUR/mes",eurAno:"EUR/año",
    probPerd:"Probabilidad de perder dinero",
    insight:"En {yr} años, esta cartera ha tenido pérdidas en {pct} de los casos históricos",
    peorCaso:"Peor escenario histórico",
    alerta:"Alta probabilidad de pérdidas a corto plazo. Considera ampliar tu horizonte.",
    pocasVentanas:"Resultado basado en pocas observaciones históricas ({n} ventanas)",
    proyectado:"Tasas basadas en ventanas de {real} años (máximo disponible), proyectadas a {target} años",
    heroTitle:"Toma el control de tu dinero",
    heroSub:"Herramientas gratuitas para entender tu cartera de inversión con datos reales — sin humo, sin promesas falsas.",
    toolIC:"Calculadora de Interés Compuesto",
    toolICdesc:"Calcula cuánto crecería tu dinero con un interés fijo. Ideal para entender el efecto del tiempo.",
    toolSim:"Simulador de Cartera",
    toolSimDesc:"Proyección realista con datos de 30+ activos, escenarios y probabilidades de pérdida.",
    toolSimBadge:"PRO",
    irA:"Ir a la herramienta",
    homeWhy:"¿Por qué Kartera?",
    homeW1t:"Datos reales",homeW1d:"35 años de retornos históricos de índices, acciones, bonos, crypto y más.",
    homeW2t:"Riesgo honesto",homeW2d:"No solo cuánto puedes ganar — cuánto puedes perder y con qué probabilidad.",
    homeW3t:"Sin conflicto",homeW3d:"No vendemos fondos ni cobramos comisiones. Solo educación financiera.",
    proximamente:"Próximamente",proxItems:"Optimización de cartera con IA | Escenario de crisis (stress test) | Comparador de brokers",
    homeSims:"Simulaciones populares",homeSimsCta:"Explora cómo se comportan las carteras más buscadas con datos reales.",
    homeCtaTitle:"¿Tienes una cartera en mente?",homeCtaBig:"Simula tu propia cartera con tus porcentajes",homeCtaBtn:"Ir al simulador →",
    intEsp:"Interés esperado",yearN:"Año",
    buscar:"Buscar activo...",tuCartera:"Tu cartera",addActivos:"Añadir activos",
    verN:"Ver los {n}",cerrar:"Cerrar",nActivos:"{n} activos",
    analisis:"Análisis de tu cartera",sinProblemas:"Tu cartera no presenta problemas evidentes.",
    perfil:"Tu perfil de inversor",
    perfilOps:["Conservador","Moderado","Agresivo","Muy agresivo"],
    catRiesgo:"Riesgo",catDiversi:"Diversificación",catCoher:"Coherencia",
    nota:"Nota de tu cartera",
    notaLabels:["Crítica","Débil","Mejorable","Buena","Excelente"],
    inspirar:"Este análisis es orientativo. Ninguna herramienta sustituye tu criterio: tú conoces tu situación, tus objetivos y lo que te deja dormir tranquilo. La mejor cartera no es la perfecta — es la que puedes mantener.",
    compartir:"Compartir mi cartera",descargado:"Imagen descargada",
    seoH1:"¿Qué es el interés compuesto?",seoP1:"El interés compuesto es el proceso por el cual una inversión genera ganancias que se reinvierten, generando a su vez nuevas ganancias. A largo plazo, este efecto permite que el dinero crezca de forma exponencial. Albert Einstein lo llamó \"la fuerza más poderosa del universo\" — y con razón: la diferencia entre invertir a los 25 o a los 35 puede ser de cientos de miles de euros al jubilarte.",
    seoH2:"Cómo usar la calculadora de interés compuesto",seoP2:"Introduce tu inversión inicial, las aportaciones periódicas (mensuales o anuales), el interés estimado y el número de años. La calculadora te mostrará cómo crecería tu dinero con el paso del tiempo, separando lo que aportas de lo que genera el mercado por ti.",
    seoH3:"¿Qué rentabilidad usar?",seoP3:"Elegir un porcentaje fijo puede ser engañoso. En la realidad, los mercados fluctúan constantemente: un año pueden subir un 30% y al siguiente caer un 20%. La media histórica del S&P 500 ronda el 7-10% anual, pero tu experiencia real dependerá de cuándo inviertas y en qué activos.",
    seoCta:"¿Quieres ver datos reales?",seoCtaDesc:"Nuestro simulador de cartera usa 35 años de retornos históricos de 30+ activos para mostrarte escenarios pesimista, esperado y optimista.",seoCtaBtn:"Ver simulación realista de cartera",
  },
  en:{
    ci:"Compound Interest",sim:"Portfolio Simulator",
    ciSub:"Calculate how your money will grow with the power of compound interest",
    capIni:"Initial capital",aport:"Contribution",intAnual:"Annual interest",horiz:"Horizon",anos:"years",
    capFin:"Final capital",tuAp:"You contribute",intGen:"Interest earned",sobreAp:"on contributed",
    evo:"Evolution",capital:"Capital",
    noSabes:"Fixed interest rates don't exist",
    pruebaEl:"In reality markets go up AND down. Discover what would have happened to your money using real historical data.",
    verSim:"See simulator with real data",
    pess:"Pessimistic",esp:"Expected",opt:"Optimistic",ano:"/year",
    preset:"Example: Balanced global portfolio — customize to your liking",
    pesos:"Weights",equi:"Equal weight",tuCart:"Your portfolio",riesgo:"Risk",
    riskL:["Low","Moderate","High","Very high"],mktGen:"Market generates",
    desglose:"Breakdown by asset",activo:"Asset",peso:"Weight",rendEsp:"Exp. return",contrib:"Contribution",
    como:"How is this calculated?",
    metodo:"1. For each historical year, the full portfolio return is computed. If an asset didn't exist that year (e.g. Bitcoin before 2014), its weight is redistributed proportionally among available assets. This lets us use up to 35 years of data without discarding information.\n\n2. Using those annual returns, rolling windows of the chosen horizon are generated (e.g. all 10-year windows: 1990-1999, 1991-2000...) and the CAGR (compound annual growth rate) of each is calculated.\n\n3. Scenarios come from real percentiles of that distribution: P10 = pessimistic, P50 (median) = expected, P90 = optimistic.\n\n4. Loss probability is the % of windows that ended negative. If 0 in the sample, we show '< 1%' because zero risk doesn't exist.\n\n5. For assets with extreme returns (crypto, growth stocks), returns above +50% annually are compressed so that one exceptional year doesn't distort future projections.\n\n6. If the chosen horizon exceeds available data, rates from the longest calculable horizon are used and projected to the desired term, clearly indicated.",
    warn:"Past performance does not guarantee future results. Educational simulation.",
    optim:"Early access to AI-powered analysis",
    prox:"First users will get free access",
    avisarme:"Get access",
    mes:"month",anoF:"year",eurMes:"EUR/mo",eurAno:"EUR/yr",
    probPerd:"Probability of losing money",
    insight:"Over {yr} years, this portfolio lost money in {pct} of historical cases",
    peorCaso:"Worst historical scenario",
    alerta:"High probability of short-term losses. Consider extending your horizon.",
    pocasVentanas:"Result based on few historical observations ({n} windows)",
    proyectado:"Rates based on {real}-year windows (max available), projected to {target} years",
    heroTitle:"Take control of your money",
    heroSub:"Free tools to understand your investment portfolio with real data — no smoke, no false promises.",
    toolIC:"Compound Interest Calculator",
    toolICdesc:"Calculate how your money would grow at a fixed rate. Great for understanding the effect of time.",
    toolSim:"Portfolio Simulator",
    toolSimDesc:"Realistic projection with 30+ assets, scenarios, and loss probabilities.",
    toolSimBadge:"PRO",
    irA:"Go to tool",
    homeWhy:"Why Kartera?",
    homeW1t:"Real data",homeW1d:"35 years of historical returns from indices, stocks, bonds, crypto and more.",
    homeW2t:"Honest risk",homeW2d:"Not just how much you can earn — how much you can lose and how likely.",
    homeW3t:"No conflict",homeW3d:"We don't sell funds or charge commissions. Just financial education.",
    proximamente:"Coming soon",proxItems:"AI portfolio optimization | Crisis scenario (stress test) | Broker comparison",
    homeSims:"Popular simulations",homeSimsCta:"Explore how the most searched portfolios perform with real data.",
    homeCtaTitle:"Have a portfolio in mind?",homeCtaBig:"Simulate your own portfolio with your percentages",homeCtaBtn:"Go to simulator →",
    intEsp:"Expected interest",yearN:"Year",
    buscar:"Search asset...",tuCartera:"Your portfolio",addActivos:"Add assets",
    verN:"See all {n}",cerrar:"Close",nActivos:"{n} assets",
    analisis:"Portfolio analysis",sinProblemas:"Your portfolio shows no obvious issues.",
    perfil:"Your investor profile",
    perfilOps:["Conservative","Moderate","Aggressive","Very aggressive"],
    catRiesgo:"Risk",catDiversi:"Diversification",catCoher:"Coherence",
    nota:"Portfolio score",
    notaLabels:["Critical","Weak","Needs improvement","Good","Excellent"],
    inspirar:"This analysis is for guidance only. No tool replaces your judgment: you know your situation, your goals and what lets you sleep at night. The best portfolio isn't the perfect one — it's the one you can stick with.",
    compartir:"Share my portfolio",descargado:"Image downloaded",
    seoH1:"What is compound interest?",seoP1:"Compound interest is the process by which an investment generates earnings that are reinvested, which in turn generate their own earnings. Over the long term, this effect allows money to grow exponentially. Albert Einstein called it \"the most powerful force in the universe\" — and with good reason: the difference between starting to invest at 25 vs 35 can be hundreds of thousands of euros by retirement.",
    seoH2:"How to use the compound interest calculator",seoP2:"Enter your initial investment, periodic contributions (monthly or annual), the estimated interest rate and the number of years. The calculator will show you how your money would grow over time, separating what you contribute from what the market generates for you.",
    seoH3:"What return rate should you use?",seoP3:"Choosing a fixed percentage can be misleading. In reality, markets fluctuate constantly: one year they might rise 30% and the next fall 20%. The historical average of the S&P 500 is around 7-10% annually, but your actual experience will depend on when you invest and in which assets.",
    seoCta:"Want to see real data?",seoCtaDesc:"Our portfolio simulator uses 35 years of historical returns from 30+ assets to show you pessimistic, expected and optimistic scenarios.",seoCtaBtn:"See realistic portfolio simulation",
  }
};

/* ══════════════════════════════════════════════
   UTILITY
   ══════════════════════════════════════════════ */
function gY(id){const d=R[id];return d?Object.keys(d).map(Number).sort((a,b)=>a-b):[];}
function pc(a,p){if(!a.length)return null;const i=(p/100)*(a.length-1);const l=Math.floor(i),h=Math.ceil(i);return l===h?a[l]:a[l]+(a[h]-a[l])*(i-l);}
function cP(ini,mo,yrs,rate){const mr=rate/100/12;const d=[{y:0,v:ini,inv:ini}];let v=ini,inv=ini;for(let y=1;y<=yrs;y++){for(let m=0;m<12;m++){v=v*(1+mr)+mo;inv+=mo;}d.push({y,v,inv});}return d;}
const fm=n=>n>=1e6?(n/1e6).toFixed(1)+"M":n.toLocaleString("es-ES",{maximumFractionDigits:0});
const fp=n=>(n>=0?"+":"")+n.toFixed(1)+"%";

/* ══════════════════════════════════════════════
   SHARE IMAGE GENERATOR (Canvas)
   ══════════════════════════════════════════════ */
function generateShareImage({profileLabel,horizon,initial,monthly,freq,assets,scenarios,probLoss,lang}){
  const W=750;
  const assetsH=assets.length*32;
  const H=590+assetsH;
  const c=document.createElement("canvas");c.width=W;c.height=H;
  const x=c.getContext("2d");
  const fmE=n=>n>=1e6?(n/1e6).toFixed(1)+"M€":n.toLocaleString("es-ES",{maximumFractionDigits:0})+"€";

  x.fillStyle="#fff";x.fillRect(0,0,W,H);
  x.fillStyle="#16754E";x.fillRect(0,0,W,5);

  x.font="700 30px system-ui,sans-serif";x.fillStyle="#0f172a";x.fillText("Kartera",40,52);
  x.fillStyle="#16754E";x.fillText(".",145,52);

  x.fillStyle="#f8fafc";x.beginPath();x.roundRect(40,75,W-80,90,16);x.fill();
  const profileItems=[
    [lang==="es"?"PERFIL":"PROFILE",profileLabel],
    [lang==="es"?"HORIZONTE":"HORIZON",horizon+" "+(lang==="es"?"años":"years")],
    [lang==="es"?"CAPITAL INICIAL":"INITIAL CAPITAL",fmE(initial)],
    [lang==="es"?"APORTACIÓN":"CONTRIBUTION",fmE(monthly)+"/"+(freq==="ano"?(lang==="es"?"año":"year"):(lang==="es"?"mes":"month"))]
  ];
  const colW=(W-80)/4;
  profileItems.forEach(([label,val],i)=>{
    const cx=40+i*colW+colW/2;
    x.font="600 11px system-ui,sans-serif";x.fillStyle="#94a3b8";x.textAlign="center";
    x.fillText(label,cx,103);
    x.font="700 17px monospace";x.fillStyle="#0f172a";
    x.fillText(val,cx,126);
  });
  x.textAlign="left";

  const circleY=215,circleR=52;
  x.beginPath();x.arc(100,circleY,circleR,0,Math.PI*2);x.strokeStyle="#16754E";x.lineWidth=5;x.stroke();
  x.font="800 28px monospace";x.fillStyle="#16754E";x.textAlign="center";
  x.fillText(fp(scenarios[1].r),100,circleY-2);
  x.font="600 11px system-ui,sans-serif";x.fillStyle="#94a3b8";
  x.fillText(lang==="es"?"ANUAL":"ANNUAL",100,circleY+16);
  x.textAlign="left";

  const capFinal=Math.round(scenarios[1].d[scenarios[1].d.length-1].v);
  const totalInvested=initial+(monthly*(freq==="ano"?1:12))*horizon;
  const gained=capFinal-totalInvested;
  x.font="800 34px monospace";x.fillStyle="#0f172a";x.fillText(fmE(capFinal),175,208);
  x.font="400 15px system-ui,sans-serif";x.fillStyle="#94a3b8";
  x.fillText(lang==="es"?"Capital esperado a "+horizon+" años":"Expected capital at "+horizon+" years",175,232);
  x.font="700 16px system-ui,sans-serif";x.fillStyle="#16754E";
  x.fillText("+"+(fmE(Math.max(0,gained)))+" "+(lang==="es"?"generados por el mercado":"generated by the market"),175,255);

  x.fillStyle="#f1f5f9";x.fillRect(40,285,W-80,1);

  x.font="600 12px system-ui,sans-serif";x.fillStyle="#94a3b8";
  x.fillText(lang==="es"?"COMPOSICIÓN":"COMPOSITION",40,315);

  let compY=340;
  assets.forEach(a=>{
    x.fillStyle=a.color;x.beginPath();x.arc(50,compY,5,0,Math.PI*2);x.fill();
    x.font="400 15px system-ui,sans-serif";x.fillStyle="#475569";x.fillText(a.name,66,compY+5);
    x.fillStyle="#f1f5f9";x.beginPath();x.roundRect(380,compY-5,220,10,5);x.fill();
    x.fillStyle=a.color;x.beginPath();x.roundRect(380,compY-5,220*(a.weight/100),10,5);x.fill();
    x.font="700 14px monospace";x.fillStyle="#0f172a";x.textAlign="right";
    x.fillText(Math.round(a.weight)+"%",W-40,compY+5);
    x.textAlign="left";
    compY+=32;
  });

  const sepY=compY+10;
  x.fillStyle="#f1f5f9";x.fillRect(40,sepY,W-80,1);

  const scY=sepY+25;
  x.font="600 12px system-ui,sans-serif";x.fillStyle="#94a3b8";
  x.fillText(lang==="es"?"ESCENARIOS":"SCENARIOS",40,scY);

  const scBoxW=(W-100)/3;
  const scColors=[{bg:"#fff",border:"#e2e8f0",labelC:TH.red,pctC:"#ef4444",eurC:TH.red},
                  {bg:"#f0fdf4",border:"#bbf7d0",labelC:"#166534",pctC:"#16754E",eurC:"#166534"},
                  {bg:TH.blueLight,border:"#bfdbfe",labelC:"#1e40af",pctC:"#2563eb",eurC:"#1e40af"}];
  const scLabels=lang==="es"?["PESIMISTA","ESPERADO","OPTIMISTA"]:["PESSIMISTIC","EXPECTED","OPTIMISTIC"];

  scenarios.forEach((sc,i)=>{
    const bx=40+i*(scBoxW+10);
    const by=scY+16;
    const col=scColors[i];
    x.fillStyle=col.bg;x.beginPath();x.roundRect(bx,by,scBoxW,80,12);x.fill();
    x.strokeStyle=col.border;x.lineWidth=1.5;x.beginPath();x.roundRect(bx,by,scBoxW,80,12);x.stroke();
    x.textAlign="center";
    const ccx=bx+scBoxW/2;
    x.font="600 10px system-ui,sans-serif";x.fillStyle=col.labelC;x.fillText(scLabels[i],ccx,by+22);
    x.font="800 20px monospace";x.fillStyle=col.pctC;x.fillText(fp(sc.r),ccx,by+48);
    const scFinal=Math.round(sc.d[sc.d.length-1].v);
    x.font="400 13px monospace";x.fillStyle=col.eurC;x.fillText(fmE(scFinal),ccx,by+68);
    x.textAlign="left";
  });

  const probY=scY+120;
  x.textAlign="center";
  const probFullText=(lang==="es"?"Probabilidad de pérdida a "+horizon+" años: ":"Probability of loss at "+horizon+" years: ")+probLoss;
  x.font="400 15px system-ui,sans-serif";x.fillStyle="#64748b";
  x.fillText(probFullText,W/2,probY);
  x.textAlign="left";

  const footSepY=probY+20;
  x.fillStyle="#f1f5f9";x.fillRect(40,footSepY,W-80,1);
  x.font="400 12px system-ui,sans-serif";x.fillStyle="#cbd5e1";
  x.fillText(lang==="es"?"Simulación con datos históricos reales":"Simulation with real historical data",40,footSepY+25);
  x.font="800 17px system-ui,sans-serif";x.fillStyle="#16754E";x.textAlign="right";
  x.fillText("kartera.pro",W-40,footSepY+25);
  x.textAlign="left";

  c.toBlob(async(blob)=>{
    if(navigator.share&&navigator.canShare){
      try{
        const file=new File([blob],"mi-cartera-kartera.png",{type:"image/png"});
        if(navigator.canShare({files:[file]})){
          await navigator.share({files:[file],title:"Mi cartera — Kartera",text:lang==="es"?"Mira mi cartera en kartera.pro":"Check out my portfolio on kartera.pro"});
          return;
        }
      }catch(e){if(e.name==="AbortError")return;}
    }
    const link=document.createElement("a");
    link.download="mi-cartera-kartera.png";
    link.href=URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  },"image/png");
}

/* ══════════════════════════════════════════════
   PORTFOLIO ANALYSIS RULES (property-based)
   ══════════════════════════════════════════════ */
function analyzePortfolio(sel, nW, yr, profile) {
  const risk=[], diversification=[], coherence=[];
  const g=id=>ASSETS.find(a=>a.id===id);
  const w=id=>nW[id]||0;
  const active=sel.filter(id=>w(id)>0);
  if(!active.length) return {risk,diversification,coherence};

  // Helpers: weighted sums over properties
  const avgRisk=active.reduce((s,id)=>s+(w(id)/100)*g(id).risk,0);
  const classW={};active.forEach(id=>{const c=g(id).class;classW[c]=(classW[c]||0)+w(id);});
  const regW={};active.forEach(id=>{const a=g(id);Object.entries(a.regions).forEach(([r,p])=>{regW[r]=(regW[r]||0)+w(id)*(p/100);});});
  const secW={};active.forEach(id=>{const a=g(id);Object.entries(a.sectors).forEach(([s,p])=>{secW[s]=(secW[s]||0)+w(id)*(p/100);});});
  const roleW={};active.forEach(id=>{g(id).role.forEach(r=>{roleW[r]=(roleW[r]||0)+w(id);});});
  const clusterW={};active.forEach(id=>{g(id).correlation_cluster.forEach(c=>{clusterW[c]=(clusterW[c]||0)+w(id);});});
  const noCfW=active.filter(id=>!g(id).cashflow).reduce((s,id)=>s+w(id),0);
  const risk5W=active.filter(id=>g(id).risk>=5).reduce((s,id)=>s+w(id),0);
  const risk4W=active.filter(id=>g(id).risk>=4).reduce((s,id)=>s+w(id),0);
  const topReg=Object.entries(regW).sort((a,b)=>b[1]-a[1])[0]||["",0];
  const topSec=Object.entries(secW).sort((a,b)=>b[1]-a[1])[0]||["",0];
  const topCluster=Object.entries(clusterW).sort((a,b)=>b[1]-a[1])[0]||["",0];
  const uClasses=new Set(active.map(id=>g(id).class));

  // ══ RIESGO ══
  // R1: Risk vs profile (too high)
  const riskThresh=[2.5,3.5,4.2,99];
  if(avgRisk>riskThresh[profile])
    risk.push({type:"warn",msg:{
      es:"Tu cartera tiene un nivel de riesgo alto para tu perfil. Considera reducir activos volátiles o ampliar el horizonte.",
      en:"Your portfolio has a high risk level for your profile. Consider reducing volatile assets or extending the horizon."}});

  // R2: Too conservative for profile
  if(avgRisk<2&&yr>10&&profile>=1){
    const severe=avgRisk<1.5&&profile>=2;
    risk.push({type:severe?"warn":"info",msg:{
      es:"Tu cartera es muy conservadora para tu perfil y horizonte. Podrías estar perdiendo potencial de crecimiento a largo plazo.",
      en:"Your portfolio is very conservative for your profile and horizon. You may be missing long-term growth potential."}});
  };

  // R3: Extreme risk assets + short horizon
  if(risk5W>10&&yr<5)
    risk.push({type:"warn",msg:{
      es:`Tienes un ${Math.round(risk5W)}% en activos de riesgo muy alto con un horizonte de ${yr} años. El riesgo de pérdida a corto plazo es elevado.`,
      en:`You have ${Math.round(risk5W)}% in very high risk assets with a ${yr}-year horizon. Short-term loss risk is high.`}});

  // R4: No stabilizers
  if(!roleW.stability&&!roleW.hedge)
    risk.push({type:"info",msg:{
      es:"No tienes activos estabilizadores ni de cobertura. En una crisis, nada amortigua la caída de tu cartera.",
      en:"You have no stability or hedge assets. In a crisis, nothing cushions your portfolio's fall."}});

  // R5: Excess speculative
  const specLim=[20,30,50,100];
  if((roleW.speculative||0)>specLim[profile])
    risk.push({type:"warn",msg:{
      es:`Tienes un ${Math.round(roleW.speculative)}% en activos especulativos. Es excesivo para tu perfil.`,
      en:`You have ${Math.round(roleW.speculative)}% in speculative assets. This is excessive for your profile.`}});

  // R6: Short horizon + high equity
  if(yr<3&&(classW.equity||0)>50)
    risk.push({type:"warn",msg:{
      es:`Con un horizonte de solo ${yr} años y más del 50% en renta variable, la probabilidad de pérdida es alta.`,
      en:`With only a ${yr}-year horizon and over 50% in equities, the probability of loss is high.`}});

  // R7: No growth engine
  if(!roleW.growth)
    risk.push({type:"info",msg:{
      es:"Tu cartera no tiene motor de crecimiento. A largo plazo, puede no superar la inflación.",
      en:"Your portfolio has no growth engine. Long-term, it may not beat inflation."}});

  // R8: Too much non-cashflow
  if(noCfW>50)
    risk.push({type:"warn",msg:{
      es:`Un ${Math.round(noCfW)}% de tu cartera no genera rentas (oro, crypto, materias primas). Esto aumenta la dependencia de la revalorización del precio.`,
      en:`${Math.round(noCfW)}% of your portfolio generates no income (gold, crypto, commodities). This increases dependence on price appreciation.`}});

  // R9: Concentration in volatile assets
  if(risk4W>60)
    risk.push({type:"warn",msg:{
      es:`Un ${Math.round(risk4W)}% de tu cartera está en activos de riesgo alto o muy alto. Considera equilibrar con activos más estables.`,
      en:`${Math.round(risk4W)}% of your portfolio is in high or very high risk assets. Consider balancing with more stable assets.`}});

  // ══ DIVERSIFICACIÓN ══
  // D1: Only 1 asset
  if(active.length===1)
    diversification.push({type:"warn",msg:{
      es:"Solo tienes un activo. Diversificar entre varios reduce el riesgo sin necesariamente reducir la rentabilidad.",
      en:"You only have one asset. Diversifying across several reduces risk without necessarily reducing returns."}});

  // D2: Very few assets
  if(active.length===2)
    diversification.push({type:"info",msg:{
      es:"Solo tienes 2 activos. Añadir más mejoraría la diversificación de tu cartera.",
      en:"You only have 2 assets. Adding more would improve your portfolio's diversification."}});

  // D3: Only 1 class
  if(uClasses.size===1)
    diversification.push({type:"warn",msg:{
      es:`Todos tus activos son del mismo tipo (${[...uClasses][0]}). Combinar distintas clases reduce el riesgo.`,
      en:`All your assets are the same type (${[...uClasses][0]}). Combining different classes reduces risk.`}});

  // D4: Single asset > 60%
  active.forEach(id=>{if(w(id)>60){
    diversification.push({type:"warn",msg:{
      es:`${g(id).name.es} pesa más del 60% de tu cartera. Esto supone un riesgo de concentración alto.`,
      en:`${g(id).name.en} is over 60% of your portfolio. This means high concentration risk.`}});}});

  // D5: Geographic concentration >80%
  if(topReg[1]>=80&&topReg[0]!=="global")
    diversification.push({type:"info",msg:{
      es:`Un ${Math.round(topReg[1])}% de tu cartera depende de una sola región (${topReg[0].toUpperCase()}). Considera diversificar geográficamente.`,
      en:`${Math.round(topReg[1])}% of your portfolio depends on a single region (${topReg[0].toUpperCase()}). Consider geographic diversification.`}});

  // D6: Sector concentration >50%
  if(topSec[1]>50&&topSec[0]!=="mix"&&topSec[0]!=="bond")
    diversification.push({type:"info",msg:{
      es:`Un ${Math.round(topSec[1])}% de tu cartera está concentrada en el sector ${topSec[0]}. Si ese sector cae, tu cartera sufrirá de forma desproporcionada.`,
      en:`${Math.round(topSec[1])}% of your portfolio is concentrated in the ${topSec[0]} sector. If that sector drops, your portfolio will suffer disproportionately.`}});

  // D7: No defensive coverage
  if(!classW.bond&&!classW.commodity&&!classW.cash)
    diversification.push({type:"info",msg:{
      es:"No tienes activos defensivos (bonos, materias primas o liquidez). Añadirlos puede proteger tu cartera en momentos de crisis.",
      en:"You have no defensive assets (bonds, commodities or cash). Adding them can protect your portfolio during crises."}});

  // D8: Good diversification
  if(active.length>=4&&uClasses.size>=3&&topReg[1]<70)
    diversification.push({type:"ok",msg:{
      es:"Tu cartera tiene buena diversificación: varios activos, múltiples clases y cobertura geográfica.",
      en:"Your portfolio has good diversification: multiple assets, several classes and geographic coverage."}});

  // ══ COHERENCIA ══
  // C1: Overlap detection (dynamic, based on regions + sectors similarity)
  for(let i=0;i<active.length;i++){
    for(let j=i+1;j<active.length;j++){
      const a1=g(active[i]),a2=g(active[j]);
      if(w(active[i])<5||w(active[j])<5) continue;
      let simR=0,simS=0;
      Object.keys(a1.regions).forEach(r=>{if(a2.regions[r])simR+=Math.min(a1.regions[r],a2.regions[r]);});
      Object.keys(a1.sectors).forEach(s=>{if(s!=="mix"&&a2.sectors[s])simS+=Math.min(a1.sectors[s],a2.sectors[s]);});
      if(simR>60&&simS>40)
        coherence.push({type:"info",msg:{
          es:`${a1.name.es} y ${a2.name.es} se solapan significativamente (regiones y sectores similares). Esto reduce la diversificación real.`,
          en:`${a1.name.en} and ${a2.name.en} overlap significantly (similar regions and sectors). This reduces real diversification.`}});
    }
  }

  // C3: Hierarchy incoherence (single > global)
  active.forEach(id=>{
    const a=g(id);
    if(a.scope==="single"&&w(id)>15){
      active.forEach(gid=>{
        const ga=g(gid);
        if(ga.scope==="global"&&ga.class==="equity"&&w(gid)<w(id)){
          coherence.push({type:"info",msg:{
            es:`${a.name.es} (${Math.round(w(id))}%) pesa más que ${ga.name.es} (${Math.round(w(gid))}%) que ya lo contiene. Esto puede ser incoherente.`,
            en:`${a.name.en} (${Math.round(w(id))}%) weighs more than ${ga.name.en} (${Math.round(w(gid))}%) which already contains it. This may be incoherent.`}});
        }
      });
    }
  });

  // C4: Dominant cluster >80%
  if(topCluster[1]>80)
    coherence.push({type:"info",msg:{
      es:`Un ${Math.round(topCluster[1])}% de tu cartera se mueve en el mismo grupo de correlación. Puedes creer que diversificas, pero en la práctica se comportan de forma similar.`,
      en:`${Math.round(topCluster[1])}% of your portfolio moves in the same correlation group. You may think you're diversified, but in practice they behave similarly.`}});

  // C5: Contradictory mix
  if((roleW.stability||0)>30&&(roleW.speculative||0)>30)
    coherence.push({type:"info",msg:{
      es:`Tienes más del 30% en estabilidad y más del 30% en especulación. Tu cartera intenta ser conservadora y agresiva a la vez — esto reduce la eficiencia.`,
      en:`You have over 30% in stability and over 30% in speculation. Your portfolio tries to be conservative and aggressive at the same time — this reduces efficiency.`}});

  // C6: Bond redundancy
  const bondAssets=active.filter(id=>g(id).class==="bond");
  if(bondAssets.length>=2){
    const bNames=bondAssets.map(id=>g(id).name);
    coherence.push({type:"info",msg:{
      es:`Tienes ${bondAssets.length} activos de renta fija (${bNames.map(n=>n.es).join(", ")}). Puede haber redundancia parcial entre ellos.`,
      en:`You have ${bondAssets.length} fixed income assets (${bNames.map(n=>n.en).join(", ")}). There may be partial redundancy between them.`}});
  }

  // C7: Coherent portfolio
  if(!coherence.length&&active.length>=3)
    coherence.push({type:"ok",msg:{
      es:"Tu cartera es coherente: sin solapamientos significativos ni contradicciones internas.",
      en:"Your portfolio is coherent: no significant overlaps or internal contradictions."}});

  return {risk,diversification,coherence};
}

/* ══════════════════════════════════════════════
   SIMULATION ENGINE
   ══════════════════════════════════════════════ */
function capExtremeReturn(ret, asset) {
  if (!asset.uf) return ret;
  let r = ret;
  if (r > 100) r = 65 + (r - 100) * 0.1;
  else if (r > 50) r = 50 + (r - 50) * 0.3;
  return r;
}

function getPortfolioAnnualReturns(selectedIds, normalizedWeights) {
  const allYearsSet = new Set();
  selectedIds.forEach(id => gY(id).forEach(y => allYearsSet.add(y)));
  const allYears = [...allYearsSet].sort((a, b) => a - b);
  if (allYears.length === 0) return [];
  return allYears.map(year => {
    const available = selectedIds.filter(id => R[id] && R[id][year] !== undefined);
    if (available.length === 0) return null;
    const totalAvailWeight = available.reduce((s, id) => s + (normalizedWeights[id] || 0), 0);
    if (totalAvailWeight === 0) return null;
    let portRet = 0;
    available.forEach(id => {
      const reW = (normalizedWeights[id] || 0) / totalAvailWeight;
      const asset = ASSETS.find(a => a.id === id);
      let r = R[id][year];
      if (asset) r = capExtremeReturn(r, asset);
      portRet += reW * r;
    });
    return { year, ret: portRet };
  }).filter(Boolean);
}

function getPortfolioRollingCAGR(annualReturns, horizon) {
  if (horizon < 1 || annualReturns.length < horizon) return [];
  const cagrs = [];
  for (let i = 0; i <= annualReturns.length - horizon; i++) {
    let cum = 1;
    for (let j = 0; j < horizon; j++) cum *= (1 + annualReturns[i + j].ret / 100);
    cagrs.push((Math.pow(cum, 1 / horizon) - 1) * 100);
  }
  return cagrs.sort((a, b) => a - b);
}

function computePortfolioScenarios(selectedIds, normalizedWeights, horizon) {
  const activeIds = selectedIds.filter(id => (normalizedWeights[id] || 0) > 0);
  if (activeIds.length === 0) return null;
  const annualRets = getPortfolioAnnualReturns(activeIds, normalizedWeights);
  const numYears = annualRets.length;
  if (numYears < 2) return null;

  // Try requested horizon first; if not enough, find max usable horizon
  let usedHorizon = horizon;
  let rollingCAGRs = getPortfolioRollingCAGR(annualRets, horizon);
  let projected = false;

  if (rollingCAGRs.length === 0) {
    // Find largest horizon that gives at least 1 window
    for (let h = numYears; h >= 1; h--) {
      const test = getPortfolioRollingCAGR(annualRets, h);
      if (test.length > 0) { rollingCAGRs = test; usedHorizon = h; projected = true; break; }
    }
    if (rollingCAGRs.length === 0) return null;
  }

  const rawP = pc(rollingCAGRs, 10), rawE = pc(rollingCAGRs, 50), rawO = pc(rollingCAGRs, 90);
  const negCount = rollingCAGRs.filter(c => c < 0).length;
  const rawProbLoss = negCount / rollingCAGRs.length;
  const probLossDisplay = rawProbLoss === 0 ? "< 1%" : Math.round(rawProbLoss * 100) + "%";
  const probLossNum = Math.round(rawProbLoss * 100);

  const p10val = pc(rollingCAGRs, 10), p90val = pc(rollingCAGRs, 90);
  const pessCount = rollingCAGRs.filter(c => c <= p10val).length;
  const optCount = rollingCAGRs.filter(c => c >= p90val).length;
  const probPess = Math.round((pessCount / rollingCAGRs.length) * 100);
  const probOpt = Math.round((optCount / rollingCAGRs.length) * 100);

  return {
    p: rawP, e: rawE, o: rawO,
    probLossDisplay, probLossNum,
    probPess, probEsp: 100 - probPess - probOpt, probOpt,
    worstCase: rollingCAGRs[0],
    dataYears: numYears,
    rollingCount: rollingCAGRs.length,
    fewWindows: rollingCAGRs.length < 10,
    projected, usedHorizon,
  };
}

function gS(id,h){
  const a=ASSETS.find(x=>x.id===id);if(!a)return{e:0};
  const yrs=gY(id);const d=R[id];if(!d||h<1||h>yrs.length-1)return{e:a.f};
  const rr=[];
  for(let i=0;i<=yrs.length-h;i++){let cum=1;let ok=true;for(let j=0;j<h;j++){let r=d[yrs[i+j]];if(r===undefined){ok=false;break;}r=capExtremeReturn(r,a);cum*=(1+r/100);}if(ok)rr.push((Math.pow(cum,1/h)-1)*100);}
  rr.sort((a,b)=>a-b);
  if(rr.length<3)return{e:a.f};
  return{e:pc(rr,50)};
}

/* ══════════════════════════════════════════════
   SHARED UI
   ══════════════════════════════════════════════ */
const cdS={background:TH.card,borderRadius:TH.r2,padding:16,border:`1.5px solid ${TH.border}`,marginBottom:12};

function SvgChart({lines,years,labels,colors,fill,yearLabel}){
  const W=580,H=220,pad={l:50,r:10,t:10,b:24},w=W-pad.l-pad.r,h=H-pad.t-pad.b;
  const allV=lines.flatMap(d=>d.map(p=>p.v));const mx=Math.max(...allV)*1.05;
  const sx=yr=>pad.l+(yr/years)*w,sy=val=>pad.t+h-(val/mx)*h;
  const ml=pts=>pts.map((p,i)=>(i===0?"M":"L")+sx(p.y).toFixed(1)+","+sy(p.v).toFixed(1)).join(" ");
  const ft=v=>v>=1e6?(v/1e6).toFixed(1)+"M":v>=1e3?(v/1e3).toFixed(0)+"k":v.toFixed(0);
  const[hover,setHover]=useState(null);
  const svgRef=useRef(null);
  const getYear=e=>{
    if(!svgRef.current)return null;
    const rect=svgRef.current.getBoundingClientRect();
    const clientX=e.clientX!==undefined?e.clientX:(e.touches&&e.touches[0]?e.touches[0].clientX:null);
    if(clientX===null)return null;
    const x=clientX-rect.left;
    const svgX=(x/rect.width)*W;
    const yr=Math.round(((svgX-pad.l)/w)*years);
    return Math.max(0,Math.min(years,yr));
  };
  const onMove=e=>{const yr=getYear(e);if(yr!==null)setHover(yr);};
  return(<div>
    <svg ref={svgRef} viewBox={"0 0 "+W+" "+H} width="100%" style={{display:"block",cursor:"crosshair"}}
      onMouseMove={onMove} onTouchMove={onMove} onMouseLeave={()=>setHover(null)} onTouchEnd={()=>setHover(null)}>
      {[0,.25,.5,.75,1].map((f,i)=>{const val=mx*f;return<g key={i}><line x1={pad.l} y1={sy(val)} x2={W-pad.r} y2={sy(val)} stroke="#f0f0f0" strokeWidth="0.7"/><text x={pad.l-4} y={sy(val)+3} textAnchor="end" fontSize="9" fill="#bbb" fontFamily="monospace">{ft(val)}</text></g>;})}
      {Array.from({length:Math.min(years+1,8)},(_,i)=>{const yr=Math.round((i/Math.min(years,7))*years);return<text key={yr} x={sx(yr)} y={H-4} textAnchor="middle" fontSize="9" fill="#bbb">{yr}a</text>;})}
      <path d={ml(lines[0].map(p=>({y:p.y,v:p.inv})))} fill="none" stroke="#d1d5db" strokeWidth="1" strokeDasharray="5,4"/>
      {fill&&lines.length>2&&<path d={ml(lines[2])+lines[0].slice().reverse().map(p=>"L"+sx(p.y).toFixed(1)+","+sy(p.v).toFixed(1)).join("")+"Z"} fill="#16754E" opacity="0.05"/>}
      {fill&&lines.length===1&&<path d={ml(lines[0])+"L"+sx(years).toFixed(1)+","+sy(0).toFixed(1)+"L"+sx(0).toFixed(1)+","+sy(0).toFixed(1)+"Z"} fill={colors[0]} opacity="0.08"/>}
      {lines.map((d,i)=><path key={i} d={ml(d)} fill="none" stroke={colors[i]} strokeWidth={2.5} strokeDasharray={lines.length>1&&i!==1?"6,4":"none"}/>)}
      {hover!==null&&<>
        <line x1={sx(hover)} y1={pad.t} x2={sx(hover)} y2={pad.t+h} stroke="#aaa" strokeWidth="0.8" strokeDasharray="3,3"/>
        {lines.map((d,i)=>{const pt=d.find(p=>p.y===hover);if(!pt)return null;return<circle key={i} cx={sx(hover)} cy={sy(pt.v)} r="4" fill={colors[i]} stroke="#fff" strokeWidth="1.5"/>;})}
      </>}
    </svg>
    {hover!==null?<div style={{background:"#111",color:"#fff",borderRadius:8,padding:"6px 10px",fontSize:11,display:"flex",gap:12,justifyContent:"center",marginTop:2,flexWrap:"wrap"}}>
      <span style={{fontWeight:700}}>{(yearLabel||"Año")+" "+hover}</span>
      {lines[0].find(p=>p.y===hover)?.inv!==undefined&&<span style={{color:"#d1d5db"}}>Aportado: <b>{fm(Math.round(lines[0].find(p=>p.y===hover).inv))}</b></span>}
      {lines.map((d,i)=>{const pt=d.find(p=>p.y===hover);if(!pt)return null;return<span key={i} style={{color:colors[i]}}>{labels[i]}: <b>{fm(Math.round(pt.v))}</b></span>;})}
    </div>
    :<div style={{display:"flex",justifyContent:"center",gap:16,marginTop:4,fontSize:11,color:TH.light}}>
      {labels.map((n,i)=><span key={i} style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:12,height:2,background:colors[i],display:"inline-block",borderRadius:1}}/>{n}</span>)}
    </div>}
  </div>);
}

function Donut({items,size}){
  const r=size/2,ir=r*0.6,c=2*Math.PI;
  let cum=0;const total=items.reduce((s,i)=>s+i.w,0)||1;
  return<svg width={size} height={size} viewBox={"0 0 "+size+" "+size}>{items.map((item,idx)=>{
    const frac=item.w/total;const start=cum;cum+=frac;
    const a1=start*c-Math.PI/2,a2=(start+frac)*c-Math.PI/2;
    const la=frac>0.5?1:0;
    return<path key={idx} d={"M"+(r+r*Math.cos(a1))+","+(r+r*Math.sin(a1))+"A"+r+","+r+" 0 "+la+" 1 "+(r+r*Math.cos(a2))+","+(r+r*Math.sin(a2))+"L"+(r+ir*Math.cos(a2))+","+(r+ir*Math.sin(a2))+"A"+ir+","+ir+" 0 "+la+" 0 "+(r+ir*Math.cos(a1))+","+(r+ir*Math.sin(a1))+"Z"} fill={item.c}/>;
  })}</svg>;
}

function Inputs({params}){return(
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:10,marginBottom:14}}>
    {params.map(p=><div key={p.l} style={{background:"#fff",borderRadius:12,padding:14,border:`1px solid ${TH.border}`}}>
      <div style={{fontSize:11,color:TH.light,marginBottom:4}}>{p.l}</div>
      <div style={{display:"flex",alignItems:"baseline",gap:4}}>
        <input type="number" value={p.v} min={p.mi||0} max={p.mx} step={p.st} onChange={e=>p.fn(Math.max(p.mi||0,Math.min(p.mx,Number(e.target.value)||0)))} style={{width:"100%",border:"none",fontSize:18,fontWeight:800,outline:"none",fontFamily:"monospace",color:TH.dark}}/>
        {p.tog?<select value={p.freq} onChange={e=>p.sF(e.target.value)} style={{border:`1.5px solid ${TH.border}`,borderRadius:6,padding:"3px 4px",fontSize:11,color:TH.muted,background:TH.bg2,cursor:"pointer",fontWeight:600,outline:"none"}}><option value="mes">{p.lMes}</option><option value="ano">{p.lAno}</option></select>
        :<span style={{fontSize:11,color:TH.light,whiteSpace:"nowrap"}}>{p.u}</span>}
      </div>
      <input type="range" min={p.mi||0} max={p.mx} step={p.st} value={p.v} onChange={e=>p.fn(Number(e.target.value))} style={{width:"100%",marginTop:6}}/>
    </div>)}
  </div>
);}

/* ══════════════════════════════════════════════
   HOME
   ══════════════════════════════════════════════ */
function HomePage({t, go, lang}) {
  const whyItems=[{icon:"📊",t:t.homeW1t,d:t.homeW1d},{icon:"⚖️",t:t.homeW2t,d:t.homeW2d},{icon:"🛡️",t:t.homeW3t,d:t.homeW3d}];
  const simIcons={"cartera-60-40":"⚖️","sp500-vs-msci-world":"🇺🇸","bitcoin-en-cartera":"₿"};
  return(<div>
    <div style={{textAlign:"center",padding:"28px 0 24px"}}>
      <h2 style={{fontSize:22,fontWeight:800,color:TH.dark,marginBottom:8,lineHeight:1.3}}>{t.heroTitle}</h2>
      <p style={{fontSize:13,color:TH.muted,maxWidth:440,margin:"0 auto",lineHeight:1.6}}>{t.heroSub}</p>
    </div>

    {/* CTA PRINCIPAL */}
    <div onClick={()=>go("/simulador-cartera")} style={{cursor:"pointer",padding:22,borderRadius:14,background:"linear-gradient(135deg,#E8F5EF,#F0FDF4)",border:"2px solid #16754E",marginBottom:20,textAlign:"center"}}>
      <div style={{fontSize:11,color:"#16754E",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>{t.homeCtaTitle}</div>
      <div style={{fontSize:17,fontWeight:800,color:TH.greenText,marginBottom:8}}>{t.homeCtaBig}</div>
      <div style={{display:"inline-block",padding:"10px 24px",background:TH.green,color:"#fff",borderRadius:10,fontSize:14,fontWeight:700}}>{t.homeCtaBtn}</div>
    </div>

    {/* HERRAMIENTAS */}
    <div style={{display:"grid",gap:10,marginBottom:24}}>
      <div onClick={()=>go("/interes-compuesto")} style={{...cdS,cursor:"pointer",padding:16,marginBottom:0,borderLeft:"4px solid #6366f1"}}>
        <div style={{fontSize:14,fontWeight:800,color:TH.dark,marginBottom:3}}>{t.toolIC}</div>
        <p style={{fontSize:12,color:TH.muted,marginBottom:8,lineHeight:1.5,margin:0}}>{t.toolICdesc}</p>
        <span style={{fontSize:12,fontWeight:700,color:"#6366f1"}}>{t.irA} →</span>
      </div>
      <div onClick={()=>go("/simulador-cartera")} style={{...cdS,cursor:"pointer",padding:16,marginBottom:0,borderLeft:"4px solid #16754E"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
          <span style={{fontSize:14,fontWeight:800,color:TH.dark}}>{t.toolSim}</span>
          <span style={{fontSize:9,fontWeight:800,background:TH.green,color:"#fff",padding:"2px 7px",borderRadius:4}}>{t.toolSimBadge}</span>
        </div>
        <p style={{fontSize:12,color:TH.muted,marginBottom:8,lineHeight:1.5,margin:0}}>{t.toolSimDesc}</p>
        <span style={{fontSize:12,fontWeight:700,color:"#16754E"}}>{t.irA} →</span>
      </div>
    </div>

    {/* SIMULACIONES POPULARES */}
    <div style={{marginBottom:24}}>
      <h3 style={{fontSize:14,fontWeight:800,color:TH.dark,marginBottom:4}}>{t.homeSims}</h3>
      <p style={{fontSize:12,color:TH.muted,marginBottom:12,lineHeight:1.5}}>{t.homeSimsCta}</p>
      <div style={{display:"grid",gap:10}}>
        {SIMS.map(sim=><div key={sim.slug} onClick={()=>go("/simulacion/"+sim.slug)} style={{...cdS,cursor:"pointer",padding:16,marginBottom:0,display:"flex",gap:14,alignItems:"flex-start",borderLeft:"4px solid #f59e0b"}}>
          <span style={{fontSize:24,lineHeight:1}}>{simIcons[sim.slug]||"📈"}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:TH.dark,marginBottom:3}}>{sim.title[lang]}</div>
            <div style={{fontSize:12,color:TH.muted,lineHeight:1.5}}>{sim.hook[lang].split("\n")[0].substring(0,120)}...</div>
            <span style={{fontSize:12,fontWeight:700,color:"#f59e0b",display:"inline-block",marginTop:6}}>{lang==="es"?"Ver simulación":"View simulation"} →</span>
          </div>
        </div>)}
      </div>
    </div>

    {/* POR QUÉ KARTERA */}
    <div style={{marginBottom:24}}>
      <h3 style={{fontSize:14,fontWeight:800,color:TH.dark,marginBottom:12}}>{t.homeWhy}</h3>
      <div style={{display:"grid",gap:10}}>{whyItems.map((w,i)=>(<div key={i} style={{...cdS,marginBottom:0,display:"flex",gap:12,alignItems:"flex-start",padding:14}}><span style={{fontSize:22}}>{w.icon}</span><div><div style={{fontSize:13,fontWeight:700,color:TH.dark,marginBottom:2}}>{w.t}</div><div style={{fontSize:11,color:TH.muted,lineHeight:1.5}}>{w.d}</div></div></div>))}</div>
    </div>

    {/* PRÓXIMAMENTE */}
    <div style={{padding:18,borderRadius:14,background:"linear-gradient(135deg,#E8F5EF,#F0FDF4)",border:"1px solid #bbf7d0",textAlign:"center"}}>
      <div style={{fontSize:14,fontWeight:800,color:TH.greenText,marginBottom:6}}>{t.proximamente}</div>
      <div style={{fontSize:11,color:TH.muted,lineHeight:1.7}}>{t.proxItems.split("|").map((s,i)=><span key={i}>{i>0?" · ":""}{s.trim()}</span>)}</div>
      <button onClick={()=>window.open("https://forms.gle/JMZg1w5eAUHnYVHw8","_blank")} style={{marginTop:12,padding:"8px 20px",fontSize:12,background:TH.green,color:"#fff",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer"}}>{t.avisarme}</button>
    </div>
  </div>);
}

/* ══════════════════════════════════════════════
   COMPOUND INTEREST
   ══════════════════════════════════════════════ */
function CompoundCalc({go,t}){
  const[ini,sI]=useState(10000);const[mo,sM]=useState(300);const[yr,sY]=useState(15);const[rate,sR]=useState(7);const[freq,sF]=useState("mes");
  const moM=freq==="ano"?mo/12:mo;
  const data=useMemo(()=>cP(ini,moM,yr,rate),[ini,moM,yr,rate]);
  const fin=data[data.length-1].v;const tI=ini+moM*12*yr;const prof=fin-tI;
  return(<div>
    <p style={{fontSize:12,color:TH.muted,marginBottom:14}}>{t.ciSub}</p>
    <Inputs params={[{l:t.capIni,v:ini,fn:sI,mx:5e6,st:500,u:"EUR"},{l:t.aport,v:mo,fn:sM,mx:freq==="ano"?600000:50000,st:freq==="ano"?100:25,tog:true,freq,sF,lMes:t.eurMes,lAno:t.eurAno},{l:t.intAnual,v:rate,fn:sR,mx:50,st:0.5,mi:0,u:"%"},{l:t.horiz,v:yr,fn:sY,mx:50,st:1,u:t.anos}]}/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:10,marginBottom:12}}>
      <div style={{...cdS,marginBottom:0,background:TH.greenLight,border:"2px solid #16754E33"}}>
        <div style={{fontSize:10,color:"#16754E",fontWeight:700,textTransform:"uppercase",marginBottom:4}}>{t.capFin}</div>
        <div style={{fontSize:26,fontWeight:800,fontFamily:"monospace",color:TH.dark}}>{fm(fin)} EUR</div>
        <div style={{fontSize:10,color:TH.light,marginTop:2}}>{fp(rate)} {t.ano} | {yr} {t.anos}</div>
      </div>
      <div style={cdS}><div style={{fontSize:10,color:TH.light,fontWeight:600,marginBottom:4}}>{t.tuAp}</div><div style={{fontSize:20,fontWeight:800,fontFamily:"monospace"}}>{fm(tI)} EUR</div></div>
      <div style={cdS}><div style={{fontSize:10,color:TH.light,fontWeight:600,marginBottom:4}}>{t.intGen}</div><div style={{fontSize:20,fontWeight:800,fontFamily:"monospace",color:"#16754E"}}>+{fm(prof)} EUR</div><div style={{fontSize:10,color:TH.light,marginTop:2}}>{tI>0?Math.round(prof/tI*100):0}% {t.sobreAp}</div></div>
    </div>
    <div style={cdS}><div style={{fontSize:13,fontWeight:700,marginBottom:8}}>{t.evo}</div><SvgChart lines={[data]} years={yr} labels={[t.capital]} colors={["#16754E"]} fill={true} yearLabel={t.yearN}/></div>
    <div style={{padding:20,borderRadius:14,background:"linear-gradient(135deg,#fef2f2,#fff7ed)",border:"1px solid #fecaca",textAlign:"center"}}>
      <div style={{fontSize:15,fontWeight:800,color:TH.red,marginBottom:6}}>{t.noSabes}</div>
      <p style={{fontSize:12,color:"#78716c",lineHeight:1.6,marginBottom:12,maxWidth:420,margin:"0 auto 12px"}}>{t.pruebaEl}</p>
      <button onClick={()=>go("/simulador-cartera")} style={{padding:"10px 24px",fontSize:13,background:TH.green,color:"#fff",border:"none",borderRadius:10,fontWeight:700,cursor:"pointer"}}>{t.verSim} →</button>
    </div>
    {/* SEO CONTENT */}
    <div style={{marginTop:24}}>
      <div style={{...cdS,padding:20}}>
        <h2 style={{fontSize:17,fontWeight:800,color:TH.dark,marginTop:0,marginBottom:8}}>{t.seoH1}</h2>
        <p style={{fontSize:13,color:TH.muted,lineHeight:1.7,margin:0}}>{t.seoP1}</p>
      </div>
      <div style={{...cdS,padding:20}}>
        <h2 style={{fontSize:17,fontWeight:800,color:TH.dark,marginTop:0,marginBottom:8}}>{t.seoH2}</h2>
        <p style={{fontSize:13,color:TH.muted,lineHeight:1.7,margin:0}}>{t.seoP2}</p>
      </div>
      <div style={{...cdS,padding:20}}>
        <h2 style={{fontSize:17,fontWeight:800,color:TH.dark,marginTop:0,marginBottom:8}}>{t.seoH3}</h2>
        <p style={{fontSize:13,color:TH.muted,lineHeight:1.7,margin:0}}>{t.seoP3}</p>
      </div>
      <div style={{padding:20,borderRadius:14,background:"linear-gradient(135deg,#eef2ff,#e0e7ff)",border:"1px solid #c7d2fe",textAlign:"center"}}>
        <div style={{fontSize:15,fontWeight:800,color:"#3730a3",marginBottom:6}}>{t.seoCta}</div>
        <p style={{fontSize:12,color:"#6366f1",lineHeight:1.6,marginBottom:12,maxWidth:420,margin:"0 auto 12px"}}>{t.seoCtaDesc}</p>
        <button onClick={()=>go("/simulador-cartera")} style={{padding:"10px 24px",fontSize:13,background:"#6366f1",color:"#fff",border:"none",borderRadius:10,fontWeight:700,cursor:"pointer"}}>{t.seoCtaBtn} →</button>
      </div>
    </div>
  </div>);
}

/* ══════════════════════════════════════════════
   PORTFOLIO SIMULATOR
   ══════════════════════════════════════════════ */
function PortfolioSim({t,lang,cfg}){
  const defSel=cfg?cfg.assets.map(a=>a.id):["msci_world","sp500","us_bond","gold"];
  const defWt=cfg?Object.fromEntries(cfg.assets.map(a=>[a.id,a.weight])):{msci_world:50,sp500:25,us_bond:20,gold:5};
  const[ini,sI]=useState(cfg?.initial||10000);const[mo,sM]=useState(cfg?.monthly||300);const[yr,sY]=useState(cfg?.horizon||15);const[freq,sF]=useState("mes");
  const moM=freq==="ano"?mo/12:mo;
  const[sel,sS]=useState(defSel);
  const[wt,sW]=useState(defWt);
  const[tab,sT]=useState("idx");const[sm,sMt]=useState(false);const[showBk,sBk]=useState(false);
  const[srcQ,setSrcQ]=useState("");const[expanded,setExp]=useState(false);
  const[profile,setProfile]=useState(1);
  const tW=sel.reduce((s,id)=>s+(wt[id]||0),0);
  const nW=useMemo(()=>{if(tW===0)return{};const n={};sel.forEach(id=>{n[id]=((wt[id]||0)/tW)*100;});return n;},[sel,wt,tW]);
  const tog=id=>{if(sel.includes(id)){sS(sel.filter(a=>a!==id));const w={...wt};delete w[id];sW(w);}else{sS([...sel,id]);sW({...wt,[id]:0});}};

  const pS=useMemo(()=>{
    if(sel.length===0||tW===0)return null;
    return computePortfolioScenarios(sel, nW, yr);
  },[sel,nW,yr,tW]);

  const scs=useMemo(()=>{if(!pS)return null;return[{l:t.pess,r:pS.p,d:cP(ini,moM,yr,pS.p),prob:pS.probPess},{l:t.esp,r:pS.e,d:cP(ini,moM,yr,pS.e),prob:pS.probEsp},{l:t.opt,r:pS.o,d:cP(ini,moM,yr,pS.o),prob:pS.probOpt}];},[pS,ini,moM,yr,t]);
  const tI=ini+moM*12*yr;
  const rL=useMemo(()=>{if(!tW)return 0;let rs=0;const cr={idx:2,stk:3,fi:0.5,cry:4,alt:1.5,etf:2.5};sel.forEach(id=>{const a=ASSETS.find(x=>x.id===id);rs+=((nW[id]||0)/100)*(cr[a?.cat]||1);});return rs<1?0:rs<2?1:rs<3?2:3;},[sel,nW,tW]);
  const cC=useMemo(()=>CATS.map(c=>({id:c.id,name:c.name[lang],w:sel.filter(id=>ASSETS.find(a=>a.id===id)?.cat===c.id).reduce((s,id)=>s+(nW[id]||0),0)})).filter(c=>c.w>0),[sel,nW,lang]);
  const assetBreakdown=useMemo(()=>{if(!pS)return[];return sel.filter(id=>(nW[id]||0)>0).map(id=>{const a=ASSETS.find(x=>x.id===id);const sc=gS(id,yr);const w=(nW[id]||0)/100;return{name:a.name[lang],weight:nW[id]||0,expRet:sc.e,contrib:w*sc.e};}).sort((a,b)=>b.contrib-a.contrib);},[sel,nW,yr,pS,lang]);
  const donutItems=useMemo(()=>sel.filter(id=>(nW[id]||0)>0).map(id=>{const a=ASSETS.find(x=>x.id===id);return{name:a?.name[lang]||id,w:nW[id]||0,c:a?.color||"#999"};}),[sel,nW,lang]);
  const rlC=["#16754E","#f59e0b","#f97316","#ef4444"];
  const showShortTermWarning = pS && yr < 5 && pS.probLossNum > 25;
  const portfolioAlerts = useMemo(() => sel.length > 0 && tW > 0 ? analyzePortfolio(sel, nW, yr, profile) : {risk:[],diversification:[],coherence:[]}, [sel, nW, yr, tW, profile]);

  return(<div>
    {!cfg&&<div style={{background:TH.greenLight,borderRadius:10,padding:"7px 14px",marginBottom:14,fontSize:12,color:TH.greenText}}>{t.preset}</div>}
    {/* PROFILE SELECTOR */}
    <div style={{background:"#fff",borderRadius:12,padding:14,border:"1.5px solid #f0f0f0",marginBottom:14}}>
      <div style={{fontSize:11,color:TH.muted,fontWeight:700,marginBottom:8}}>{t.perfil}</div>
      <div style={{display:"flex",gap:4}}>{t.perfilOps.map((label,i)=><button key={i} onClick={()=>setProfile(i)} style={{flex:1,padding:"7px 4px",borderRadius:8,border:"none",fontSize:11,fontWeight:700,cursor:"pointer",background:profile===i?"#111":TH.bg2,color:profile===i?"#fff":"#888"}}>{label}</button>)}</div>
    </div>
    <Inputs params={[{l:t.capIni,v:ini,fn:sI,mx:5e6,st:500,u:"EUR"},{l:t.aport,v:mo,fn:sM,mx:freq==="ano"?600000:50000,st:freq==="ano"?100:25,tog:true,freq,sF,lMes:t.eurMes,lAno:t.eurAno},{l:t.horiz,v:yr,fn:sY,mx:50,st:1,u:t.anos}]}/>
    {/* ── AÑADIR ACTIVOS ── */}
    <div style={{fontSize:11,color:TH.muted,fontWeight:700,marginBottom:5}}>{t.addActivos}</div>
    <input value={srcQ} onChange={e=>{setSrcQ(e.target.value);if(e.target.value)setExp(false);}} placeholder={t.buscar} style={{width:"100%",padding:"9px 12px",borderRadius:10,border:`1.5px solid ${TH.border}`,fontSize:13,background:"#fff",marginBottom:8,outline:"none",boxSizing:"border-box"}}/>
    {srcQ?<div style={{background:"#fff",border:`1.5px solid ${TH.border}`,borderRadius:10,maxHeight:220,overflowY:"auto",marginBottom:14}}>
      {(()=>{const q=srcQ.toLowerCase();const res=ASSETS.filter(a=>a.name.es.toLowerCase().includes(q)||a.name.en.toLowerCase().includes(q)||(a.desc.es+" "+a.desc.en).toLowerCase().includes(q)||a.id.includes(q));if(!res.length)return<div style={{textAlign:"center",padding:20,color:TH.light,fontSize:13}}>No se encontró "{srcQ}"</div>;return res.map(a=>{const on=sel.includes(a.id);const cat=CATS.find(c=>c.id===a.cat);const yrs=Object.keys(R[a.id]||{}).length;return<div key={a.id} onClick={()=>{tog(a.id);setSrcQ("");}} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",cursor:"pointer",fontSize:13,borderBottom:"0.5px solid #F2F0EB",background:on?TH.greenLight:"transparent"}}><div style={{width:8,height:8,borderRadius:2,background:a.color,flexShrink:0}}/><span style={{fontWeight:600,flex:1}}>{a.name[lang]}</span><span style={{fontSize:11,color:TH.light}}>{cat?.name[lang]} · {yrs}a</span><div style={{width:18,height:18,borderRadius:4,border:on?"1.5px solid #16754E":"1.5px solid #ddd",background:on?"#16754E":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",flexShrink:0}}>{on?"✓":""}</div></div>;});})()}
    </div>:<>
    <div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap"}}>{CATS.map(c=>{const catAssets=ASSETS.filter(a=>a.cat===c.id);const n=sel.filter(id=>catAssets.find(a=>a.id===id)).length;return<button key={c.id} onClick={()=>{sT(c.id);setExp(false);}} style={{padding:"5px 12px",borderRadius:8,border:"none",fontSize:12,fontWeight:700,cursor:"pointer",background:tab===c.id?"#fff":"transparent",color:tab===c.id?"#111":"#aaa",boxShadow:tab===c.id?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>{c.name[lang]}{n>0?" ("+n+")":""}</button>;})}</div>
    {!expanded?<>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>{ASSETS.filter(a=>a.cat===tab).slice(0,4).map(a=>{const on=sel.includes(a.id);return<button key={a.id} onClick={()=>tog(a.id)} style={{padding:"6px 14px",borderRadius:20,border:on?"2px solid #16754E":`2px solid ${TH.border}`,background:on?TH.greenLight:"#fff",color:on?"#065f46":"#555",fontSize:13,fontWeight:600,cursor:"pointer"}}>{a.name[lang]}{on?" ✓":""}</button>;})}</div>
      {ASSETS.filter(a=>a.cat===tab).length>4&&<button onClick={()=>setExp(true)} style={{width:"100%",padding:8,borderRadius:8,border:"1.5px dashed #ddd",background:"transparent",fontSize:12,color:TH.muted,cursor:"pointer",marginBottom:14}}>{t.verN.replace("{n}",ASSETS.filter(a=>a.cat===tab).length+" "+CATS.find(c=>c.id===tab)?.name[lang])} ▼</button>}
      {ASSETS.filter(a=>a.cat===tab).length<=4&&<div style={{marginBottom:14}}/>}
    </>:<>
      <div style={{background:"#fff",border:`1.5px solid ${TH.border}`,borderRadius:10,maxHeight:260,overflowY:"auto",marginBottom:0}}>
        {ASSETS.filter(a=>a.cat===tab).map(a=>{const on=sel.includes(a.id);const yrs=Object.keys(R[a.id]||{}).length;return<div key={a.id} onClick={()=>tog(a.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",cursor:"pointer",fontSize:13,borderBottom:"0.5px solid #F2F0EB",background:on?TH.greenLight:"transparent"}}><div style={{width:8,height:8,borderRadius:2,background:a.color,flexShrink:0}}/><span style={{fontWeight:600,flex:1}}>{a.name[lang]}</span><span style={{fontSize:11,color:TH.light}}>{yrs} {t.anos}</span><div style={{width:18,height:18,borderRadius:4,border:on?"1.5px solid #16754E":"1.5px solid #ddd",background:on?"#16754E":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",flexShrink:0}}>{on?"✓":""}</div></div>;})}
      </div>
      <button onClick={()=>setExp(false)} style={{width:"100%",padding:8,borderRadius:"0 0 10px 10px",border:`1.5px solid ${TH.border}`,borderTop:"none",background:TH.bg2,fontSize:12,color:TH.muted,cursor:"pointer",marginBottom:14}}>{t.cerrar} ▲</button>
    </>}
    </>}
    {sel.length>0&&<div style={cdS}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:13,fontWeight:700}}>{t.pesos}: <span style={{color:Math.abs(tW-100)<1?"#16754E":"#f59e0b",fontFamily:"monospace"}}>{tW}%</span> / 100%</span><button onClick={()=>{const w=Math.floor(100/sel.length);const rem=100-w*sel.length;const n={};sel.forEach((id,i)=>{n[id]=w+(i<rem?1:0);});sW(n);}} style={{fontSize:11,background:TH.bg2,border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>{t.equi}</button></div>
      {sel.map(id=>{const a=ASSETS.find(x=>x.id===id);return<div key={id} style={{marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
          <span style={{width:90,fontSize:12,fontWeight:600,flexShrink:0}}>{a.name[lang]}</span>
          <input type="range" min={0} max={100} value={wt[id]||0} onChange={e=>sW({...wt,[id]:Number(e.target.value)})} style={{flex:1}}/>
          <div style={{display:"flex",alignItems:"center",background:TH.bg2,border:`1.5px solid ${TH.border}`,borderRadius:8,width:54,flexShrink:0}}><input type="number" min={0} max={100} value={wt[id]||0} onChange={e=>sW({...wt,[id]:Math.max(0,Math.min(100,Number(e.target.value)||0))})} style={{width:32,border:"none",background:"transparent",textAlign:"right",fontSize:12,fontWeight:700,outline:"none",padding:"4px 0 4px 3px",fontFamily:"monospace",color:TH.dark}}/><span style={{fontSize:10,color:TH.light,paddingRight:4}}>%</span></div>
          <button onClick={()=>tog(id)} style={{background:"none",border:"none",color:"#ccc",cursor:"pointer",fontSize:16}}>x</button>
        </div>
        <div style={{fontSize:10,color:TH.light,marginLeft:0,fontStyle:"italic"}}>{a.desc[lang]}</div>
      </div>;})}
    </div>}

    {scs&&<div>
      {/* Projected warning */}
      {pS.projected&&<div style={{padding:"8px 14px",borderRadius:10,background:"#eef2ff",border:"1px solid #c7d2fe",fontSize:11,color:"#4338ca",marginBottom:10}}>{t.proyectado.replace("{real}",String(pS.usedHorizon)).replace("{target}",String(yr))}</div>}

      {/* Few windows */}
      {pS.fewWindows&&<div style={{padding:"8px 14px",borderRadius:10,background:"#fffbeb",border:"1px solid #fef3c7",fontSize:11,color:"#92400e",marginBottom:10}}>{t.pocasVentanas.replace("{n}",String(pS.rollingCount))}</div>}

      {showShortTermWarning&&<div style={{padding:"10px 14px",borderRadius:10,background:TH.redLight,border:"1px solid #fecaca",fontSize:12,color:TH.red,marginBottom:10,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:18}}>⚠</span>{t.alerta}
      </div>}

      {/* SCENARIO CARDS — money big, rate visible */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:10,marginBottom:12}}>
        {scs.map((s,i)=>{const fin=s.d[s.d.length-1].v;const pr=fin-tI;const mu=tI>0?fin/tI:0;return<div key={i} style={{...cdS,marginBottom:0,border:i===1?"2px solid #16754E33":`1px solid ${TH.border}`,background:i===1?TH.greenLight:"#fff",position:"relative"}}>
          {i===1&&<div style={{position:"absolute",top:-1,left:"50%",transform:"translateX(-50%)",background:TH.green,color:"#fff",fontSize:8,fontWeight:800,padding:"2px 8px",borderRadius:"0 0 6px 6px"}}>{s.l}</div>}
          <div style={{fontSize:10,fontWeight:700,color:COL[i],textTransform:"uppercase",marginBottom:5,marginTop:i===1?6:0}}>{s.l} <span style={{fontWeight:500,opacity:0.7}}>({s.prob}%)</span></div>
          <div style={{fontSize:22,fontWeight:800,fontFamily:"monospace",color:TH.dark}}>{fm(fin)} EUR</div>
          <div style={{fontSize:14,fontWeight:700,fontFamily:"monospace",color:s.r>=0?"#16754E":"#ef4444",marginTop:3}}>{fp(s.r)} <span style={{fontSize:10,fontWeight:500,color:TH.light}}>{t.ano}</span></div>
          <div style={{fontSize:11,color:pr>=0?"#16754E":"#ef4444",fontWeight:600,marginTop:6,paddingTop:6,borderTop:"1px solid #f3f4f6"}}>{pr>=0?"+":""}{fm(pr)} | x{mu.toFixed(1)}</div>
        </div>;})}
      </div>

      {/* PROBABILITY & WORST CASE */}
      <div style={{...cdS,background:TH.bg2,padding:"12px 16px"}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"stretch"}}>
          <div style={{flex:"1 1 140px",background:"#fff",borderRadius:10,padding:"10px 14px",border:`1px solid ${TH.border}`,textAlign:"center"}}>
            <div style={{fontSize:10,color:TH.light,fontWeight:600,marginBottom:4}}>{t.probPerd}</div>
            <div style={{fontSize:26,fontWeight:800,fontFamily:"monospace",color:pS.probLossNum>25?"#ef4444":pS.probLossNum>10?"#f59e0b":"#16754E"}}>{pS.probLossDisplay}</div>
          </div>
          <div style={{flex:"1 1 140px",background:"#fff",borderRadius:10,padding:"10px 14px",border:`1px solid ${TH.border}`,textAlign:"center"}}>
            <div style={{fontSize:10,color:TH.light,fontWeight:600,marginBottom:4}}>{t.peorCaso}</div>
            <div style={{fontSize:26,fontWeight:800,fontFamily:"monospace",color:"#ef4444"}}>{fp(pS.worstCase)}</div>
          </div>
        </div>
        <div style={{marginTop:10,fontSize:11,color:TH.muted,textAlign:"center",fontStyle:"italic"}}>
          {t.insight.replace("{yr}",String(yr)).replace("{pct}",pS.probLossDisplay)}
        </div>
      </div>

      {/* CHART */}
      <div style={cdS}><div style={{fontSize:13,fontWeight:700,marginBottom:8}}>{t.evo}</div><SvgChart lines={[scs[0].d,scs[1].d,scs[2].d]} years={yr} labels={[t.pess,t.esp,t.opt]} colors={COL} fill={true} yearLabel={t.yearN}/></div>

      {/* PORTFOLIO + DONUT + RISK */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:10,marginBottom:12}}>
        <div style={cdS}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>{t.tuCart}</div>
          <div style={{display:"flex",gap:14,alignItems:"center"}}>
            <Donut items={donutItems} size={80}/>
            <div style={{flex:1}}>
              {donutItems.map(d=><div key={d.name} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <div style={{width:8,height:8,borderRadius:2,background:d.c,flexShrink:0}}/>
                <span style={{flex:1,fontSize:11,color:TH.muted}}>{d.name}</span>
                <span style={{fontSize:11,fontFamily:"monospace",fontWeight:600,color:TH.muted}}>{Math.round(d.w)}%</span>
              </div>)}
            </div>
          </div>
        </div>
        <div style={cdS}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>{t.riesgo}</div>
          <div style={{display:"flex",gap:2,marginBottom:5}}>{rlC.map((c,i)=><div key={i} style={{flex:1,height:5,borderRadius:3,background:i<=rL?c:"#eee"}}/>)}</div>
          <div style={{fontSize:13,fontWeight:700,color:rlC[rL],marginBottom:12}}>{t.riskL[rL]}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:55,background:TH.bg2,borderRadius:10,padding:"8px 8px",textAlign:"center"}}><div style={{fontSize:9,color:TH.light}}>{t.tuAp}</div><div style={{fontSize:12,fontWeight:800,fontFamily:"monospace"}}>{fm(tI)}</div></div>
            <div style={{flex:1,minWidth:55,background:TH.greenLight,borderRadius:10,padding:"8px 8px",textAlign:"center"}}><div style={{fontSize:9,color:TH.light}}>{t.mktGen}</div><div style={{fontSize:12,fontWeight:800,fontFamily:"monospace",color:"#16754E"}}>+{fm(Math.max(0,scs[1].d[scs[1].d.length-1].v-tI))}</div></div>
            <div style={{flex:1,minWidth:55,background:"#eef2ff",borderRadius:10,padding:"8px 8px",textAlign:"center"}}><div style={{fontSize:9,color:TH.light}}>{t.intEsp}</div><div style={{fontSize:12,fontWeight:800,fontFamily:"monospace",color:"#6366f1"}}>{fp(pS.e)}</div></div>
          </div>
        </div>
      </div>

      {/* BREAKDOWN */}
      <div style={{...cdS,padding:0}}>
        <button onClick={()=>sBk(!showBk)} style={{width:"100%",padding:"12px 16px",border:"none",background:"transparent",display:"flex",justifyContent:"space-between",cursor:"pointer",fontSize:12,fontWeight:700,color:TH.muted}}><span>{t.desglose}</span><span>{showBk?"▲":"▼"}</span></button>
        {showBk&&<div style={{padding:"0 16px 14px"}}>
          <div style={{display:"flex",gap:4,padding:"6px 0",borderBottom:"1px solid "+TH.border,fontSize:10,color:TH.light,fontWeight:600}}>
            <span style={{flex:2}}>{t.activo}</span><span style={{width:45,textAlign:"right"}}>{t.peso}</span><span style={{width:55,textAlign:"right"}}>{t.rendEsp}</span><span style={{width:55,textAlign:"right"}}>{t.contrib}</span>
          </div>
          {assetBreakdown.map(ab=>(
            <div key={ab.name} style={{display:"flex",gap:4,padding:"6px 0",borderBottom:"1px solid #f8f8f8",fontSize:11,alignItems:"center"}}>
              <div style={{flex:2}}><div style={{fontWeight:600,color:TH.dark}}>{ab.name}</div></div>
              <span style={{width:45,textAlign:"right",fontFamily:"monospace",color:TH.muted}}>{Math.round(ab.weight)}%</span>
              <span style={{width:55,textAlign:"right",fontFamily:"monospace",color:ab.expRet>=0?"#16754E":"#ef4444"}}>{fp(ab.expRet)}</span>
              <span style={{width:55,textAlign:"right",fontFamily:"monospace",fontWeight:700,color:ab.contrib>=0?"#16754E":"#ef4444"}}>{fp(ab.contrib)}</span>
            </div>
          ))}
        </div>}
      </div>

      {/* PORTFOLIO ANALYSIS */}
      <div style={cdS}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>{t.analisis}</div>
        {(()=>{
          const pa=portfolioAlerts;
          const all=[...pa.risk,...pa.diversification,...pa.coherence];
          const renderCat=(alerts,title)=>{
            if(!alerts.length) return null;
            const sorted=[...alerts.filter(a=>a.type==="warn"),...alerts.filter(a=>a.type==="info"),...alerts.filter(a=>a.type==="ok")];
            return <div style={{marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:TH.muted,marginBottom:5,textTransform:"uppercase",letterSpacing:0.5}}>{title}</div>
              {sorted.map((a,i)=><div key={i} style={{
                padding:"7px 10px",borderRadius:6,marginBottom:3,fontSize:12,lineHeight:1.5,display:"flex",gap:6,alignItems:"flex-start",
                background:a.type==="warn"?TH.redLight:a.type==="ok"?"#f0fdf4":TH.blueLight,
                border:a.type==="warn"?"1px solid #fecaca":a.type==="ok"?"1px solid #bbf7d0":"1px solid #bfdbfe",
                color:a.type==="warn"?TH.red:a.type==="ok"?"#166534":"#1e40af"
              }}>
                <span style={{fontSize:13,flexShrink:0}}>{a.type==="warn"?"⚠️":a.type==="ok"?"✅":"💡"}</span>
                <span>{a.msg[lang]}</span>
              </div>)}
            </div>;
          };
          return <>
            {!all.length&&<div style={{fontSize:12,color:"#16754E",display:"flex",alignItems:"center",gap:6,marginBottom:8}}><span style={{fontSize:16}}>✓</span>{t.sinProblemas}</div>}
            {renderCat(pa.risk,t.catRiesgo)}
            {renderCat(pa.diversification,t.catDiversi)}
            {renderCat(pa.coherence,t.catCoher)}
          </>;
        })()}
        <div style={{fontSize:14,color:TH.muted,lineHeight:1.7,fontStyle:"italic",borderTop:"1px solid "+TH.border,paddingTop:14,marginTop:8,textAlign:"center"}}>"{t.inspirar}"</div>
      </div>

      {/* SHARE BUTTON */}
      {scs&&<button onClick={()=>{
        const activeAssets=sel.filter(id=>(nW[id]||0)>0).map(id=>{const a=ASSETS.find(x=>x.id===id);return{name:a.name[lang],weight:nW[id]||0,color:a.color};});
        generateShareImage({
          profileLabel:t.perfilOps[profile],
          horizon:yr,initial:ini,monthly:mo,freq,
          assets:activeAssets,
          scenarios:scs,
          probLoss:pS.probLossDisplay,
          lang
        });
      }} style={{width:"100%",padding:"14px 0",borderRadius:12,border:"2px solid #16754E",background:TH.greenLight,color:TH.greenText,fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#065f46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        {t.compartir}
      </button>}

      {/* METHODOLOGY */}
      <div style={{...cdS,padding:0}}><button onClick={()=>sMt(!sm)} style={{width:"100%",padding:"12px 16px",border:"none",background:"transparent",display:"flex",justifyContent:"space-between",cursor:"pointer",fontSize:12,fontWeight:600,color:TH.muted}}><span>{t.como}</span><span>{sm?"▲":"▼"}</span></button>{sm&&<div style={{padding:"0 16px 14px",fontSize:11,color:TH.muted,lineHeight:1.8,whiteSpace:"pre-line"}}>{t.metodo}</div>}</div>
      <div style={{fontSize:11,color:"#92400e",background:"#fffbeb",padding:12,borderRadius:10,textAlign:"center",border:"1px solid #fef3c7",marginBottom:12}}>{t.warn}</div>

      <div style={{padding:18,borderRadius:14,background:"linear-gradient(135deg,#E8F5EF,#F0FDF4)",border:"1px solid #bbf7d0",textAlign:"center"}}>
        <div style={{fontSize:14,fontWeight:800,color:TH.greenText,marginBottom:3}}>{t.optim}</div>
        <div style={{fontSize:11,color:TH.muted,marginBottom:10}}>{t.prox}</div>
        <button onClick={()=>window.open("https://forms.gle/JMZg1w5eAUHnYVHw8","_blank")} style={{padding:"8px 20px",fontSize:12,background:TH.green,color:"#fff",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer"}}>{t.avisarme}</button>
      </div>
    </div>}
  </div>);
}

/* ══════════════════════════════════════════════
   SIMULATION PAGE — preconfigured portfolio pages
   ══════════════════════════════════════════════ */
function SimulationPage({sim,t,lang,go}){
  const cdS={background:TH.card,borderRadius:TH.r2,padding:14,marginBottom:14,border:`1.5px solid ${TH.border}`};
  const h3s={fontSize:17,fontWeight:700,marginBottom:8,marginTop:0};
  const ps={fontSize:14,color:TH.muted,lineHeight:1.7,margin:0,whiteSpace:"pre-line"};
  const a=sim.analysis;
  return(<div>
    {/* BLOQUE 1 — Título + gancho */}
    <h2 style={{fontSize:22,fontWeight:800,lineHeight:1.3,marginBottom:10,marginTop:0}}>{sim.title[lang]}</h2>
    {sim.hook&&<div style={{fontSize:14,color:TH.text,lineHeight:1.7,marginBottom:18,whiteSpace:"pre-line"}}>{sim.hook[lang]}</div>}
    {/* BLOQUE 2 — Qué es esta simulación */}
    <div style={{background:TH.bg2,borderRadius:10,padding:14,marginBottom:18,border:"1px solid #e2e8f0"}}>
      <p style={{fontSize:13,color:TH.muted,lineHeight:1.7,margin:0,whiteSpace:"pre-line"}}>{sim.intro[lang]}</p>
    </div>
    {/* BLOQUE 3 — Simulador */}
    <PortfolioSim t={t} lang={lang} cfg={sim}/>
    {/* BLOQUE 4 — Análisis */}
    {a&&<div style={{marginTop:24}}>
      <div style={cdS}>
        <h3 style={h3s}>{lang==="es"?"Qué significan estos resultados":"What these results mean"}</h3>
        <p style={ps}>{a.meaning[lang]}</p>
      </div>
      <div style={cdS}>
        <h3 style={h3s}>{a.risk.title[lang]}</h3>
        <p style={ps}>{a.risk[lang]}</p>
      </div>
      <div style={cdS}>
        <h3 style={h3s}>{a.why.title[lang]}</h3>
        {a.why.items.map((it,i)=><p key={i} style={{fontSize:14,color:TH.text,lineHeight:1.6,margin:"0 0 8px",paddingLeft:8,borderLeft:"3px solid "+(ASSETS.find(x=>sim.assets[i]&&x.id===sim.assets[i].id)?.color||"#ddd")}}>{it[lang]}</p>)}
        {a.why.extra&&<p style={{...ps,marginTop:10}}>{a.why.extra[lang]}</p>}
      </div>
      <div style={cdS}>
        <h3 style={h3s}>{a.profile.title[lang]}</h3>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
          <span style={{padding:"4px 12px",borderRadius:20,fontSize:12,background:"#fef3c7",color:"#92400e",fontWeight:600}}>{lang==="es"?"Riesgo":"Risk"}: {a.profile.risk_level[lang]}</span>
          <span style={{padding:"4px 12px",borderRadius:20,fontSize:12,background:"#e0f2fe",color:"#0369a1",fontWeight:600}}>{lang==="es"?"Horizonte":"Horizon"}: {a.profile.horizon[lang]}</span>
        </div>
        <p style={{fontSize:13,color:TH.muted,lineHeight:1.6,margin:"0 0 6px"}}><strong>{lang==="es"?"Ideal para":"Ideal for"}:</strong> {a.profile.ideal[lang]}</p>
        <p style={{fontSize:13,color:TH.muted,lineHeight:1.6,margin:0,fontStyle:"italic"}}>{a.profile.note[lang]}</p>
      </div>
      <div style={{background:TH.greenLight,borderRadius:12,padding:14,marginBottom:14,border:"1px solid #bbf7d0"}}>
        <h3 style={{...h3s,fontSize:15}}>{lang==="es"?"Conclusión rápida":"Quick conclusion"}</h3>
        <p style={{fontSize:13,margin:"0 0 4px",color:"#166534"}}>✅ {a.conclusion.expect[lang]}</p>
        <p style={{fontSize:13,margin:"0 0 4px",color:"#92400e"}}>⚠️ {a.conclusion.risk[lang]}</p>
        <p style={{fontSize:13,margin:0,color:"#1e40af"}}>🎯 {a.conclusion.target[lang]}</p>
      </div>
    </div>}
    {/* BLOQUE 5 — FAQ */}
    {sim.faq&&<div style={{marginTop:10}}>
      <h3 style={{...h3s,fontSize:16,marginBottom:12}}>{lang==="es"?"Preguntas frecuentes":"Frequently asked questions"}</h3>
      {sim.faq.map((f,i)=><div key={i} style={{marginBottom:14}}>
        <p style={{fontSize:14,fontWeight:700,color:TH.dark,margin:"0 0 4px"}}>{f.q[lang]}</p>
        <p style={{fontSize:13,color:TH.muted,lineHeight:1.6,margin:0}}>{f.a[lang]}</p>
      </div>)}
    </div>}
    {/* BLOQUE 6 — Otras simulaciones */}
    {sim.related&&<div style={cdS}>
      <h3 style={{...h3s,fontSize:15}}>{lang==="es"?"Otras simulaciones que pueden interesarte":"Other simulations you might find interesting"}</h3>
      {sim.related.map(slug=>{const s=SIMS.find(x=>x.slug===slug);if(!s)return null;return<a key={slug} href={"/simulacion/"+slug} style={{display:"block",padding:"8px 0",fontSize:14,color:"#16754E",fontWeight:600,textDecoration:"none",borderBottom:"0.5px solid "+TH.border}}>→ {s.title[lang]}</a>;})}
    </div>}
    {/* BLOQUE 7 — CTA */}
    <div style={{textAlign:"center",marginTop:20,marginBottom:10}}>
      <p style={{fontSize:14,fontWeight:700,marginBottom:8,color:TH.dark}}>{lang==="es"?"Simula tu propia cartera con tus porcentajes":"Simulate your own portfolio with your percentages"}</p>
      <button onClick={()=>go("/simulador-cartera")} style={{background:TH.green,color:"#fff",border:"none",borderRadius:10,padding:"12px 28px",fontSize:14,fontWeight:700,cursor:"pointer"}}>{lang==="es"?"Ir al simulador completo":"Go to full simulator"} →</button>
    </div>
  </div>);
}

/* ══════════════════════════════════════════════
   APP ROOT
   ══════════════════════════════════════════════ */
/* ══════════════════════════════════════════════
   AUTH — Login / Register Page
   ══════════════════════════════════════════════ */
function LoginPage({go,lang}){
  const t=lang==="es"?{
    title:"Crea tu cuenta gratis",sub:"Empieza a controlar tus inversiones en un solo sitio",
    google:"Continuar con Google",or:"o",email:"Email",pass:"Contraseña",
    create:"Crear cuenta",have:"¿Ya tienes cuenta?",enter:"Entrar",
    noHave:"¿No tienes cuenta?",createFree:"Crear cuenta gratis",
    legal:"Al continuar aceptas nuestros Términos y Política de Privacidad",
    titleLogin:"Entra en tu cuenta",subLogin:"Accede a tu cartera"
  }:{
    title:"Create your free account",sub:"Start tracking your investments in one place",
    google:"Continue with Google",or:"or",email:"Email",pass:"Password",
    create:"Create account",have:"Already have an account?",enter:"Sign in",
    noHave:"Don't have an account?",createFree:"Create free account",
    legal:"By continuing you accept our Terms and Privacy Policy",
    titleLogin:"Sign in to your account",subLogin:"Access your portfolio"
  };
  const[mode,setMode]=useState("register");
  const[email,setEmail]=useState("");
  const[pass,setPass]=useState("");
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");

  const handleGoogle=async()=>{
    setLoading(true);
    const{error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin+"/onboarding"}});
    if(error)setError(error.message);
    setLoading(false);
  };
  const handleEmail=async(e)=>{
    e.preventDefault();setLoading(true);setError("");
    if(mode==="register"){
      const{error}=await supabase.auth.signUp({email,password:pass});
      if(error)setError(error.message);
      else go("/onboarding");
    }else{
      const{error}=await supabase.auth.signInWithPassword({email,password:pass});
      if(error)setError(error.message);
      else go("/dashboard");
    }
    setLoading(false);
  };

  const isLogin=mode==="login";
  return(<div style={{maxWidth:380,margin:"0 auto",padding:"60px 20px",textAlign:"center"}}>
    <div style={{fontFamily:TH.serif,fontSize:28,color:TH.dark,marginBottom:8}}>{isLogin?t.titleLogin:t.title}</div>
    <p style={{fontSize:14,color:TH.muted,marginBottom:32}}>{isLogin?t.subLogin:t.sub}</p>

    <button onClick={handleGoogle} disabled={loading} style={{width:"100%",padding:"12px 20px",borderRadius:10,border:`1.5px solid ${TH.border}`,background:TH.card,fontSize:14,fontWeight:600,color:TH.dark,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontFamily:TH.sans,marginBottom:20}}>
      <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
      {t.google}
    </button>

    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
      <div style={{flex:1,height:1,background:TH.border}}/>
      <span style={{fontSize:12,color:TH.light}}>{t.or}</span>
      <div style={{flex:1,height:1,background:TH.border}}/>
    </div>

    <form onSubmit={handleEmail}>
      <input type="email" placeholder={t.email} value={email} onChange={e=>setEmail(e.target.value)} required style={{width:"100%",padding:"12px 14px",borderRadius:10,border:`1.5px solid ${TH.border}`,fontSize:14,fontFamily:TH.sans,marginBottom:10,outline:"none",background:TH.card,color:TH.dark}}/>
      <input type="password" placeholder={t.pass} value={pass} onChange={e=>setPass(e.target.value)} required minLength={6} style={{width:"100%",padding:"12px 14px",borderRadius:10,border:`1.5px solid ${TH.border}`,fontSize:14,fontFamily:TH.sans,marginBottom:14,outline:"none",background:TH.card,color:TH.dark}}/>
      {error&&<div style={{fontSize:12,color:TH.red,marginBottom:10}}>{error}</div>}
      <button type="submit" disabled={loading} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:TH.green,color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:TH.sans}}>{isLogin?t.enter:t.create}</button>
    </form>

    <p style={{fontSize:13,color:TH.muted,marginTop:20}}>
      {isLogin?t.noHave:t.have}{" "}
      <span onClick={()=>{setMode(isLogin?"register":"login");setError("");}} style={{color:TH.green,fontWeight:600,cursor:"pointer"}}>{isLogin?t.createFree:t.enter}</span>
    </p>
    <p style={{fontSize:11,color:TH.light,marginTop:16}}>{t.legal}</p>
  </div>);
}

/* ══════════════════════════════════════════════
   ONBOARDING — 3-step setup
   ══════════════════════════════════════════════ */
const TEMPLATES={
  conservadora:[{id:"bond_global",w:60},{id:"msci_world",w:30},{id:"gold",w:10}],
  equilibrada:[{id:"msci_world",w:60},{id:"bond_global",w:30},{id:"gold",w:10}],
  agresiva:[{id:"msci_world",w:80},{id:"btc",w:10},{id:"gold",w:10}]
};

function OnboardingPage({go,lang,session}){
  const t=lang==="es"?{
    step:"Paso",of:"de",next:"Siguiente",prev:"Anterior",skip:"Saltar este paso",finish:"Ir al dashboard",
    t1:"¿Cómo te defines como inversor?",s1:"Esto nos ayuda a personalizar tu análisis. Puedes cambiarlo después.",
    profiles:["Conservador","Moderado","Agresivo","Muy agresivo"],
    profileDesc:["Prefiero ganar poco pero no perder casi nunca","Acepto caídas temporales a cambio de crecimiento","Busco máxima rentabilidad, tolero caídas fuertes","Acepto riesgo extremo por oportunidad de altos retornos"],
    t2:"¿Cómo quieres distribuir tu cartera?",s2:"Esto nos permite avisarte cuándo rebalancear.",
    templates:["Conservadora","Equilibrada","Agresiva","Personalizada"],
    t3:"Registra tu primera inversión",s3:"Mira tu app del broker y copia los datos. 10 segundos.",
    asset:"Activo",broker:"Broker",invested:"Total invertido (€)",value:"Valor actual (€)",
    gain:"Ganancia",add:"Añadir posición",another:"Añadir otra",goDash:"Ir al dashboard"
  }:{
    step:"Step",of:"of",next:"Next",prev:"Back",skip:"Skip this step",finish:"Go to dashboard",
    t1:"How do you define yourself as an investor?",s1:"This helps us personalize your analysis. You can change it later.",
    profiles:["Conservative","Moderate","Aggressive","Very aggressive"],
    profileDesc:["I prefer earning little but almost never losing","I accept temporary drops for growth","I seek maximum returns, I tolerate strong drops","I accept extreme risk for high return opportunities"],
    t2:"How do you want to distribute your portfolio?",s2:"This lets us alert you when to rebalance.",
    templates:["Conservative","Balanced","Aggressive","Custom"],
    t3:"Register your first investment",s3:"Check your broker app and copy the data. 10 seconds.",
    asset:"Asset",broker:"Broker",invested:"Total invested (€)",value:"Current value (€)",
    gain:"Gain",add:"Add position",another:"Add another",goDash:"Go to dashboard"
  };

  const[step,setStep]=useState(1);
  const[profile,setProfile]=useState(-1);
  const[tpl,setTpl]=useState(-1);
  const[targets,setTargets]=useState([]);
  const[positions,setPositions]=useState([]);
  const[pos,setPos]=useState({asset_id:"",broker:"",invested:"",value:""});
  const[saving,setSaving]=useState(false);

  const selectTpl=(i)=>{
    setTpl(i);
    if(i<3){
      const key=["conservadora","equilibrada","agresiva"][i];
      setTargets(TEMPLATES[key].map(t=>({...t})));
    }else{
      setTargets([]);
    }
  };

  const addPos=()=>{
    if(!pos.asset_id||!pos.invested||!pos.value)return;
    setPositions([...positions,{...pos,invested:Number(pos.invested),value:Number(pos.value)}]);
    setPos({asset_id:"",broker:"",invested:"",value:""});
  };

  const saveAll=async()=>{
    if(!session?.user)return;
    setSaving(true);
    const uid=session.user.id;
    // Save profile
    await supabase.from("profiles").update({risk_profile:profile}).eq("id",uid);
    // Save targets
    if(targets.length>0){
      const rows=targets.map(t=>({user_id:uid,asset_id:t.id,weight:t.w}));
      await supabase.from("target_portfolio").upsert(rows,{onConflict:"user_id,asset_id"});
    }
    // Save positions
    for(const p of positions){
      await supabase.from("positions").upsert({
        user_id:uid,asset_id:p.asset_id,broker:p.broker||null,
        total_invested:p.invested,current_value:p.value
      },{onConflict:"user_id,asset_id,broker"});
    }
    // Create first snapshot
    if(positions.length>0){
      const totalInv=positions.reduce((s,p)=>s+p.invested,0);
      const totalVal=positions.reduce((s,p)=>s+p.value,0);
      const month=new Date().toISOString().slice(0,7)+"-01";
      await supabase.from("history").upsert({user_id:uid,month,total_invested:totalInv,total_value:totalVal},{onConflict:"user_id,month"});
    }
    setSaving(false);
    go("/dashboard");
  };

  const pBar=<div style={{display:"flex",gap:6,marginBottom:28}}>
    {[1,2,3].map(i=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=step?TH.green:TH.border}}/>)}
  </div>;

  const posGain=pos.invested&&pos.value?(Number(pos.value)-Number(pos.invested)):null;
  const posPct=posGain!==null&&Number(pos.invested)>0?(posGain/Number(pos.invested)*100):null;

  return(<div style={{maxWidth:440,margin:"0 auto",padding:"32px 20px"}}>
    {pBar}
    <div style={{fontSize:11,color:TH.light,marginBottom:8}}>{t.step} {step} {t.of} 3</div>

    {step===1&&<div>
      <h2 style={{fontFamily:TH.serif,fontSize:24,color:TH.dark,marginBottom:8}}>{t.t1}</h2>
      <p style={{fontSize:14,color:TH.muted,marginBottom:24}}>{t.s1}</p>
      <div style={{display:"grid",gap:10}}>
        {t.profiles.map((label,i)=><div key={i} onClick={()=>setProfile(i)} style={{padding:"16px 18px",borderRadius:TH.r2,border:`1.5px solid ${profile===i?TH.green:TH.border}`,background:profile===i?TH.greenLight:TH.card,cursor:"pointer"}}>
          <div style={{fontSize:14,fontWeight:600,color:profile===i?TH.greenText:TH.dark,marginBottom:3}}>{label}</div>
          <div style={{fontSize:12,color:profile===i?TH.greenText:TH.muted}}>{t.profileDesc[i]}</div>
        </div>)}
      </div>
      <button onClick={()=>setStep(2)} disabled={profile<0} style={{width:"100%",marginTop:24,padding:"14px",borderRadius:10,border:"none",background:profile>=0?TH.green:TH.border,color:profile>=0?"#fff":TH.muted,fontSize:15,fontWeight:600,cursor:profile>=0?"pointer":"default",fontFamily:TH.sans}}>{t.next}</button>
    </div>}

    {step===2&&<div>
      <h2 style={{fontFamily:TH.serif,fontSize:24,color:TH.dark,marginBottom:8}}>{t.t2}</h2>
      <p style={{fontSize:14,color:TH.muted,marginBottom:24}}>{t.s2}</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
        {t.templates.map((label,i)=><div key={i} onClick={()=>selectTpl(i)} style={{padding:"14px",borderRadius:TH.r2,border:`1.5px solid ${tpl===i?TH.green:TH.border}`,background:tpl===i?TH.greenLight:TH.card,cursor:"pointer",textAlign:"center"}}>
          <div style={{fontSize:13,fontWeight:600,color:tpl===i?TH.greenText:TH.dark}}>{label}</div>
        </div>)}
      </div>
      {targets.length>0&&<div style={{background:TH.bg2,borderRadius:TH.r,padding:14,marginBottom:16}}>
        {targets.map((t2,i)=>{const a=ASSETS.find(a=>a.id===t2.id);return<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:i<targets.length-1?`1px solid ${TH.border}`:"none"}}>
          <span style={{fontSize:13,fontWeight:500,color:TH.dark}}>{a?.name[lang]||t2.id}</span>
          <span style={{fontSize:14,fontWeight:700,fontFamily:"monospace",color:TH.dark}}>{t2.w}%</span>
        </div>;})}
      </div>}
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>setStep(1)} style={{flex:1,padding:"14px",borderRadius:10,border:`1.5px solid ${TH.border}`,background:"transparent",fontSize:14,fontWeight:600,color:TH.muted,cursor:"pointer",fontFamily:TH.sans}}>{t.prev}</button>
        <button onClick={()=>setStep(3)} style={{flex:2,padding:"14px",borderRadius:10,border:"none",background:TH.green,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:TH.sans}}>{t.next}</button>
      </div>
      <div onClick={()=>setStep(3)} style={{textAlign:"center",marginTop:12,fontSize:13,color:TH.green,cursor:"pointer",fontWeight:500}}>{t.skip} →</div>
    </div>}

    {step===3&&<div>
      <h2 style={{fontFamily:TH.serif,fontSize:24,color:TH.dark,marginBottom:8}}>{t.t3}</h2>
      <p style={{fontSize:14,color:TH.muted,marginBottom:24}}>{t.s3}</p>

      {positions.length>0&&<div style={{background:TH.bg2,borderRadius:TH.r,padding:14,marginBottom:16}}>
        {positions.map((p,i)=>{const a=ASSETS.find(a=>a.id===p.asset_id);const g=p.value-p.invested;return<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i<positions.length-1?`1px solid ${TH.border}`:"none",fontSize:13}}>
          <span style={{fontWeight:500,color:TH.dark}}>{a?.name[lang]||p.asset_id}</span>
          <span style={{fontWeight:600,color:g>=0?TH.green:TH.red}}>{g>=0?"+":""}€{Math.round(g)} ({(g/p.invested*100).toFixed(1)}%)</span>
        </div>;})}
      </div>}

      <div style={{display:"grid",gap:10}}>
        <select value={pos.asset_id} onChange={e=>setPos({...pos,asset_id:e.target.value})} style={{padding:"12px 14px",borderRadius:10,border:`1.5px solid ${TH.border}`,fontSize:14,fontFamily:TH.sans,background:TH.card,color:TH.dark}}>
          <option value="">{t.asset}...</option>
          {ASSETS.map(a=><option key={a.id} value={a.id}>{a.name[lang]}</option>)}
        </select>
        <input placeholder={t.broker+" (MyInvestor, Degiro...)"} value={pos.broker} onChange={e=>setPos({...pos,broker:e.target.value})} style={{padding:"12px 14px",borderRadius:10,border:`1.5px solid ${TH.border}`,fontSize:14,fontFamily:TH.sans,background:TH.card,color:TH.dark}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <input type="number" placeholder={t.invested} value={pos.invested} onChange={e=>setPos({...pos,invested:e.target.value})} style={{padding:"12px 14px",borderRadius:10,border:`1.5px solid ${TH.border}`,fontSize:14,fontFamily:TH.sans,background:TH.card,color:TH.dark}}/>
          <input type="number" placeholder={t.value} value={pos.value} onChange={e=>setPos({...pos,value:e.target.value})} style={{padding:"12px 14px",borderRadius:10,border:`1.5px solid ${TH.border}`,fontSize:14,fontFamily:TH.sans,background:TH.card,color:TH.dark}}/>
        </div>
        {posGain!==null&&<div style={{fontSize:13,color:posGain>=0?TH.green:TH.red,fontWeight:600,textAlign:"center"}}>{t.gain}: {posGain>=0?"+":""}€{Math.round(posGain)} ({posPct.toFixed(1)}%)</div>}
        <button onClick={addPos} disabled={!pos.asset_id||!pos.invested||!pos.value} style={{padding:"12px",borderRadius:10,border:`1.5px solid ${TH.green}`,background:TH.greenLight,color:TH.greenText,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:TH.sans}}>{positions.length>0?t.another:t.add}</button>
      </div>

      <div style={{display:"flex",gap:10,marginTop:20}}>
        <button onClick={()=>setStep(2)} style={{flex:1,padding:"14px",borderRadius:10,border:`1.5px solid ${TH.border}`,background:"transparent",fontSize:14,fontWeight:600,color:TH.muted,cursor:"pointer",fontFamily:TH.sans}}>{t.prev}</button>
        <button onClick={saveAll} disabled={saving||positions.length===0} style={{flex:2,padding:"14px",borderRadius:10,border:"none",background:positions.length>0?TH.green:TH.border,color:positions.length>0?"#fff":TH.muted,fontSize:14,fontWeight:600,cursor:positions.length>0?"pointer":"default",fontFamily:TH.sans}}>{saving?"...":(t.finish+" →")}</button>
      </div>
    </div>}
  </div>);
}

/* ══════════════════════════════════════════════
   DASHBOARD — Main portfolio view
   ══════════════════════════════════════════════ */
function DashboardPage({go,lang,session}){
  const t=lang==="es"?{
    hi:"Buenos días",value:"Valor total",invested:"Aportado",gain:"Ganancia",
    positions:"Mis posiciones",asset:"Activo",target:"Objetivo",broker:"Broker",
    val:"Valor",real:"% Real",addMov:"Registrar movimiento",
    rebalTitle:"Próxima aportación sugerida",
    rebalDesc:"Destina tu próxima aportación a",
    devLabel:"Desviación",loading:"Cargando...",noPos:"No tienes posiciones registradas",
    addFirst:"Añadir primera posición",logout:"Cerrar sesión",
    objective:"Obj",realW:"Real"
  }:{
    hi:"Good morning",value:"Total value",invested:"Invested",gain:"Gain",
    positions:"My positions",asset:"Asset",target:"Target",broker:"Broker",
    val:"Value",real:"% Real",addMov:"Record movement",
    rebalTitle:"Suggested next contribution",
    rebalDesc:"Allocate your next contribution to",
    devLabel:"Deviation",loading:"Loading...",noPos:"No positions registered",
    addFirst:"Add first position",logout:"Sign out",
    objective:"Obj",realW:"Real"
  };

  const[positions,setPositions]=useState([]);
  const[targets,setTargets]=useState([]);
  const[profileData,setProfileData]=useState(null);
  const[historyData,setSnapshots]=useState([]);
  const[loading,setLoading]=useState(true);
  const[showMov,setShowMov]=useState(false);
  const[mov,setMov]=useState({type:"buy",date:new Date().toISOString().slice(0,10),asset_id:"",broker:"",amount:""});
  const[movSaving,setMovSaving]=useState(false);

  const uid=session?.user?.id;
  const userName=session?.user?.user_metadata?.full_name||session?.user?.user_metadata?.name||session?.user?.email?.split("@")[0]||"";

  useEffect(()=>{
    if(!uid)return;
    const load=async()=>{
      const[{data:pos},{data:tgt},{data:prof},{data:snap}]=await Promise.all([
        supabase.from("positions").select("*").eq("user_id",uid),
        supabase.from("target_portfolio").select("*").eq("user_id",uid),
        supabase.from("profiles").select("*").eq("id",uid).single(),
        supabase.from("history").select("*").eq("user_id",uid).order("month")
      ]);
      setPositions(pos||[]);setTargets(tgt||[]);setProfileData(prof);setSnapshots(snap||[]);
      setLoading(false);
    };
    load();
  },[uid]);

  if(loading)return<div style={{textAlign:"center",padding:60,color:TH.muted}}>{t.loading}</div>;

  const totalValue=positions.reduce((s,p)=>s+Number(p.current_value),0);
  const totalInvested=positions.reduce((s,p)=>s+Number(p.total_invested),0);
  const totalGain=totalValue-totalInvested;
  const totalPct=totalInvested>0?(totalGain/totalInvested*100):0;

  // Rebalance calculation
  const targetMap={};targets.forEach(t=>{targetMap[t.asset_id]=Number(t.weight);});
  let worstDev=null;
  positions.forEach(p=>{
    const realW=totalValue>0?(Number(p.current_value)/totalValue*100):0;
    const tgtW=targetMap[p.asset_id]||0;
    const dev=realW-tgtW;
    if(tgtW>0&&(worstDev===null||dev<worstDev.dev)){
      worstDev={asset_id:p.asset_id,dev,tgtW,realW};
    }
  });

  const saveMov=async()=>{
    if(!mov.asset_id||!mov.amount)return;
    setMovSaving(true);
    const amt=Number(mov.amount);
    // Insert movement
    await supabase.from("movements").insert({user_id:uid,asset_id:mov.asset_id,broker:mov.broker||null,type:mov.type,amount:amt,date:mov.date});
    // Update position
    const existing=positions.find(p=>p.asset_id===mov.asset_id&&(p.broker||"")===(mov.broker||""));
    if(existing){
      const newInv=mov.type==="sell"?Number(existing.total_invested)-amt:Number(existing.total_invested)+amt;
      const newVal=mov.type==="sell"?Number(existing.current_value)-amt:Number(existing.current_value)+amt;
      await supabase.from("positions").update({total_invested:Math.max(0,newInv),current_value:Math.max(0,newVal),updated_at:new Date().toISOString()}).eq("id",existing.id);
    }else if(mov.type==="buy"){
      await supabase.from("positions").insert({user_id:uid,asset_id:mov.asset_id,broker:mov.broker||null,total_invested:amt,current_value:amt});
    }
    // Refresh
    const{data:pos}=await supabase.from("positions").select("*").eq("user_id",uid);
    setPositions(pos||[]);
    setShowMov(false);setMov({type:"buy",date:new Date().toISOString().slice(0,10),asset_id:"",broker:"",amount:""});
    setMovSaving(false);
  };

  const handleLogout=async()=>{await supabase.auth.signOut();go("/");};

  if(positions.length===0&&!showMov)return<div style={{textAlign:"center",padding:60}}>
    <div style={{fontFamily:TH.serif,fontSize:24,color:TH.dark,marginBottom:12}}>{t.noPos}</div>
    <button onClick={()=>setShowMov(true)} style={{padding:"14px 28px",borderRadius:10,border:"none",background:TH.green,color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:TH.sans}}>{t.addFirst}</button>
  </div>;

  return(<div>
    {/* HEADER */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div style={{fontSize:15,color:TH.muted}}>{t.hi}, <span style={{fontWeight:600,color:TH.dark}}>{userName}</span></div>
      <button onClick={handleLogout} style={{fontSize:11,color:TH.light,background:"none",border:"none",cursor:"pointer",fontFamily:TH.sans}}>{t.logout}</button>
    </div>

    {/* METRICS */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20}}>
      <div style={{background:TH.card,borderRadius:TH.r2,padding:"14px 12px",border:`1.5px solid ${TH.border}`}}>
        <div style={{fontSize:10,color:TH.light,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{t.value}</div>
        <div style={{fontSize:20,fontWeight:700,fontFamily:"monospace",color:TH.dark}}>{fm(Math.round(totalValue))}€</div>
      </div>
      <div style={{background:TH.card,borderRadius:TH.r2,padding:"14px 12px",border:`1.5px solid ${TH.border}`}}>
        <div style={{fontSize:10,color:TH.light,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{t.invested}</div>
        <div style={{fontSize:20,fontWeight:700,fontFamily:"monospace",color:TH.muted}}>{fm(Math.round(totalInvested))}€</div>
      </div>
      <div style={{background:TH.card,borderRadius:TH.r2,padding:"14px 12px",border:`1.5px solid ${TH.border}`}}>
        <div style={{fontSize:10,color:TH.light,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{t.gain}</div>
        <div style={{fontSize:20,fontWeight:700,fontFamily:"monospace",color:totalGain>=0?TH.green:TH.red}}>{totalGain>=0?"+":""}{fm(Math.round(totalGain))}€</div>
        <div style={{fontSize:11,fontWeight:600,color:totalGain>=0?TH.green:TH.red}}>{totalPct>=0?"+":""}{totalPct.toFixed(1)}%</div>
      </div>
    </div>

    {/* CHART */}
    {historyData.length>1&&<div style={{background:TH.card,borderRadius:TH.r2,padding:16,border:`1.5px solid ${TH.border}`,marginBottom:20}}>
      <SvgChart lines={[historyData.map((s,i)=>({y:i,v:Number(s.total_value),inv:Number(s.total_invested)}))]} years={historyData.map((_,i)=>i)} labels={[t.value]} colors={[TH.green]} fill={true} yearLabel=""/>
    </div>}

    {/* POSITIONS */}
    <div style={{background:TH.card,borderRadius:TH.r2,border:`1.5px solid ${TH.border}`,marginBottom:20,overflow:"hidden"}}>
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${TH.border}`,fontSize:13,fontWeight:700,color:TH.dark}}>{t.positions}</div>
      {positions.map((p,i)=>{
        const a=ASSETS.find(a=>a.id===p.asset_id);
        const val=Number(p.current_value);const inv=Number(p.total_invested);
        const gain=val-inv;const pct=inv>0?(gain/inv*100):0;
        const realW=totalValue>0?(val/totalValue*100):0;
        const tgtW=targetMap[p.asset_id]||0;
        return<div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:8,alignItems:"center",padding:"12px 16px",borderBottom:i<positions.length-1?`1px solid ${TH.border}`:"none"}}>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:TH.dark}}>{a?.name[lang]||p.asset_id}</div>
            <div style={{fontSize:11,color:TH.light}}>{p.broker||""}{tgtW>0?` · ${t.objective} ${tgtW.toFixed(0)}%`:""}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:13,fontWeight:600,fontFamily:"monospace",color:TH.dark}}>{fm(Math.round(val))}€</div>
            <div style={{fontSize:11,fontWeight:600,color:gain>=0?TH.green:TH.red}}>{gain>=0?"+":""}{pct.toFixed(1)}%</div>
          </div>
          <div style={{textAlign:"right",minWidth:44}}>
            <div style={{fontSize:12,fontWeight:700,fontFamily:"monospace",color:TH.dark}}>{realW.toFixed(1)}%</div>
          </div>
        </div>;
      })}
    </div>

    {/* DONUT + REBALANCE */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
      <div style={{background:TH.card,borderRadius:TH.r2,padding:16,border:`1.5px solid ${TH.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Donut items={positions.map(p=>{const a=ASSETS.find(a=>a.id===p.asset_id);return{name:a?.name[lang]||p.asset_id,w:totalValue>0?(Number(p.current_value)/totalValue*100):0,c:a?.color||"#999"};})} size={100}/>
      </div>
      {worstDev&&worstDev.dev<-2&&<div style={{background:TH.greenLight,borderRadius:TH.r2,padding:16,border:`1.5px solid #C6E6D5`,display:"flex",flexDirection:"column",justifyContent:"center"}}>
        <div style={{fontSize:11,fontWeight:700,color:TH.greenText,marginBottom:6}}>{t.rebalTitle}</div>
        <div style={{fontSize:13,color:TH.greenText,lineHeight:1.5}}>{t.rebalDesc} <strong>{ASSETS.find(a=>a.id===worstDev.asset_id)?.name[lang]||worstDev.asset_id}</strong></div>
        <div style={{fontSize:11,color:TH.green,marginTop:6}}>{t.objective}: {worstDev.tgtW.toFixed(0)}% → {t.realW}: {worstDev.realW.toFixed(1)}%</div>
      </div>}
    </div>

    {/* ADD MOVEMENT BUTTON */}
    <button onClick={()=>setShowMov(!showMov)} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:TH.green,color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:TH.sans,marginBottom:16}}>+ {t.addMov}</button>

    {/* MOVEMENT FORM */}
    {showMov&&<div style={{background:TH.card,borderRadius:TH.r2,padding:18,border:`1.5px solid ${TH.border}`,marginBottom:20}}>
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {["buy","sell","dividend"].map(tp=><button key={tp} onClick={()=>setMov({...mov,type:tp})} style={{flex:1,padding:"8px",borderRadius:8,border:`1.5px solid ${mov.type===tp?TH.green:TH.border}`,background:mov.type===tp?TH.greenLight:TH.card,color:mov.type===tp?TH.greenText:TH.muted,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:TH.sans}}>{tp==="buy"?(lang==="es"?"Compra":"Buy"):tp==="sell"?(lang==="es"?"Venta":"Sell"):(lang==="es"?"Dividendo":"Dividend")}</button>)}
      </div>
      <div style={{display:"grid",gap:10}}>
        <input type="date" value={mov.date} onChange={e=>setMov({...mov,date:e.target.value})} style={{padding:"10px 14px",borderRadius:10,border:`1.5px solid ${TH.border}`,fontSize:13,fontFamily:TH.sans,background:TH.card,color:TH.dark}}/>
        <select value={mov.asset_id} onChange={e=>setMov({...mov,asset_id:e.target.value})} style={{padding:"10px 14px",borderRadius:10,border:`1.5px solid ${TH.border}`,fontSize:13,fontFamily:TH.sans,background:TH.card,color:TH.dark}}>
          <option value="">{lang==="es"?"Activo":"Asset"}...</option>
          {positions.map(p=>{const a=ASSETS.find(a=>a.id===p.asset_id);return<option key={p.id} value={p.asset_id}>{a?.name[lang]||p.asset_id}</option>;})}
          <option value="_new">{lang==="es"?"+ Añadir nuevo":"+ Add new"}</option>
        </select>
        <input placeholder="Broker" value={mov.broker} onChange={e=>setMov({...mov,broker:e.target.value})} style={{padding:"10px 14px",borderRadius:10,border:`1.5px solid ${TH.border}`,fontSize:13,fontFamily:TH.sans,background:TH.card,color:TH.dark}}/>
        <input type="number" placeholder={lang==="es"?"Importe (€)":"Amount (€)"} value={mov.amount} onChange={e=>setMov({...mov,amount:e.target.value})} style={{padding:"10px 14px",borderRadius:10,border:`1.5px solid ${TH.border}`,fontSize:13,fontFamily:TH.sans,background:TH.card,color:TH.dark}}/>
        <button onClick={saveMov} disabled={movSaving||!mov.asset_id||!mov.amount} style={{padding:"12px",borderRadius:10,border:"none",background:TH.green,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:TH.sans}}>{movSaving?"...":(lang==="es"?"Registrar":"Record")}</button>
      </div>
    </div>}
  </div>);
}

/* ══════════════════════════════════════════════
   BOTTOM NAV — App navigation bar
   ══════════════════════════════════════════════ */
function BottomNav({go,path,lang}){
  const items=[
    {id:"/dashboard",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,label:lang==="es"?"Cartera":"Portfolio"},
    {id:"/analisis",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>,label:lang==="es"?"Análisis":"Analysis",locked:true},
    {id:"add",icon:null,label:""},
    {id:"/simulador-cartera",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,label:lang==="es"?"Simulador":"Simulator"},
    {id:"/ajustes",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,label:lang==="es"?"Ajustes":"Settings"}
  ];
  return<div style={{position:"fixed",bottom:0,left:0,right:0,background:TH.card,borderTop:`1px solid ${TH.border}`,display:"flex",justifyContent:"space-around",alignItems:"center",padding:"6px 0 env(safe-area-inset-bottom,8px)",zIndex:200}}>
    {items.map((it,i)=>{
      if(it.id==="add")return<div key={i} onClick={()=>go("/dashboard")} style={{width:48,height:48,borderRadius:"50%",background:TH.green,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",marginTop:-18,boxShadow:"0 2px 12px rgba(0,0,0,0.15)"}}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </div>;
      const active=path===it.id;
      return<div key={i} onClick={()=>!it.locked&&go(it.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:it.locked?"default":"pointer",opacity:it.locked?0.4:1,padding:"4px 8px"}}>
        <div style={{color:active?TH.green:TH.muted}}>{it.icon}</div>
        <span style={{fontSize:10,fontWeight:600,color:active?TH.green:TH.muted}}>{it.label}{it.locked?" 🔒":""}</span>
      </div>;
    })}
  </div>;
}

export default function App(){
  const {path, go, simSlug} = useRouter();
  const[lang,setLangState]=useState(()=>{try{return localStorage.getItem("kartera_lang")||"es";}catch(e){return "es";}});
  const setLang=(l)=>{setLangState(l);try{localStorage.setItem("kartera_lang",l);}catch(e){}};
  const t=T[lang];
  const sim=simSlug?SIMS.find(s=>s.slug===simSlug):null;
  const pageTitle = path==="/interes-compuesto" ? t.ci : path==="/simulador-cartera" ? t.sim : path==="/simulacion"&&sim ? sim.title[lang] : null;

  /* Auth state */
  const[session,setSession]=useState(null);
  const[authLoading,setAuthLoading]=useState(true);
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setAuthLoading(false);});
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>{setSession(s);setAuthLoading(false);});
    return()=>subscription.unsubscribe();
  },[]);

  /* Dynamic SEO */
  const seoMap={
    "/":{
      es:["Kartera — Simulador de cartera de inversión con datos reales","Herramientas gratuitas para simular tu cartera de inversión con 36 años de datos históricos. Escenarios realistas, probabilidad de pérdida y más."],
      en:["Kartera — Investment portfolio simulator with real data","Free tools to simulate your investment portfolio with 36 years of historical data. Realistic scenarios, loss probability and more."]
    },
    "/interes-compuesto":{
      es:["Calculadora de Interés Compuesto — Kartera","Calcula cuánto crecerá tu dinero con el interés compuesto. Ajusta capital, aportaciones y plazo."],
      en:["Compound Interest Calculator — Kartera","Calculate how your money will grow with compound interest. Adjust capital, contributions and time frame."]
    },
    "/simulador-cartera":{
      es:["Simulador de Cartera de Inversión — Kartera","Simula tu cartera con 31 activos reales: índices, acciones, bonos, crypto y ETFs. Escenarios pesimista, esperado y optimista con datos de 36 años."],
      en:["Investment Portfolio Simulator — Kartera","Simulate your portfolio with 31 real assets: indices, stocks, bonds, crypto and ETFs. Pessimistic, expected and optimistic scenarios with 36 years of data."]
    }
  };
  const seoSim=sim?{es:[sim.title.es+" — Kartera",sim.hook.es.split("\n")[0]],en:[sim.title.en+" — Kartera",sim.hook.en.split("\n")[0]]}:null;
  const seo=seoSim||seoMap[path]||seoMap["/"];
  const[seoTitle,seoDesc]=seo[lang];
  if(typeof document!=="undefined"){
    document.title=seoTitle;
    let m=document.querySelector('meta[name="description"]');
    if(!m){m=document.createElement("meta");m.name="description";document.head.appendChild(m);}
    m.content=seoDesc;
  }

  if(authLoading&&(path==="/dashboard"||path==="/onboarding")){
    return <div style={{fontFamily:TH.sans,background:TH.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:14,color:TH.muted}}>Cargando...</div></div>;
  }

  /* Redirect logic */
  if(path==="/dashboard"&&!session){go("/login");return null;}
  if(path==="/onboarding"&&!session){go("/login");return null;}

  return(
    <div style={{fontFamily:TH.sans,background:TH.bg,minHeight:"100vh",color:TH.text,WebkitFontSmoothing:"antialiased"}}>
      <div style={{maxWidth:680,margin:"0 auto",padding:"20px 16px 40px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <h1 onClick={()=>go("/")} style={{fontFamily:TH.serif,fontSize:24,fontWeight:400,cursor:"pointer",margin:0,color:TH.dark,letterSpacing:"-0.02em"}}>Kartera<span style={{color:TH.green}}>.</span></h1>
            {pageTitle&&path!=="/simulacion"&&<span style={{fontSize:11,color:TH.light,fontWeight:500}}>/ {pageTitle}</span>}
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <button onClick={()=>setLang(lang==="es"?"en":"es")} style={{background:TH.bg2,border:`1.5px solid ${TH.border}`,borderRadius:8,padding:"5px 12px",fontSize:11,color:TH.muted,cursor:"pointer",fontWeight:600,fontFamily:TH.sans}}>{lang==="es"?"EN":"ES"}</button>
            {session?
              <button onClick={()=>go("/dashboard")} style={{background:TH.green,color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:TH.sans}}>{lang==="es"?"Mi cartera":"My portfolio"}</button>
              :<button onClick={()=>go("/login")} style={{background:TH.dark,color:TH.bg,border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:TH.sans}}>{t.enter}</button>
            }
          </div>
        </div>
        {(path==="/interes-compuesto"||path==="/simulador-cartera")&&<div style={{display:"flex",background:TH.bg2,borderRadius:TH.r,padding:3,marginBottom:18,border:`1px solid ${TH.border}`}}>
          <button onClick={()=>go("/interes-compuesto")} style={{flex:1,padding:"10px 0",borderRadius:10,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:TH.sans,background:path==="/interes-compuesto"?TH.card:"transparent",color:path==="/interes-compuesto"?TH.dark:TH.muted,boxShadow:path==="/interes-compuesto"?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>{t.ci}</button>
          <button onClick={()=>go("/simulador-cartera")} style={{flex:1,padding:"10px 0",borderRadius:10,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:TH.sans,background:path==="/simulador-cartera"?TH.card:"transparent",color:path==="/simulador-cartera"?TH.dark:TH.muted,boxShadow:path==="/simulador-cartera"?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>{t.sim}</button>
        </div>}
        {path==="/"&&<HomePage t={t} go={go} lang={lang}/>}
        {path==="/login"&&<LoginPage go={go} lang={lang}/>}
        {path==="/onboarding"&&session&&<OnboardingPage go={go} lang={lang} session={session}/>}
        {path==="/dashboard"&&session&&<DashboardPage go={go} lang={lang} session={session}/>}
        {path==="/interes-compuesto"&&<CompoundCalc go={go} t={t}/>}
        {path==="/simulador-cartera"&&<PortfolioSim t={t} lang={lang}/>}
        {path==="/simulacion"&&sim&&<SimulationPage sim={sim} t={t} lang={lang} go={go}/>}
        {path==="/simulacion"&&!sim&&<div style={{textAlign:"center",padding:40}}><p style={{fontSize:16,color:TH.muted}}>{lang==="es"?"Simulación no encontrada":"Simulation not found"}</p><button onClick={()=>go("/")} style={{marginTop:12,background:TH.green,color:"#fff",border:"none",borderRadius:10,padding:"12px 24px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:TH.sans}}>{lang==="es"?"Volver al inicio":"Back to home"}</button></div>}
        <div style={{textAlign:"center",marginTop:24,fontSize:10,color:TH.border}}>kartera.pro 2026</div>
      </div>
    </div>
  );
}
