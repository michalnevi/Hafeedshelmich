import { useState, useEffect, useCallback, useRef } from "react";

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const LAT = 32.5167, LON = 34.9333; // Ein Ayala

const injectPWA = () => {
  if (document.getElementById("pwa-meta")) return;
  [["apple-mobile-web-app-capable","yes"],["apple-mobile-web-app-title","הפיד של מיכ"],["apple-mobile-web-app-status-bar-style","default"],["theme-color","#E8F4FD"]].forEach(([name,content]) => { const m=document.createElement("meta"); m.name=name; m.content=content; document.head.appendChild(m); });
  const svg=`data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 180'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%25' stop-color='%234FC3F7'/><stop offset='100%25' stop-color='%23CE93D8'/></linearGradient></defs><rect width='180' height='180' rx='40' fill='url(%23g)'/><text x='90' y='78' text-anchor='middle' font-size='26' font-family='serif' fill='white'>הפיד</text><text x='90' y='112' text-anchor='middle' font-size='19' font-family='serif' fill='%23FFF9C4'>של מיכ</text><text x='45' y='148' font-size='18'>%E2%AD%90</text><text x='80' y='155' font-size='14'>%E2%9C%A8</text><text x='115' y='148' font-size='18'>%E2%AD%90</text></svg>`;
  const l=document.createElement("link"); l.rel="apple-touch-icon"; l.href=svg; l.id="pwa-meta"; document.head.appendChild(l);
};

function getTimeOfDay() { const h=new Date().getHours(); if(h>=5&&h<12)return"morning"; if(h>=12&&h<17)return"afternoon"; if(h>=17&&h<21)return"evening"; return"night"; }

const TIME_THEMES = {
  morning:  {greeting:"בוקר של קסם ✨",particle:"🌤️",gradient:"linear-gradient(160deg,#FFF9E6 0%,#FFF0D0 40%,#FFE8F0 100%)",accent:"#FF8C00",secondary:"#FF69B4",tertiary:"#4CAF50",text:"#2C1A00",subtext:"#A07040",sparkles:["#FFD700","#FF69B4","#87CEEB","#98FB98"]},
  afternoon:{greeting:"שעת הרפתקה 🌈",particle:"🌈",gradient:"linear-gradient(160deg,#E3F2FD 0%,#EDE7F6 50%,#E8F5E9 100%)",accent:"#5C6BC0",secondary:"#AB47BC",tertiary:"#26A69A",text:"#1A1040",subtext:"#6050A0",sparkles:["#7986CB","#BA68C8","#4DB6AC","#81C784"]},
  evening:  {greeting:"שקיעת הקסם 🌇",particle:"🌇",gradient:"linear-gradient(160deg,#FFF3E0 0%,#FCE4EC 50%,#F3E5F5 100%)",accent:"#F06292",secondary:"#FF8A65",tertiary:"#9575CD",text:"#2C1020",subtext:"#A05070",sparkles:["#F48FB1","#FFAB91","#CE93D8","#FFD54F"]},
  night:    {greeting:"לילה של כוכבים 🌙",particle:"🌙",gradient:"linear-gradient(160deg,#E8EAF6 0%,#EDE7F6 50%,#E1F5FE 100%)",accent:"#7C4DFF",secondary:"#448AFF",tertiary:"#00BCD4",text:"#1A0840",subtext:"#6040A0",sparkles:["#B39DDB","#90CAF9","#80DEEA","#F48FB1"]},
};

const KNOWLEDGE_TOPICS = [
  {id:"psychology",label:"פסיכולוגיה ומדע המוח",icon:"🧠",color:"#9C27B0"},
  {id:"history",   label:"היסטוריה ופילוסופיה", icon:"📜",color:"#FF6F00"},
  {id:"science",   label:"מדע וטכנולוגיה",       icon:"🔬",color:"#2E7D32"},
  {id:"theater",   label:"תיאטרון ואמנות",       icon:"🎭",color:"#C2185B"},
  {id:"parenting", label:"הורות ומונטיסורי",     icon:"🌱",color:"#F57C00"},
  {id:"health",    label:"בריאות ורפואה",        icon:"❤️",color:"#D32F2F"},
  {id:"news_il",   label:"חדשות ישראל",          icon:"🇮🇱",color:"#1565C0"},
  {id:"news_world",label:"חדשות העולם",          icon:"🌍",color:"#6A1B9A"},
];

const SELFDEV_SOURCES = ["'The Power of Habit' by Charles Duhigg","'Mindset' by Carol Dweck","'Atomic Habits' by James Clear","Positive Psychology — Martin Seligman","Flow Theory — Mihaly Csikszentmihalyi","'Grit' by Angela Duckworth","Brené Brown on vulnerability","'Start with Why' by Simon Sinek","'The Power of Now' by Eckhart Tolle","Self-Determination Theory — Deci & Ryan"];
const pickSource = () => SELFDEV_SOURCES[Math.floor(Math.random()*SELFDEV_SOURCES.length)];

// ── ARABIC WORD BANK (localStorage) ──────────────────────────────────────────
const ARABIC_KEY = "michals_arabic_v1";
function loadWordBank() { try { return JSON.parse(localStorage.getItem(ARABIC_KEY)||"[]"); } catch { return []; } }
function saveWordBank(words) { try { localStorage.setItem(ARABIC_KEY,JSON.stringify(words)); } catch {} }

// ── CACHE ─────────────────────────────────────────────────────────────────────
const CACHE_KEY = "michals_content_v7";
function saveCache(id,c) { try { const d=JSON.parse(localStorage.getItem(CACHE_KEY)||"{}"); d[id]=c; localStorage.setItem(CACHE_KEY,JSON.stringify(d)); } catch {} }
function loadCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY)||"{}"); } catch { return {}; } }
const CHECKS_KEY = "michals_checks_v1";
function getTodayStr() { return new Date().toISOString().split("T")[0]; }
function loadChecks() { try { const d=JSON.parse(localStorage.getItem(CHECKS_KEY)||"{}"); return d.date===getTodayStr()?d.checks||0:0; } catch { return 0; } }
function saveChecks(n) { try { localStorage.setItem(CHECKS_KEY,JSON.stringify({date:getTodayStr(),checks:n})); } catch {} }

// ── CLAUDE API ────────────────────────────────────────────────────────────────
async function callClaude(system, userMsg) {
  const body={model:"claude-haiku-4-5-20251001",max_tokens:900,system,messages:[{role:"user",content:userMsg}]};
  const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify(body)});
  if(!resp.ok)throw new Error(`API ${resp.status}`);
  const data=await resp.json();
  const text=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n");
  const s=text.indexOf("{"),e=text.lastIndexOf("}");
  if(s===-1||e===-1)throw new Error("No JSON");
  return JSON.parse(text.substring(s,e+1));
}

async function translateToHebrew(obj) {
  const sys=`Translate all text values in this JSON to Hebrew. Keep keys unchanged. Return JSON only, no backticks.`;
  try { return await callClaude(sys, JSON.stringify(obj)); } catch { return obj; }
}

