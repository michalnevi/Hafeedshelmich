import { useState, useEffect, useCallback, useRef } from "react";

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

const injectPWA = () => {
  if (document.getElementById("pwa-meta")) return;
  [["apple-mobile-web-app-capable","yes"],["apple-mobile-web-app-title","הפיד של מיכ"],["apple-mobile-web-app-status-bar-style","default"],["theme-color","#FFF9F0"]].forEach(([name,content]) => { const m = document.createElement("meta"); m.name=name; m.content=content; document.head.appendChild(m); });
  const svg = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 180'><rect width='180' height='180' rx='40' fill='%23FFE4B5'/><text x='90' y='75' text-anchor='middle' font-size='28' font-family='serif' fill='%23E84393'>הפיד</text><text x='90' y='110' text-anchor='middle' font-size='20' font-family='serif' fill='%234169E1'>של מיכ</text><circle cx='60' cy='145' r='10' fill='%23FFD700'/><circle cx='90' cy='148' r='8' fill='%23FF69B4'/><circle cx='120' cy='145' r='10' fill='%234169E1'/></svg>`;
  const l = document.createElement("link"); l.rel="apple-touch-icon"; l.href=svg; l.id="pwa-meta"; document.head.appendChild(l);
};

function getTimeOfDay() { const h=new Date().getHours(); if(h>=5&&h<12)return"morning"; if(h>=12&&h<17)return"afternoon"; if(h>=17&&h<21)return"evening"; return"night"; }

const TIME_THEMES = {
  morning:  { greeting:"בוקר של קסם ✨", particle:"☀️", bg:"#FFF9F0", gradient:"linear-gradient(160deg,#FFF9F0 0%,#FFE8D6 60%,#FFF0E8 100%)", accent:"#FF6B35", secondary:"#4169E1", tertiary:"#2ECC71", cardBg:"rgba(255,255,255,0.85)", stars:false, text:"#2C1810", subtext:"#8B5E3C" },
  afternoon:{ greeting:"רגע של הפסקה 🌸", particle:"🌸", bg:"#F0F8FF", gradient:"linear-gradient(160deg,#F0F8FF 0%,#E8F4FD 60%,#F5F0FF 100%)", accent:"#9B59B6", secondary:"#3498DB", tertiary:"#E74C3C", cardBg:"rgba(255,255,255,0.85)", stars:false, text:"#1a1a2e", subtext:"#555577" },
  evening:  { greeting:"שעת קסם 🌅", particle:"🌅", bg:"#FFF5F0", gradient:"linear-gradient(160deg,#FFF5F0 0%,#FFE8E0 60%,#FFF0F5 100%)", accent:"#E84393", secondary:"#FF6B35", tertiary:"#9B59B6", cardBg:"rgba(255,255,255,0.85)", stars:false, text:"#2C1810", subtext:"#8B4060" },
  night:    { greeting:"שעת הכוכבים 🌙", particle:"🌙", bg:"#F5F0FF", gradient:"linear-gradient(160deg,#F5F0FF 0%,#E8E0FF 60%,#F0F5FF 100%)", accent:"#6C5CE7", secondary:"#A29BFE", tertiary:"#74B9FF", cardBg:"rgba(255,255,255,0.85)", stars:true, text:"#1a1030", subtext:"#5544AA" },
};

const KNOWLEDGE_TOPICS = [
  {id:"psychology", label:"פסיכולוגיה ומדע המוח", icon:"🧠", color:"#9B59B6"},
  {id:"history",    label:"היסטוריה ופילוסופיה",   icon:"📜", color:"#E67E22"},
  {id:"science",    label:"מדע וטכנולוגיה",         icon:"🔬", color:"#27AE60"},
  {id:"theater",    label:"תיאטרון ואמנות",         icon:"🎭", color:"#E84393"},
  {id:"parenting",  label:"הורות והתפתחות הילד",    icon:"🌱", color:"#F39C12"},
  {id:"health",     label:"בריאות ורפואה",          icon:"❤️", color:"#E74C3C"},
  {id:"news_il",    label:"חדשות ישראל",            icon:"🇮🇱", color:"#3498DB"},
  {id:"news_world", label:"חדשות העולם",            icon:"🌍", color:"#6C5CE7"},
];

const SELFDEV_SOURCES = ["ספר 'הכוח שבהרגלים' של צ'ארלס דאהיג","ספר 'מיינדסט' של קרול דווק","ספר 'אטומיק האביטס' של ג'יימס קליר","מחקרי פסיכולוגיה חיובית של מרטין סליגמן","תיאוריית ה-Flow של צ'יקסנטמיהאי","ספר 'גריט' של אנג'לה דאקוורת'","מחקרי ברנה בראון על פגיעות ואומץ","ספר 'Start with Why' של סיימון סינק","ספר 'The Power of Now' של אקהרט טולה","מחקרי Self-Determination Theory של דסי ורייאן"];
const FORMATS = ["fact","qa","flashcard","quote","insight"];
const FORMAT_LABELS = {fact:"עובדה",qa:"שאלה ותשובה",flashcard:"כרטיסייה",quote:"ציטוט",insight:"תובנה"};
const pickFormat = () => FORMATS[Math.floor(Math.random()*FORMATS.length)];
const pickSource = () => SELFDEV_SOURCES[Math.floor(Math.random()*SELFDEV_SOURCES.length)];

