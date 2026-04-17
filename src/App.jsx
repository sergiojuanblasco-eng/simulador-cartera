import { useState, useMemo, useCallback, useRef } from "react";

/* ══════════════════════════════════════════════
   ROUTING — pathname-based, multi-HTML
   ══════════════════════════════════════════════ */
function useRouter() {
  const raw = window.location.pathname;
  const simMatch = raw.match(/\/simulacion\/(.+)/);
  const path = simMatch ? "/simulacion"
    : raw.includes("interes-compuesto") ? "/interes-compuesto"
    : raw.includes("simulador-cartera") ? "/simulador-cartera"
    : "/";
  const simSlug = simMatch ? simMatch[1].replace(/\/+$/,"") : null;
  const go = useCallback((p) => {
    window.location.href = p;
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
const CATCO={idx:"#3b82f6",stk:"#10b981",fi:"#1e40af",cry:"#f59e0b",alt:"#92400e",etf:"#7c3aed"};
const COL=["#f87171","#10b981","#60a5fa"];

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
    metodo:"1. Para cada año histórico se calcula el retorno de la cartera completa. Si un activo no existía ese año (ej. Bitcoin antes de 2014), se redistribuye su peso entre los demás activos proporcionalmente. Esto permite usar hasta 35 años de datos sin descartar información.\n\n2. Con esos retornos anuales, se generan ventanas rolling del horizonte elegido (ej. todas las ventanas de 10 años: 1990-1999, 1991-2000...) y se calcula el CAGR (rentabilidad anualizada compuesta) de cada una.\n\n3. Los escenarios salen de percentiles reales de esa distribución: P10 = pesimista, P50 (mediana) = esperado, P75 = optimista. No se usa P90 para evitar expectativas irreales.\n\n4. La probabilidad de pérdida es el % de ventanas que terminaron en negativo. Si es 0 en la muestra, se muestra '< 1%' porque el riesgo cero no existe.\n\n5. Para activos con retornos extremos (crypto, growth stocks), se comprime la parte que supera el +50% anual para evitar que un año excepcional distorsione las proyecciones a futuro.\n\n6. Si el horizonte elegido supera los datos disponibles, se usan las tasas del horizonte máximo calculable y se proyectan al plazo deseado, indicándolo claramente.",
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
    intEsp:"Interés esperado",yearN:"Año",
    buscar:"Buscar activo...",tuCartera:"Tu cartera",addActivos:"Añadir activos",
    verN:"Ver los {n}",cerrar:"Cerrar",nActivos:"{n} activos",
    analisis:"Análisis de tu cartera",sinProblemas:"Tu cartera no presenta problemas evidentes.",
    perfil:"Tu perfil de inversor",
    perfilOps:["Conservador","Moderado","Agresivo","Muy agresivo"],
    catRiesgo:"Riesgo",catDiversi:"Diversificación",catCoher:"Coherencia",
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
    metodo:"1. For each historical year, the full portfolio return is computed. If an asset didn't exist that year (e.g. Bitcoin before 2014), its weight is redistributed proportionally among available assets. This lets us use up to 35 years of data without discarding information.\n\n2. Using those annual returns, rolling windows of the chosen horizon are generated (e.g. all 10-year windows: 1990-1999, 1991-2000...) and the CAGR (compound annual growth rate) of each is calculated.\n\n3. Scenarios come from real percentiles of that distribution: P10 = pessimistic, P50 (median) = expected, P75 = optimistic. P90 is not used to avoid unrealistic expectations.\n\n4. Loss probability is the % of windows that ended negative. If 0 in the sample, we show '< 1%' because zero risk doesn't exist.\n\n5. For assets with extreme returns (crypto, growth stocks), returns above +50% annually are compressed so that one exceptional year doesn't distort future projections.\n\n6. If the chosen horizon exceeds available data, rates from the longest calculable horizon are used and projected to the desired term, clearly indicated.",
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
    intEsp:"Expected interest",yearN:"Year",
    buscar:"Search asset...",tuCartera:"Your portfolio",addActivos:"Add assets",
    verN:"See all {n}",cerrar:"Close",nActivos:"{n} assets",
    analisis:"Portfolio analysis",sinProblemas:"Your portfolio shows no obvious issues.",
    perfil:"Your investor profile",
    perfilOps:["Conservative","Moderate","Aggressive","Very aggressive"],
    catRiesgo:"Risk",catDiversi:"Diversification",catCoher:"Coherence",
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
      es:`Tu nivel de riesgo medio (${avgRisk.toFixed(1)}) es alto para tu perfil. Considera reducir activos volátiles o ampliar el horizonte.`,
      en:`Your average risk level (${avgRisk.toFixed(1)}) is high for your profile. Consider reducing volatile assets or extending the horizon.`}});

  // R2: Too conservative for profile
  if(avgRisk<2&&yr>10&&profile>=1)
    risk.push({type:"info",msg:{
      es:"Tu cartera es muy conservadora para tu perfil y horizonte. Podrías estar perdiendo potencial de crecimiento a largo plazo.",
      en:"Your portfolio is very conservative for your profile and horizon. You may be missing long-term growth potential."}});

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

  const rawP = pc(rollingCAGRs, 10), rawE = pc(rollingCAGRs, 50), rawO = pc(rollingCAGRs, 75);
  const negCount = rollingCAGRs.filter(c => c < 0).length;
  const rawProbLoss = negCount / rollingCAGRs.length;
  const probLossDisplay = rawProbLoss === 0 ? "< 1%" : Math.round(rawProbLoss * 100) + "%";
  const probLossNum = Math.round(rawProbLoss * 100);

  const p10val = pc(rollingCAGRs, 10), p75val = pc(rollingCAGRs, 75);
  const pessCount = rollingCAGRs.filter(c => c <= p10val).length;
  const optCount = rollingCAGRs.filter(c => c >= p75val).length;
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
const cdS={background:"#fff",borderRadius:12,padding:16,border:"1px solid #eee",marginBottom:12};

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
      {fill&&lines.length>2&&<path d={ml(lines[2])+lines[0].slice().reverse().map(p=>"L"+sx(p.y).toFixed(1)+","+sy(p.v).toFixed(1)).join("")+"Z"} fill="#10b981" opacity="0.05"/>}
      {fill&&lines.length===1&&<path d={ml(lines[0])+"L"+sx(years).toFixed(1)+","+sy(0).toFixed(1)+"L"+sx(0).toFixed(1)+","+sy(0).toFixed(1)+"Z"} fill={colors[0]} opacity="0.08"/>}
      {lines.map((d,i)=><path key={i} d={ml(d)} fill="none" stroke={colors[i]} strokeWidth={2.5} strokeDasharray={lines.length>1&&i!==1?"6,4":"none"}/>)}
      {hover!==null&&<>
        <line x1={sx(hover)} y1={pad.t} x2={sx(hover)} y2={pad.t+h} stroke="#aaa" strokeWidth="0.8" strokeDasharray="3,3"/>
        {lines.map((d,i)=>{const pt=d.find(p=>p.y===hover);if(!pt)return null;return<circle key={i} cx={sx(hover)} cy={sy(pt.v)} r="4" fill={colors[i]} stroke="#fff" strokeWidth="1.5"/>;})}
      </>}
    </svg>
    {hover!==null?<div style={{background:"#111",color:"#fff",borderRadius:8,padding:"6px 10px",fontSize:11,display:"flex",gap:12,justifyContent:"center",marginTop:2,flexWrap:"wrap"}}>
      <span style={{fontWeight:700}}>{(yearLabel||"Año")+" "+hover}</span>
      {lines.map((d,i)=>{const pt=d.find(p=>p.y===hover);if(!pt)return null;return<span key={i} style={{color:colors[i]}}>{labels[i]}: <b>{fm(Math.round(pt.v))}</b></span>;})}
    </div>
    :<div style={{display:"flex",justifyContent:"center",gap:16,marginTop:4,fontSize:11,color:"#aaa"}}>
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
    {params.map(p=><div key={p.l} style={{background:"#fff",borderRadius:12,padding:14,border:"1px solid #eee"}}>
      <div style={{fontSize:11,color:"#aaa",marginBottom:4}}>{p.l}</div>
      <div style={{display:"flex",alignItems:"baseline",gap:4}}>
        <input type="number" value={p.v} min={p.mi||0} max={p.mx} step={p.st} onChange={e=>p.fn(Math.max(p.mi||0,Math.min(p.mx,Number(e.target.value)||0)))} style={{width:"100%",border:"none",fontSize:18,fontWeight:800,outline:"none",fontFamily:"monospace",color:"#111"}}/>
        {p.tog?<select value={p.freq} onChange={e=>p.sF(e.target.value)} style={{border:"1.5px solid #eee",borderRadius:6,padding:"3px 4px",fontSize:11,color:"#888",background:"#f9fafb",cursor:"pointer",fontWeight:600,outline:"none"}}><option value="mes">{p.lMes}</option><option value="ano">{p.lAno}</option></select>
        :<span style={{fontSize:11,color:"#bbb",whiteSpace:"nowrap"}}>{p.u}</span>}
      </div>
      <input type="range" min={p.mi||0} max={p.mx} step={p.st} value={p.v} onChange={e=>p.fn(Number(e.target.value))} style={{width:"100%",marginTop:6}}/>
    </div>)}
  </div>
);}