// ── RSS HELPER ────────────────────────────────────────────────────────────────
async function fetchRSS(url) {
  const proxy=`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const resp=await fetch(proxy);
  const data=await resp.json();
  const doc=new DOMParser().parseFromString(data.contents,"text/xml");
  return Array.from(doc.querySelectorAll("item")).slice(0,5).map(item=>({
    title:item.querySelector("title")?.textContent||"",
    desc:item.querySelector("description")?.textContent?.replace(/<[^>]*>/g,"").substring(0,200)||"",
  }));
}

// ── CONTENT FETCHERS ──────────────────────────────────────────────────────────
async function fetchKnowledge(topic) {
  const formats=["fact","insight","quote"];
  const format=formats[Math.floor(Math.random()*formats.length)];
  const schemas={
    fact:`{"type":"fact","emoji":"emoji","title":"title","body":"3-4 interesting sentences","takeaway":"one practical takeaway"}`,
    insight:`{"type":"insight","emoji":"emoji","title":"title","finding":"key finding in one sentence","explanation":"2-3 sentences","practical":"one practical step"}`,
    quote:`{"type":"quote","emoji":"emoji","title":"topic","quote":"real famous quote","author":"real person","context":"1-2 sentences of context","relevance":"why relevant today"}`,
  };
  if(topic.id==="parenting") {
    const sys=`You are a Montessori educator. Topic: child development and parenting.\nReturn JSON only, no backticks:\n${schemas[format]}`;
    return {...await callClaude(sys,`Create ${format} about Montessori/child development`),format};
  }
  if(topic.id==="news_il") {
    try {
      const items=await fetchRSS("https://www.ynet.co.il/Integration/StoryRss2.xml");
      if(items.length>0){
        const top5=items.slice(0,5);
        const headlines=top5.map(i=>i.title).join("\n");
        const mainItem=top5[0];
        return{type:"news_feed",format:"news",emoji:"📰",
          title:mainItem.title.substring(0,80),
          body:mainItem.desc.substring(0,200),
          all_items:top5,
          source:"ynet"};
      }
    } catch {}
    return{type:"fact",format:"fact",emoji:"📰",title:"חדשות ישראל",body:"לא ניתן לטעון חדשות כרגע",takeaway:""};
  }
  if(topic.id==="news_world") {
    try {
      const items=await fetchRSS("https://feeds.reuters.com/reuters/topNews");
      if(items.length>0){
        const top5=items.slice(0,5);
        const mainItem=top5[0];
        return{type:"news_feed",format:"news",emoji:"🌍",
          title:mainItem.title.substring(0,80),
          body:mainItem.desc.substring(0,200),
          all_items:top5,
          source:"Reuters"};
      }
    } catch {}
    return{type:"fact",format:"fact",emoji:"🌍",title:"World News",body:"Could not load news",takeaway:""};
  }
  if(topic.id==="science") {
    try {
      const items=await fetchRSS("https://www.nasa.gov/feed/");
      if(items.length>0){const item=items[Math.floor(Math.random()*items.length)];const title=item.title;const desc=item.desc;const sys=`Make this NASA story exciting and accessible.\nReturn JSON only:\n${schemas.fact}`;return{...await callClaude(sys,`NASA: ${title}\n${desc}`),format:"fact"};}
    } catch {}
  }
  const sys=`You are a knowledgeable educator. Topic: ${topic.label}.\nWrite in English. Return JSON only, no backticks:\n${schemas[format]}`;
  return{...await callClaude(sys,`Create ${format} about ${topic.label}`),format};
}

async function fetchSelfDev() {
  const source=pickSource();
  const schemas={
    fact:`{"type":"fact","emoji":"emoji","source":"${source}","title":"key principle","body":"3-4 sentences","takeaway":"practical application"}`,
    quote:`{"type":"quote","emoji":"emoji","source":"${source}","title":"key theme","quote":"exact quote","author":"author name","context":"brief context","relevance":"relevance today"}`,
    insight:`{"type":"insight","emoji":"emoji","source":"${source}","title":"key insight","finding":"main finding","explanation":"explanation","practical":"small step for today"}`,
  };
  const format=["fact","quote","insight"][Math.floor(Math.random()*3)];
  const sys=`Expert in personal development. Return JSON only:\n${schemas[format]}`;
  return{...await callClaude(sys,`Create ${format} from: ${source}`),format};
}

async function fetchDailyMenu() {
  const themes=["Mediterranean","Asian inspired","Israeli home cooking","High protein vegetarian","Light & fresh","Comfort food","Middle Eastern"];
  const theme=themes[Math.floor(Math.random()*themes.length)];
  const sys=`You are an Israeli vegetarian nutritionist. Create a full daily menu with theme: ${theme}. The person eats eggs and dairy products. STRICTLY NO meat, chicken, fish, tuna, salmon, or any seafood whatsoever.\nReturn ONLY this JSON structure, no extra text:\n{"emoji":"🥗","theme":"${theme}","breakfast":{"name":"dish name","description":"2-3 word description"},"lunch":{"name":"dish name","description":"2-3 word description"},"dinner":{"name":"dish name","description":"2-3 word description"},"snack":{"name":"snack name","description":"2-3 word description"},"tip":"one nutritional tip"}`;
  return callClaude(sys,`Create a vegetarian daily menu with ${theme} theme. All dishes must be 100% vegetarian with no meat or fish.`);
}

async function fetchMenuDetail(name,desc) {
  const sys=`Vegetarian chef. Return JSON only:\n{"ingredients":["item"],"steps":["step"],"time":"time","difficulty":"easy/medium/hard","tip":"tip"}`;
  return callClaude(sys,`Recipe for: ${name} — ${desc}`);
}

async function fetchInspirationTip() {
  const types=["mindfulness","stoic wisdom","Buddhist insight","poetic wisdom","nature wisdom","philosophical quote"];
  const t=types[Math.floor(Math.random()*types.length)];
  return callClaude(`Daily inspiration. Return JSON only:\n{"type":"${t}","emoji":"emoji","text":"inspiring text max 25 words","author":"name or null"}`,"Daily inspiration");
}

async function fetchTrivia() {
  try {
    const resp=await fetch("https://opentdb.com/api.php?amount=1&type=multiple&difficulty=medium");
    if(resp.ok){const data=await resp.json();if(data.results?.length>0){const q=data.results[0];const clean=(s)=>s.replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">");const correct=clean(q.correct_answer);const all=[...q.incorrect_answers.map(clean),correct].sort(()=>Math.random()-.5);const correctIdx=all.indexOf(correct);const ex=await callClaude(`Explain this trivia answer in 1-2 sentences. Return JSON only:\n{"explanation":"brief explanation"}`,`Q: ${clean(q.question)}\nA: ${correct}`).catch(()=>({explanation:""}));return{emoji:q.category.includes("Science")?"🔬":q.category.includes("History")?"📜":q.category.includes("Art")?"🎨":q.category.includes("Sport")?"⚽":"🎯",topic:q.category,question:clean(q.question),options:all.map((a,i)=>`${["A","B","C","D"][i]}. ${a}`),correct:correctIdx,explanation:ex.explanation||`Answer: ${correct}`};}}
  } catch {}
  return callClaude(`Quiz question. Return JSON only:\n{"emoji":"emoji","topic":"topic","question":"question","options":["A. opt","B. opt","C. opt","D. opt"],"correct":0,"explanation":"explanation"}`,"Trivia question");
}

async function fetchDailyTask() {
  const cats=["Health & medical","Finance","Home organization","Relationships","Career","Personal wellbeing","Digital hygiene"];
  const cat=cats[Math.floor(Math.random()*cats.length)];
  return callClaude(`Life coach. One procrastinated task. Category: ${cat}.\nReturn JSON only:\n{"emoji":"emoji","category":"${cat}","task":"task name","why":"why it matters","how":"specific small step now","time":"how long"}`,"Procrastinated task");
}

async function fetchTodayInHistory() {
  try {
    const today=new Date();const m=today.getMonth()+1;const d=today.getDate();
    const resp=await fetch(`https://history.muffinlabs.com/date/${m}/${d}`);
    if(resp.ok){const data=await resp.json();const events=data.data?.Events||[];if(events.length>0){const event=events[Math.floor(Math.random()*Math.min(events.length,20))];const sys=`Make this historical event interesting. Return JSON only:\n{"emoji":"emoji","year":"${event.year}","title":"catchy title","story":"3-4 engaging sentences","insight":"lesson"}`;return callClaude(sys,`${event.year}: ${event.text}`);}}
  } catch {}
  return callClaude(`Historian. Event from today in history. Return JSON only:\n{"emoji":"emoji","year":"year","title":"title","story":"3-4 sentences","insight":"lesson"}`,"Historical event for today");
}

async function fetchStyleTip() {
  const occs=["יום יומי","עבודה","יציאה לערב","שבת","ספורט ופנאי","קניות"];
  const occ=occs[Math.floor(Math.random()*occs.length)];
  const tipTypes=["קומבינציית צבעים","טיפ לבגד מרכזי","נעליים ואביזרים","שכבות","פרופורציות לגוף","צבעים המחמיאים לעיניים ועור"];
  const tipType=tipTypes[Math.floor(Math.random()*tipTypes.length)];
  const sys = "את מעצבת אופנה ישראלית. הלקוחה: אישה בת 30, גובה 1.57, מידה S, מבנה שעון חול קטן ונשי, עור בהיר, עיניים כחולות, שיער בלונדיני. אוקיזיה: "+occ+". סוג טיפ: "+tipType+".\nצבעים שמחמיאים לעיניים כחולות ועור בהיר, פרופורציות לגוף שעון חול קטן.\nהחזר JSON בלבד, ללא backtick, הכל בעברית:\n{\"emoji\":\"emoji\",\"occasion\":\""+occ+"\",\"tip_type\":\""+tipType+"\",\"main_tip\":\"הטיפ המרכזי\",\"outfit\":\"תיאור התלבושת\",\"colors\":\"קומבינציית צבעים ולמה מחמיאה לך\",\"why\":\"למה זה עובד למבנה הגוף שלך\",\"avoid\":\"מה להימנע ולמה\",\"accessory\":\"אקססורי מחמיא\"}";
  return callClaude(sys, "סטייל " + occ + " " + tipType);
}

async function fetchWeatherAndOutfit() {
  const resp=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weathercode,windspeed_10m,apparent_temperature&timezone=Asia/Jerusalem`);
  if(!resp.ok)throw new Error("weather");
  const data=await resp.json();const curr=data.current;
  const temp=Math.round(curr.temperature_2m);const feels=Math.round(curr.apparent_temperature);const wind=Math.round(curr.windspeed_10m);const code=curr.weathercode;
  const desc=code<=1?"Clear":code<=3?"Partly cloudy":code<=48?"Foggy":code<=67?"Rainy":code<=77?"Snow":"Stormy";
  const emoji=code<=1?"☀️":code<=3?"⛅":code<=48?"🌫️":code<=67?"🌧️":code<=77?"❄️":"⛈️";
  const r=await callClaude(`Fashion stylist. Weather: ${temp}°C (feels ${feels}°C), ${desc}, wind ${wind}km/h, Israel. Client: woman 157cm, size S, petite hourglass.\nReturn JSON only:\n{"outfit":"outfit","layers":"layering","shoes":"shoes","tip":"tip"}`,`Outfit for ${temp}°C ${desc}`);
  return{...r,temp,feels,desc,emoji,wind};
}

async function fetchFamousQuote() {
  // Use random skip to avoid repetition - quotable.io has 1000s of quotes
  const skip = Math.floor(Math.random()*500);
  const tagSets = ["wisdom","philosophy","science","literature","success","motivational","technology","humor","history","politics"];
  const tag = tagSets[Math.floor(Math.random()*tagSets.length)];
  try {
    const resp=await fetch(`https://api.quotable.io/quotes/random?limit=1&maxLength=180&tags=${tag}&skip=${skip}`);
    if(resp.ok){
      const data=await resp.json();
      const q=Array.isArray(data)?data[0]:data;
      if(q && q.content && q.author){
        const qtext = q.content.replace(/"/g,"'").replace(/\n/g," ").substring(0,150);
        const sys = "Explain this quote briefly. Return JSON only, no backtick: {\"emoji\":\"💬\",\"category\":\"wisdom\",\"quote\":\""+qtext+"\",\"author\":\""+q.author+"\",\"profession\":\"their field\",\"relevance\":\"why relevant today\"}";
        return callClaude(sys, "Quote: "+q.author);
      }
    }
  } catch {}
  try {
    const resp2=await fetch("https://api.quotable.io/quotes/random?limit=1&maxLength=180");
    if(resp2.ok){const data=await resp2.json();const q=Array.isArray(data)?data[0]:data;if(q?.content&&q?.author){const sys=`Explain briefly. Return JSON only:\n{"emoji":"💬","category":"wisdom","quote":"${q.content.replace(/"/g,"'")}","author":"${q.author}","profession":"field","relevance":"relevance today"}`;return callClaude(sys,`Quote by ${q.author}`);}}
  } catch {}
  return callClaude(`Share a real famous quote from a well-known person. Return JSON only:\n{"emoji":"💬","category":"wisdom","quote":"real verbatim quote","author":"real person name","profession":"their field","relevance":"one sentence on relevance today"}`,"Famous real quote");
}

