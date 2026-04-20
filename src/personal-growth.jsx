import { useState, useEffect, useCallback, useRef } from "react";

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

const injectPWA = () => {
  if (document.getElementById("pwa-meta")) return;
  [["apple-mobile-web-app-capable","yes"],["apple-mobile-web-app-title","הפיד של מיכ"],["apple-mobile-web-app-status-bar-style","default"],["theme-color","#E8F4FD"]].forEach(([name,content]) => { const m = document.createElement("meta"); m.name=name; m.content=content; document.head.appendChild(m); });
  const svg = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 180'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%25' stop-color='%234FC3F7'/><stop offset='100%25' stop-color='%23CE93D8'/></linearGradient></defs><rect width='180' height='180' rx='40' fill='url(%23g)'/><text x='90' y='78' text-anchor='middle' font-size='26' font-family='serif' fill='white'>הפיד</text><text x='90' y='112' text-anchor='middle' font-size='19' font-family='serif' fill='%23FFF9C4'>של מיכ</text><text x='45' y='148' font-size='18'>%E2%AD%90</text><text x='80' y='155' font-size='14'>%E2%9C%A8</text><text x='115' y='148' font-size='18'>%E2%AD%90</text></svg>`;
  const l = document.createElement("link"); l.rel="apple-touch-icon"; l.href=svg; l.id="pwa-meta"; document.head.appendChild(l);
};

function getTimeOfDay() { const h=new Date().getHours(); if(h>=5&&h<12)return"morning"; if(h>=12&&h<17)return"afternoon"; if(h>=17&&h<21)return"evening"; return"night"; }

// Disney / Pixar magic themes - bright, warm, sparkly
const TIME_THEMES = {
  morning: {
    greeting:"בוקר של קסם ✨", particle:"🌤️",
    gradient:"linear-gradient(160deg, #FFF9E6 0%, #FFF0D0 40%, #FFE8F0 100%)",
    accent:"#FF8C00", secondary:"#FF69B4", tertiary:"#4CAF50",
    cardBg:"rgba(255,255,255,0.92)", stars:false,
    text:"#2C1A00", subtext:"#A07040",
    shimmer:"#FF8C0022",
    sparkles:["#FFD700","#FF69B4","#87CEEB","#98FB98"],
  },
  afternoon: {
    greeting:"שעת הרפתקה 🌈", particle:"🌈",
    gradient:"linear-gradient(160deg, #E3F2FD 0%, #EDE7F6 50%, #E8F5E9 100%)",
    accent:"#5C6BC0", secondary:"#AB47BC", tertiary:"#26A69A",
    cardBg:"rgba(255,255,255,0.92)", stars:false,
    text:"#1A1040", subtext:"#6050A0",
    shimmer:"#5C6BC022",
    sparkles:["#7986CB","#BA68C8","#4DB6AC","#81C784"],
  },
  evening: {
    greeting:"שקיעת הקסם 🌇", particle:"🌇",
    gradient:"linear-gradient(160deg, #FFF3E0 0%, #FCE4EC 50%, #F3E5F5 100%)",
    accent:"#F06292", secondary:"#FF8A65", tertiary:"#9575CD",
    cardBg:"rgba(255,255,255,0.92)", stars:true,
    text:"#2C1020", subtext:"#A05070",
    shimmer:"#F0629222",
    sparkles:["#F48FB1","#FFAB91","#CE93D8","#FFD54F"],
  },
  night: {
    greeting:"לילה של כוכבים 🌙", particle:"🌙",
    gradient:"linear-gradient(160deg, #E8EAF6 0%, #EDE7F6 50%, #E1F5FE 100%)",
    accent:"#7C4DFF", secondary:"#448AFF", tertiary:"#00BCD4",
    cardBg:"rgba(255,255,255,0.92)", stars:true,
    text:"#1A0840", subtext:"#6040A0",
    shimmer:"#7C4DFF22",
    sparkles:["#B39DDB","#90CAF9","#80DEEA","#F48FB1"],
  },
};

const KNOWLEDGE_TOPICS = [
  {id:"psychology", label:"פסיכולוגיה ומדע המוח",       icon:"🧠", color:"#9C27B0"},
  {id:"history",    label:"היסטוריה ופילוסופיה",         icon:"📜", color:"#FF6F00"},
  {id:"science",    label:"מדע וטכנולוגיה",               icon:"🔬", color:"#2E7D32"},
  {id:"theater",    label:"תיאטרון ואמנות",               icon:"🎭", color:"#C2185B"},
  {id:"parenting",  label:"הורות, מונטיסורי והתפתחות",   icon:"🌱", color:"#F57C00"},
  {id:"health",     label:"בריאות ורפואה",                icon:"❤️", color:"#D32F2F"},
  {id:"news_il",    label:"חדשות ישראל",                  icon:"🇮🇱", color:"#1565C0"},
  {id:"news_world", label:"חדשות העולם",                  icon:"🌍", color:"#6A1B9A"},
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
  let extra = "";
  if (topic.id==="news_il") extra = " חפש חדשות עדכניות מ-ynet.co.il. כתוב בעברית.";
  if (topic.id==="news_world") extra = " Search reuters.com for today's top news. Summarize in Hebrew.";
  if (topic.id==="parenting") extra = " שלב גישה מונטיסורית ועקרונות פדגוגיה מתקדמת בתשובה.";
  const sys = `אתה מורה לפיתוח אישי שכותב בעברית בלבד. נושא: ${topic.label}.${extra}\nהחזר JSON בלבד, ללא backticks:\n${FMT[format]}`;
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
  const sys = `אתה תזונאית ישראלית. המשתמשת צמחונית לחלוטין — אוכלת ביצים וחלב, אבל לא בשר, לא עוף, ולא דגים. אל תכלול שום מנה עם בשר, עוף או דגים בשום צורה.\nהחזר JSON בלבד, ללא backticks, ללא הסבר:\n{"emoji":"אמוג'י","theme":"נושא תזונתי ליום","breakfast":{"name":"שם המנה","description":"תיאור קצר ומזמין"},"lunch":{"name":"שם המנה","description":"תיאור קצר ומזמין"},"dinner":{"name":"שם המנה","description":"תיאור קצר ומזמין"},"snack":{"name":"שם החטיף","description":"תיאור קצר"},"tip":"טיפ תזונתי מעניין"}`;
  return callClaude(sys, "הצע תפריט יומי מזין וטעים לצמחונית. חשוב: ללא בשר, עוף ודגים בשום מנה.");
}

async function fetchMenuDetail(name, desc) {
  const sys = `שף צמחוני ישראלי. אין בשר, עוף או דגים. כתוב בעברית. החזר JSON בלבד, ללא backticks:\n{"ingredients":["מרכיב 1","מרכיב 2"],"steps":["שלב 1","שלב 2"],"time":"זמן הכנה","difficulty":"קל/בינוני/מאתגר","tip":"טיפ השף"}`;
  return callClaude(sys, `מתכון מלא ל: ${name} — ${desc}`);
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
  const sys = `אתה מנחה חידונים שכותב בעברית. צור שאלת טריוויה מרתקת בנושא: ${t}.\nJSON בלבד, ללא backticks:\n{"emoji":"אמוג'י","topic":"${t}","question":"שאלה מעניינת","options":["א. אפשרות","ב. אפשרות","ג. אפשרות","ד. אפשרות"],"correct":0,"explanation":"הסבר קצר ומעניין"}`;
  return callClaude(sys, "צור שאלת טריוויה");
}

const FEED_KEY = "michals_feed_v4";
function getTodayStr() { return new Date().toISOString().split("T")[0]; }
function loadChecks() { try { const d=JSON.parse(localStorage.getItem(FEED_KEY)||"{}"); return d.date===getTodayStr()?d.checks||0:0; } catch { return 0; } }
function saveChecks(n) { try { localStorage.setItem(FEED_KEY,JSON.stringify({date:getTodayStr(),checks:n})); } catch {} }

// Disney magic sparkles floating in background
function MagicSparkles({colors}) {
  const sparks = useRef(Array.from({length:18},()=>({
    x:Math.random()*100, y:Math.random()*100,
    s:Math.random()*16+8, d:Math.random()*6, dur:Math.random()*4+3,
    color:colors[Math.floor(Math.random()*colors.length)],
    rot:Math.random()*360,
  }))).current;
  return(
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
      {sparks.map((s,i)=>(
        <div key={i} style={{position:"absolute",left:`${s.x}%`,top:`${s.y}%`,fontSize:s.s,opacity:0.35,animation:`float ${s.dur}s ${s.d}s infinite alternate ease-in-out`,transform:`rotate(${s.rot}deg)`}}>✦</div>
      ))}
    </div>
  );
}

function ContentBody({content,color,textColor}) {
  const [flipped,setFlipped]=useState(false);
  if(!content)return null;
  const tc=textColor||"#333";
  const bs={color:tc,fontSize:15,lineHeight:1.9};
  const bar={color,fontSize:16,fontStyle:"italic",lineHeight:1.6,borderRight:`3px solid ${color}`,paddingRight:14,marginBottom:20};
  const Box=({label,text})=><div style={{background:`${color}15`,border:`1px solid ${color}33`,borderRadius:14,padding:16,marginTop:20}}><div style={{color,fontSize:10,letterSpacing:"2.5px",marginBottom:6,fontFamily:"monospace"}}>{label}</div><div style={{color:tc,fontSize:14,lineHeight:1.65,fontStyle:"italic"}}>{text}</div></div>;
  if(content.type==="fact")return(<><p style={bar}>{content.hook}</p><p style={bs}>{content.body}</p><Box label="✦ תובנה" text={content.insight}/></>);
  if(content.type==="qa")return(<><div style={{...bar,fontStyle:"normal",fontWeight:700}}>❓ {content.question}</div><p style={bs}>{content.answer}</p><Box label="✦ תובנה" text={content.insight}/></>);
  if(content.type==="quote")return(<><blockquote style={{margin:"0 0 20px",padding:"20px 20px 20px 0",borderRight:`4px solid ${color}`,fontFamily:"serif",fontSize:20,fontStyle:"italic",color:tc,lineHeight:1.5}}>"{content.quote}"<footer style={{marginTop:8,fontSize:14,color,fontStyle:"normal"}}>— {content.author}</footer></blockquote><p style={bs}>{content.context}</p><Box label="✦ רלוונטיות" text={content.insight}/></>);
  if(content.type==="insight")return(<><div style={{...bar,fontStyle:"normal",fontWeight:700}}>🔎 {content.finding}</div><p style={bs}>{content.explanation}</p><Box label="🛠 יישום" text={content.practical}/></>);
  if(content.type==="flashcard")return(<div><p style={{color:"#bbb",fontSize:12,textAlign:"center",marginBottom:10}}>לחצי להפוך</p><div onClick={()=>setFlipped(!flipped)} style={{perspective:"1000px",cursor:"pointer",marginBottom:20}}><div style={{position:"relative",height:155,transformStyle:"preserve-3d",transition:"transform .6s",transform:flipped?"rotateY(180deg)":"none"}}>{[{side:"א׳",bg:`${color}12`,border:`${color}33`,text:content.front,tf:"none"},{side:"ב׳",bg:`${color}22`,border:`${color}55`,text:content.back,tf:"rotateY(180deg)"}].map(({side,bg,border,text,tf})=><div key={side} style={{position:"absolute",inset:0,backfaceVisibility:"hidden",transform:tf,background:bg,border:`1px solid ${border}`,borderRadius:16,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,textAlign:"center"}}><div style={{color,fontSize:10,letterSpacing:"2px",marginBottom:8}}>צד {side}</div><div style={{color:tc,fontSize:15,lineHeight:1.5}}>{text}</div></div>)}</div></div><Box label="✦ תובנה" text={content.insight}/></div>);
  return null;
}

function Modal({show,title,icon,color,content,loading,error,onClose,onRefresh,sourceLabel,textColor}) {
  if(!show)return null;
  const tc=textColor||"#333";
  return(<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(100,80,150,0.3)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:16,backdropFilter:"blur(12px)"}}><div onClick={e=>e.stopPropagation()} style={{background:"white",border:`2px solid ${color}55`,borderRadius:28,padding:36,maxWidth:580,width:"100%",maxHeight:"90vh",overflowY:"auto",direction:"rtl",position:"relative",boxShadow:`0 20px 60px ${color}25,0 0 0 1px ${color}22`,animation:"mIn .35s cubic-bezier(0.34,1.56,.64,1)"}}><div style={{position:"absolute",top:0,left:0,right:0,height:4,borderRadius:"28px 28px 0 0",background:`linear-gradient(90deg,${color},${color}88,${color})`}}/><button onClick={onClose} style={{position:"absolute",top:18,left:18,background:`${color}15`,border:`1px solid ${color}33`,color:color,borderRadius:"50%",width:34,height:34,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold"}}>×</button>{loading&&<div style={{textAlign:"center",padding:"60px 0"}}><div style={{fontSize:40,animation:"float 1s ease-in-out infinite"}}>✨</div><div style={{color:"#bbb",fontSize:13,marginTop:12}}>מכין תוכן...</div></div>}{!loading&&error&&<div style={{textAlign:"center",padding:"40px 0"}}><div style={{fontSize:36,marginBottom:12}}>😕</div><div style={{color:"#aaa",fontSize:14,marginBottom:20}}>לא הצלחתי לטעון</div><button onClick={onRefresh} style={{padding:"10px 24px",background:`${color}15`,border:`1px solid ${color}44`,color,borderRadius:12,cursor:"pointer",fontSize:14}}>נסי שוב ↺</button></div>}{!loading&&!error&&content&&(<><div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:24}}><span style={{fontSize:38}}>{content.emoji||icon}</span><div>{sourceLabel&&<div style={{color:"#ccc",fontSize:10,letterSpacing:"1px",marginBottom:4,fontFamily:"monospace"}}>📚 {sourceLabel}</div>}<div style={{color,fontSize:10,letterSpacing:"3px",fontFamily:"monospace"}}>{title} · {FORMAT_LABELS[content.type]||content.type}</div><h2 style={{color:tc,fontSize:22,fontFamily:"serif",margin:"5px 0 0",lineHeight:1.3}}>{content.title}</h2></div></div><ContentBody content={content} color={color} textColor={tc}/><button onClick={onRefresh} style={{marginTop:24,width:"100%",padding:13,background:`linear-gradient(135deg,${color}22,${color}11)`,border:`1px solid ${color}44`,color,borderRadius:14,cursor:"pointer",fontSize:14,fontFamily:"inherit",fontWeight:500}} onMouseEnter={e=>e.currentTarget.style.background=`linear-gradient(135deg,${color}33,${color}22)`} onMouseLeave={e=>e.currentTarget.style.background=`linear-gradient(135deg,${color}22,${color}11)`}>✨ תוכן חדש</button></>)}</div></div>);
}

function RecipeModal({meal,color,onClose}) {
  const [detail,setDetail]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  useEffect(()=>{fetchMenuDetail(meal.name,meal.description).then(setDetail).catch(()=>setError(true)).finally(()=>setLoading(false));},[]);
  return(<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(100,80,150,0.3)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:16,backdropFilter:"blur(12px)"}}><div onClick={e=>e.stopPropagation()} style={{background:"white",border:`2px solid ${color}44`,borderRadius:28,padding:36,maxWidth:520,width:"100%",maxHeight:"90vh",overflowY:"auto",direction:"rtl",position:"relative",boxShadow:`0 20px 60px ${color}25`,animation:"mIn .35s cubic-bezier(0.34,1.56,.64,1)"}}><div style={{position:"absolute",top:0,left:0,right:0,height:4,borderRadius:"28px 28px 0 0",background:`linear-gradient(90deg,${color},${color}88)`}}/><button onClick={onClose} style={{position:"absolute",top:18,left:18,background:`${color}15`,border:`1px solid ${color}33`,color,borderRadius:"50%",width:34,height:34,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold"}}>×</button><h2 style={{color:"#333",fontSize:22,fontFamily:"serif",marginBottom:6}}>{meal.name}</h2><p style={{color:"#aaa",fontSize:13,marginBottom:24}}>{meal.description}</p>{loading&&<div style={{textAlign:"center",padding:"40px 0"}}><div style={{fontSize:32,animation:"float 1s ease-in-out infinite"}}>🍳</div></div>}{error&&<div style={{textAlign:"center",color:"#aaa",padding:"30px 0"}}>שגיאה — נסי שוב</div>}{detail&&(<><div style={{display:"flex",gap:10,marginBottom:20}}><span style={{background:`${color}15`,color,fontSize:11,padding:"4px 12px",borderRadius:20,border:`1px solid ${color}33`}}>⏱ {detail.time}</span><span style={{background:`${color}15`,color,fontSize:11,padding:"4px 12px",borderRadius:20,border:`1px solid ${color}33`}}>📊 {detail.difficulty}</span></div><div style={{marginBottom:20}}><div style={{color,fontSize:10,letterSpacing:"2px",marginBottom:10,fontFamily:"monospace"}}>🛒 מרכיבים</div>{detail.ingredients?.map((ing,i)=><div key={i} style={{color:"#555",fontSize:14,padding:"6px 0",borderBottom:"1px solid #f5f5f5",display:"flex",gap:8,alignItems:"center"}}><span style={{color,fontSize:10}}>◆</span>{ing}</div>)}</div><div style={{marginBottom:20}}><div style={{color,fontSize:10,letterSpacing:"2px",marginBottom:10,fontFamily:"monospace"}}>👩‍🍳 הכנה</div>{detail.steps?.map((step,i)=><div key={i} style={{color:"#555",fontSize:14,padding:"8px 0",display:"flex",gap:10,borderBottom:"1px solid #f9f9f9"}}><span style={{background:color,color:"white",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0,fontWeight:700}}>{i+1}</span><span style={{lineHeight:1.5}}>{step}</span></div>)}</div>{detail.tip&&<div style={{background:`${color}10`,border:`1px solid ${color}25`,borderRadius:14,padding:16}}><div style={{color,fontSize:10,letterSpacing:"2px",marginBottom:6,fontFamily:"monospace"}}>💡 טיפ השף</div><div style={{color:"#555",fontSize:13,lineHeight:1.6}}>{detail.tip}</div></div>}</>)}</div></div>);
}

function SocialSection({accent,textColor}) {
  const [checks,setChecks]=useState(loadChecks);
  const max=3;
  const msgs=["✨ עוד לא נגעת ברשתות היום — קסם!","🌟 סיבוב אחד. את מודעת לזה — זה המפתח","🌈 שניים. הפיד כאן במקום","💙 שלושה סיבובים. נשמי. מה הרגשת?"];
  const add=()=>{ if(checks>=max)return; const n=checks+1; setChecks(n); saveChecks(n); };
  const remove=()=>{ if(checks<=0)return; const n=checks-1; setChecks(n); saveChecks(n); };
  return(<div style={{background:"white",border:`2px solid ${accent}33`,borderRadius:22,padding:24,boxShadow:`0 8px 32px ${accent}15`,position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${accent},${accent}66,${accent})`}}/><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}><span style={{fontSize:28}}>🧘</span><div><div style={{color:accent,fontSize:9,letterSpacing:"3px",fontFamily:"monospace",marginBottom:2}}>✦ בריאות דיגיטלית</div><div style={{color:textColor||"#333",fontSize:15,fontFamily:"serif",fontWeight:700}}>הפיד שלך — לא שלהם</div></div></div><p style={{color:"#aaa",fontSize:12,lineHeight:1.7,marginBottom:18}}>המטרה היא להחליף גלילת רשתות בתוכן שבחרת. כל כניסה לכאן — ניצחון.</p><div style={{marginBottom:16}}><div style={{color:"#ccc",fontSize:11,marginBottom:12}}>כמה פעמים גללתי ברשתות היום?</div><div style={{display:"flex",gap:12,alignItems:"center"}}>{Array.from({length:max},(_,i)=><button key={i} onClick={add} style={{width:52,height:52,borderRadius:"50%",background:i<checks?`linear-gradient(135deg,${accent},${accent}bb)`:"#f8f8f8",border:`2px solid ${i<checks?accent:"#eee"}`,fontSize:22,cursor:"pointer",transition:"all .3s cubic-bezier(0.34,1.56,.64,1)",transform:i<checks?"scale(1.1)":"scale(1)",boxShadow:i<checks?`0 4px 16px ${accent}44`:"none",color:i<checks?"white":"#ddd"}}>{i<checks?"✓":"○"}</button>)}{checks>0&&<button onClick={remove} style={{fontSize:11,color:"#ccc",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>בטלי</button>}</div></div><div style={{background:`${accent}10`,border:`1px solid ${accent}25`,borderRadius:14,padding:"12px 16px"}}><div style={{color:accent,fontSize:14,fontWeight:500}}>{msgs[checks]}</div></div></div>);
}