async function callClaude(system, userMsg, useSearch=false) {
  const body = { model:"claude-haiku-4-5-20251001", max_tokens:800, system, messages:[{role:"user",content:userMsg}] };
  if (useSearch) body.tools = [{type:"web_search_20250305",name:"web_search"}];
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`API ${resp.status}`);
  const data = await resp.json();
  const text = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n");
  const s=text.indexOf("{"), e=text.lastIndexOf("}");
  if (s===-1||e===-1) throw new Error("No JSON");
  return JSON.parse(text.substring(s,e+1));
}

const FMT = {
  fact:     `{"type":"fact","emoji":"אמוג'י","title":"כותרת","hook":"משפט פתיחה","body":"3-4 משפטים","insight":"תובנה"}`,
  qa:       `{"type":"qa","emoji":"אמוג'י","title":"כותרת","question":"שאלה","answer":"2-3 משפטים","insight":"מה ללמוד"}`,
  flashcard:`{"type":"flashcard","emoji":"אמוג'י","title":"מושג","front":"הגדרה קצרה","back":"הסבר+דוגמה","insight":"למה לזכור"}`,
  quote:    `{"type":"quote","emoji":"אמוג'י","title":"נושא","quote":"ציטוט אמיתי","author":"שם","context":"הקשר","insight":"רלוונטיות"}`,
  insight:  `{"type":"insight","emoji":"אמוג'י","title":"כותרת","finding":"ממצא","explanation":"2-3 משפטים","practical":"יישום"}`,
};

async function fetchKnowledge(topic, format) {
  const isNews = topic.id.startsWith("news_");
  let newsPrompt = "";
  if (topic.id === "news_il") newsPrompt = " חפש חדשות עדכניות מ-ynet.co.il ואתרי חדשות ישראליים.";
  if (topic.id === "news_world") newsPrompt = " חפש חדשות עדכניות מ-reuters.com ואתרי חדשות בינלאומיים.";
  const sys = `אתה מורה לפיתוח אישי שכותב בעברית בלבד. נושא: ${topic.label}.${newsPrompt}\nהחזר JSON בלבד, ללא backticks:\n${FMT[format]}`;
  const r = await callClaude(sys, `צור תוכן ${format}`, isNews);
  return {...r, format};
}

async function fetchSelfDev() {
  const source = pickSource();
  const format = ["fact","quote","insight","qa"][Math.floor(Math.random()*4)];
  const schemas = {
    fact:   `{"type":"fact","emoji":"אמוג'י","source":"${source}","title":"עיקרון","hook":"רעיון","body":"3-4 משפטים","insight":"יישום"}`,
    quote:  `{"type":"quote","emoji":"אמוג'י","source":"${source}","title":"ציטוט","quote":"ציטוט מדויק","author":"שם","context":"הקשר","insight":"רלוונטיות"}`,
    insight:`{"type":"insight","emoji":"אמוג'י","source":"${source}","title":"תובנה","finding":"ממצא","explanation":"הסבר","practical":"צעד קטן"}`,
    qa:     `{"type":"qa","emoji":"אמוג'י","source":"${source}","title":"שאלה","question":"שאלה עמוקה","answer":"תשובה","insight":"צעד לנקוט"}`,
  };
  const sys = `אתה מומחה בספרי פיתוח אישי. כתוב בעברית.\nהחזר JSON בלבד, ללא backticks:\n${schemas[format]}`;
  const r = await callClaude(sys, `צור תוכן מ: ${source}`);
  return {...r, format};
}

async function fetchDailyMenu() {
  const sys = `אתה תזונאית. המשתמשת צמחונית (ביצים וחלב, לא בשר/דגים).\nהחזר JSON בלבד, ללא backticks:\n{"emoji":"אמוג'י","theme":"נושא היום","breakfast":{"name":"שם","description":"תיאור"},"lunch":{"name":"שם","description":"תיאור"},"dinner":{"name":"שם","description":"תיאור"},"snack":{"name":"שם","description":"תיאור"},"tip":"טיפ"}`;
  return callClaude(sys, "תפריט יומי צמחוני");
}

async function fetchMenuDetail(name, desc) {
  const sys = `שף צמחוני. עברית. JSON בלבד, ללא backticks:\n{"ingredients":["מרכיב"],"steps":["שלב"],"time":"זמן","difficulty":"קל/בינוני/מאתגר","tip":"טיפ"}`;
  return callClaude(sys, `מתכון ל: ${name} — ${desc}`);
}

async function fetchInspirationTip() {
  const types = ["נוכחות ברגע","ציטוט פילוסופי","תרגול מיינדפולנס","תובנת חיים","חכמת הסטואה","רעיון בודהיסטי","השראה מהטבע","ציטוט שירה"];
  const t = types[Math.floor(Math.random()*types.length)];
  const sys = `אתה חכם שכותב בעברית. ספק השראה יומית קצרה מסוג: ${t}.\nJSON בלבד, ללא backticks:\n{"type":"${t}","emoji":"אמוג'י","text":"טקסט עד 25 מילה","author":"שם או null"}`;
  return callClaude(sys, "השראה יומית");
}

async function fetchTrivia() {
  const topics = ["היסטוריה","מדע","גאוגרפיה","ספרות","קולנוע","מוזיקה","ספורט","טבע","אמנות","מיתולוגיה"];
  const t = topics[Math.floor(Math.random()*topics.length)];
  const sys = `אתה מנחה חידונים שכותב בעברית. צור שאלת טריוויה מרתקת בנושא: ${t}.\nJSON בלבד, ללא backticks:\n{"emoji":"אמוג'י","topic":"${t}","question":"שאלה","options":["א. תשובה1","ב. תשובה2","ג. תשובה3","ד. תשובה4"],"correct":0,"explanation":"הסבר קצר"}`;
  return callClaude(sys, "צור שאלת טריוויה");
}