async function fetchArabicWord() {
  const categories=["greetings","numbers","colors","food","emotions","family","nature","time","body","travel"];
  const cat=categories[Math.floor(Math.random()*categories.length)];
  return callClaude(`Arabic language teacher. Teach one Arabic word/phrase for: ${cat}.\nReturn JSON only:\n{"emoji":"emoji","category":"${cat}","arabic":"Arabic script","transliteration":"phonetic in English letters","hebrew":"translation in Hebrew","english":"translation in English","example_arabic":"simple example sentence in Arabic","example_transliteration":"phonetic of example","example_translation":"English translation of example","tip":"memory tip"}`,"Arabic word lesson");
}

async function fetchGrammarQuestion() {
  const topics=["present perfect vs simple past","past continuous vs past simple","future: will vs going to","1st vs 2nd conditional","passive voice transformation","modal verbs (must/should/might)","reported speech","relative clauses (who/which/whose)","gerunds vs infinitives","active vs passive voice"];
  const topic=topics[Math.floor(Math.random()*topics.length)];
  return callClaude(`English grammar teacher. Topic: ${topic}. Create a structural grammar question (not vocabulary). Show a sentence and ask the student to choose the correct grammatical form.\nReturn JSON only, no backticks:\n{"emoji":"📝","topic":"${topic}","instruction":"Choose the correct form:","sentence":"a full sentence showing the grammar point","options":["A: full sentence version A","B: full sentence version B","C: full sentence version C","D: full sentence version D"],"correct":0,"rule":"the grammar rule in simple terms","example":"another correct example","common_mistake":"typical error learners make"}`, `Grammar ${topic}`);
}

// ── UI HELPERS ─────────────────────────────────────────────────────────────────
function MagicSparkles({colors}) {
  const sparks=useRef(Array.from({length:14},()=>({x:Math.random()*100,y:Math.random()*100,s:Math.random()*14+7,d:Math.random()*6,dur:Math.random()*4+3,color:colors[Math.floor(Math.random()*colors.length)],rot:Math.random()*360}))).current;
  return(<div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>{sparks.map((s,i)=><div key={i} style={{position:"absolute",left:`${s.x}%`,top:`${s.y}%`,fontSize:s.s,opacity:0.2,animation:`float ${s.dur}s ${s.d}s infinite alternate ease-in-out`,transform:`rotate(${s.rot}deg)`,color:s.color}}>✦</div>)}</div>);
}

function Card({children,color,style={}}) {
  return(<div style={{background:`linear-gradient(145deg,${color}18,${color}06)`,border:`2px solid ${color}44`,borderRadius:22,padding:24,boxShadow:`0 6px 24px ${color}20`,position:"relative",overflow:"hidden",...style}}><div style={{position:"absolute",top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${color},${color}88)`}}/>{children}</div>);
}

function SectionLabel({color,text}) { return <div style={{color,fontSize:10,letterSpacing:"3px",fontFamily:"monospace",marginBottom:12}}>✦ {text}</div>; }

function LoadingPulse({color}) {
  return(<div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0"}}><div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${color}44`,borderTopColor:color,animation:"spin 1s linear infinite"}}/><span style={{color:"#bbb",fontSize:13}}>Loading...</span></div>);
}

function TranslateBtn({color,onTranslate,translated}) {
  return(<button onClick={onTranslate} style={{position:"absolute",top:12,left:12,background:translated?"#E8F5E9":"white",border:`1px solid ${color}44`,color:translated?"#2E7D32":color,borderRadius:20,padding:"4px 10px",fontSize:10,cursor:"pointer",fontFamily:"monospace",letterSpacing:"1px",zIndex:2}}>
    {translated?"✓ עברית":"🇮🇱 תרגם"}
  </button>);
}

// ── KNOWLEDGE CARD (inline, no modal) ─────────────────────────────────────────

function NewsFeedInline({items,source,color,textColor}) {
  const [expanded,setExpanded]=useState(false);
  const tc=textColor||"#333";
  return(<div style={{direction:"rtl"}}>
    <div style={{color:"#aaa",fontSize:9,letterSpacing:"2px",fontFamily:"monospace",marginBottom:8}}>📡 {source} — חדשות אחרונות</div>
    {(expanded?items:[items[0]]).map((item,i)=>(
      <div key={i} style={{marginBottom:10,paddingBottom:10,borderBottom:i<(expanded?items.length-1:0)?"1px solid "+color+"22":"none"}}>
        <div style={{color:tc,fontSize:13,fontWeight:i===0?700:500,lineHeight:1.4,marginBottom:3}}>{item.title}</div>
        {(i===0||expanded)&&item.desc&&<div style={{color:"#888",fontSize:11,lineHeight:1.5}}>{item.desc.substring(0,120)}...</div>}
      </div>
    ))}
    {items?.length>1&&<button onClick={()=>setExpanded(!expanded)} style={{fontSize:10,color,background:`${color}12`,border:`1px solid ${color}33`,borderRadius:20,padding:"3px 10px",cursor:"pointer",marginTop:4}}>
      {expanded?"▲ פחות":"▼ עוד "+( items.length-1)+" כותרות"}
    </button>}
  </div>);
}

function KnowledgeCard({topic,content,loading,error,onRefresh,textColor}) {
  const [translated,setTranslated]=useState(false);
  const [translatedContent,setTranslatedContent]=useState(null);
  const [translating,setTranslating]=useState(false);
  const c=translated&&translatedContent?translatedContent:content;

  const handleTranslate=async()=>{
    if(translated){setTranslated(false);return;}
    if(translatedContent){setTranslated(true);return;}
    setTranslating(true);
    try{const t=await translateToHebrew(content);setTranslatedContent(t);setTranslated(true);}catch{}
    setTranslating(false);
  };

  const tc=textColor||"#333";
  return(<Card color={topic.color} style={{height:"100%"}}>
    <TranslateBtn color={topic.color} onTranslate={handleTranslate} translated={translated}/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,paddingTop:2}}>
      <div style={{paddingTop:2}}>{loading?<div style={{width:8,height:8,borderRadius:"50%",border:`2px solid ${topic.color}44`,borderTopColor:topic.color,animation:"spin 1s linear infinite"}}/>:error?<div style={{width:8,height:8,borderRadius:"50%",background:"#FFCDD2"}}/>:content?<div style={{width:8,height:8,borderRadius:"50%",background:topic.color,boxShadow:`0 0 8px ${topic.color}`}}/>:<div style={{width:8,height:8,borderRadius:"50%",background:"#E0E0E0"}}/>}</div>
      <span style={{fontSize:28}}>{topic.icon}</span>
    </div>
    <div style={{color:topic.color,fontSize:12,fontWeight:700,marginBottom:10}}>{topic.label}</div>

    {loading&&!content&&<LoadingPulse color={topic.color}/>}
    {translating&&<div style={{color:"#bbb",fontSize:12,marginBottom:8}}>מתרגם...</div>}
    {error&&!content&&<div style={{color:"#EF9A9A",fontSize:12,marginBottom:8}}>Error loading</div>}

    {c&&(<div style={{direction:translated?"rtl":"ltr",textAlign:translated?"right":"left"}}>
      {c.type==="news_feed"?<NewsFeedInline items={c.all_items} source={c.source} color={topic.color} textColor={tc}/>:(<>
      {c.title&&<div style={{color:tc,fontSize:14,fontWeight:700,marginBottom:8,fontFamily:"serif",lineHeight:1.3}}>{c.emoji} {c.title}</div>}
      {c.type==="fact"&&<><p style={{color:tc,fontSize:13,lineHeight:1.7,marginBottom:8}}>{c.body}</p><div style={{background:`${topic.color}12`,borderRadius:10,padding:"8px 12px"}}><span style={{color:topic.color,fontSize:10,letterSpacing:"1px",fontFamily:"monospace"}}>✦ TAKEAWAY: </span><span style={{color:tc,fontSize:12}}>{c.takeaway}</span></div></>}
      {c.type==="insight"&&<><p style={{color:tc,fontSize:13,fontWeight:600,marginBottom:6,lineHeight:1.5}}>🔎 {c.finding}</p><p style={{color:tc,fontSize:13,lineHeight:1.7,marginBottom:8}}>{c.explanation}</p><div style={{background:`${topic.color}12`,borderRadius:10,padding:"8px 12px"}}><span style={{color:topic.color,fontSize:10,letterSpacing:"1px",fontFamily:"monospace"}}>🛠 APPLY: </span><span style={{color:tc,fontSize:12}}>{c.practical}</span></div></>}
      {c.type==="quote"&&<><blockquote style={{borderLeft:`3px solid ${topic.color}`,paddingLeft:12,fontFamily:"serif",fontSize:15,fontStyle:"italic",color:tc,lineHeight:1.6,marginBottom:8}}>"{c.quote}"<footer style={{fontSize:12,color:topic.color,fontStyle:"normal",marginTop:4}}>— {c.author}</footer></blockquote><p style={{color:"#888",fontSize:12,lineHeight:1.5,marginBottom:8}}>{c.context}</p><div style={{background:`${topic.color}12`,borderRadius:10,padding:"8px 12px"}}><span style={{color:topic.color,fontSize:10,letterSpacing:"1px",fontFamily:"monospace"}}>💡 TODAY: </span><span style={{color:tc,fontSize:12}}>{c.relevance}</span></div></>}
      </>)}
    </div>)}

    <button onClick={onRefresh} style={{marginTop:12,fontSize:10,color:topic.color,background:"transparent",border:`1px solid ${topic.color}33`,borderRadius:20,padding:"3px 10px",cursor:"pointer",fontFamily:"inherit"}}>↻ רענן</button>
  </Card>);
}