function InspirationBanner({theme}) {
  const [tip,setTip]=useState(null);
  const [loading,setLoading]=useState(true);
  const load=useCallback(()=>{ setLoading(true); setTip(null); fetchInspirationTip().then(setTip).catch(()=>setTip(null)).finally(()=>setLoading(false)); },[]);
  useEffect(()=>{ load(); },[]);
  return(<div onClick={!loading?load:undefined} style={{background:"white",border:`2px solid ${theme.secondary}33`,borderRadius:20,padding:"20px 22px",cursor:loading?"default":"pointer",marginBottom:28,boxShadow:`0 8px 32px ${theme.secondary}18`,position:"relative",overflow:"hidden",transition:"all .3s"}} onMouseEnter={e=>{ if(!loading)e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; }}><div style={{position:"absolute",top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${theme.accent},${theme.secondary},${theme.tertiary})`}}/><div style={{position:"absolute",bottom:8,left:12,fontSize:20,opacity:0.15}}>✦</div><div style={{position:"absolute",top:12,left:60,fontSize:14,opacity:0.1}}>★</div>{loading?<div style={{display:"flex",alignItems:"center",gap:10,paddingTop:4}}><div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${theme.secondary}44`,borderTopColor:theme.secondary,animation:"spin 1s linear infinite",flexShrink:0}}/><span style={{color:"#ccc",fontSize:13}}>מביא השראה...</span></div>:tip?<div style={{paddingTop:4}}><div style={{display:"flex",alignItems:"flex-start",gap:14}}><span style={{fontSize:30,lineHeight:1,animation:"float 3s ease-in-out infinite"}}>{tip.emoji}</span><div style={{flex:1}}><div style={{color:theme.secondary,fontSize:9,letterSpacing:"2.5px",fontFamily:"monospace",marginBottom:8}}>{tip.type} · לחצי לרענן ✨</div><div style={{color:theme.text,fontSize:16,fontFamily:"serif",lineHeight:1.65,fontStyle:"italic"}}>"{tip.text}"</div>{tip.author&&tip.author!=="null"&&<div style={{color:"#bbb",fontSize:12,marginTop:8}}>— {tip.author}</div>}</div></div></div>:<div style={{color:"#ccc",fontSize:13,textAlign:"center",paddingTop:4}}>לחצי לקבל השראה ✨</div>}</div>);
}