const FEED_KEY = "michals_feed_v3";
function getTodayStr() { return new Date().toISOString().split("T")[0]; }
function loadChecks() { try { const d=JSON.parse(localStorage.getItem(FEED_KEY)||"{}"); return d.date===getTodayStr()?d.checks||0:0; } catch { return 0; } }
function saveChecks(n) { try { localStorage.setItem(FEED_KEY,JSON.stringify({date:getTodayStr(),checks:n})); } catch {} }

function Stars({accent}) {
  const stars = useRef(Array.from({length:30},()=>({x:Math.random()*100,y:Math.random()*100,s:Math.random()*3+1,d:Math.random()*4,c:Math.random()>0.6}))).current;
  return <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>{stars.map((s,i)=><div key={i} style={{position:"absolute",left:`${s.x}%`,top:`${s.y}%`,width:s.s,height:s.s,borderRadius:"50%",background:s.c?accent:"#FFD700",opacity:0.3,animation:`twinkle ${2+s.d}s ${s.d}s infinite alternate`}}/>)}</div>;
}

function ContentBody({content,color,textColor}) {
  const [flipped,setFlipped]=useState(false);
  if(!content)return null;
  const tc = textColor||"#333";
  const bs={color:tc,fontSize:15,lineHeight:1.9};
  const bar={color,fontSize:16,fontStyle:"italic",lineHeight:1.6,borderRight:`3px solid ${color}`,paddingRight:14,marginBottom:20};
  const Box=({label,text})=><div style={{background:`${color}18`,border:`1px solid ${color}44`,borderRadius:14,padding:16,marginTop:20}}><div style={{color,fontSize:10,letterSpacing:"2.5px",marginBottom:6,fontFamily:"monospace"}}>{label}</div><div style={{color:tc,fontSize:14,lineHeight:1.65,fontStyle:"italic"}}>{text}</div></div>;
  if(content.type==="fact")return(<><p style={bar}>{content.hook}</p><p style={bs}>{content.body}</p><Box label="✦ תובנה" text={content.insight}/></>);
  if(content.type==="qa")return(<><div style={{...bar,fontStyle:"normal",fontWeight:700}}>❓ {content.question}</div><p style={bs}>{content.answer}</p><Box label="✦ תובנה" text={content.insight}/></>);
  if(content.type==="quote")return(<><blockquote style={{margin:"0 0 20px",padding:"20px 20px 20px 0",borderRight:`4px solid ${color}`,fontFamily:"serif",fontSize:20,fontStyle:"italic",color:tc,lineHeight:1.5}}>"{content.quote}"<footer style={{marginTop:8,fontSize:14,color,fontStyle:"normal"}}>— {content.author}</footer></blockquote><p style={bs}>{content.context}</p><Box label="✦ רלוונטיות" text={content.insight}/></>);
  if(content.type==="insight")return(<><div style={{...bar,fontStyle:"normal",fontWeight:700}}>🔎 {content.finding}</div><p style={bs}>{content.explanation}</p><Box label="🛠 יישום" text={content.practical}/></>);
  if(content.type==="flashcard")return(<div><p style={{color:"#999",fontSize:12,textAlign:"center",marginBottom:10}}>לחצי להפוך</p><div onClick={()=>setFlipped(!flipped)} style={{perspective:"1000px",cursor:"pointer",marginBottom:20}}><div style={{position:"relative",height:155,transformStyle:"preserve-3d",transition:"transform .6s",transform:flipped?"rotateY(180deg)":"none"}}>{[{side:"א׳",bg:`${color}15`,border:`${color}44`,text:content.front,tf:"none"},{side:"ב׳",bg:`${color}28`,border:`${color}66`,text:content.back,tf:"rotateY(180deg)"}].map(({side,bg,border,text,tf})=><div key={side} style={{position:"absolute",inset:0,backfaceVisibility:"hidden",transform:tf,background:bg,border:`1px solid ${border}`,borderRadius:16,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,textAlign:"center"}}><div style={{color,fontSize:10,letterSpacing:"2px",marginBottom:8}}>צד {side}</div><div style={{color:tc,fontSize:15,lineHeight:1.5}}>{text}</div></div>)}</div></div><Box label="✦ תובנה" text={content.insight}/></div>);
  return null;
}