// ── SELF DEV CARD ─────────────────────────────────────────────────────────────
function SelfDevCard({content,loading,error,onRefresh,color,textColor}) {
  const [translated,setTranslated]=useState(false);
  const [translatedContent,setTranslatedContent]=useState(null);
  const [translating,setTranslating]=useState(false);
  const c=translated&&translatedContent?translatedContent:content;
  const tc=textColor||"#333";

  const handleTranslate=async()=>{
    if(translated){setTranslated(false);return;}
    if(translatedContent){setTranslated(true);return;}
    setTranslating(true);
    try{const t=await translateToHebrew(content);setTranslatedContent(t);setTranslated(true);}catch{}
    setTranslating(false);
  };

  return(<Card color={color}>
    <TranslateBtn color={color} onTranslate={handleTranslate} translated={translated}/>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingTop:4}}>
      <span style={{fontSize:28,animation:"float 4s ease-in-out infinite"}}>{c?.emoji||"🌟"}</span>
      <div>
        <div style={{color,fontSize:9,letterSpacing:"3px",fontFamily:"monospace"}}>✦ PERSONAL DEVELOPMENT</div>
        {c?.source&&<div style={{color:"#bbb",fontSize:10,marginTop:2}}>📚 {c.source}</div>}
      </div>
    </div>
    {loading&&<LoadingPulse color={color}/>}
    {translating&&<div style={{color:"#bbb",fontSize:12,marginBottom:8}}>מתרגם...</div>}
    {error&&<div style={{color:"#EF9A9A",fontSize:12}}>Error loading</div>}
    {c&&(<div style={{direction:translated?"rtl":"ltr",textAlign:translated?"right":"left"}}>
      {c.title&&<div style={{color:tc,fontSize:15,fontWeight:700,fontFamily:"serif",marginBottom:10}}>{c.title}</div>}
      {c.type==="fact"&&<><p style={{color:tc,fontSize:13,lineHeight:1.7,marginBottom:8}}>{c.body}</p><div style={{background:`${color}12`,borderRadius:10,padding:"8px 12px"}}><span style={{color,fontSize:10,letterSpacing:"1px",fontFamily:"monospace"}}>✦ APPLY: </span><span style={{color:tc,fontSize:12}}>{c.takeaway}</span></div></>}
      {c.type==="quote"&&<><blockquote style={{borderLeft:`3px solid ${color}`,paddingLeft:12,fontFamily:"serif",fontSize:16,fontStyle:"italic",color:tc,lineHeight:1.6,marginBottom:8}}>"{c.quote}"<footer style={{fontSize:12,color,fontStyle:"normal",marginTop:4}}>— {c.author}</footer></blockquote><div style={{background:`${color}12`,borderRadius:10,padding:"8px 12px"}}><span style={{color,fontSize:10,fontFamily:"monospace"}}>💡 RELEVANCE: </span><span style={{color:tc,fontSize:12}}>{c.relevance}</span></div></>}
      {c.type==="insight"&&<><p style={{color:tc,fontSize:13,fontWeight:600,marginBottom:6}}>🔎 {c.finding}</p><p style={{color:tc,fontSize:13,lineHeight:1.7,marginBottom:8}}>{c.explanation}</p><div style={{background:`${color}12`,borderRadius:10,padding:"8px 12px"}}><span style={{color,fontSize:10,fontFamily:"monospace"}}>🛠 TODAY: </span><span style={{color:tc,fontSize:12}}>{c.practical}</span></div></>}
    </div>)}
    <button onClick={onRefresh} style={{marginTop:12,fontSize:10,color,background:"transparent",border:`1px solid ${color}33`,borderRadius:20,padding:"3px 10px",cursor:"pointer"}}>↻ רענן</button>
  </Card>);
}

// ── ARABIC SECTION ────────────────────────────────────────────────────────────
function ArabicSection({theme}) {
  const color="#009688";
  const [word,setWord]=useState(null);const [loading,setLoading]=useState(true);
  const [bank,setBank]=useState(loadWordBank);
  const [quizMode,setQuizMode]=useState(false);
  const [quizWord,setQuizWord]=useState(null);
  const [quizInput,setQuizInput]=useState("");
  const [quizResult,setQuizResult]=useState(null);

  const loadWord=useCallback(()=>{setLoading(true);setWord(null);setQuizResult(null);fetchArabicWord().then(w=>{setWord(w);const b=loadWordBank();if(!b.find(x=>x.arabic===w.arabic)){const nb=[...b,w].slice(-50);setBank(nb);saveWordBank(nb);}}).catch(()=>setWord(null)).finally(()=>setLoading(false));},[]);
  useEffect(()=>{loadWord();},[]);

  const startQuiz=()=>{if(bank.length<2)return;const w=bank[Math.floor(Math.random()*bank.length)];setQuizWord(w);setQuizInput("");setQuizResult(null);setQuizMode(true);};
  const checkQuiz=()=>{if(!quizWord)return;const correct=quizInput.trim().toLowerCase()===quizWord.english.toLowerCase()||quizInput.trim()===quizWord.hebrew;setQuizResult(correct?"✅ נכון!":"❌ "+quizWord.english+" / "+quizWord.hebrew);};

  return(<Card color={color}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:24}}>🕌</span><div><div style={{color,fontSize:9,letterSpacing:"3px",fontFamily:"monospace"}}>✦ לימוד ערבית</div><div style={{color:"#bbb",fontSize:11,marginTop:2}}>{bank.length} מילים בבנק</div></div></div>
      <div style={{display:"flex",gap:8}}>
        {bank.length>=2&&<button onClick={startQuiz} style={{fontSize:11,color,background:`${color}15`,border:`1px solid ${color}33`,borderRadius:20,padding:"5px 12px",cursor:"pointer"}}>בוחן</button>}
        <button onClick={loadWord} style={{fontSize:11,color,background:`${color}15`,border:`1px solid ${color}33`,borderRadius:20,padding:"5px 12px",cursor:"pointer"}}>מילה חדשה</button>
      </div>
    </div>

    {!quizMode&&(<>
      {loading?<LoadingPulse color={color}/>:word?(<div style={{direction:"rtl"}}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:42,fontWeight:700,color,marginBottom:4,direction:"rtl"}}>{word.arabic}</div>
          <div style={{fontSize:18,color:"#555",marginBottom:2}}>{word.transliteration}</div>
          <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:8}}>
            <span style={{background:`${color}15`,color,padding:"4px 14px",borderRadius:20,fontSize:14,fontWeight:600}}>{word.hebrew}</span>
            <span style={{background:"#E3F2FD",color:"#1565C0",padding:"4px 14px",borderRadius:20,fontSize:13}}>{word.english}</span>
          </div>
        </div>
        <div style={{background:`${color}10`,borderRadius:14,padding:14,marginBottom:12}}>
          <div style={{color,fontSize:10,letterSpacing:"2px",marginBottom:6,fontFamily:"monospace"}}>✦ דוגמה</div>
          <div style={{textAlign:"center",direction:"rtl"}}>
            <div style={{fontSize:18,color:"#333",marginBottom:2}}>{word.example_arabic}</div>
            <div style={{color:"#888",fontSize:13}}>{word.example_transliteration}</div>
            <div style={{color:"#555",fontSize:13,fontStyle:"italic"}}>{word.example_translation}</div>
          </div>
        </div>
        {word.tip&&<div style={{background:"#FFF3E0",borderRadius:10,padding:"8px 12px",fontSize:12,color:"#E65100"}}>💡 {word.tip}</div>}
      </div>):<div style={{color:"#ccc",fontSize:13}}>Error loading</div>}
    </>)}

    {quizMode&&quizWord&&(<div style={{direction:"rtl"}}>
      <div style={{marginBottom:16}}>
        <div style={{color,fontSize:10,letterSpacing:"2px",marginBottom:8,fontFamily:"monospace"}}>✦ בוחן — מה המשמעות?</div>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:44,fontWeight:700,color,marginBottom:4}}>{quizWord.arabic}</div>
          <div style={{fontSize:16,color:"#888"}}>{quizWord.transliteration}</div>
        </div>
        <input value={quizInput} onChange={e=>setQuizInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&checkQuiz()} placeholder="כתבי בעברית או אנגלית..." style={{width:"100%",padding:"10px 14px",borderRadius:12,border:`2px solid ${color}33`,fontSize:14,fontFamily:"inherit",outline:"none",marginBottom:8,direction:"rtl"}}/>
        <div style={{display:"flex",gap:8}}>
          <button onClick={checkQuiz} style={{flex:1,padding:"10px",background:`linear-gradient(135deg,${color},${color}bb)`,color:"white",border:"none",borderRadius:12,cursor:"pointer",fontSize:14,fontWeight:600}}>בדיקה</button>
          <button onClick={()=>setQuizMode(false)} style={{padding:"10px 16px",background:"white",color:"#aaa",border:"1px solid #eee",borderRadius:12,cursor:"pointer",fontSize:13}}>חזרה</button>
        </div>
        {quizResult&&<div style={{marginTop:12,padding:"10px 14px",borderRadius:12,background:quizResult.startsWith("✅")?"#E8F5E9":"#FFEBEE",color:quizResult.startsWith("✅")?"#2E7D32":"#C62828",fontSize:14,fontWeight:600,textAlign:"center"}}>{quizResult}</div>}
      </div>
    </div>)}
  </Card>);
}