/* ══════════════════════════════════════════════
   HOME
   ══════════════════════════════════════════════ */
function HomePage({t, go}) {
  const whyItems=[{icon:"📊",t:t.homeW1t,d:t.homeW1d},{icon:"⚖️",t:t.homeW2t,d:t.homeW2d},{icon:"🛡️",t:t.homeW3t,d:t.homeW3d}];
  return(<div>
    <div style={{textAlign:"center",padding:"28px 0 24px"}}>
      <h2 style={{fontSize:22,fontWeight:800,color:"#111",marginBottom:8,lineHeight:1.3}}>{t.heroTitle}</h2>
      <p style={{fontSize:13,color:"#888",maxWidth:440,margin:"0 auto",lineHeight:1.6}}>{t.heroSub}</p>
    </div>
    <div style={{display:"grid",gap:12,marginBottom:24}}>
      <div onClick={()=>go("/interes-compuesto")} style={{...cdS,cursor:"pointer",padding:20,marginBottom:0,borderLeft:"4px solid #6366f1"}}>
        <div style={{fontSize:15,fontWeight:800,color:"#111",marginBottom:4}}>{t.toolIC}</div>
        <p style={{fontSize:12,color:"#888",marginBottom:10,lineHeight:1.5}}>{t.toolICdesc}</p>
        <span style={{fontSize:12,fontWeight:700,color:"#6366f1"}}>{t.irA} →</span>
      </div>
      <div onClick={()=>go("/simulador-cartera")} style={{...cdS,cursor:"pointer",padding:20,marginBottom:0,borderLeft:"4px solid #10b981",background:"#f0fdf8"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
          <span style={{fontSize:15,fontWeight:800,color:"#111"}}>{t.toolSim}</span>
          <span style={{fontSize:9,fontWeight:800,background:"#10b981",color:"#fff",padding:"2px 7px",borderRadius:4}}>{t.toolSimBadge}</span>
        </div>
        <p style={{fontSize:12,color:"#888",marginBottom:10,lineHeight:1.5}}>{t.toolSimDesc}</p>
        <span style={{fontSize:12,fontWeight:700,color:"#10b981"}}>{t.irA} →</span>
      </div>
    </div>
    <div style={{marginBottom:24}}>
      <h3 style={{fontSize:14,fontWeight:800,color:"#111",marginBottom:12}}>{t.homeWhy}</h3>
      <div style={{display:"grid",gap:10}}>{whyItems.map((w,i)=>(<div key={i} style={{...cdS,marginBottom:0,display:"flex",gap:12,alignItems:"flex-start",padding:14}}><span style={{fontSize:22}}>{w.icon}</span><div><div style={{fontSize:13,fontWeight:700,color:"#111",marginBottom:2}}>{w.t}</div><div style={{fontSize:11,color:"#888",lineHeight:1.5}}>{w.d}</div></div></div>))}</div>
    </div>
    <div style={{padding:18,borderRadius:14,background:"linear-gradient(135deg,#ecfdf5,#f0fdf4)",border:"1px solid #bbf7d0",textAlign:"center"}}>
      <div style={{fontSize:14,fontWeight:800,color:"#065f46",marginBottom:6}}>{t.proximamente}</div>
      <div style={{fontSize:11,color:"#666",lineHeight:1.7}}>{t.proxItems.split("|").map((s,i)=><span key={i}>{i>0?" · ":""}{s.trim()}</span>)}</div>
      <button onClick={()=>window.open("https://forms.gle/JMZg1w5eAUHnYVHw8","_blank")} style={{marginTop:12,padding:"8px 20px",fontSize:12,background:"#10b981",color:"#fff",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer"}}>{t.avisarme}</button>
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
    <p style={{fontSize:12,color:"#999",marginBottom:14}}>{t.ciSub}</p>
    <Inputs params={[{l:t.capIni,v:ini,fn:sI,mx:5e6,st:500,u:"EUR"},{l:t.aport,v:mo,fn:sM,mx:freq==="ano"?600000:50000,st:freq==="ano"?100:25,tog:true,freq,sF,lMes:t.eurMes,lAno:t.eurAno},{l:t.intAnual,v:rate,fn:sR,mx:50,st:0.5,mi:0,u:"%"},{l:t.horiz,v:yr,fn:sY,mx:50,st:1,u:t.anos}]}/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:10,marginBottom:12}}>
      <div style={{...cdS,marginBottom:0,background:"#f0fdf8",border:"2px solid #10b98133"}}>
        <div style={{fontSize:10,color:"#10b981",fontWeight:700,textTransform:"uppercase",marginBottom:4}}>{t.capFin}</div>
        <div style={{fontSize:26,fontWeight:800,fontFamily:"monospace",color:"#111"}}>{fm(fin)} EUR</div>
        <div style={{fontSize:10,color:"#aaa",marginTop:2}}>{fp(rate)} {t.ano} | {yr} {t.anos}</div>
      </div>
      <div style={cdS}><div style={{fontSize:10,color:"#aaa",fontWeight:600,marginBottom:4}}>{t.tuAp}</div><div style={{fontSize:20,fontWeight:800,fontFamily:"monospace"}}>{fm(tI)} EUR</div></div>
      <div style={cdS}><div style={{fontSize:10,color:"#aaa",fontWeight:600,marginBottom:4}}>{t.intGen}</div><div style={{fontSize:20,fontWeight:800,fontFamily:"monospace",color:"#10b981"}}>+{fm(prof)} EUR</div><div style={{fontSize:10,color:"#aaa",marginTop:2}}>{tI>0?Math.round(prof/tI*100):0}% {t.sobreAp}</div></div>
    </div>
    <div style={cdS}><div style={{fontSize:13,fontWeight:700,marginBottom:8}}>{t.evo}</div><SvgChart lines={[data]} years={yr} labels={[t.capital]} colors={["#10b981"]} fill={true} yearLabel={t.yearN}/></div>
    <div style={{padding:20,borderRadius:14,background:"linear-gradient(135deg,#fef2f2,#fff7ed)",border:"1px solid #fecaca",textAlign:"center"}}>
      <div style={{fontSize:15,fontWeight:800,color:"#991b1b",marginBottom:6}}>{t.noSabes}</div>
      <p style={{fontSize:12,color:"#78716c",lineHeight:1.6,marginBottom:12,maxWidth:420,margin:"0 auto 12px"}}>{t.pruebaEl}</p>
      <button onClick={()=>go("/simulador-cartera")} style={{padding:"10px 24px",fontSize:13,background:"#10b981",color:"#fff",border:"none",borderRadius:10,fontWeight:700,cursor:"pointer"}}>{t.verSim} →</button>
    </div>
    {/* SEO CONTENT */}
    <div style={{marginTop:24}}>
      <div style={{...cdS,padding:20}}>
        <h2 style={{fontSize:17,fontWeight:800,color:"#111",marginTop:0,marginBottom:8}}>{t.seoH1}</h2>
        <p style={{fontSize:13,color:"#555",lineHeight:1.7,margin:0}}>{t.seoP1}</p>
      </div>
      <div style={{...cdS,padding:20}}>
        <h2 style={{fontSize:17,fontWeight:800,color:"#111",marginTop:0,marginBottom:8}}>{t.seoH2}</h2>
        <p style={{fontSize:13,color:"#555",lineHeight:1.7,margin:0}}>{t.seoP2}</p>
      </div>
      <div style={{...cdS,padding:20}}>
        <h2 style={{fontSize:17,fontWeight:800,color:"#111",marginTop:0,marginBottom:8}}>{t.seoH3}</h2>
        <p style={{fontSize:13,color:"#555",lineHeight:1.7,margin:0}}>{t.seoP3}</p>
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
  const rlC=["#10b981","#f59e0b","#f97316","#ef4444"];
  const showShortTermWarning = pS && yr < 5 && pS.probLossNum > 25;
  const portfolioAlerts = useMemo(() => sel.length > 0 && tW > 0 ? analyzePortfolio(sel, nW, yr, profile) : {risk:[],diversification:[],coherence:[]}, [sel, nW, yr, tW, profile]);

  return(<div>
    {!cfg&&<div style={{background:"#ecfdf5",borderRadius:10,padding:"7px 14px",marginBottom:14,fontSize:12,color:"#065f46"}}>{t.preset}</div>}
    {/* PROFILE SELECTOR */}
    <div style={{background:"#fff",borderRadius:12,padding:14,border:"1.5px solid #f0f0f0",marginBottom:14}}>
      <div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:8}}>{t.perfil}</div>
      <div style={{display:"flex",gap:4}}>{t.perfilOps.map((label,i)=><button key={i} onClick={()=>setProfile(i)} style={{flex:1,padding:"7px 4px",borderRadius:8,border:"none",fontSize:11,fontWeight:700,cursor:"pointer",background:profile===i?"#111":"#f3f4f6",color:profile===i?"#fff":"#888"}}>{label}</button>)}</div>
    </div>
    <Inputs params={[{l:t.capIni,v:ini,fn:sI,mx:5e6,st:500,u:"EUR"},{l:t.aport,v:mo,fn:sM,mx:freq==="ano"?600000:50000,st:freq==="ano"?100:25,tog:true,freq,sF,lMes:t.eurMes,lAno:t.eurAno},{l:t.horiz,v:yr,fn:sY,mx:50,st:1,u:t.anos}]}/>
    {/* ── AÑADIR ACTIVOS ── */}
    <div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:5}}>{t.addActivos}</div>
    <input value={srcQ} onChange={e=>{setSrcQ(e.target.value);if(e.target.value)setExp(false);}} placeholder={t.buscar} style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"1.5px solid #eee",fontSize:13,background:"#fff",marginBottom:8,outline:"none",boxSizing:"border-box"}}/>
    {srcQ?<div style={{background:"#fff",border:"1.5px solid #eee",borderRadius:10,maxHeight:220,overflowY:"auto",marginBottom:14}}>
      {(()=>{const q=srcQ.toLowerCase();const res=ASSETS.filter(a=>a.name.es.toLowerCase().includes(q)||a.name.en.toLowerCase().includes(q)||(a.desc.es+" "+a.desc.en).toLowerCase().includes(q)||a.id.includes(q));if(!res.length)return<div style={{textAlign:"center",padding:20,color:"#aaa",fontSize:13}}>No se encontró "{srcQ}"</div>;return res.map(a=>{const on=sel.includes(a.id);const cat=CATS.find(c=>c.id===a.cat);const yrs=Object.keys(R[a.id]||{}).length;return<div key={a.id} onClick={()=>{tog(a.id);setSrcQ("");}} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",cursor:"pointer",fontSize:13,borderBottom:"0.5px solid #f3f4f6",background:on?"#f0fdf8":"transparent"}}><div style={{width:8,height:8,borderRadius:2,background:a.color,flexShrink:0}}/><span style={{fontWeight:600,flex:1}}>{a.name[lang]}</span><span style={{fontSize:11,color:"#aaa"}}>{cat?.name[lang]} · {yrs}a</span><div style={{width:18,height:18,borderRadius:4,border:on?"1.5px solid #10b981":"1.5px solid #ddd",background:on?"#10b981":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",flexShrink:0}}>{on?"✓":""}</div></div>;});})()}
    </div>:<>
    <div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap"}}>{CATS.map(c=>{const catAssets=ASSETS.filter(a=>a.cat===c.id);const n=sel.filter(id=>catAssets.find(a=>a.id===id)).length;return<button key={c.id} onClick={()=>{sT(c.id);setExp(false);}} style={{padding:"5px 12px",borderRadius:8,border:"none",fontSize:12,fontWeight:700,cursor:"pointer",background:tab===c.id?"#fff":"transparent",color:tab===c.id?"#111":"#aaa",boxShadow:tab===c.id?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>{c.name[lang]}{n>0?" ("+n+")":""}</button>;})}</div>
    {!expanded?<>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>{ASSETS.filter(a=>a.cat===tab).slice(0,4).map(a=>{const on=sel.includes(a.id);return<button key={a.id} onClick={()=>tog(a.id)} style={{padding:"6px 14px",borderRadius:20,border:on?"2px solid #10b981":"2px solid #e5e7eb",background:on?"#ecfdf5":"#fff",color:on?"#065f46":"#555",fontSize:13,fontWeight:600,cursor:"pointer"}}>{a.name[lang]}{on?" ✓":""}</button>;})}</div>
      {ASSETS.filter(a=>a.cat===tab).length>4&&<button onClick={()=>setExp(true)} style={{width:"100%",padding:8,borderRadius:8,border:"1.5px dashed #ddd",background:"transparent",fontSize:12,color:"#888",cursor:"pointer",marginBottom:14}}>{t.verN.replace("{n}",ASSETS.filter(a=>a.cat===tab).length+" "+CATS.find(c=>c.id===tab)?.name[lang])} ▼</button>}
      {ASSETS.filter(a=>a.cat===tab).length<=4&&<div style={{marginBottom:14}}/>}
    </>:<>
      <div style={{background:"#fff",border:"1.5px solid #eee",borderRadius:10,maxHeight:260,overflowY:"auto",marginBottom:0}}>
        {ASSETS.filter(a=>a.cat===tab).map(a=>{const on=sel.includes(a.id);const yrs=Object.keys(R[a.id]||{}).length;return<div key={a.id} onClick={()=>tog(a.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",cursor:"pointer",fontSize:13,borderBottom:"0.5px solid #f3f4f6",background:on?"#f0fdf8":"transparent"}}><div style={{width:8,height:8,borderRadius:2,background:a.color,flexShrink:0}}/><span style={{fontWeight:600,flex:1}}>{a.name[lang]}</span><span style={{fontSize:11,color:"#aaa"}}>{yrs} {t.anos}</span><div style={{width:18,height:18,borderRadius:4,border:on?"1.5px solid #10b981":"1.5px solid #ddd",background:on?"#10b981":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",flexShrink:0}}>{on?"✓":""}</div></div>;})}
      </div>
      <button onClick={()=>setExp(false)} style={{width:"100%",padding:8,borderRadius:"0 0 10px 10px",border:"1.5px solid #eee",borderTop:"none",background:"#fafafa",fontSize:12,color:"#888",cursor:"pointer",marginBottom:14}}>{t.cerrar} ▲</button>
    </>}
    </>}
    {sel.length>0&&<div style={cdS}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:13,fontWeight:700}}>{t.pesos}: <span style={{color:Math.abs(tW-100)<1?"#10b981":"#f59e0b",fontFamily:"monospace"}}>{tW}%</span> / 100%</span><button onClick={()=>{const w=Math.floor(100/sel.length);const rem=100-w*sel.length;const n={};sel.forEach((id,i)=>{n[id]=w+(i<rem?1:0);});sW(n);}} style={{fontSize:11,background:"#f3f4f6",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>{t.equi}</button></div>
      {sel.map(id=>{const a=ASSETS.find(x=>x.id===id);return<div key={id} style={{marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
          <span style={{width:90,fontSize:12,fontWeight:600,flexShrink:0}}>{a.name[lang]}</span>
          <input type="range" min={0} max={100} value={wt[id]||0} onChange={e=>sW({...wt,[id]:Number(e.target.value)})} style={{flex:1}}/>
          <div style={{display:"flex",alignItems:"center",background:"#f9fafb",border:"1.5px solid #eee",borderRadius:8,width:54,flexShrink:0}}><input type="number" min={0} max={100} value={wt[id]||0} onChange={e=>sW({...wt,[id]:Math.max(0,Math.min(100,Number(e.target.value)||0))})} style={{width:32,border:"none",background:"transparent",textAlign:"right",fontSize:12,fontWeight:700,outline:"none",padding:"4px 0 4px 3px",fontFamily:"monospace",color:"#333"}}/><span style={{fontSize:10,color:"#bbb",paddingRight:4}}>%</span></div>
          <button onClick={()=>tog(id)} style={{background:"none",border:"none",color:"#ccc",cursor:"pointer",fontSize:16}}>x</button>
        </div>
        <div style={{fontSize:10,color:"#aaa",marginLeft:0,fontStyle:"italic"}}>{a.desc[lang]}</div>
      </div>;})}
    </div>}

    {scs&&<div>
      {/* Projected warning */}
      {pS.projected&&<div style={{padding:"8px 14px",borderRadius:10,background:"#eef2ff",border:"1px solid #c7d2fe",fontSize:11,color:"#4338ca",marginBottom:10}}>{t.proyectado.replace("{real}",String(pS.usedHorizon)).replace("{target}",String(yr))}</div>}

      {/* Few windows */}
      {pS.fewWindows&&<div style={{padding:"8px 14px",borderRadius:10,background:"#fffbeb",border:"1px solid #fef3c7",fontSize:11,color:"#92400e",marginBottom:10}}>{t.pocasVentanas.replace("{n}",String(pS.rollingCount))}</div>}

      {showShortTermWarning&&<div style={{padding:"10px 14px",borderRadius:10,background:"#fef2f2",border:"1px solid #fecaca",fontSize:12,color:"#991b1b",marginBottom:10,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:18}}>⚠</span>{t.alerta}
      </div>}

      {/* SCENARIO CARDS — money big, rate visible */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:10,marginBottom:12}}>
        {scs.map((s,i)=>{const fin=s.d[s.d.length-1].v;const pr=fin-tI;const mu=tI>0?fin/tI:0;return<div key={i} style={{...cdS,marginBottom:0,border:i===1?"2px solid #10b98133":"1px solid #eee",background:i===1?"#f0fdf8":"#fff",position:"relative"}}>
          {i===1&&<div style={{position:"absolute",top:-1,left:"50%",transform:"translateX(-50%)",background:"#10b981",color:"#fff",fontSize:8,fontWeight:800,padding:"2px 8px",borderRadius:"0 0 6px 6px"}}>{s.l}</div>}
          <div style={{fontSize:10,fontWeight:700,color:COL[i],textTransform:"uppercase",marginBottom:5,marginTop:i===1?6:0}}>{s.l} <span style={{fontWeight:500,opacity:0.7}}>({s.prob}%)</span></div>
          <div style={{fontSize:22,fontWeight:800,fontFamily:"monospace",color:"#111"}}>{fm(fin)} EUR</div>
          <div style={{fontSize:14,fontWeight:700,fontFamily:"monospace",color:s.r>=0?"#10b981":"#ef4444",marginTop:3}}>{fp(s.r)} <span style={{fontSize:10,fontWeight:500,color:"#aaa"}}>{t.ano}</span></div>
          <div style={{fontSize:11,color:pr>=0?"#10b981":"#ef4444",fontWeight:600,marginTop:6,paddingTop:6,borderTop:"1px solid #f3f4f6"}}>{pr>=0?"+":""}{fm(pr)} | x{mu.toFixed(1)}</div>
        </div>;})}
      </div>

      {/* PROBABILITY & WORST CASE */}
      <div style={{...cdS,background:"#fafafa",padding:"12px 16px"}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"stretch"}}>
          <div style={{flex:"1 1 140px",background:"#fff",borderRadius:10,padding:"10px 14px",border:"1px solid #eee",textAlign:"center"}}>
            <div style={{fontSize:10,color:"#aaa",fontWeight:600,marginBottom:4}}>{t.probPerd}</div>
            <div style={{fontSize:26,fontWeight:800,fontFamily:"monospace",color:pS.probLossNum>25?"#ef4444":pS.probLossNum>10?"#f59e0b":"#10b981"}}>{pS.probLossDisplay}</div>
          </div>
          <div style={{flex:"1 1 140px",background:"#fff",borderRadius:10,padding:"10px 14px",border:"1px solid #eee",textAlign:"center"}}>
            <div style={{fontSize:10,color:"#aaa",fontWeight:600,marginBottom:4}}>{t.peorCaso}</div>
            <div style={{fontSize:26,fontWeight:800,fontFamily:"monospace",color:"#ef4444"}}>{fp(pS.worstCase)}</div>
          </div>
        </div>
        <div style={{marginTop:10,fontSize:11,color:"#666",textAlign:"center",fontStyle:"italic"}}>
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
                <span style={{flex:1,fontSize:11,color:"#777"}}>{d.name}</span>
                <span style={{fontSize:11,fontFamily:"monospace",fontWeight:600,color:"#999"}}>{Math.round(d.w)}%</span>
              </div>)}
            </div>
          </div>
        </div>
        <div style={cdS}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>{t.riesgo}</div>
          <div style={{display:"flex",gap:2,marginBottom:5}}>{rlC.map((c,i)=><div key={i} style={{flex:1,height:5,borderRadius:3,background:i<=rL?c:"#eee"}}/>)}</div>
          <div style={{fontSize:13,fontWeight:700,color:rlC[rL],marginBottom:12}}>{t.riskL[rL]}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:55,background:"#f9fafb",borderRadius:10,padding:"8px 8px",textAlign:"center"}}><div style={{fontSize:9,color:"#aaa"}}>{t.tuAp}</div><div style={{fontSize:12,fontWeight:800,fontFamily:"monospace"}}>{fm(tI)}</div></div>
            <div style={{flex:1,minWidth:55,background:"#ecfdf5",borderRadius:10,padding:"8px 8px",textAlign:"center"}}><div style={{fontSize:9,color:"#aaa"}}>{t.mktGen}</div><div style={{fontSize:12,fontWeight:800,fontFamily:"monospace",color:"#10b981"}}>+{fm(Math.max(0,scs[1].d[scs[1].d.length-1].v-tI))}</div></div>
            <div style={{flex:1,minWidth:55,background:"#eef2ff",borderRadius:10,padding:"8px 8px",textAlign:"center"}}><div style={{fontSize:9,color:"#aaa"}}>{t.intEsp}</div><div style={{fontSize:12,fontWeight:800,fontFamily:"monospace",color:"#6366f1"}}>{fp(pS.e)}</div></div>
          </div>
        </div>
      </div>

      {/* BREAKDOWN */}
      <div style={{...cdS,padding:0}}>
        <button onClick={()=>sBk(!showBk)} style={{width:"100%",padding:"12px 16px",border:"none",background:"transparent",display:"flex",justifyContent:"space-between",cursor:"pointer",fontSize:12,fontWeight:700,color:"#555"}}><span>{t.desglose}</span><span>{showBk?"▲":"▼"}</span></button>
        {showBk&&<div style={{padding:"0 16px 14px"}}>
          <div style={{display:"flex",gap:4,padding:"6px 0",borderBottom:"1px solid #f0f0f0",fontSize:10,color:"#aaa",fontWeight:600}}>
            <span style={{flex:2}}>{t.activo}</span><span style={{width:45,textAlign:"right"}}>{t.peso}</span><span style={{width:55,textAlign:"right"}}>{t.rendEsp}</span><span style={{width:55,textAlign:"right"}}>{t.contrib}</span>
          </div>
          {assetBreakdown.map(ab=>(
            <div key={ab.name} style={{display:"flex",gap:4,padding:"6px 0",borderBottom:"1px solid #f8f8f8",fontSize:11,alignItems:"center"}}>
              <div style={{flex:2}}><div style={{fontWeight:600,color:"#333"}}>{ab.name}</div></div>
              <span style={{width:45,textAlign:"right",fontFamily:"monospace",color:"#888"}}>{Math.round(ab.weight)}%</span>
              <span style={{width:55,textAlign:"right",fontFamily:"monospace",color:ab.expRet>=0?"#10b981":"#ef4444"}}>{fp(ab.expRet)}</span>
              <span style={{width:55,textAlign:"right",fontFamily:"monospace",fontWeight:700,color:ab.contrib>=0?"#10b981":"#ef4444"}}>{fp(ab.contrib)}</span>
            </div>
          ))}
        </div>}
      </div>

      {/* PORTFOLIO ANALYSIS */}
      <div style={cdS}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>{t.analisis}</div>
        {(()=>{
          const pa=portfolioAlerts;
          const all=[...pa.risk,...pa.diversification,...pa.coherence];
          if(!all.length) return <div style={{fontSize:12,color:"#10b981",display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:16}}>✓</span>{t.sinProblemas}</div>;
          const renderAlerts=(alerts,title,color)=>{
            if(!alerts.length) return null;
            const warns=alerts.filter(a=>a.type==="warn");
            const infos=alerts.filter(a=>a.type==="info");
            const oks=alerts.filter(a=>a.type==="ok");
            const sorted=[...warns,...infos,...oks];
            return <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>{title}</div>
              {sorted.map((a,i)=><div key={i} style={{
                padding:"8px 12px",borderRadius:8,marginBottom:4,fontSize:12,lineHeight:1.5,display:"flex",gap:8,alignItems:"flex-start",
                background:a.type==="warn"?"#fef2f2":a.type==="ok"?"#f0fdf4":"#eff6ff",
                border:a.type==="warn"?"1px solid #fecaca":a.type==="ok"?"1px solid #bbf7d0":"1px solid #bfdbfe",
                color:a.type==="warn"?"#991b1b":a.type==="ok"?"#166534":"#1e40af"
              }}>
                <span style={{fontSize:14,flexShrink:0,marginTop:1}}>{a.type==="warn"?"⚠️":a.type==="ok"?"✅":"💡"}</span>
                <span>{a.msg[lang]}</span>
              </div>)}
            </div>;
          };
          return <>{renderAlerts(pa.risk,t.catRiesgo,"#991b1b")}{renderAlerts(pa.diversification,t.catDiversi,"#1e40af")}{renderAlerts(pa.coherence,t.catCoher,"#92400e")}</>;
        })()}
      </div>

      {/* METHODOLOGY */}
      <div style={{...cdS,padding:0}}><button onClick={()=>sMt(!sm)} style={{width:"100%",padding:"12px 16px",border:"none",background:"transparent",display:"flex",justifyContent:"space-between",cursor:"pointer",fontSize:12,fontWeight:600,color:"#999"}}><span>{t.como}</span><span>{sm?"▲":"▼"}</span></button>{sm&&<div style={{padding:"0 16px 14px",fontSize:11,color:"#777",lineHeight:1.8,whiteSpace:"pre-line"}}>{t.metodo}</div>}</div>
      <div style={{fontSize:11,color:"#92400e",background:"#fffbeb",padding:12,borderRadius:10,textAlign:"center",border:"1px solid #fef3c7",marginBottom:12}}>{t.warn}</div>

      <div style={{padding:18,borderRadius:14,background:"linear-gradient(135deg,#ecfdf5,#f0fdf4)",border:"1px solid #bbf7d0",textAlign:"center"}}>
        <div style={{fontSize:14,fontWeight:800,color:"#065f46",marginBottom:3}}>{t.optim}</div>
        <div style={{fontSize:11,color:"#888",marginBottom:10}}>{t.prox}</div>
        <button onClick={()=>window.open("https://forms.gle/JMZg1w5eAUHnYVHw8","_blank")} style={{padding:"8px 20px",fontSize:12,background:"#10b981",color:"#fff",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer"}}>{t.avisarme}</button>
      </div>
    </div>}
  </div>);
}

/* ══════════════════════════════════════════════
   SIMULATION PAGE — preconfigured portfolio pages
   ══════════════════════════════════════════════ */
function SimulationPage({sim,t,lang,go}){
  const cdS={background:"#fff",borderRadius:12,padding:14,marginBottom:14,border:"1.5px solid #f0f0f0"};
  const h3s={fontSize:17,fontWeight:700,marginBottom:8,marginTop:0};
  const ps={fontSize:14,color:"#555",lineHeight:1.7,margin:0,whiteSpace:"pre-line"};
  const a=sim.analysis;
  return(<div>
    {/* BLOQUE 1 — Título + gancho */}
    <h2 style={{fontSize:22,fontWeight:800,lineHeight:1.3,marginBottom:10,marginTop:0}}>{sim.title[lang]}</h2>
    {sim.hook&&<div style={{fontSize:14,color:"#444",lineHeight:1.7,marginBottom:18,whiteSpace:"pre-line"}}>{sim.hook[lang]}</div>}
    {/* BLOQUE 2 — Qué es esta simulación */}
    <div style={{background:"#f8fafc",borderRadius:10,padding:14,marginBottom:18,border:"1px solid #e2e8f0"}}>
      <p style={{fontSize:13,color:"#555",lineHeight:1.7,margin:0,whiteSpace:"pre-line"}}>{sim.intro[lang]}</p>
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
        {a.why.items.map((it,i)=><p key={i} style={{fontSize:14,color:"#444",lineHeight:1.6,margin:"0 0 8px",paddingLeft:8,borderLeft:"3px solid "+(ASSETS.find(x=>sim.assets[i]&&x.id===sim.assets[i].id)?.color||"#ddd")}}>{it[lang]}</p>)}
        {a.why.extra&&<p style={{...ps,marginTop:10}}>{a.why.extra[lang]}</p>}
      </div>
      <div style={cdS}>
        <h3 style={h3s}>{a.profile.title[lang]}</h3>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
          <span style={{padding:"4px 12px",borderRadius:20,fontSize:12,background:"#fef3c7",color:"#92400e",fontWeight:600}}>{lang==="es"?"Riesgo":"Risk"}: {a.profile.risk_level[lang]}</span>
          <span style={{padding:"4px 12px",borderRadius:20,fontSize:12,background:"#e0f2fe",color:"#0369a1",fontWeight:600}}>{lang==="es"?"Horizonte":"Horizon"}: {a.profile.horizon[lang]}</span>
        </div>
        <p style={{fontSize:13,color:"#555",lineHeight:1.6,margin:"0 0 6px"}}><strong>{lang==="es"?"Ideal para":"Ideal for"}:</strong> {a.profile.ideal[lang]}</p>
        <p style={{fontSize:13,color:"#888",lineHeight:1.6,margin:0,fontStyle:"italic"}}>{a.profile.note[lang]}</p>
      </div>
      <div style={{background:"#f0fdf4",borderRadius:12,padding:14,marginBottom:14,border:"1px solid #bbf7d0"}}>
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
        <p style={{fontSize:14,fontWeight:700,color:"#333",margin:"0 0 4px"}}>{f.q[lang]}</p>
        <p style={{fontSize:13,color:"#666",lineHeight:1.6,margin:0}}>{f.a[lang]}</p>
      </div>)}
    </div>}
    {/* BLOQUE 6 — Otras simulaciones */}
    {sim.related&&<div style={cdS}>
      <h3 style={{...h3s,fontSize:15}}>{lang==="es"?"Otras simulaciones que pueden interesarte":"Other simulations you might find interesting"}</h3>
      {sim.related.map(slug=>{const s=SIMS.find(x=>x.slug===slug);if(!s)return null;return<a key={slug} href={"/simulacion/"+slug} style={{display:"block",padding:"8px 0",fontSize:14,color:"#10b981",fontWeight:600,textDecoration:"none",borderBottom:"0.5px solid #f0f0f0"}}>→ {s.title[lang]}</a>;})}
    </div>}
    {/* BLOQUE 7 — CTA */}
    <div style={{textAlign:"center",marginTop:20,marginBottom:10}}>
      <p style={{fontSize:14,fontWeight:700,marginBottom:8,color:"#333"}}>{lang==="es"?"Simula tu propia cartera con tus porcentajes":"Simulate your own portfolio with your percentages"}</p>
      <button onClick={()=>go("/simulador-cartera")} style={{background:"#10b981",color:"#fff",border:"none",borderRadius:10,padding:"12px 28px",fontSize:14,fontWeight:700,cursor:"pointer"}}>{lang==="es"?"Ir al simulador completo":"Go to full simulator"} →</button>
    </div>
  </div>);
}

/* ══════════════════════════════════════════════
   APP ROOT
   ══════════════════════════════════════════════ */
export default function App(){
  const {path, go, simSlug} = useRouter();
  const[lang,setLangState]=useState(()=>{try{return localStorage.getItem("kartera_lang")||"es";}catch(e){return "es";}});
  const setLang=(l)=>{setLangState(l);try{localStorage.setItem("kartera_lang",l);}catch(e){}};
  const t=T[lang];
  const sim=simSlug?SIMS.find(s=>s.slug===simSlug):null;
  const pageTitle = path==="/interes-compuesto" ? t.ci : path==="/simulador-cartera" ? t.sim : path==="/simulacion"&&sim ? sim.title[lang] : null;

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
  return(
    <div style={{fontFamily:"system-ui,sans-serif",background:"#f5f7fa",minHeight:"100vh",color:"#1f2937"}}>
      <div style={{maxWidth:680,margin:"0 auto",padding:"20px 16px 40px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <h1 onClick={()=>go("/")} style={{fontSize:24,fontWeight:800,cursor:"pointer",margin:0}}>Kartera</h1>
            {pageTitle&&path!=="/simulacion"&&<span style={{fontSize:11,color:"#aaa",fontWeight:600}}>/ {pageTitle}</span>}
          </div>
          <button onClick={()=>setLang(lang==="es"?"en":"es")} style={{background:"#f3f4f6",border:"none",borderRadius:7,padding:"5px 10px",fontSize:11,color:"#888",cursor:"pointer",fontWeight:700}}>{lang==="es"?"EN":"ES"}</button>
        </div>
        {(path==="/interes-compuesto"||path==="/simulador-cartera")&&<div style={{display:"flex",background:"#e5e7eb",borderRadius:10,padding:3,marginBottom:18}}>
          <button onClick={()=>go("/interes-compuesto")} style={{flex:1,padding:"10px 0",borderRadius:8,border:"none",fontSize:13,fontWeight:700,cursor:"pointer",background:path==="/interes-compuesto"?"#fff":"transparent",color:path==="/interes-compuesto"?"#111":"#999",boxShadow:path==="/interes-compuesto"?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>{t.ci}</button>
          <button onClick={()=>go("/simulador-cartera")} style={{flex:1,padding:"10px 0",borderRadius:8,border:"none",fontSize:13,fontWeight:700,cursor:"pointer",background:path==="/simulador-cartera"?"#fff":"transparent",color:path==="/simulador-cartera"?"#111":"#999",boxShadow:path==="/simulador-cartera"?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>{t.sim}</button>
        </div>}
        {path==="/"&&<HomePage t={t} go={go}/>}
        {path==="/interes-compuesto"&&<CompoundCalc go={go} t={t}/>}
        {path==="/simulador-cartera"&&<PortfolioSim t={t} lang={lang}/>}
        {path==="/simulacion"&&sim&&<SimulationPage sim={sim} t={t} lang={lang} go={go}/>}
        {path==="/simulacion"&&!sim&&<div style={{textAlign:"center",padding:40}}><p style={{fontSize:16,color:"#888"}}>{lang==="es"?"Simulación no encontrada":"Simulation not found"}</p><button onClick={()=>go("/")} style={{marginTop:12,background:"#10b981",color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer"}}>{lang==="es"?"Volver al inicio":"Back to home"}</button></div>}
        <div style={{textAlign:"center",marginTop:24,fontSize:10,color:"#ddd"}}>kartera.pro 2026</div>
      </div>
    </div>
  );
}