function Modal({show,title,icon,color,content,loading,error,onClose,onRefresh,sourceLabel,textColor}) {
  if(!show)return null;
  const tc=textColor||"#333";
  return(<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:16,backdropFilter:"blur(12px)"}}><div onClick={e=>e.stopPropagation()} style={{background:"white",border:`2px solid ${color}44`,borderRadius:28,padding:36,maxWidth:580,width:"100%",maxHeight:"90vh",overflowY:"auto",direction:"rtl",position:"relative",boxShadow:`0 20px 60px ${color}30`,animation:"mIn .35s cubic-bezier(0.34,1.56,.64,1)"}}><button onClick={onClose} style={{position:"absolute",top:18,left:18,background:`${color}15`,border:"none",color:color,borderRadius:"50%",width:34,height:34,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold"}}>×</button>{loading&&<div style={{textAlign:"center",padding:"60px 0"}}><div style={{width:42,height:42,borderRadius:"50%",border:`3px solid ${color}33`,borderTopColor:color,margin:"0 auto 14px",animation:"spin 1s linear infinite"}}/><div style={{color:"#888",fontSize:13}}>מכין תוכן...</div></div>}{!loading&&error&&<div style={{textAlign:"center",padding:"40px 0"}}><div style={{fontSize:36,marginBottom:12}}>😕</div><div style={{color:"#888",fontSize:14,marginBottom:20}}>לא הצלחתי לטעון</div><button onClick={onRefresh} style={{padding:"10px 24px",background:`${color}20`,border:`1px solid ${color}44`,color,borderRadius:12,cursor:"pointer",fontSize:14}}>נסי שוב ↺</button></div>}{!loading&&!error&&content&&(<><div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:24}}><span style={{fontSize:38}}>{content.emoji||icon}</span><div>{sourceLabel&&<div style={{color:"#aaa",fontSize:10,letterSpacing:"1px",marginBottom:4,fontFamily:"monospace"}}>📚 {sourceLabel}</div>}<div style={{color,fontSize:10,letterSpacing:"3px",fontFamily:"monospace"}}>{title} · {FORMAT_LABELS[content.type]||content.type}</div><h2 style={{color:tc,fontSize:22,fontFamily:"serif",margin:"5px 0 0",lineHeight:1.3}}>{content.title}</h2></div></div><ContentBody content={content} color={color} textColor={tc}/><button onClick={onRefresh} style={{marginTop:24,width:"100%",padding:13,background:`${color}15`,border:`1px solid ${color}44`,color,borderRadius:14,cursor:"pointer",fontSize:14,fontFamily:"inherit"}} onMouseEnter={e=>e.currentTarget.style.background=`${color}25`} onMouseLeave={e=>e.currentTarget.style.background=`${color}15`}>↻ תוכן חדש</button></>)}</div></div>);
}

function RecipeModal({meal,color,onClose}) {
  const [detail,setDetail]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  useEffect(()=>{fetchMenuDetail(meal.name,meal.description).then(setDetail).catch(()=>setError(true)).finally(()=>setLoading(false));},[]);
  return(<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:16,backdropFilter:"blur(12px)"}}><div onClick={e=>e.stopPropagation()} style={{background:"white",border:`2px solid ${color}44`,borderRadius:28,padding:36,maxWidth:520,width:"100%",maxHeight:"90vh",overflowY:"auto",direction:"rtl",position:"relative",boxShadow:`0 20px 60px ${color}30`,animation:"mIn .35s cubic-bezier(0.34,1.56,.64,1)"}}><button onClick={onClose} style={{position:"absolute",top:18,left:18,background:`${color}15`,border:"none",color,borderRadius:"50%",width:34,height:34,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold"}}>×</button><h2 style={{color:"#333",fontSize:22,fontFamily:"serif",marginBottom:6}}>{meal.name}</h2><p style={{color:"#888",fontSize:13,marginBottom:24}}>{meal.description}</p>{loading&&<div style={{textAlign:"center",padding:"40px 0"}}><div style={{width:36,height:36,borderRadius:"50%",border:`3px solid ${color}33`,borderTopColor:color,margin:"0 auto",animation:"spin 1s linear infinite"}}/></div>}{error&&<div style={{textAlign:"center",color:"#888",padding:"30px 0"}}>שגיאה — נסי שוב</div>}{detail&&(<><div style={{display:"flex",gap:10,marginBottom:20}}><span style={{background:`${color}15`,color,fontSize:11,padding:"4px 10px",borderRadius:8}}>⏱ {detail.time}</span><span style={{background:`${color}15`,color,fontSize:11,padding:"4px 10px",borderRadius:8}}>📊 {detail.difficulty}</span></div><div style={{marginBottom:20}}><div style={{color,fontSize:10,letterSpacing:"2px",marginBottom:10,fontFamily:"monospace"}}>🛒 מרכיבים</div>{detail.ingredients?.map((ing,i)=><div key={i} style={{color:"#444",fontSize:14,padding:"5px 0",borderBottom:"1px solid #eee"}}>• {ing}</div>)}</div><div style={{marginBottom:20}}><div style={{color,fontSize:10,letterSpacing:"2px",marginBottom:10,fontFamily:"monospace"}}>👩‍🍳 הכנה</div>{detail.steps?.map((step,i)=><div key={i} style={{color:"#444",fontSize:14,padding:"6px 0",display:"flex",gap:10}}><span style={{color,minWidth:20,fontWeight:700}}>{i+1}.</span><span>{step}</span></div>)}</div>{detail.tip&&<div style={{background:`${color}10`,border:`1px solid ${color}30`,borderRadius:12,padding:14}}><div style={{color,fontSize:10,letterSpacing:"2px",marginBottom:6,fontFamily:"monospace"}}>💡 טיפ</div><div style={{color:"#555",fontSize:13}}>{detail.tip}</div></div>}</>)}</div></div>);
}

function SocialSection({accent,textColor}) {
  const [checks,setChecks]=useState(loadChecks);
  const max=3;
  const msgs=["עוד לא נגעת ברשתות היום — כל הכבוד! 🌟","סיבוב אחד. את מודעת לזה — זה המפתח 💪","שניים. הפיד כאן במקום 🤔","שלושה סיבובים. נשמי. מה הרגשת? 💙"];
  const add=()=>{ if(checks>=max)return; const n=checks+1; setChecks(n); saveChecks(n); };
  const remove=()=>{ if(checks<=0)return; const n=checks-1; setChecks(n); saveChecks(n); };
  return(<div style={{background:`white`,border:`2px solid ${accent}33`,borderRadius:22,padding:22,boxShadow:`0 4px 20px ${accent}15`}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}><span style={{fontSize:26}}>🧘</span><div><div style={{color:accent,fontSize:9,letterSpacing:"3px",fontFamily:"monospace"}}>✦ בריאות דיגיטלית</div><div style={{color:textColor||"#333",fontSize:15,fontFamily:"serif",fontWeight:600}}>הפיד שלך — לא שלהם</div></div></div><p style={{color:"#888",fontSize:12,lineHeight:1.7,marginBottom:18}}>המטרה היא להחליף גלילת רשתות בתוכן שבחרת. כל כניסה לכאן — ניצחון.</p><div style={{marginBottom:16}}><div style={{color:"#aaa",fontSize:11,marginBottom:10}}>כמה פעמים גללתי ברשתות היום?</div><div style={{display:"flex",gap:10,alignItems:"center"}}>{Array.from({length:max},(_,i)=><button key={i} onClick={add} style={{width:50,height:50,borderRadius:"50%",background:i<checks?accent:"#f5f5f5",border:`2px solid ${i<checks?accent:"#ddd"}`,fontSize:20,cursor:"pointer",transition:"all .3s cubic-bezier(0.34,1.56,.64,1)",transform:i<checks?"scale(1.1)":"scale(1)",boxShadow:i<checks?`0 4px 12px ${accent}44`:"none",color:i<checks?"white":"#ccc"}}>{i<checks?"✓":"○"}</button>)}{checks>0&&<button onClick={remove} style={{fontSize:11,color:"#ccc",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>בטלי</button>}</div></div><div style={{background:`${accent}10`,border:`1px solid ${accent}30`,borderRadius:12,padding:"11px 14px"}}><div style={{color:accent,fontSize:13,fontWeight:500}}>{msgs[checks]}</div></div></div>);
}

function InspirationBanner({theme}) {
  const [tip,setTip]=useState(null);
  const [loading,setLoading]=useState(true);
  const load=useCallback(()=>{ setLoading(true); setTip(null); fetchInspirationTip().then(setTip).catch(()=>setTip(null)).finally(()=>setLoading(false)); },[]);
  useEffect(()=>{ load(); },[]);
  return(<div onClick={!loading?load:undefined} style={{background:"white",border:`2px solid ${theme.secondary}33`,borderRadius:18,padding:"18px 20px",cursor:loading?"default":"pointer",marginBottom:28,boxShadow:`0 4px 20px ${theme.secondary}15`,position:"relative",overflow:"hidden"}} onMouseEnter={e=>{ if(!loading){e.currentTarget.style.boxShadow=`0 8px 28px ${theme.secondary}25`;}}} onMouseLeave={e=>{ e.currentTarget.style.boxShadow=`0 4px 20px ${theme.secondary}15`; }}><div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${theme.accent},${theme.secondary},${theme.tertiary})`}}/>{loading?<div style={{display:"flex",alignItems:"center",gap:10,paddingTop:4}}><div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${theme.secondary}44`,borderTopColor:theme.secondary,animation:"spin 1s linear infinite",flexShrink:0}}/><span style={{color:"#bbb",fontSize:13}}>מביא השראה...</span></div>:tip?<div style={{paddingTop:4}}><div style={{display:"flex",alignItems:"flex-start",gap:12}}><span style={{fontSize:28,lineHeight:1}}>{tip.emoji}</span><div style={{flex:1}}><div style={{color:theme.secondary,fontSize:9,letterSpacing:"2.5px",fontFamily:"monospace",marginBottom:6}}>{tip.type} · לחצי לרענן</div><div style={{color:theme.text,fontSize:15,fontFamily:"serif",lineHeight:1.6,fontStyle:"italic"}}>"{tip.text}"</div>{tip.author&&tip.author!=="null"&&<div style={{color:"#aaa",fontSize:12,marginTop:6}}>— {tip.author}</div>}</div></div></div>:<div style={{color:"#bbb",fontSize:13,textAlign:"center",paddingTop:4}}>לחצי לקבל השראה</div>}</div>);
}