function TriviaSection({theme}) {
  const [trivia,setTrivia]=useState(null);
  const [loading,setLoading]=useState(true);
  const [selected,setSelected]=useState(null);
  const [revealed,setRevealed]=useState(false);
  const load=useCallback(()=>{ setLoading(true); setTrivia(null); setSelected(null); setRevealed(false); fetchTrivia().then(setTrivia).catch(()=>setTrivia(null)).finally(()=>setLoading(false)); },[]);
  useEffect(()=>{ load(); },[]);
  const choose=(i)=>{ if(revealed)return; setSelected(i); setRevealed(true); };
  return(<div style={{background:"white",border:`2px solid ${theme.accent}33`,borderRadius:22,padding:24,boxShadow:`0 8px 32px ${theme.accent}15`,position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${theme.accent},${theme.secondary})`}}/><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:26}}>🎯</span><div><div style={{color:theme.accent,fontSize:9,letterSpacing:"3px",fontFamily:"monospace"}}>✦ טריוויה יומית</div>{trivia&&<div style={{color:"#bbb",fontSize:11,marginTop:2}}>{trivia.topic}</div>}</div></div>{!loading&&<button onClick={load} style={{fontSize:11,color:theme.accent,background:`${theme.accent}12`,border:`1px solid ${theme.accent}33`,borderRadius:20,padding:"5px 12px",cursor:"pointer",fontFamily:"inherit"}}>שאלה חדשה ✨</button>}</div>{loading&&<div style={{display:"flex",alignItems:"center",gap:10}}><div style={{fontSize:24,animation:"float 1s ease-in-out infinite"}}>🎯</div><span style={{color:"#ccc",fontSize:13}}>מכין שאלה...</span></div>}{!loading&&trivia&&(<><div style={{color:theme.text,fontSize:16,fontFamily:"serif",lineHeight:1.5,marginBottom:20,fontWeight:600}}>{trivia.emoji} {trivia.question}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>{trivia.options?.map((opt,i)=>{ const isCorrect=i===trivia.correct; const isSelected=i===selected; let bg="#fafafa",border="#eee",color="#555",fw="normal"; if(revealed&&isCorrect){bg=`${theme.tertiary}15`;border=theme.tertiary;color=theme.tertiary;fw="700";} else if(revealed&&isSelected&&!isCorrect){bg="#FFF0F0";border="#E57373";color="#E57373";} return(<button key={i} onClick={()=>choose(i)} style={{background:bg,border:`2px solid ${border}`,borderRadius:14,padding:"12px 14px",cursor:revealed?"default":"pointer",textAlign:"right",color,fontSize:13,lineHeight:1.4,transition:"all .2s",fontFamily:"inherit",fontWeight:fw}} onMouseEnter={e=>{ if(!revealed)e.currentTarget.style.background=`${theme.accent}10`;}} onMouseLeave={e=>{ if(!revealed)e.currentTarget.style.background=bg;}}>{opt}</button>); })}</div>{revealed&&trivia.explanation&&<div style={{background:`${theme.accent}10`,border:`1px solid ${theme.accent}25`,borderRadius:14,padding:"14px 16px"}}><div style={{color:theme.accent,fontSize:10,letterSpacing:"2px",marginBottom:6,fontFamily:"monospace"}}>💡 הסבר</div><div style={{color:theme.text,fontSize:13,lineHeight:1.6}}>{trivia.explanation}</div></div>}</>)}{!loading&&!trivia&&<div style={{color:"#ccc",fontSize:13}}>שגיאה — לחצי על "שאלה חדשה"</div>}</div>);
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
    <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:6px;background:#f0f0f0}::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}@keyframes mIn{from{opacity:0;transform:scale(.92) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}@keyframes shimmer{0%{opacity:.3}50%{opacity:.8}100%{opacity:.3}}`}</style>
    <MagicSparkles colors={theme.sparkles}/>
    <div style={{position:"relative",zIndex:1,maxWidth:820,margin:"0 auto",padding:"32px 20px 80px"}}>

      <div style={{textAlign:"center",marginBottom:32,animation:"fadeUp .6s both"}}>
        <div style={{fontSize:42,marginBottom:10,animation:"float 4s ease-in-out infinite"}}>{theme.particle}</div>
        <div style={{fontSize:10,color:theme.subtext,letterSpacing:"4px",marginBottom:10,fontFamily:"monospace"}}>{theme.greeting} · {new Date().toLocaleDateString("he-IL",{weekday:"long",day:"numeric",month:"long"})}</div>
        <h1 style={{fontFamily:"serif",fontSize:"clamp(36px,7vw,60px)",background:`linear-gradient(135deg,${theme.accent},${theme.secondary},${theme.tertiary})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1.1,marginBottom:10,filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.1))"}}>הפיד של מיכ ✨</h1>
        <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:14}}>{KNOWLEDGE_TOPICS.map(t=><div key={t.id} style={{width:9,height:9,borderRadius:"50%",background:knowledge[t.id]?t.color:topicErrors[t.id]?"#FFCDD2":loadingTopics.has(t.id)?"#E0E0E0":"#F5F5F5",boxShadow:knowledge[t.id]?`0 0 8px ${t.color}88`:"none",transition:"all .4s"}}/>)}</div>
        {readyCount<KNOWLEDGE_TOPICS.length&&<div style={{color:"#ccc",fontSize:10,marginTop:8,fontFamily:"monospace"}}>טוען {readyCount}/{KNOWLEDGE_TOPICS.length}... ✨</div>}
      </div>

      <InspirationBanner theme={theme}/>

      <div style={{marginBottom:28,animation:"fadeUp .5s .15s both"}}>
        <div style={{color:theme.subtext,fontSize:10,letterSpacing:"3px",fontFamily:"monospace",marginBottom:12}}>✦ בריאות דיגיטלית</div>
        <SocialSection accent={theme.accent} textColor={theme.text}/>
      </div>

      <div style={{marginBottom:28}}>
        <div style={{color:theme.subtext,fontSize:10,letterSpacing:"3px",fontFamily:"monospace",marginBottom:12}}>✦ ידע יומי</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:14}}>
          {KNOWLEDGE_TOPICS.map((topic,i)=>{ const c=knowledge[topic.id]; const isLoading=loadingTopics.has(topic.id); const hasError=topicErrors[topic.id]; return(<div key={topic.id} style={{animation:`fadeUp .5s ${0.2+i*0.06}s both`}}><button onClick={()=>openTopic(topic)} style={{background:"white",border:`2px solid ${c?topic.color+"44":hasError?"#FFCDD2":"#eee"}`,borderRadius:20,padding:"20px 16px",cursor:"pointer",textAlign:"right",transition:"all .25s",width:"100%",position:"relative",overflow:"hidden",boxShadow:c?`0 6px 20px ${topic.color}22`:"0 2px 10px rgba(0,0,0,0.06)"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow=`0 12px 32px ${topic.color}33`;}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=c?`0 6px 20px ${topic.color}22`:"0 2px 10px rgba(0,0,0,0.06)";}}><div style={{position:"absolute",top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${topic.color},${topic.color}77)`,opacity:c?1:0,transition:"opacity .5s"}}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{paddingTop:2}}>{isLoading?<div style={{width:8,height:8,borderRadius:"50%",border:`2px solid ${topic.color}44`,borderTopColor:topic.color,animation:"spin 1s linear infinite"}}/>:hasError?<div style={{width:8,height:8,borderRadius:"50%",background:"#FFCDD2"}}/>:c?<div style={{width:8,height:8,borderRadius:"50%",background:topic.color,boxShadow:`0 0 8px ${topic.color}`}}/>:<div style={{width:8,height:8,borderRadius:"50%",background:"#E0E0E0"}}/>}</div><span style={{fontSize:30}}>{topic.icon}</span></div><div style={{color:topic.color,fontSize:13,fontWeight:700,marginTop:12,marginBottom:c?6:0}}>{topic.label}</div>{c&&<div style={{color:"#bbb",fontSize:11,lineHeight:1.4}}>{(c.hook||c.finding||c.question||"").substring(0,55)}...</div>}{c&&<div style={{marginTop:8,display:"inline-block",fontSize:9,letterSpacing:"1px",color:"white",background:topic.color,padding:"3px 9px",borderRadius:20}}>{FORMAT_LABELS[c.type]}</div>}{hasError&&<div style={{color:"#EF9A9A",fontSize:11,marginTop:6}}>לחצי לנסות שוב</div>}{isLoading&&!c&&<div style={{color:"#ddd",fontSize:11,marginTop:6}}>טוען...</div>}</button></div>); })}
        </div>
      </div>

      <div style={{marginBottom:28,animation:"fadeUp .5s .6s both"}}>
        <div style={{color:theme.subtext,fontSize:10,letterSpacing:"3px",fontFamily:"monospace",marginBottom:12}}>✦ פיתוח אישי</div>
        <button onClick={()=>setModal({type:"selfdev",content:selfDev,loading:selfDevLoading,error:selfDevError})} style={{width:"100%",background:"white",border:`2px solid ${theme.tertiary}33`,borderRadius:22,padding:24,cursor:"pointer",textAlign:"right",transition:"all .3s",boxShadow:`0 6px 20px ${theme.tertiary}15`}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 12px 32px ${theme.tertiary}25`;}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=`0 6px 20px ${theme.tertiary}15`;}}>
          <div style={{display:"flex",gap:14,alignItems:"flex-start"}}><span style={{fontSize:38,animation:"float 4s ease-in-out infinite"}}>{selfDev?.emoji||"🌟"}</span><div style={{flex:1}}>{selfDev?.source&&<div style={{color:"#ccc",fontSize:10,letterSpacing:"1px",marginBottom:5,fontFamily:"monospace"}}>📚 {selfDev.source}</div>}<div style={{color:theme.tertiary,fontSize:10,letterSpacing:"2px",marginBottom:5,fontFamily:"monospace"}}>פיתוח אישי{selfDev?` · ${FORMAT_LABELS[selfDev.type]}`:""}</div>{selfDevLoading?<div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${theme.tertiary}44`,borderTopColor:theme.tertiary,animation:"spin 1s linear infinite"}}/><span style={{color:"#ccc",fontSize:12}}>טוען...</span></div>:selfDevError?<div style={{color:"#EF9A9A",fontSize:13}}>שגיאה — לחצי לנסות שוב</div>:selfDev?(<><div style={{color:theme.text,fontSize:17,fontFamily:"serif",marginBottom:5,lineHeight:1.3,fontWeight:600}}>{selfDev.title}</div><div style={{color:"#bbb",fontSize:11,lineHeight:1.5}}>{(selfDev.hook||selfDev.finding||selfDev.question||"").substring(0,80)}...</div></>):null}</div></div>
        </button>
      </div>

      <div style={{marginBottom:28,animation:"fadeUp .5s .7s both"}}>
        <div style={{color:theme.subtext,fontSize:10,letterSpacing:"3px",fontFamily:"monospace",marginBottom:12}}>✦ טריוויה יומית</div>
        <TriviaSection theme={theme}/>
      </div>

      <div style={{animation:"fadeUp .5s .8s both"}}>
        <div style={{color:theme.subtext,fontSize:10,letterSpacing:"3px",fontFamily:"monospace",marginBottom:12}}>✦ תפריט יומי צמחוני</div>
        <div style={{background:"white",border:`2px solid ${theme.accent}22`,borderRadius:22,padding:24,boxShadow:`0 6px 20px ${theme.accent}12`,position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${theme.accent},${theme.secondary},${theme.tertiary})`}}/>
          {menuLoading?<div style={{display:"flex",alignItems:"center",gap:12,paddingTop:4}}><div style={{fontSize:24,animation:"float 1s ease-in-out infinite"}}>🥗</div><span style={{color:"#ccc",fontSize:13}}>מכין תפריט...</span></div>
          :menu?(<><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18,paddingTop:4}}><span style={{fontSize:28}}>{menu.emoji}</span><div><div style={{color:"#ccc",fontSize:9,letterSpacing:"2px",fontFamily:"monospace"}}>נושא היום</div><div style={{color:theme.text,fontSize:15,fontFamily:"serif",fontWeight:700}}>{menu.theme}</div></div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:12,marginBottom:16}}>{["breakfast","lunch","dinner","snack"].map(m=>menu[m]&&<div key={m} style={{background:"#FAFAFA",border:"1px solid #F0F0F0",borderRadius:16,padding:"14px 12px",transition:"all .2s"}}><div style={{color:"#ccc",fontSize:9,letterSpacing:"2px",marginBottom:6,fontFamily:"monospace"}}>{MEAL_ICONS[m]} {MEAL_NAMES[m]}</div><div style={{color:theme.text,fontSize:13,fontWeight:700,marginBottom:4,lineHeight:1.3}}>{menu[m].name}</div><div style={{color:"#bbb",fontSize:11,lineHeight:1.4,marginBottom:10}}>{menu[m].description}</div><button onClick={()=>setRecipeMeal(menu[m])} style={{fontSize:10,color:theme.accent,background:`${theme.accent}12`,border:`1px solid ${theme.accent}33`,borderRadius:20,padding:"4px 12px",cursor:"pointer",fontFamily:"inherit"}}>מתכון ✨</button></div>)}</div>{menu.tip&&<div style={{background:`${theme.accent}08`,border:`1px solid ${theme.accent}20`,borderRadius:14,padding:"12px 16px",color:"#aaa",fontSize:12}}>💡 {menu.tip}</div>}</>)
          :<div style={{color:"#ccc",fontSize:13,paddingTop:4}}>שגיאה — רעננ את הדף</div>}
        </div>
      </div>

    </div>
    <Modal show={!!modal} title={modal?.type==="selfdev"?"פיתוח אישי":modal?.topic?.label} icon={modal?.type==="selfdev"?"🌟":modal?.topic?.icon} color={modal?.type==="selfdev"?theme.tertiary:(modal?.topic?.color||theme.accent)} content={modal?.content} loading={!!modal?.loading} error={!!modal?.error} onClose={()=>setModal(null)} onRefresh={refreshModal} sourceLabel={modal?.type==="selfdev"?modal?.content?.source:null} textColor={theme.text}/>
    {recipeMeal&&<RecipeModal meal={recipeMeal} color={theme.accent} onClose={()=>setRecipeMeal(null)}/>}
  </div>);
}