// ── GRAMMAR SECTION ───────────────────────────────────────────────────────────
function GrammarSection({theme}) {
  const color="#1565C0";
  const [q,setQ]=useState(null);const [loading,setLoading]=useState(true);
  const [selected,setSelected]=useState(null);const [revealed,setRevealed]=useState(false);
  const load=useCallback(()=>{setLoading(true);setQ(null);setSelected(null);setRevealed(false);fetchGrammarQuestion().then(setQ).catch(()=>setQ(null)).finally(()=>setLoading(false));},[]);
  useEffect(()=>{load();},[]);
  const choose=(i)=>{if(revealed)return;setSelected(i);setRevealed(true);};
  return(<Card color={color}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:24}}>📝</span><div><div style={{color,fontSize:9,letterSpacing:"3px",fontFamily:"monospace"}}>✦ גרמר אנגלית</div>{q&&<div style={{color:"#bbb",fontSize:11,marginTop:2}}>{q.topic}</div>}</div></div>
      {!loading&&<button onClick={load} style={{fontSize:11,color,background:`${color}15`,border:`1px solid ${color}33`,borderRadius:20,padding:"5px 12px",cursor:"pointer"}}>שאלה חדשה</button>}
    </div>
    {loading?<LoadingPulse color={color}/>:q?(<div style={{direction:"ltr"}}>
      <div style={{color:"#555",fontSize:11,letterSpacing:"1px",fontFamily:"monospace",marginBottom:6}}>{q.instruction}</div>
      {q.sentence&&<div style={{background:"#E3F2FD",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:15,color:"#1565C0",fontFamily:"serif",fontStyle:"italic"}}>{q.sentence}</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        {q.options?.map((opt,i)=>{const isC=i===q.correct,isSel=i===selected;let bg="#fafafa",brd="#eee",col="#555";if(revealed&&isC){bg="#E8F5E9";brd="#4CAF50";col="#2E7D32";}else if(revealed&&isSel&&!isC){bg="#FFEBEE";brd="#EF5350";col="#C62828";}return(<button key={i} onClick={()=>choose(i)} style={{background:bg,border:`2px solid ${brd}`,borderRadius:12,padding:"10px 12px",cursor:revealed?"default":"pointer",textAlign:"left",color:col,fontSize:12,lineHeight:1.4,fontFamily:"inherit",transition:"all .2s"}} onMouseEnter={e=>{if(!revealed)e.currentTarget.style.background=`${color}10`;}} onMouseLeave={e=>{if(!revealed)e.currentTarget.style.background=bg;}}>{opt}</button>);})}
      </div>
      {revealed&&(<div style={{background:`${color}10`,border:`1px solid ${color}25`,borderRadius:12,padding:14}}>
        <div style={{color,fontSize:10,letterSpacing:"2px",marginBottom:6,fontFamily:"monospace"}}>📚 THE RULE</div>
        <div style={{color:"#333",fontSize:13,lineHeight:1.6,marginBottom:8}}>{q.rule}</div>
        {q.example&&<div style={{color:"#555",fontSize:12,fontStyle:"italic",borderLeft:`3px solid ${color}`,paddingLeft:10,marginBottom:6}}>✓ {q.example}</div>}
        {q.common_mistake&&<div style={{color:"#E57373",fontSize:12,borderLeft:`3px solid #E57373`,paddingLeft:10}}>✗ Common mistake: {q.common_mistake}</div>}
      </div>)}
    </div>):<div style={{color:"#ccc",fontSize:13}}>Error loading</div>}
  </Card>);
}