function TriviaSection({theme}) {
  const [trivia,setTrivia]=useState(null);
  const [loading,setLoading]=useState(true);
  const [selected,setSelected]=useState(null);
  const [revealed,setRevealed]=useState(false);

  const load=useCallback(()=>{ setLoading(true); setTrivia(null); setSelected(null); setRevealed(false); fetchTrivia().then(setTrivia).catch(()=>setTrivia(null)).finally(()=>setLoading(false)); },[]);
  useEffect(()=>{ load(); },[]);

  const choose=(i)=>{ if(revealed)return; setSelected(i); setRevealed(true); };

  return(<div style={{background:"white",border:`2px solid ${theme.accent}33`,borderRadius:22,padding:24,boxShadow:`0 4px 20px ${theme.accent}15`}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:24}}>🎯</span>
        <div>
          <div style={{color:theme.accent,fontSize:9,letterSpacing:"3px",fontFamily:"monospace"}}>✦ טריוויה יומית</div>
          {trivia&&<div style={{color:"#888",fontSize:11}}>{trivia.topic}</div>}
        </div>
      </div>
      {!loading&&<button onClick={load} style={{fontSize:11,color:theme.accent,background:`${theme.accent}10`,border:`1px solid ${theme.accent}30`,borderRadius:8,padding:"4px 10px",cursor:"pointer"}}>שאלה חדשה ↻</button>}
    </div>

    {loading&&<div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${theme.accent}33`,borderTopColor:theme.accent,animation:"spin 1s linear infinite"}}/><span style={{color:"#bbb",fontSize:13}}>מכין שאלה...</span></div>}

    {!loading&&trivia&&(<>
      <div style={{color:theme.text,fontSize:16,fontFamily:"serif",lineHeight:1.5,marginBottom:20,fontWeight:600}}>{trivia.emoji} {trivia.question}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        {trivia.options?.map((opt,i)=>{
          const isCorrect = i===trivia.correct;
          const isSelected = i===selected;
          let bg="#f8f8f8", border="#eee", color="#444";
          if(revealed&&isCorrect){bg=`${theme.tertiary}20`;border=theme.tertiary;color=theme.tertiary;}
          else if(revealed&&isSelected&&!isCorrect){bg="#FFE8E8";border="#E74C3C";color="#E74C3C";}
          return(<button key={i} onClick={()=>choose(i)} style={{background:bg,border:`2px solid ${border}`,borderRadius:12,padding:"10px 12px",cursor:revealed?"default":"pointer",textAlign:"right",color,fontSize:13,lineHeight:1.4,transition:"all .2s",fontFamily:"inherit"}}>{opt}</button>);
        })}
      </div>
      {revealed&&trivia.explanation&&<div style={{background:`${theme.accent}10`,border:`1px solid ${theme.accent}30`,borderRadius:12,padding:"12px 14px"}}><div style={{color:theme.accent,fontSize:10,letterSpacing:"2px",marginBottom:6,fontFamily:"monospace"}}>💡 הסבר</div><div style={{color:"#555",fontSize:13,lineHeight:1.6}}>{trivia.explanation}</div></div>}
    </>)}
    {!loading&&!trivia&&<div style={{color:"#bbb",fontSize:13}}>שגיאה — לחצי על "שאלה חדשה"</div>}
  </div>);
}

export default function App() {
  const [tod]=useState(getTimeOfDay);
  const theme=TIME_THEMES[tod];
  const [knowledge,setKnowledge]=useState({});
  const [topicErrors,setTopicErrors]=useState({});
  const [loadingTopics,setLoadingTopics]=useState(new Set(KNOWLEDGE_TOPICS.map(t=>t.id)));
  const [selfDev,setSelfDev]=useState(null);
  const [selfDevLoading,setSelfDevLoading]=useState(true);
  const [selfDevError,setSelfDevError]=useState(false);
  const [menu,setMenu]=useState(null);
  const [menuLoading,setMenuLoading]=useState(true);
  const [modal,setModal]=useState(null);
  const [recipeMeal,setRecipeMeal]=useState(null);
  const startedRef=useRef(false);

  const loadTopic=useCallback(async(topic)=>{ setLoadingTopics(p=>new Set([...p,topic.id])); setTopicErrors(p=>({...p,[topic.id]:false})); try { const c=await fetchKnowledge(topic,pickFormat()); setKnowledge(p=>({...p,[topic.id]:c})); } catch(e){ console.error(topic.id,e); setTopicErrors(p=>({...p,[topic.id]:true})); } setLoadingTopics(p=>{ const n=new Set(p); n.delete(topic.id); return n; }); },[]);

  useEffect(()=>{ injectPWA(); if(startedRef.current)return; startedRef.current=true; KNOWLEDGE_TOPICS.forEach(loadTopic); fetchSelfDev().then(setSelfDev).catch(()=>setSelfDevError(true)).finally(()=>setSelfDevLoading(false)); fetchDailyMenu().then(setMenu).catch(console.error).finally(()=>setMenuLoading(false)); },[]);

  useEffect(()=>{ if(!modal||modal.type!=="topic")return; const tid=modal.topic?.id; if(!tid)return; const c=knowledge[tid]; const loading=loadingTopics.has(tid); const error=topicErrors[tid]; if(!loading)setModal(m=>({...m,content:c||null,loading:false,error:error||!c})); },[knowledge,loadingTopics,topicErrors]);

  const openTopic=(topic)=>{ const c=knowledge[topic.id]; const loading=loadingTopics.has(topic.id); const error=topicErrors[topic.id]||false; setModal({type:"topic",topic,content:c||null,loading,error:!loading&&!c&&error}); };

  const refreshModal=async()=>{ if(!modal)return; setModal(m=>({...m,content:null,loading:true,error:false})); try { if(modal.type==="selfdev"){ const c=await fetchSelfDev(); setSelfDev(c); setModal(m=>({...m,content:c,loading:false,error:false})); } else { const c=await fetchKnowledge(modal.topic,pickFormat()); setKnowledge(p=>({...p,[modal.topic.id]:c})); setModal(m=>({...m,content:c,loading:false,error:false})); } } catch { setModal(m=>({...m,loading:false,error:true})); } };

  const readyCount=KNOWLEDGE_TOPICS.length-loadingTopics.size;
  const MEAL_ICONS={breakfast:"🌅",lunch:"☀️",dinner:"🌙",snack:"🍎"};
  const MEAL_NAMES={breakfast:"בוקר",lunch:"צהריים",dinner:"ערב",snack:"חטיף"};

  return(<div style={{minHeight:"100vh",background:theme.gradient,color:theme.text,fontFamily:"Georgia, serif",direction:"rtl",position:"relative",overflowX:"hidden"}}>
    <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:6px;background:#f0f0f0}::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes twinkle{from{opacity:.1}to{opacity:.5}}@keyframes mIn{from{opacity:0;transform:scale(.92) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    {theme.stars&&<Stars accent={theme.accent}/>}
    <div style={{position:"relative",zIndex:1,maxWidth:820,margin:"0 auto",padding:"32px 20px 80px"}}>

      <div style={{textAlign:"center",marginBottom:32,animation:"fadeUp .6s both"}}>
        <div style={{fontSize:36,marginBottom:8,animation:"float 5s ease-in-out infinite"}}>{theme.particle}</div>
        <div style={{fontSize:10,color:theme.subtext,letterSpacing:"4px",marginBottom:10,fontFamily:"monospace"}}>{theme.greeting} · {new Date().toLocaleDateString("he-IL",{weekday:"long",day:"numeric",month:"long"})}</div>
        <h1 style={{fontFamily:"serif",fontSize:"clamp(34px,7vw,58px)",background:`linear-gradient(135deg,${theme.accent},${theme.secondary},${theme.tertiary})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1.1,marginBottom:8}}>הפיד של מיכ</h1>
        <div style={{display:"flex",justifyContent:"center",gap:5,marginTop:14}}>{KNOWLEDGE_TOPICS.map(t=><div key={t.id} style={{width:8,height:8,borderRadius:"50%",background:knowledge[t.id]?t.color:topicErrors[t.id]?"#ffaaaa":loadingTopics.has(t.id)?"#ddd":"#eee",boxShadow:knowledge[t.id]?`0 0 6px ${t.color}88`:"none",transition:"all .4s"}}/>)}</div>
        {readyCount<KNOWLEDGE_TOPICS.length&&<div style={{color:"#bbb",fontSize:10,marginTop:6,fontFamily:"monospace"}}>טוען {readyCount}/{KNOWLEDGE_TOPICS.length}...</div>}
      </div>

      <InspirationBanner theme={theme}/>

      <div style={{marginBottom:28,animation:"fadeUp .5s .15s both"}}>
        <div style={{color:theme.subtext,fontSize:10,letterSpacing:"3px",fontFamily:"monospace",marginBottom:12}}>✦ בריאות דיגיטלית</div>
        <SocialSection accent={theme.accent} textColor={theme.text}/>
      </div>

      <div style={{marginBottom:28}}>
        <div style={{color:theme.subtext,fontSize:10,letterSpacing:"3px",fontFamily:"monospace",marginBottom:12}}>✦ ידע יומי</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:12}}>
          {KNOWLEDGE_TOPICS.map((topic,i)=>{ const c=knowledge[topic.id]; const isLoading=loadingTopics.has(topic.id); const hasError=topicErrors[topic.id]; return(<div key={topic.id} style={{animation:`fadeUp .5s ${0.2+i*0.06}s both`}}><button onClick={()=>openTopic(topic)} style={{background:"white",border:`2px solid ${c?topic.color+"44":hasError?"#ffcccc":"#eee"}`,borderRadius:18,padding:"18px 16px",cursor:"pointer",textAlign:"right",transition:"all .25s",width:"100%",position:"relative",overflow:"hidden",boxShadow:c?`0 4px 16px ${topic.color}20`:"0 2px 8px rgba(0,0,0,0.06)"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 8px 24px ${topic.color}30`;}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=c?`0 4px 16px ${topic.color}20`:"0 2px 8px rgba(0,0,0,0.06)";}}><div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${topic.color},${topic.color}88)`,opacity:c?1:0,transition:"opacity .5s"}}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{paddingTop:2}}>{isLoading?<div style={{width:8,height:8,borderRadius:"50%",border:`2px solid ${topic.color}44`,borderTopColor:topic.color,animation:"spin 1s linear infinite"}}/>:hasError?<div style={{width:7,height:7,borderRadius:"50%",background:"#ffaaaa"}}/>:c?<div style={{width:7,height:7,borderRadius:"50%",background:topic.color,boxShadow:`0 0 6px ${topic.color}`}}/>:<div style={{width:7,height:7,borderRadius:"50%",background:"#ddd"}}/>}</div><span style={{fontSize:28}}>{topic.icon}</span></div><div style={{color:topic.color,fontSize:13,fontWeight:700,marginTop:10,marginBottom:c?5:0}}>{topic.label}</div>{c&&<div style={{color:"#999",fontSize:11,lineHeight:1.4}}>{(c.hook||c.finding||c.question||"").substring(0,55)}...</div>}{c&&<div style={{marginTop:7,display:"inline-block",fontSize:9,letterSpacing:"1px",color:topic.color,background:`${topic.color}15`,padding:"2px 7px",borderRadius:7}}>{FORMAT_LABELS[c.type]}</div>}{hasError&&<div style={{color:"#ffaaaa",fontSize:11,marginTop:6}}>לחצי לנסות שוב</div>}{isLoading&&!c&&<div style={{color:"#ccc",fontSize:11,marginTop:6}}>טוען...</div>}</button></div>); })}
        </div>
      </div>

      <div style={{marginBottom:28,animation:"fadeUp .5s .6s both"}}>
        <div style={{color:theme.subtext,fontSize:10,letterSpacing:"3px",fontFamily:"monospace",marginBottom:12}}>✦ פיתוח אישי</div>
        <button onClick={()=>setModal({type:"selfdev",content:selfDev,loading:selfDevLoading,error:selfDevError})} style={{width:"100%",background:"white",border:`2px solid ${theme.tertiary}33`,borderRadius:22,padding:24,cursor:"pointer",textAlign:"right",transition:"all .3s",boxShadow:`0 4px 16px ${theme.tertiary}15`}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 24px ${theme.tertiary}25`;}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=`0 4px 16px ${theme.tertiary}15`;}}>
          <div style={{display:"flex",gap:14,alignItems:"flex-start"}}><span style={{fontSize:36}}>{selfDev?.emoji||"🌟"}</span><div style={{flex:1}}>{selfDev?.source&&<div style={{color:"#bbb",fontSize:10,letterSpacing:"1px",marginBottom:5,fontFamily:"monospace"}}>📚 {selfDev.source}</div>}<div style={{color:theme.tertiary,fontSize:10,letterSpacing:"2px",marginBottom:5,fontFamily:"monospace"}}>פיתוח אישי{selfDev?` · ${FORMAT_LABELS[selfDev.type]}`:""}</div>{selfDevLoading?<div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${theme.tertiary}44`,borderTopColor:theme.tertiary,animation:"spin 1s linear infinite"}}/><span style={{color:"#bbb",fontSize:12}}>טוען...</span></div>:selfDevError?<div style={{color:"#ffaaaa",fontSize:13}}>שגיאה — לחצי לנסות שוב</div>:selfDev?(<><div style={{color:theme.text,fontSize:17,fontFamily:"serif",marginBottom:5,lineHeight:1.3}}>{selfDev.title}</div><div style={{color:"#aaa",fontSize:11,lineHeight:1.5}}>{(selfDev.hook||selfDev.finding||selfDev.question||"").substring(0,80)}...</div></>):null}</div></div>
        </button>
      </div>

      <div style={{marginBottom:28,animation:"fadeUp .5s .7s both"}}>
        <div style={{color:theme.subtext,fontSize:10,letterSpacing:"3px",fontFamily:"monospace",marginBottom:12}}>✦ טריוויה יומית</div>
        <TriviaSection theme={theme}/>
      </div>

      <div style={{animation:"fadeUp .5s .8s both"}}>
        <div style={{color:theme.subtext,fontSize:10,letterSpacing:"3px",fontFamily:"monospace",marginBottom:12}}>✦ תפריט יומי צמחוני</div>
        <div style={{background:"white",border:`2px solid ${theme.accent}22`,borderRadius:22,padding:22,boxShadow:`0 4px 16px ${theme.accent}10`}}>
          {menuLoading?<div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${theme.accent}44`,borderTopColor:theme.accent,animation:"spin 1s linear infinite"}}/><span style={{color:"#bbb",fontSize:13}}>מכין תפריט...</span></div>
          :menu?(<><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><span style={{fontSize:24}}>{menu.emoji}</span><div><div style={{color:"#bbb",fontSize:9,letterSpacing:"2px",fontFamily:"monospace"}}>נושא היום</div><div style={{color:theme.text,fontSize:14,fontFamily:"serif",fontWeight:600}}>{menu.theme}</div></div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:10,marginBottom:14}}>{["breakfast","lunch","dinner","snack"].map(m=>menu[m]&&<div key={m} style={{background:"#fafafa",border:`1px solid #eee`,borderRadius:14,padding:"12px 11px"}}><div style={{color:"#bbb",fontSize:9,letterSpacing:"2px",marginBottom:5,fontFamily:"monospace"}}>{MEAL_ICONS[m]} {MEAL_NAMES[m]}</div><div style={{color:theme.text,fontSize:13,fontWeight:600,marginBottom:3,lineHeight:1.3}}>{menu[m].name}</div><div style={{color:"#aaa",fontSize:11,lineHeight:1.4,marginBottom:9}}>{menu[m].description}</div><button onClick={()=>setRecipeMeal(menu[m])} style={{fontSize:10,color:theme.accent,background:`${theme.accent}10`,border:`1px solid ${theme.accent}30`,borderRadius:8,padding:"3px 9px",cursor:"pointer"}}>מתכון ←</button></div>)}</div>{menu.tip&&<div style={{background:`${theme.accent}08`,border:`1px solid ${theme.accent}20`,borderRadius:12,padding:"10px 13px",color:"#888",fontSize:12}}>💡 {menu.tip}</div>}</>)
          :<div style={{color:"#bbb",fontSize:13}}>שגיאה</div>}
        </div>
      </div>

    </div>
    <Modal show={!!modal} title={modal?.type==="selfdev"?"פיתוח אישי":modal?.topic?.label} icon={modal?.type==="selfdev"?"🌟":modal?.topic?.icon} color={modal?.type==="selfdev"?theme.tertiary:(modal?.topic?.color||theme.accent)} content={modal?.content} loading={!!modal?.loading} error={!!modal?.error} onClose={()=>setModal(null)} onRefresh={refreshModal} sourceLabel={modal?.type==="selfdev"?modal?.content?.source:null} textColor={theme.text}/>
    {recipeMeal&&<RecipeModal meal={recipeMeal} color={theme.accent} onClose={()=>setRecipeMeal(null)}/>}
  </div>);
}
