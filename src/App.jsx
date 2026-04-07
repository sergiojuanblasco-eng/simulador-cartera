import { useState, useMemo, useEffect, useCallback, useRef } from "react";

/* ══════════════════════════════════════════════
   ROUTING
   ══════════════════════════════════════════════ */
function useRouter() {
  const getPath = () => window.location.hash.replace("#", "") || "/";
  const [path, setPath] = useState(getPath);
  useEffect(() => {
    const h = () => setPath(getPath());
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  const go = useCallback((p) => { window.location.hash = p; }, []);
  return { path, go };
}

/* ══════════════════════════════════════════════
   DATA
   ══════════════════════════════════════════════ */
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

const ASSETS=[
  {id:"sp500",name:"S&P 500",cat:"idx",f:5,s:15,uf:false,desc:{es:"Las 500 mayores empresas de EE.UU.",en:"Top 500 US companies."}},
  {id:"nasdaq",name:"Nasdaq 100",cat:"idx",f:7,s:20,uf:false,desc:{es:"100 mayores tecnol\u00f3gicas.",en:"Top 100 tech companies."}},
  {id:"msci_world",name:"MSCI World",cat:"idx",f:6,s:15,uf:false,desc:{es:"1.500 empresas de 23 pa\u00edses desarrollados.",en:"1,500 companies from 23 developed countries."}},
  {id:"msci_em",name:"Emergentes",cat:"idx",f:7.5,s:20,uf:false,desc:{es:"Mercados emergentes (China, India, Brasil).",en:"Emerging markets (China, India, Brazil)."}},
  {id:"stoxx600",name:"Europa 600",cat:"idx",f:5.5,s:15,uf:false,desc:{es:"600 empresas europeas.",en:"600 European companies."}},
  {id:"msci_acwi",name:"MSCI ACWI",cat:"idx",f:6,s:15,uf:false,desc:{es:"Todo el mundo en un \u00edndice.",en:"The whole world in one index."}},
  {id:"apple",name:"Apple",cat:"stk",f:10,s:30,uf:true,desc:{es:"Ecosistema tech, valor refugio tecnol\u00f3gico.",en:"Tech ecosystem, tech safe haven."}},
  {id:"nvidia",name:"NVIDIA",cat:"stk",f:13,s:35,uf:true,desc:{es:"L\u00edder en chips para IA. Muy vol\u00e1til.",en:"AI chip leader. Very volatile."}},
  {id:"microsoft",name:"Microsoft",cat:"stk",f:10,s:28,uf:true,desc:{es:"Cloud + IA + software empresarial.",en:"Cloud + AI + enterprise software."}},
  {id:"tesla",name:"Tesla",cat:"stk",f:12,s:40,uf:true,desc:{es:"Veh\u00edculos el\u00e9ctricos + energ\u00eda. Muy vol\u00e1til.",en:"Electric vehicles + energy. Very volatile."}},
  {id:"amazon",name:"Amazon",cat:"stk",f:11,s:30,uf:true,desc:{es:"E-commerce + AWS cloud.",en:"E-commerce + AWS cloud."}},
  {id:"google",name:"Alphabet",cat:"stk",f:10,s:28,uf:true,desc:{es:"Publicidad digital + cloud + IA.",en:"Digital ads + cloud + AI."}},
  {id:"coca_cola",name:"Coca-Cola",cat:"stk",f:7,s:15,uf:true,desc:{es:"Valor defensivo, dividendo estable.",en:"Defensive stock, stable dividend."}},
  {id:"meta",name:"Meta",cat:"stk",f:11,s:35,uf:true,desc:{es:"Facebook, Instagram, WhatsApp.",en:"Facebook, Instagram, WhatsApp."}},
  {id:"us_bond",name:"Bonos USA 10Y",cat:"fi",f:4.5,s:8,uf:false,desc:{es:"Deuda del gobierno de EE.UU.",en:"US government debt."}},
  {id:"cash",name:"Monetario",cat:"fi",f:3,s:2,uf:false,desc:{es:"Liquidez con rendimiento m\u00ednimo.",en:"Liquidity with minimal return."}},
  {id:"btc",name:"Bitcoin",cat:"cry",f:15,s:60,uf:true,desc:{es:"Oro digital. Alta volatilidad.",en:"Digital gold. High volatility."}},
  {id:"eth",name:"Ethereum",cat:"cry",f:12,s:65,uf:true,desc:{es:"Contratos inteligentes. M\u00e1s riesgo que BTC.",en:"Smart contracts. Higher risk than BTC."}},
  {id:"gold",name:"Oro",cat:"alt",f:5,s:15,uf:false,desc:{es:"Protecci\u00f3n contra inflaci\u00f3n y crisis.",en:"Inflation and crisis protection."}},
  {id:"reits",name:"REITs",cat:"alt",f:6.5,s:15,uf:false,desc:{es:"Inmobiliario cotizado.",en:"Listed real estate."}},
];

const CATS=[{id:"idx",name:{es:"\u00cdndices",en:"Indices"}},{id:"stk",name:{es:"Acciones",en:"Stocks"}},{id:"fi",name:{es:"Renta Fija",en:"Fixed Income"}},{id:"cry",name:{es:"Cripto",en:"Crypto"}},{id:"alt",name:{es:"Otros",en:"Others"}}];
const CATCO={idx:"#3b82f6",stk:"#10b981",fi:"#1e40af",cry:"#f59e0b",alt:"#92400e"};
const COL=["#f87171","#10b981","#60a5fa"];

/* ══════════════════════════════════════════════
   I18N
   ══════════════════════════════════════════════ */
const T={
  es:{
    ci:"Inter\u00e9s Compuesto",sim:"Simulador de Cartera",
    ciSub:"Calcula cu\u00e1nto crecer\u00e1 tu dinero con el poder del inter\u00e9s compuesto",
    capIni:"Capital inicial",aport:"Aportaci\u00f3n",intAnual:"Inter\u00e9s anual",horiz:"Horizonte",anos:"a\u00f1os",
    capFin:"Capital final",tuAp:"Tu aportas",intGen:"Intereses generados",sobreAp:"sobre lo aportado",
    evo:"Evoluci\u00f3n",capital:"Capital",
    noSabes:"Los intereses fijos no existen",
    pruebaEl:"En la realidad los mercados suben Y bajan. Descubre qu\u00e9 habr\u00eda pasado con tu dinero usando datos hist\u00f3ricos reales.",
    verSim:"Ver simulador con datos reales",
    pess:"Pesimista",esp:"Esperado",opt:"Optimista",ano:"/a\u00f1o",
    preset:"Ejemplo: Cartera equilibrada global - personaliza a tu gusto",
    pesos:"Pesos",equi:"Equiponderar",tuCart:"Tu cartera",riesgo:"Riesgo",
    riskL:["Bajo","Moderado","Alto","Muy alto"],mktGen:"Mercado genera",
    desglose:"Desglose por activo",activo:"Activo",peso:"Peso",rendEsp:"Rend. esperado",contrib:"Contribuci\u00f3n",
    como:"\u00bfC\u00f3mo se calcula?",
    metodo:"1. Para cada a\u00f1o hist\u00f3rico se calcula el retorno de la cartera completa. Si un activo no exist\u00eda ese a\u00f1o (ej. Bitcoin antes de 2014), se redistribuye su peso entre los dem\u00e1s activos proporcionalmente. Esto permite usar hasta 35 a\u00f1os de datos sin descartar informaci\u00f3n.\n\n2. Con esos retornos anuales, se generan ventanas rolling del horizonte elegido (ej. todas las ventanas de 10 a\u00f1os: 1990-1999, 1991-2000...) y se calcula el CAGR (rentabilidad anualizada compuesta) de cada una.\n\n3. Los escenarios salen de percentiles reales de esa distribuci\u00f3n: P10 = pesimista, P50 (mediana) = esperado, P75 = optimista. No se usa P90 para evitar expectativas irreales.\n\n4. La probabilidad de p\u00e9rdida es el % de ventanas que terminaron en negativo. Si es 0 en la muestra, se muestra \"< 1%\" porque el riesgo cero no existe.\n\n5. Para activos con retornos extremos (crypto, growth stocks), se comprime la parte que supera el +50% anual para evitar que un a\u00f1o excepcional distorsione las proyecciones a futuro.",
    warn:"Rentabilidades pasadas no garantizan resultados futuros. Simulaci\u00f3n educativa.",
    optim:"Acceso anticipado al an\u00e1lisis con IA",
    prox:"Los primeros usuarios tendr\u00e1n acceso gratuito",
    avisarme:"Quiero acceso",
    mes:"mes",anoF:"a\u00f1o",eurMes:"EUR/mes",eurAno:"EUR/a\u00f1o",
    probPerd:"Probabilidad de perder dinero",
    insight:"En {yr} a\u00f1os, esta cartera ha tenido p\u00e9rdidas en {pct} de los casos hist\u00f3ricos",
    peorCaso:"Peor escenario hist\u00f3rico",
    alerta:"Alta probabilidad de p\u00e9rdidas a corto plazo. Considera ampliar tu horizonte.",
    datosLimWarn:"Datos hist\u00f3ricos limitados: los resultados pueden estar sesgados por periodos recientes",
    pocasVentanas:"Resultado basado en pocas observaciones hist\u00f3ricas ({n} ventanas)",
    sinDatos:"No hay suficientes datos hist\u00f3ricos para simular {yr} a\u00f1os con esta cartera",
    heroTitle:"Toma el control de tu dinero",
    heroSub:"Herramientas gratuitas para entender tu cartera de inversi\u00f3n con datos reales \u2014 sin humo, sin promesas falsas.",
    toolIC:"Calculadora de Inter\u00e9s Compuesto",
    toolICdesc:"Calcula cu\u00e1nto crecer\u00eda tu dinero con un inter\u00e9s fijo. Ideal para entender el efecto del tiempo.",
    toolSim:"Simulador de Cartera",
    toolSimDesc:"Proyecci\u00f3n realista con datos de 20+ activos, escenarios y probabilidades de p\u00e9rdida.",
    toolSimBadge:"PRO",
    irA:"Ir a la herramienta",
    homeWhy:"\u00bfPor qu\u00e9 Kartera?",
    homeW1t:"Datos reales",homeW1d:"35 a\u00f1os de retornos hist\u00f3ricos de \u00edndices, acciones, bonos, crypto y m\u00e1s.",
    homeW2t:"Riesgo honesto",homeW2d:"No solo cu\u00e1nto puedes ganar \u2014 cu\u00e1nto puedes perder y con qu\u00e9 probabilidad.",
    homeW3t:"Sin conflicto",homeW3d:"No vendemos fondos ni cobramos comisiones. Solo educaci\u00f3n financiera.",
    proximamente:"Pr\u00f3ximamente",proxItems:"Optimizaci\u00f3n de cartera con IA | Escenario de crisis (stress test) | Comparador de brokers",
    intEsp:"Inter\u00e9s esperado",
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
    preset:"Example: Balanced global portfolio - customize to your liking",
    pesos:"Weights",equi:"Equal weight",tuCart:"Your portfolio",riesgo:"Risk",
    riskL:["Low","Moderate","High","Very high"],mktGen:"Market generates",
    desglose:"Breakdown by asset",activo:"Asset",peso:"Weight",rendEsp:"Exp. return",contrib:"Contribution",
    como:"How is this calculated?",
    metodo:"1. For each historical year, the full portfolio return is computed. If an asset didn't exist that year (e.g. Bitcoin before 2014), its weight is redistributed proportionally among available assets. This lets us use up to 35 years of data without discarding information.\n\n2. Using those annual returns, rolling windows of the chosen horizon are generated (e.g. all 10-year windows: 1990-1999, 1991-2000...) and the CAGR (compound annual growth rate) of each is calculated.\n\n3. Scenarios come from real percentiles of that distribution: P10 = pessimistic, P50 (median) = expected, P75 = optimistic. P90 is not used to avoid unrealistic expectations.\n\n4. Loss probability is the % of windows that ended negative. If 0 in the sample, we show '< 1%' because zero risk doesn't exist.\n\n5. For assets with extreme returns (crypto, growth stocks), returns above +50% annually are compressed so that one exceptional year doesn't distort future projections.",
    warn:"Past performance does not guarantee future results. Educational simulation.",
    optim:"Early access to AI-powered analysis",
    prox:"First users will get free access",
    avisarme:"Get access",
    mes:"month",anoF:"year",eurMes:"EUR/mo",eurAno:"EUR/yr",
    probPerd:"Probability of losing money",
    insight:"Over {yr} years, this portfolio lost money in {pct} of historical cases",
    peorCaso:"Worst historical scenario",
    alerta:"High probability of short-term losses. Consider extending your horizon.",
    datosLimWarn:"Limited historical data: results may be biased by recent periods",
    pocasVentanas:"Result based on few historical observations ({n} windows)",
    sinDatos:"Not enough historical data to simulate {yr} years with this portfolio",
    heroTitle:"Take control of your money",
    heroSub:"Free tools to understand your investment portfolio with real data \u2014 no smoke, no false promises.",
    toolIC:"Compound Interest Calculator",
    toolICdesc:"Calculate how your money would grow at a fixed rate. Great for understanding the effect of time.",
    toolSim:"Portfolio Simulator",
    toolSimDesc:"Realistic projection with 20+ assets, scenarios, and loss probabilities.",
    toolSimBadge:"PRO",
    irA:"Go to tool",
    homeWhy:"Why Kartera?",
    homeW1t:"Real data",homeW1d:"35 years of historical returns from indices, stocks, bonds, crypto and more.",
    homeW2t:"Honest risk",homeW2d:"Not just how much you can earn \u2014 how much you can lose and how likely.",
    homeW3t:"No conflict",homeW3d:"We don't sell funds or charge commissions. Just financial education.",
    proximamente:"Coming soon",proxItems:"AI portfolio optimization | Crisis scenario (stress test) | Broker comparison",
    intEsp:"Expected interest",
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
   SIMULATION ENGINE — RE-NORMALIZATION
   ══════════════════════════════════════════════ */
function capExtremeReturn(ret, asset) {
  if (!asset.uf) return ret;
  let r = ret;
  if (r > 100) r = 65 + (r - 100) * 0.1;
  else if (r > 50) r = 50 + (r - 50) * 0.3;
  return r;
}

/* RE-NORMALIZATION: use ALL years, redistribute weights when an asset is missing */
function getPortfolioAnnualReturns(selectedIds, normalizedWeights) {
  // Collect ALL unique years from ALL selected assets
  const allYearsSet = new Set();
  selectedIds.forEach(id => gY(id).forEach(y => allYearsSet.add(y)));
  const allYears = [...allYearsSet].sort((a, b) => a - b);
  if (allYears.length === 0) return [];

  return allYears.map(year => {
    // Which assets have data this year?
    const available = selectedIds.filter(id => R[id] && R[id][year] !== undefined);
    if (available.length === 0) return null;

    // Sum original weights of available assets, then re-normalize
    const totalAvailWeight = available.reduce((s, id) => s + (normalizedWeights[id] || 0), 0);
    if (totalAvailWeight === 0) return null;

    let portRet = 0;
    available.forEach(id => {
      const reW = (normalizedWeights[id] || 0) / totalAvailWeight; // re-normalized weight
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

/* NO FALLBACKS — return null if insufficient data */
function computePortfolioScenarios(selectedIds, normalizedWeights, horizon) {
  const activeIds = selectedIds.filter(id => (normalizedWeights[id] || 0) > 0);
  if (activeIds.length === 0) return null;
  const annualRets = getPortfolioAnnualReturns(activeIds, normalizedWeights);
  const numYears = annualRets.length;
  if (numYears < horizon) return { insufficient: true, dataYears: numYears };

  const rollingCAGRs = getPortfolioRollingCAGR(annualRets, horizon);
  if (rollingCAGRs.length === 0) return { insufficient: true, dataYears: numYears };

  const rawP = pc(rollingCAGRs, 10), rawE = pc(rollingCAGRs, 50), rawO = pc(rollingCAGRs, 75);
  const negCount = rollingCAGRs.filter(c => c < 0).length;
  const rawProbLoss = negCount / rollingCAGRs.length;
  // "< 1%" floor — never show 0%
  const probLossDisplay = rawProbLoss === 0 ? "< 1%" : Math.round(rawProbLoss * 100) + "%";
  const probLossNum = Math.round(rawProbLoss * 100);

  const p10val = pc(rollingCAGRs, 10), p75val = pc(rollingCAGRs, 75);
  const pessCount = rollingCAGRs.filter(c => c <= p10val).length;
  const optCount = rollingCAGRs.filter(c => c >= p75val).length;
  const probPess = Math.round((pessCount / rollingCAGRs.length) * 100);
  const probOpt = Math.round((optCount / rollingCAGRs.length) * 100);

  return {
    insufficient: false,
    p: rawP, e: rawE, o: rawO,
    probLossDisplay, probLossNum,
    probPess, probEsp: 100 - probPess - probOpt, probOpt,
    worstCase: rollingCAGRs[0],
    dataYears: numYears,
    rollingCount: rollingCAGRs.length,
    fewWindows: rollingCAGRs.length < 10,
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

function SvgChart({lines,years,labels,colors,fill}){
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
    const x=(e.clientX||e.touches?.[0]?.clientX||0)-rect.left;
    const ratio=x/rect.width;
    const yr=Math.round(ratio*(W)- pad.l)/(w)*years;
    return Math.max(0,Math.min(years,Math.round(yr)));
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
      {hover!==null&&hover>=0&&hover<=years&&<>
        <line x1={sx(hover)} y1={pad.t} x2={sx(hover)} y2={pad.t+h} stroke="#aaa" strokeWidth="0.8" strokeDasharray="3,3"/>
        {lines.map((d,i)=>{const pt=d.find(p=>p.y===hover);if(!pt)return null;return<circle key={i} cx={sx(hover)} cy={sy(pt.v)} r="4" fill={colors[i]} stroke="#fff" strokeWidth="1.5"/>;})}
      </>}
    </svg>
    {/* Tooltip */}
    {hover!==null&&hover>=0&&hover<=years&&<div style={{background:"#111",color:"#fff",borderRadius:8,padding:"6px 10px",fontSize:11,display:"flex",gap:12,justifyContent:"center",marginTop:2}}>
      <span style={{fontWeight:700}}>A\u00f1o {hover}</span>
      {lines.map((d,i)=>{const pt=d.find(p=>p.y===hover);if(!pt)return null;return<span key={i} style={{color:colors[i]}}>{labels[i]}: <b>{fm(Math.round(pt.v))}</b></span>;})}
    </div>}
    {hover===null&&<div style={{display:"flex",justifyContent:"center",gap:16,marginTop:4,fontSize:11,color:"#aaa"}}>
      {labels.map((n,i)=><span key={i} style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:12,height:2,background:colors[i],display:"inline-block",borderRadius:1}}/>{n}</span>)}
    </div>}
  </div>);
}

/* DONUT CHART */
function Donut({items,size}){
  const r=size/2,ir=r*0.6,c=2*Math.PI;
  let cum=0;
  const total=items.reduce((s,i)=>s+i.w,0)||1;
  const paths=items.map((item,idx)=>{
    const frac=item.w/total;const start=cum;cum+=frac;
    const a1=start*c-Math.PI/2,a2=(start+frac)*c-Math.PI/2;
    const la=frac>0.5?1:0;
    const x1=r+r*Math.cos(a1),y1=r+r*Math.sin(a1);
    const x2=r+r*Math.cos(a2),y2=r+r*Math.sin(a2);
    const ix1=r+ir*Math.cos(a1),iy1=r+ir*Math.sin(a1);
    const ix2=r+ir*Math.cos(a2),iy2=r+ir*Math.sin(a2);
    return<path key={idx} d={`M${x1},${y1}A${r},${r} 0 ${la} 1 ${x2},${y2}L${ix2},${iy2}A${ir},${ir} 0 ${la} 0 ${ix1},${iy1}Z`} fill={item.c}/>;
  });
  return<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{paths}</svg>;
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
  const whyItems=[{icon:"\u{1F4CA}",t:t.homeW1t,d:t.homeW1d},{icon:"\u2696\uFE0F",t:t.homeW2t,d:t.homeW2d},{icon:"\u{1F6E1}\uFE0F",t:t.homeW3t,d:t.homeW3d}];
  return(<div>
    <div style={{textAlign:"center",padding:"28px 0 24px"}}>
      <h2 style={{fontSize:22,fontWeight:800,color:"#111",marginBottom:8,lineHeight:1.3}}>{t.heroTitle}</h2>
      <p style={{fontSize:13,color:"#888",maxWidth:440,margin:"0 auto",lineHeight:1.6}}>{t.heroSub}</p>
    </div>
    <div style={{display:"grid",gap:12,marginBottom:24}}>
      <div onClick={()=>go("/interes-compuesto")} style={{...cdS,cursor:"pointer",padding:20,marginBottom:0,borderLeft:"4px solid #6366f1"}}>
        <div style={{fontSize:15,fontWeight:800,color:"#111",marginBottom:4}}>{t.toolIC}</div>
        <p style={{fontSize:12,color:"#888",marginBottom:10,lineHeight:1.5}}>{t.toolICdesc}</p>
        <span style={{fontSize:12,fontWeight:700,color:"#6366f1"}}>{t.irA} \u2192</span>
      </div>
      <div onClick={()=>go("/simulador-cartera")} style={{...cdS,cursor:"pointer",padding:20,marginBottom:0,borderLeft:"4px solid #10b981",background:"#f0fdf8"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
          <span style={{fontSize:15,fontWeight:800,color:"#111"}}>{t.toolSim}</span>
          <span style={{fontSize:9,fontWeight:800,background:"#10b981",color:"#fff",padding:"2px 7px",borderRadius:4}}>{t.toolSimBadge}</span>
        </div>
        <p style={{fontSize:12,color:"#888",marginBottom:10,lineHeight:1.5}}>{t.toolSimDesc}</p>
        <span style={{fontSize:12,fontWeight:700,color:"#10b981"}}>{t.irA} \u2192</span>
      </div>
    </div>
    <div style={{marginBottom:24}}>
      <h3 style={{fontSize:14,fontWeight:800,color:"#111",marginBottom:12}}>{t.homeWhy}</h3>
      <div style={{display:"grid",gap:10}}>{whyItems.map((w,i)=>(<div key={i} style={{...cdS,marginBottom:0,display:"flex",gap:12,alignItems:"flex-start",padding:14}}><span style={{fontSize:22}}>{w.icon}</span><div><div style={{fontSize:13,fontWeight:700,color:"#111",marginBottom:2}}>{w.t}</div><div style={{fontSize:11,color:"#888",lineHeight:1.5}}>{w.d}</div></div></div>))}</div>
    </div>
    <div style={{padding:18,borderRadius:14,background:"linear-gradient(135deg,#ecfdf5,#f0fdf4)",border:"1px solid #bbf7d0",textAlign:"center"}}>
      <div style={{fontSize:14,fontWeight:800,color:"#065f46",marginBottom:6}}>{t.proximamente}</div>
      <div style={{fontSize:11,color:"#666",lineHeight:1.7}}>{t.proxItems.split("|").map((s,i)=><span key={i}>{i>0?" \u00B7 ":""}{s.trim()}</span>)}</div>
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
    <div style={cdS}><div style={{fontSize:13,fontWeight:700,marginBottom:8}}>{t.evo}</div><SvgChart lines={[data]} years={yr} labels={[t.capital]} colors={["#10b981"]} fill={true}/></div>
    <div style={{padding:20,borderRadius:14,background:"linear-gradient(135deg,#fef2f2,#fff7ed)",border:"1px solid #fecaca",textAlign:"center"}}>
      <div style={{fontSize:15,fontWeight:800,color:"#991b1b",marginBottom:6}}>{t.noSabes}</div>
      <p style={{fontSize:12,color:"#78716c",lineHeight:1.6,marginBottom:12,maxWidth:420,margin:"0 auto 12px"}}>{t.pruebaEl}</p>
      <button onClick={()=>go("/simulador-cartera")} style={{padding:"10px 24px",fontSize:13,background:"#10b981",color:"#fff",border:"none",borderRadius:10,fontWeight:700,cursor:"pointer"}}>{t.verSim} \u2192</button>
    </div>
  </div>);
}

/* ══════════════════════════════════════════════
   PORTFOLIO SIMULATOR
   ══════════════════════════════════════════════ */
function PortfolioSim({t,lang}){
  const[ini,sI]=useState(10000);const[mo,sM]=useState(300);const[yr,sY]=useState(15);const[freq,sF]=useState("mes");
  const moM=freq==="ano"?mo/12:mo;
  const[sel,sS]=useState(["msci_world","sp500","us_bond","gold"]);
  const[wt,sW]=useState({msci_world:50,sp500:25,us_bond:20,gold:5});
  const[tab,sT]=useState("idx");const[sm,sMt]=useState(false);const[showBk,sBk]=useState(false);
  const tW=sel.reduce((s,id)=>s+(wt[id]||0),0);
  const nW=useMemo(()=>{if(tW===0)return{};const n={};sel.forEach(id=>{n[id]=((wt[id]||0)/tW)*100;});return n;},[sel,wt,tW]);
  const tog=id=>{if(sel.includes(id)){sS(sel.filter(a=>a!==id));const w={...wt};delete w[id];sW(w);}else{sS([...sel,id]);sW({...wt,[id]:0});}};

  const pS=useMemo(()=>{
    if(sel.length===0||tW===0)return null;
    return computePortfolioScenarios(sel, nW, yr);
  },[sel,nW,yr,tW]);

  const scs=useMemo(()=>{if(!pS||pS.insufficient)return null;return[{l:t.pess,r:pS.p,d:cP(ini,moM,yr,pS.p),prob:pS.probPess},{l:t.esp,r:pS.e,d:cP(ini,moM,yr,pS.e),prob:pS.probEsp},{l:t.opt,r:pS.o,d:cP(ini,moM,yr,pS.o),prob:pS.probOpt}];},[pS,ini,moM,yr,t]);
  const tI=ini+moM*12*yr;
  const rL=useMemo(()=>{if(!tW)return 0;let rs=0;const cr={idx:2,stk:3,fi:0.5,cry:4,alt:1.5};sel.forEach(id=>{const a=ASSETS.find(x=>x.id===id);rs+=((nW[id]||0)/100)*(cr[a?.cat]||1);});return rs<1?0:rs<2?1:rs<3?2:3;},[sel,nW,tW]);
  const cC=useMemo(()=>CATS.map(c=>({id:c.id,name:c.name[lang],w:sel.filter(id=>ASSETS.find(a=>a.id===id)?.cat===c.id).reduce((s,id)=>s+(nW[id]||0),0)})).filter(c=>c.w>0),[sel,nW,lang]);
  const assetBreakdown=useMemo(()=>{if(!pS||pS.insufficient)return[];return sel.filter(id=>(nW[id]||0)>0).map(id=>{const a=ASSETS.find(x=>x.id===id);const sc=gS(id,yr);const w=(nW[id]||0)/100;return{name:a.name,weight:nW[id]||0,expRet:sc.e,contrib:w*sc.e,cat:a.cat};}).sort((a,b)=>b.contrib-a.contrib);},[sel,nW,yr,pS,lang]);
  // Donut items per asset
  const donutItems=useMemo(()=>{const assetColors={sp500:"#3b82f6",nasdaq:"#6366f1",msci_world:"#0ea5e9",msci_em:"#14b8a6",stoxx600:"#2563eb",msci_acwi:"#0284c7",apple:"#10b981",nvidia:"#34d399",microsoft:"#059669",tesla:"#f97316",amazon:"#f59e0b",google:"#eab308",coca_cola:"#84cc16",meta:"#22d3ee",us_bond:"#1e40af",cash:"#60a5fa",btc:"#f59e0b",eth:"#8b5cf6",gold:"#92400e",reits:"#a16207"};return sel.filter(id=>(nW[id]||0)>0).map(id=>({name:ASSETS.find(a=>a.id===id)?.name||id,w:nW[id]||0,c:assetColors[id]||"#999"}));},[sel,nW]);

  const rlC=["#10b981","#f59e0b","#f97316","#ef4444"];
  const showShortTermWarning = pS && !pS.insufficient && yr < 5 && pS.probLossNum > 25;

  return(<div>
    <div style={{background:"#ecfdf5",borderRadius:10,padding:"7px 14px",marginBottom:14,fontSize:12,color:"#065f46"}}>{t.preset}</div>
    <Inputs params={[{l:t.capIni,v:ini,fn:sI,mx:5e6,st:500,u:"EUR"},{l:t.aport,v:mo,fn:sM,mx:freq==="ano"?600000:50000,st:freq==="ano"?100:25,tog:true,freq,sF,lMes:t.eurMes,lAno:t.eurAno},{l:t.horiz,v:yr,fn:sY,mx:50,st:1,u:t.anos}]}/>
    <div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap"}}>{CATS.map(c=>{const n=sel.filter(id=>ASSETS.find(a=>a.id===id)?.cat===c.id).length;return<button key={c.id} onClick={()=>sT(c.id)} style={{padding:"6px 14px",borderRadius:8,border:"none",fontSize:12,fontWeight:700,cursor:"pointer",background:tab===c.id?"#fff":"transparent",color:tab===c.id?"#111":"#aaa",boxShadow:tab===c.id?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>{c.name[lang]}{n>0?" ("+n+")":""}</button>;})}</div>
    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>{ASSETS.filter(a=>a.cat===tab).map(a=>{const on=sel.includes(a.id);return<button key={a.id} onClick={()=>tog(a.id)} style={{padding:"6px 14px",borderRadius:20,border:on?"2px solid #10b981":"2px solid #e5e7eb",background:on?"#ecfdf5":"#fff",color:on?"#065f46":"#555",fontSize:13,fontWeight:600,cursor:"pointer"}}>{a.name}{on?" \u2713":""}</button>;})}</div>
    {sel.length>0&&<div style={cdS}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:13,fontWeight:700}}>{t.pesos}: <span style={{color:Math.abs(tW-100)<1?"#10b981":"#f59e0b",fontFamily:"monospace"}}>{tW}%</span> / 100%</span><button onClick={()=>{const w=Math.floor(100/sel.length);const rem=100-w*sel.length;const n={};sel.forEach((id,i)=>{n[id]=w+(i<rem?1:0);});sW(n);}} style={{fontSize:11,background:"#f3f4f6",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>{t.equi}</button></div>
      {sel.map(id=>{const a=ASSETS.find(x=>x.id===id);return<div key={id} style={{marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
          <span style={{width:90,fontSize:12,fontWeight:600,flexShrink:0}}>{a.name}</span>
          <input type="range" min={0} max={100} value={wt[id]||0} onChange={e=>sW({...wt,[id]:Number(e.target.value)})} style={{flex:1}}/>
          <div style={{display:"flex",alignItems:"center",background:"#f9fafb",border:"1.5px solid #eee",borderRadius:8,width:54,flexShrink:0}}><input type="number" min={0} max={100} value={wt[id]||0} onChange={e=>sW({...wt,[id]:Math.max(0,Math.min(100,Number(e.target.value)||0))})} style={{width:32,border:"none",background:"transparent",textAlign:"right",fontSize:12,fontWeight:700,outline:"none",padding:"4px 0 4px 3px",fontFamily:"monospace",color:"#333"}}/><span style={{fontSize:10,color:"#bbb",paddingRight:4}}>%</span></div>
          <button onClick={()=>tog(id)} style={{background:"none",border:"none",color:"#ccc",cursor:"pointer",fontSize:16}}>x</button>
        </div>
        <div style={{fontSize:10,color:"#aaa",marginLeft:0,fontStyle:"italic"}}>{a.desc[lang]}</div>
      </div>;})}
    </div>}

    {/* INSUFFICIENT DATA */}
    {pS&&pS.insufficient&&<div style={{padding:"16px",borderRadius:12,background:"#fef2f2",border:"1px solid #fecaca",textAlign:"center",marginBottom:12}}>
      <div style={{fontSize:13,fontWeight:700,color:"#991b1b",marginBottom:4}}>{t.sinDatos.replace("{yr}",String(yr))}</div>
      <div style={{fontSize:11,color:"#92400e"}}>({pS.dataYears} {t.anos} disponibles)</div>
    </div>}

    {scs&&<div>
      {/* Few windows warning */}
      {pS.fewWindows&&<div style={{padding:"8px 14px",borderRadius:10,background:"#fffbeb",border:"1px solid #fef3c7",fontSize:11,color:"#92400e",marginBottom:10}}>{t.pocasVentanas.replace("{n}",String(pS.rollingCount))}</div>}

      {showShortTermWarning&&<div style={{padding:"10px 14px",borderRadius:10,background:"#fef2f2",border:"1px solid #fecaca",fontSize:12,color:"#991b1b",marginBottom:10,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:18}}>{"\u26A0"}</span>{t.alerta}
      </div>}

      {/* SCENARIO CARDS — % annual big, money small */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:10,marginBottom:12}}>
        {scs.map((s,i)=>{const fin=s.d[s.d.length-1].v;const pr=fin-tI;const mu=tI>0?fin/tI:0;return<div key={i} style={{...cdS,marginBottom:0,border:i===1?"2px solid #10b98133":"1px solid #eee",background:i===1?"#f0fdf8":"#fff",position:"relative"}}>
          {i===1&&<div style={{position:"absolute",top:-1,left:"50%",transform:"translateX(-50%)",background:"#10b981",color:"#fff",fontSize:8,fontWeight:800,padding:"2px 8px",borderRadius:"0 0 6px 6px"}}>{s.l}</div>}
          <div style={{fontSize:10,fontWeight:700,color:COL[i],textTransform:"uppercase",marginBottom:5,marginTop:i===1?6:0}}>{s.l} <span style={{fontWeight:500,opacity:0.7}}>({s.prob}%)</span></div>
          <div style={{fontSize:24,fontWeight:800,fontFamily:"monospace",color:s.r>=0?"#10b981":"#ef4444"}}>{fp(s.r)} <span style={{fontSize:11,fontWeight:500,color:"#aaa"}}>{t.ano}</span></div>
          <div style={{fontSize:13,color:"#555",fontFamily:"monospace",marginTop:4}}>{fm(fin)} EUR</div>
          <div style={{fontSize:10,color:"#aaa",marginTop:4,paddingTop:4,borderTop:"1px solid #f3f4f6"}}>{pr>=0?"+":""}{fm(pr)} | x{mu.toFixed(1)}</div>
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
      <div style={cdS}><div style={{fontSize:13,fontWeight:700,marginBottom:8}}>{t.evo}</div><SvgChart lines={[scs[0].d,scs[1].d,scs[2].d]} years={yr} labels={[t.pess,t.esp,t.opt]} colors={COL} fill={true}/></div>

      {/* PORTFOLIO COMPOSITION + DONUT + RISK */}
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
            <div style={{flex:1,minWidth:60,background:"#f9fafb",borderRadius:10,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:9,color:"#aaa"}}>{t.tuAp}</div><div style={{fontSize:13,fontWeight:800,fontFamily:"monospace"}}>{fm(tI)}</div></div>
            <div style={{flex:1,minWidth:60,background:"#ecfdf5",borderRadius:10,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:9,color:"#aaa"}}>{t.mktGen}</div><div style={{fontSize:13,fontWeight:800,fontFamily:"monospace",color:"#10b981"}}>+{fm(Math.max(0,scs[1].d[scs[1].d.length-1].v-tI))}</div></div>
            <div style={{flex:1,minWidth:60,background:"#eef2ff",borderRadius:10,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:9,color:"#aaa"}}>{t.intEsp}</div><div style={{fontSize:13,fontWeight:800,fontFamily:"monospace",color:"#6366f1"}}>{fp(pS.e)}</div></div>
          </div>
        </div>
      </div>

      {/* ASSET BREAKDOWN */}
      <div style={{...cdS,padding:0}}>
        <button onClick={()=>sBk(!showBk)} style={{width:"100%",padding:"12px 16px",border:"none",background:"transparent",display:"flex",justifyContent:"space-between",cursor:"pointer",fontSize:12,fontWeight:700,color:"#555"}}><span>{t.desglose}</span><span>{showBk?"\u25B2":"\u25BC"}</span></button>
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

      {/* METHODOLOGY */}
      <div style={{...cdS,padding:0}}><button onClick={()=>sMt(!sm)} style={{width:"100%",padding:"12px 16px",border:"none",background:"transparent",display:"flex",justifyContent:"space-between",cursor:"pointer",fontSize:12,fontWeight:600,color:"#999"}}><span>{t.como}</span><span>{sm?"\u25B2":"\u25BC"}</span></button>{sm&&<div style={{padding:"0 16px 14px",fontSize:11,color:"#777",lineHeight:1.8,whiteSpace:"pre-line"}}>{t.metodo}</div>}</div>
      <div style={{fontSize:11,color:"#92400e",background:"#fffbeb",padding:12,borderRadius:10,textAlign:"center",border:"1px solid #fef3c7",marginBottom:12}}>{t.warn}</div>

      {/* CTA */}
      <div style={{padding:18,borderRadius:14,background:"linear-gradient(135deg,#ecfdf5,#f0fdf4)",border:"1px solid #bbf7d0",textAlign:"center"}}>
        <div style={{fontSize:14,fontWeight:800,color:"#065f46",marginBottom:3}}>{t.optim}</div>
        <div style={{fontSize:11,color:"#888",marginBottom:10}}>{t.prox}</div>
        <button onClick={()=>window.open("https://forms.gle/JMZg1w5eAUHnYVHw8","_blank")} style={{padding:"8px 20px",fontSize:12,background:"#10b981",color:"#fff",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer"}}>{t.avisarme}</button>
      </div>
    </div>}
  </div>);
}

/* ══════════════════════════════════════════════
   APP ROOT
   ══════════════════════════════════════════════ */
export default function App(){
  const {path, go} = useRouter();
  const[lang,setLang]=useState("es");
  const t=T[lang];
  const pageTitle = path==="/interes-compuesto" ? t.ci : path==="/simulador-cartera" ? t.sim : null;

  return(
    <div style={{fontFamily:"system-ui,sans-serif",background:"#f5f7fa",minHeight:"100vh",color:"#1f2937"}}>
      <div style={{maxWidth:680,margin:"0 auto",padding:"20px 16px 40px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <h1 onClick={()=>go("/")} style={{fontSize:24,fontWeight:800,cursor:"pointer",margin:0}}>Kartera</h1>
            {pageTitle&&<span style={{fontSize:11,color:"#aaa",fontWeight:600}}>/ {pageTitle}</span>}
          </div>
          <button onClick={()=>setLang(lang==="es"?"en":"es")} style={{background:"#f3f4f6",border:"none",borderRadius:7,padding:"5px 10px",fontSize:11,color:"#888",cursor:"pointer",fontWeight:700}}>{lang==="es"?"EN":"ES"}</button>
        </div>
        {path!=="/"&&<div style={{display:"flex",background:"#e5e7eb",borderRadius:10,padding:3,marginBottom:18}}>
          <button onClick={()=>go("/interes-compuesto")} style={{flex:1,padding:"10px 0",borderRadius:8,border:"none",fontSize:13,fontWeight:700,cursor:"pointer",background:path==="/interes-compuesto"?"#fff":"transparent",color:path==="/interes-compuesto"?"#111":"#999",boxShadow:path==="/interes-compuesto"?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>{t.ci}</button>
          <button onClick={()=>go("/simulador-cartera")} style={{flex:1,padding:"10px 0",borderRadius:8,border:"none",fontSize:13,fontWeight:700,cursor:"pointer",background:path==="/simulador-cartera"?"#fff":"transparent",color:path==="/simulador-cartera"?"#111":"#999",boxShadow:path==="/simulador-cartera"?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>{t.sim}</button>
        </div>}
        {path==="/"&&<HomePage t={t} go={go}/>}
        {path==="/interes-compuesto"&&<CompoundCalc go={go} t={t}/>}
        {path==="/simulador-cartera"&&<PortfolioSim t={t} lang={lang}/>}
        <div style={{textAlign:"center",marginTop:24,fontSize:10,color:"#ddd"}}>kartera.pro 2026</div>
      </div>
    </div>
  );
}