// ── OTHER SECTIONS ────────────────────────────────────────────────────────────
function SocialSection({accent,textColor}) {
  const [checks,setChecks]=useState(loadChecks);
  const max=3;const msgs=["✨ No social media today — amazing!","🌟 One scroll. You noticed — that's the key.","🌈 Two times. The feed is here instead.","💙 Three. Breathe. How did that feel?"];
  const add=()=>{if(checks>=max)return;const n=checks+1;setChecks(n);saveChecks(n);};
  const remove=()=>{if(checks<=0)return;const n=checks-1;setChecks(n);saveChecks(n);};
  return(<Card color={accent}><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}><span style={{fontSize:26}}>🧘</span><div><div style={{color:accent,fontSize:9,letterSpacing:"3px",fontFamily:"monospace"}}>✦ בריאות דיגיטלית</div><div style={{color:textColor||"#333",fontSize:15,fontFamily:"serif",fontWeight:700}}>הפיד שלך — לא שלהם</div></div></div><p style={{color:"#aaa",fontSize:12,lineHeight:1.7,marginBottom:18}}>כל כניסה לכאן במקום לרשתות — ניצחון.</p><div style={{marginBottom:16}}><div style={{color:"#ccc",fontSize:11,marginBottom:12}}>כמה פעמים גללתי ברשתות היום?</div><div style={{display:"flex",gap:12,alignItems:"center"}}>{Array.from({length:max},(_,i)=><button key={i} onClick={add} style={{width:52,height:52,borderRadius:"50%",background:i<checks?`linear-gradient(135deg,${accent},${accent}bb)`:"#f8f8f8",border:`2px solid ${i<checks?accent:"#eee"}`,fontSize:22,cursor:"pointer",transition:"all .3s cubic-bezier(0.34,1.56,.64,1)",transform:i<checks?"scale(1.1)":"scale(1)",boxShadow:i<checks?`0 4px 16px ${accent}44`:"none",color:i<checks?"white":"#ddd"}}>{i<checks?"✓":"○"}</button>)}{checks>0&&<button onClick={remove} style={{fontSize:11,color:"#ccc",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Undo</button>}</div></div><div style={{background:`${accent}10`,border:`1px solid ${accent}25`,borderRadius:14,padding:"12px 16px"}}><div style={{color:accent,fontSize:14,fontWeight:500}}>{msgs[checks]}</div></div></Card>);
}

function InspirationBanner({theme}) {
  const [tip,setTip]=useState(null);const [loading,setLoading]=useState(true);
  const load=useCallback(()=>{setLoading(true);setTip(null);fetchInspirationTip().then(setTip).catch(()=>setTip(null)).finally(()=>setLoading(false));},[]);
  useEffect(()=>{load();},[]);
  return(<div onClick={!loading?load:undefined} style={{background:"white",border:`2px solid ${theme.secondary}33`,borderRadius:20,padding:"20px 22px",cursor:loading?"default":"pointer",marginBottom:28,boxShadow:`0 8px 28px ${theme.secondary}15`,position:"relative",overflow:"hidden",transition:"all .3s"}} onMouseEnter={e=>{if(!loading)e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${theme.accent},${theme.secondary},${theme.tertiary})`}}/>
    {loading?<LoadingPulse color={theme.secondary}/>:tip?<div style={{paddingTop:4,direction:"ltr"}}><div style={{display:"flex",alignItems:"flex-start",gap:14}}><span style={{fontSize:30,lineHeight:1,animation:"float 3s ease-in-out infinite"}}>{tip.emoji}</span><div style={{flex:1}}><div style={{color:theme.secondary,fontSize:9,letterSpacing:"2.5px",fontFamily:"monospace",marginBottom:8}}>{tip.type} · tap to refresh ✨</div><div style={{color:theme.text,fontSize:16,fontFamily:"serif",lineHeight:1.65,fontStyle:"italic"}}>"{tip.text}"</div>{tip.author&&tip.author!=="null"&&<div style={{color:"#bbb",fontSize:12,marginTop:8}}>— {tip.author}</div>}</div></div></div>:<div style={{color:"#ccc",fontSize:13,textAlign:"center",paddingTop:4}}>Tap for inspiration ✨</div>}
  </div>);
}

function TriviaSection({theme}) {
  const [trivia,setTrivia]=useState(null);const [loading,setLoading]=useState(true);const [selected,setSelected]=useState(null);const [revealed,setRevealed]=useState(false);
  const load=useCallback(()=>{setLoading(true);setTrivia(null);setSelected(null);setRevealed(false);fetchTrivia().then(setTrivia).catch(()=>setTrivia(null)).finally(()=>setLoading(false));},[]);
  useEffect(()=>{load();},[]);
  const choose=(i)=>{if(revealed)return;setSelected(i);setRevealed(true);};
  return(<Card color={theme.accent}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:24}}>🎯</span><div><div style={{color:theme.accent,fontSize:9,letterSpacing:"3px",fontFamily:"monospace"}}>✦ טריוויה יומית</div>{trivia&&<div style={{color:"#bbb",fontSize:11,marginTop:2}}>{trivia.topic}</div>}</div></div>{!loading&&<button onClick={load} style={{fontSize:11,color:theme.accent,background:`${theme.accent}15`,border:`1px solid ${theme.accent}44`,borderRadius:20,padding:"5px 12px",cursor:"pointer"}}>New ✨</button>}</div>{loading?<LoadingPulse color={theme.accent}/>:trivia?(<div style={{direction:"ltr"}}><div style={{color:theme.text,fontSize:15,fontFamily:"serif",lineHeight:1.5,marginBottom:20,fontWeight:600}}>{trivia.emoji} {trivia.question}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>{trivia.options?.map((opt,i)=>{const isC=i===trivia.correct,isSel=i===selected;let bg="#fafafa",brd="#eee",col="#555";if(revealed&&isC){bg=`${theme.tertiary}15`;brd=theme.tertiary;col=theme.tertiary;}else if(revealed&&isSel&&!isC){bg="#FFF0F0";brd="#E57373";col="#E57373";}return(<button key={i} onClick={()=>choose(i)} style={{background:bg,border:`2px solid ${brd}`,borderRadius:14,padding:"12px 14px",cursor:revealed?"default":"pointer",textAlign:"left",color:col,fontSize:13,lineHeight:1.4,fontFamily:"inherit"}} onMouseEnter={e=>{if(!revealed)e.currentTarget.style.background=`${theme.accent}10`;}} onMouseLeave={e=>{if(!revealed)e.currentTarget.style.background=bg;}}>{opt}</button>);})}</div>{revealed&&trivia.explanation&&<div style={{background:`${theme.accent}10`,border:`1px solid ${theme.accent}25`,borderRadius:14,padding:14}}><div style={{color:theme.accent,fontSize:10,letterSpacing:"2px",marginBottom:6,fontFamily:"monospace"}}>💡 EXPLANATION</div><div style={{color:theme.text,fontSize:13,lineHeight:1.6}}>{trivia.explanation}</div></div>}</div>):<div style={{color:"#ccc",fontSize:13}}>Error</div>}</Card>);
}

function DailyTaskSection({theme}) {
  const color="#E91E63";
  const [task,setTask]=useState(null);const [loading,setLoading]=useState(true);const [done,setDone]=useState(false);
  const load=useCallback(()=>{setLoading(true);setTask(null);setDone(false);fetchDailyTask().then(setTask).catch(()=>setTask(null)).finally(()=>setLoading(false));},[]);
  useEffect(()=>{load();},[]);
  return(<Card color={color}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:24}}>⚡</span><div><div style={{color,fontSize:9,letterSpacing:"3px",fontFamily:"monospace"}}>✦ משימה שדוחים</div>{task&&<div style={{color:"#bbb",fontSize:11,marginTop:2}}>{task.category}</div>}</div></div>{!loading&&<button onClick={load} style={{fontSize:11,color,background:`${color}12`,border:`1px solid ${color}33`,borderRadius:20,padding:"5px 12px",cursor:"pointer"}}>Another</button>}</div>{loading?<LoadingPulse color={color}/>:task?(<div style={{direction:"ltr"}}><div style={{display:"flex",gap:12,marginBottom:14}}><span style={{fontSize:28}}>{task.emoji}</span><div><div style={{color:theme.text,fontSize:15,fontFamily:"serif",fontWeight:700}}>{task.task}</div><div style={{color:"#aaa",fontSize:11,marginTop:2}}>{task.time}</div></div></div><div style={{background:`${color}10`,borderRadius:12,padding:12,marginBottom:10}}><div style={{color,fontSize:10,fontFamily:"monospace",marginBottom:4}}>🎯 WHY</div><div style={{color:theme.text,fontSize:13,lineHeight:1.6}}>{task.why}</div></div><div style={{background:"#F3E5F5",borderRadius:12,padding:12,marginBottom:14}}><div style={{color:"#9C27B0",fontSize:10,fontFamily:"monospace",marginBottom:4}}>▶ DO NOW</div><div style={{color:theme.text,fontSize:13,lineHeight:1.6}}>{task.how}</div></div><button onClick={()=>setDone(!done)} style={{width:"100%",padding:"11px",background:done?`linear-gradient(135deg,${color},${color}bb)`:"white",border:`2px solid ${color}`,color:done?"white":color,borderRadius:12,cursor:"pointer",fontSize:13,fontFamily:"serif",fontWeight:600,transition:"all .3s"}}>{done?"✓ Done! 🎉":"Mark as done"}</button></div>):<div style={{color:"#ccc",fontSize:13}}>Error</div>}</Card>);
}

function HistorySection({theme}) {
  const color="#795548";
  const [event,setEvent]=useState(null);const [loading,setLoading]=useState(true);
  const [translated,setTranslated]=useState(false);const [translatedContent,setTranslatedContent]=useState(null);const [translating,setTranslating]=useState(false);
  const load=useCallback(()=>{setLoading(true);setEvent(null);setTranslated(false);setTranslatedContent(null);fetchTodayInHistory().then(setEvent).catch(()=>setEvent(null)).finally(()=>setLoading(false));},[]);
  useEffect(()=>{load();},[]);
  const c=translated&&translatedContent?translatedContent:event;
  const handleTranslate=async()=>{if(translated){setTranslated(false);return;}if(translatedContent){setTranslated(true);return;}setTranslating(true);try{const t=await translateToHebrew(event);setTranslatedContent(t);setTranslated(true);}catch{}setTranslating(false);};
  return(<Card color={color}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:24}}>📅</span><div><div style={{color,fontSize:9,letterSpacing:"3px",fontFamily:"monospace"}}>✦ היום בהיסטוריה</div>{event&&<div style={{color:"#bbb",fontSize:11,marginTop:2}}>{new Date().toLocaleDateString("en",{month:"long",day:"numeric"})}</div>}</div></div><div style={{display:"flex",gap:6}}>{event&&<button onClick={handleTranslate} style={{fontSize:10,color:translated?"#2E7D32":color,background:translated?"#E8F5E9":color+"15",border:`1px solid ${color}33`,borderRadius:20,padding:"4px 10px",cursor:"pointer"}}>{translating?"...":translated?"✓ עב":"🇮🇱 תרגם"}</button>}<button onClick={load} style={{fontSize:10,color,background:`${color}15`,border:`1px solid ${color}33`,borderRadius:20,padding:"4px 10px",cursor:"pointer"}}>אחר</button></div></div>{loading?<LoadingPulse color={color}/>:c?(<div style={{direction:translated?"rtl":"ltr",textAlign:translated?"right":"left"}}><div style={{display:"flex",gap:10,marginBottom:12}}><span style={{fontSize:28}}>{c.emoji}</span><div><div style={{color:"#aaa",fontSize:10,fontFamily:"monospace"}}>{c.year}</div><div style={{color:theme.text,fontSize:15,fontFamily:"serif",fontWeight:700}}>{c.title}</div></div></div><p style={{color:theme.text,fontSize:13,lineHeight:1.8,marginBottom:12}}>{c.story}</p><div style={{background:`${color}10`,borderRadius:12,padding:12}}><span style={{color,fontSize:10,fontFamily:"monospace"}}>💡 LESSON: </span><span style={{color:theme.text,fontSize:12}}>{c.insight}</span></div></div>):<div style={{color:"#ccc",fontSize:13}}>Error</div>}</Card>);
}

function StyleSection({theme}) {
  const color="#E91E8C";
  const [style,setStyle]=useState(null);const [loading,setLoading]=useState(true);
  const load=useCallback(()=>{setLoading(true);setStyle(null);fetchStyleTip().then(setStyle).catch(()=>setStyle(null)).finally(()=>setLoading(false));},[]);
  useEffect(()=>{load();},[]);
  return(<Card color={color}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:24}}>👗</span><div><div style={{color,fontSize:9,letterSpacing:"3px",fontFamily:"monospace"}}>✦ סטייל יומי</div>{style&&<div style={{color:"#bbb",fontSize:11,marginTop:2}}>{style.occasion} — {style.tip_type}</div>}</div></div>{!loading&&<button onClick={load} style={{fontSize:11,color,background:`${color}12`,border:`1px solid ${color}33`,borderRadius:20,padding:"5px 12px",cursor:"pointer"}}>טיפ חדש</button>}</div>{loading?<LoadingPulse color={color}/>:style?(<div style={{direction:"rtl",textAlign:"right"}}><div style={{background:`${color}10`,borderRadius:12,padding:12,marginBottom:12}}><div style={{color,fontSize:10,fontFamily:"monospace",marginBottom:4}}>✨ הטיפ המרכזי</div><div style={{color:theme.text,fontSize:14,fontFamily:"serif",fontWeight:600}}>{style.main_tip}</div></div><div style={{marginBottom:12}}><div style={{color:"#aaa",fontSize:10,fontFamily:"monospace",marginBottom:4}}>👚 תלבושת מומלצת</div><div style={{color:theme.text,fontSize:13,lineHeight:1.6}}>{style.outfit}</div></div>{style.colors&&<div style={{background:"#F3E5F5",borderRadius:12,padding:12,marginBottom:10}}><div style={{color:"#9C27B0",fontSize:10,fontFamily:"monospace",marginBottom:4}}>🎨 קומבינציית צבעים</div><div style={{color:theme.text,fontSize:13,lineHeight:1.6}}>{style.colors}</div></div>}<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}><div style={{background:"#E8F5E9",borderRadius:10,padding:10}}><div style={{color:"#4CAF50",fontSize:9,fontFamily:"monospace",marginBottom:3}}>✓ למה עובד לך</div><div style={{color:"#333",fontSize:12}}>{style.why}</div></div><div style={{background:"#FFF3E0",borderRadius:10,padding:10}}><div style={{color:"#FF9800",fontSize:9,fontFamily:"monospace",marginBottom:3}}>✗ להימנע מ</div><div style={{color:"#333",fontSize:12}}>{style.avoid}</div></div></div><div style={{background:`${color}08`,borderRadius:10,padding:10}}><span style={{color,fontSize:9,fontFamily:"monospace"}}>💎 אקססורי: </span><span style={{color:theme.text,fontSize:12}}>{style.accessory}</span></div></div>):<div style={{color:"#ccc",fontSize:13}}>Error</div>}</Card>);
}

function WeatherSection({theme}) {
  const color="#0288D1";
  const [weather,setWeather]=useState(null);const [loading,setLoading]=useState(true);const [error,setError]=useState(false);
  useEffect(()=>{fetchWeatherAndOutfit().then(setWeather).catch(()=>setError(true)).finally(()=>setLoading(false));},[]);
  return(<Card color={color}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><span style={{fontSize:24}}>🌡️</span><div><div style={{color,fontSize:9,letterSpacing:"3px",fontFamily:"monospace"}}>✦ מזג אוויר + לבוש</div><div style={{color:"#bbb",fontSize:11,marginTop:2}}>עין איילה / זכרון יעקב</div></div></div>{loading?<LoadingPulse color={color}/>:error?<div style={{color:"#ccc",fontSize:13}}>Could not load weather</div>:weather?(<div style={{direction:"ltr"}}><div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14,background:`${color}10`,borderRadius:12,padding:12}}><span style={{fontSize:40}}>{weather.emoji}</span><div><div style={{color:theme.text,fontSize:26,fontWeight:700}}>{weather.temp}°C</div><div style={{color:"#aaa",fontSize:12}}>{weather.desc} · feels {weather.feels}°C · wind {weather.wind}km/h</div></div></div><div style={{marginBottom:10}}><div style={{color:"#aaa",fontSize:9,fontFamily:"monospace",marginBottom:4}}>👚 OUTFIT</div><div style={{color:theme.text,fontSize:13,lineHeight:1.6}}>{weather.outfit}</div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}><div style={{background:"#E3F2FD",borderRadius:10,padding:10}}><div style={{color,fontSize:9,fontFamily:"monospace",marginBottom:3}}>LAYERS</div><div style={{color:"#333",fontSize:12}}>{weather.layers}</div></div><div style={{background:"#E3F2FD",borderRadius:10,padding:10}}><div style={{color,fontSize:9,fontFamily:"monospace",marginBottom:3}}>SHOES</div><div style={{color:"#333",fontSize:12}}>{weather.shoes}</div></div></div><div style={{background:`${color}08`,borderRadius:10,padding:10}}><span style={{color,fontSize:9,fontFamily:"monospace"}}>💡 TIP: </span><span style={{color:theme.text,fontSize:12}}>{weather.tip}</span></div></div>):<div style={{color:"#ccc",fontSize:13}}>Error</div>}</Card>);
}

function FamousQuoteSection({theme}) {
  const color="#F57F17";
  const [quote,setQuote]=useState(null);const [loading,setLoading]=useState(true);
  const load=useCallback(()=>{setLoading(true);setQuote(null);fetchFamousQuote().then(setQuote).catch(()=>setQuote(null)).finally(()=>setLoading(false));},[]);
  useEffect(()=>{load();},[]);
  return(<Card color={color}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:24}}>💬</span><div><div style={{color,fontSize:9,letterSpacing:"3px",fontFamily:"monospace"}}>✦ ציטוט מפורסם</div>{quote&&<div style={{color:"#bbb",fontSize:11,marginTop:2}}>{quote.category}</div>}</div></div>{!loading&&<button onClick={load} style={{fontSize:11,color,background:`${color}15`,border:`1px solid ${color}44`,borderRadius:20,padding:"5px 12px",cursor:"pointer"}}>New quote</button>}</div>{loading?<LoadingPulse color={color}/>:quote?(<div style={{direction:"ltr"}}><div style={{borderLeft:`4px solid ${color}`,paddingLeft:14,marginBottom:14}}><div style={{fontFamily:"serif",fontSize:17,fontStyle:"italic",color:theme.text,lineHeight:1.65}}>"{quote.quote}"</div><div style={{fontSize:13,color:color,marginTop:6,fontWeight:600}}>— {quote.author}</div><div style={{color:"#aaa",fontSize:11}}>{quote.profession}</div></div><div style={{background:`${color}10`,borderRadius:12,padding:12}}><span style={{color,fontSize:9,fontFamily:"monospace"}}>💡 TODAY: </span><span style={{color:theme.text,fontSize:13}}>{quote.relevance}</span></div></div>):<div style={{color:"#ccc",fontSize:13}}>Error</div>}</Card>);
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tod]=useState(getTimeOfDay);
  const theme=TIME_THEMES[tod];
  const [knowledge,setKnowledge]=useState(()=>loadCache());
  const [topicErrors,setTopicErrors]=useState({});
  const [loadingTopics,setLoadingTopics]=useState(new Set(KNOWLEDGE_TOPICS.map(t=>t.id)));
  const [selfDev,setSelfDev]=useState(null);const [selfDevLoading,setSelfDevLoading]=useState(true);const [selfDevError,setSelfDevError]=useState(false);
  const [menu,setMenu]=useState(null);const [menuLoading,setMenuLoading]=useState(true);
  const [recipeMeal,setRecipeMeal]=useState(null);
  const startedRef=useRef(false);

  const loadTopic=useCallback(async(topic)=>{setLoadingTopics(p=>new Set([...p,topic.id]));setTopicErrors(p=>({...p,[topic.id]:false}));try{const c=await fetchKnowledge(topic);setKnowledge(p=>({...p,[topic.id]:c}));saveCache(topic.id,c);}catch(e){console.error(topic.id,e);setTopicErrors(p=>({...p,[topic.id]:true}));}setLoadingTopics(p=>{const n=new Set(p);n.delete(topic.id);return n;});},[]);
  const refreshTopic=useCallback((topic)=>{setKnowledge(p=>({...p,[topic.id]:null}));loadTopic(topic);},[loadTopic]);
  const refreshSelfDev=useCallback(()=>{setSelfDevLoading(true);setSelfDev(null);setSelfDevError(false);fetchSelfDev().then(setSelfDev).catch(()=>setSelfDevError(true)).finally(()=>setSelfDevLoading(false));},[]);

  useEffect(()=>{injectPWA();if(startedRef.current)return;startedRef.current=true;KNOWLEDGE_TOPICS.forEach(loadTopic);fetchSelfDev().then(setSelfDev).catch(()=>setSelfDevError(true)).finally(()=>setSelfDevLoading(false));fetchDailyMenu().then(setMenu).catch(console.error).finally(()=>setMenuLoading(false));},[]);

  const readyCount=KNOWLEDGE_TOPICS.length-loadingTopics.size;
  const MEAL_ICONS={breakfast:"🌅",lunch:"☀️",dinner:"🌙",snack:"🍎"};
  const MEAL_NAMES={breakfast:"Breakfast",lunch:"Lunch",dinner:"Dinner",snack:"Snack"};

  return(<div style={{minHeight:"100vh",background:theme.gradient,color:theme.text,fontFamily:"Georgia, serif",direction:"rtl",position:"relative",overflowX:"hidden"}}>
    <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:6px;background:#f0f0f0}::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}@keyframes mIn{from{opacity:0;transform:scale(.92) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}input:focus{outline:none;border-color:currentColor!important;}`}</style>
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>{Array.from({length:12},(_,i)=>{const colors=theme.sparkles;const s=Math.random()*14+7;return<div key={i} style={{position:"absolute",left:`${Math.random()*100}%`,top:`${Math.random()*100}%`,fontSize:s,opacity:0.18,animation:`float ${Math.random()*4+3}s ${Math.random()*6}s infinite alternate ease-in-out`,color:colors[i%colors.length]}}>✦</div>;})}
    </div>

    <div style={{position:"relative",zIndex:1,maxWidth:840,margin:"0 auto",padding:"32px 20px 80px"}}>

      {/* HEADER */}
      <div style={{textAlign:"center",marginBottom:32,animation:"fadeUp .6s both"}}>
        <div style={{fontSize:42,marginBottom:10,animation:"float 4s ease-in-out infinite"}}>{theme.particle}</div>
        <div style={{fontSize:10,color:theme.subtext,letterSpacing:"4px",marginBottom:10,fontFamily:"monospace"}}>{theme.greeting} · {new Date().toLocaleDateString("en",{weekday:"long",month:"long",day:"numeric"})}</div>
        <h1 style={{fontFamily:"serif",fontSize:"clamp(36px,7vw,60px)",background:`linear-gradient(135deg,${theme.accent},${theme.secondary},${theme.tertiary})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1.1,marginBottom:10}}>הפיד של מיכ ✨</h1>
        <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:14}}>{KNOWLEDGE_TOPICS.map(t=><div key={t.id} style={{width:9,height:9,borderRadius:"50%",background:knowledge[t.id]?t.color:topicErrors[t.id]?"#FFCDD2":loadingTopics.has(t.id)?"#E0E0E0":"#F5F5F5",boxShadow:knowledge[t.id]?`0 0 8px ${t.color}88`:"none",transition:"all .4s"}}/>)}</div>
        {readyCount<KNOWLEDGE_TOPICS.length&&<div style={{color:"#ccc",fontSize:10,marginTop:8,fontFamily:"monospace"}}>Loading {readyCount}/{KNOWLEDGE_TOPICS.length}... ✨</div>}
      </div>

      <InspirationBanner theme={theme}/>

      {/* Weather + Social */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:14,marginBottom:28}}>
        <div><SectionLabel color={theme.subtext} text="מזג אוויר + לבוש"/><WeatherSection theme={theme}/></div>
        <div><SectionLabel color={theme.subtext} text="בריאות דיגיטלית"/><SocialSection accent={theme.accent} textColor={theme.text}/></div>
      </div>

      {/* Quote */}
      <div style={{marginBottom:28}}><SectionLabel color={theme.subtext} text="ציטוט מפורסם"/><FamousQuoteSection theme={theme}/></div>

      {/* History + Style */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:14,marginBottom:28}}>
        <div><SectionLabel color={theme.subtext} text="היום בהיסטוריה"/><HistorySection theme={theme}/></div>
        <div><SectionLabel color={theme.subtext} text="סטייל יומי"/><StyleSection theme={theme}/></div>
      </div>

      {/* Task */}
      <div style={{marginBottom:28}}><SectionLabel color={theme.subtext} text="משימה שדוחים"/><DailyTaskSection theme={theme}/></div>

      {/* Arabic + Grammar */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:14,marginBottom:28}}>
        <div><SectionLabel color={theme.subtext} text="לימוד ערבית 🕌"/><ArabicSection theme={theme}/></div>
        <div><SectionLabel color={theme.subtext} text="גרמר אנגלית 📝"/><GrammarSection theme={theme}/></div>
      </div>

      {/* Knowledge Grid */}
      <div style={{marginBottom:28}}>
        <SectionLabel color={theme.subtext} text="ידע יומי"/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
          {KNOWLEDGE_TOPICS.map((topic,i)=>(
            <div key={topic.id} style={{animation:`fadeUp .5s ${0.2+i*0.06}s both`}}>
              <KnowledgeCard topic={topic} content={knowledge[topic.id]} loading={loadingTopics.has(topic.id)} error={topicErrors[topic.id]} onRefresh={()=>refreshTopic(topic)} textColor={theme.text}/>
            </div>
          ))}
        </div>
      </div>

      {/* Self Dev */}
      <div style={{marginBottom:28}}>
        <SectionLabel color={theme.subtext} text="פיתוח אישי"/>
        <SelfDevCard content={selfDev} loading={selfDevLoading} error={selfDevError} onRefresh={refreshSelfDev} color={theme.tertiary} textColor={theme.text}/>
      </div>

      {/* Trivia */}
      <div style={{marginBottom:28}}><SectionLabel color={theme.subtext} text="טריוויה יומית"/><TriviaSection theme={theme}/></div>

      {/* Menu */}
      <div>
        <SectionLabel color={theme.subtext} text="תפריט יומי צמחוני"/>
        <div style={{background:menu?`linear-gradient(145deg,${theme.accent}15,${theme.accent}05)`:"white",border:`2px solid ${theme.accent}33`,borderRadius:22,padding:24,boxShadow:`0 6px 20px ${theme.accent}18`,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${theme.accent},${theme.secondary},${theme.tertiary})`}}/>
          {menuLoading?<div style={{display:"flex",alignItems:"center",gap:12,paddingTop:4}}><div style={{fontSize:24,animation:"float 1s ease-in-out infinite"}}>🥗</div><span style={{color:"#ccc",fontSize:13}}>Loading menu...</span></div>
          :menu?(<div style={{paddingTop:4}}><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}><span style={{fontSize:28}}>{menu.emoji}</span><div><div style={{color:"#ccc",fontSize:9,letterSpacing:"2px",fontFamily:"monospace"}}>TODAY'S THEME</div><div style={{color:theme.text,fontSize:15,fontFamily:"serif",fontWeight:700,direction:"ltr"}}>{menu.theme}</div></div></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:12,marginBottom:16}}>{["breakfast","lunch","dinner","snack"].map(m=>menu[m]&&<div key={m} style={{background:`linear-gradient(145deg,${theme.accent}12,${theme.secondary}08)`,border:`1px solid ${theme.accent}33`,borderRadius:16,padding:"14px 12px"}}><div style={{color:"#ccc",fontSize:9,letterSpacing:"2px",marginBottom:6,fontFamily:"monospace"}}>{MEAL_ICONS[m]} {MEAL_NAMES[m]}</div><div style={{color:theme.text,fontSize:13,fontWeight:700,marginBottom:4,lineHeight:1.3,direction:"ltr"}}>{menu[m].name}</div><div style={{color:"#bbb",fontSize:11,lineHeight:1.4,marginBottom:10,direction:"ltr"}}>{menu[m].description}</div><button onClick={()=>setRecipeMeal(menu[m])} style={{fontSize:10,color:theme.accent,background:`${theme.accent}12`,border:`1px solid ${theme.accent}33`,borderRadius:20,padding:"4px 12px",cursor:"pointer"}}>Recipe ✨</button></div>)}</div>
          {menu.tip&&<div style={{background:`${theme.accent}08`,border:`1px solid ${theme.accent}20`,borderRadius:14,padding:"12px 16px",color:"#aaa",fontSize:12,direction:"ltr"}}>💡 {menu.tip}</div>}</div>)
          :<div style={{color:"#ccc",fontSize:13,paddingTop:4}}>Error — refresh page</div>}
        </div>
      </div>
    </div>

    {/* Recipe Modal */}
    {recipeMeal&&(<div onClick={()=>setRecipeMeal(null)} style={{position:"fixed",inset:0,background:"rgba(100,80,150,0.25)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:16,backdropFilter:"blur(12px)"}}><div onClick={e=>e.stopPropagation()} style={{background:"white",border:`2px solid ${theme.accent}44`,borderRadius:28,padding:36,maxWidth:520,width:"100%",maxHeight:"90vh",overflowY:"auto",direction:"ltr",position:"relative",boxShadow:`0 20px 60px ${theme.accent}25`,animation:"mIn .35s cubic-bezier(0.34,1.56,.64,1)"}}><div style={{position:"absolute",top:0,left:0,right:0,height:4,borderRadius:"28px 28px 0 0",background:`linear-gradient(90deg,${theme.accent},${theme.secondary})`}}/><button onClick={()=>setRecipeMeal(null)} style={{position:"absolute",top:18,right:18,background:`${theme.accent}15`,border:`1px solid ${theme.accent}33`,color:theme.accent,borderRadius:"50%",width:34,height:34,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold"}}>×</button><RecipeContent meal={recipeMeal} color={theme.accent} textColor={theme.text}/></div></div>)}
  </div>);
}

function RecipeContent({meal,color,textColor}) {
  const [detail,setDetail]=useState(null);const [loading,setLoading]=useState(true);const [error,setError]=useState(false);
  useEffect(()=>{fetchMenuDetail(meal.name,meal.description).then(setDetail).catch(()=>setError(true)).finally(()=>setLoading(false));},[]);
  const tc=textColor||"#333";
  return(<div style={{paddingTop:4}}><h2 style={{color:tc,fontSize:22,fontFamily:"serif",marginBottom:6}}>{meal.name}</h2><p style={{color:"#aaa",fontSize:13,marginBottom:24}}>{meal.description}</p>{loading&&<div style={{textAlign:"center",padding:"40px 0"}}><div style={{fontSize:32,animation:"float 1s ease-in-out infinite"}}>🍳</div></div>}{error&&<div style={{textAlign:"center",color:"#aaa"}}>Error loading recipe</div>}{detail&&(<><div style={{display:"flex",gap:10,marginBottom:20}}><span style={{background:`${color}15`,color,fontSize:11,padding:"4px 12px",borderRadius:20}}>⏱ {detail.time}</span><span style={{background:`${color}15`,color,fontSize:11,padding:"4px 12px",borderRadius:20}}>📊 {detail.difficulty}</span></div><div style={{marginBottom:20}}><div style={{color,fontSize:10,letterSpacing:"2px",marginBottom:10,fontFamily:"monospace"}}>🛒 INGREDIENTS</div>{detail.ingredients?.map((ing,i)=><div key={i} style={{color:"#555",fontSize:14,padding:"6px 0",borderBottom:"1px solid #f5f5f5"}}>◆ {ing}</div>)}</div><div style={{marginBottom:20}}><div style={{color,fontSize:10,letterSpacing:"2px",marginBottom:10,fontFamily:"monospace"}}>👩‍🍳 STEPS</div>{detail.steps?.map((step,i)=><div key={i} style={{color:"#555",fontSize:14,padding:"8px 0",display:"flex",gap:10,borderBottom:"1px solid #f9f9f9"}}><span style={{background:color,color:"white",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0,fontWeight:700}}>{i+1}</span><span style={{lineHeight:1.5}}>{step}</span></div>)}</div>{detail.tip&&<div style={{background:`${color}10`,border:`1px solid ${color}25`,borderRadius:14,padding:16}}><div style={{color,fontSize:10,letterSpacing:"2px",marginBottom:6,fontFamily:"monospace"}}>💡 CHEF'S TIP</div><div style={{color:"#555",fontSize:13}}>{detail.tip}</div></div>}</>)}</div>);
}
