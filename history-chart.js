(()=>{
"use strict";
const host=document.getElementById("monthlyChart");if(!host)return;
const daily=new Map();let readFailed=false;
try{
 const db=JSON.parse(localStorage.getItem("fuyumoe-senseki-v1")||"{}");
 const add=(date,rows)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Array.isArray(rows))return;const parsed=new Date(date+"T12:00:00");if(!Number.isFinite(+parsed)||parsed.getFullYear()+"-"+String(parsed.getMonth()+1).padStart(2,"0")+"-"+String(parsed.getDate()).padStart(2,"0")!==date)return;for(const row of rows){if(!row||!["win","loss"].includes(row.result))continue;const day=daily.get(date)||{wins:0,total:0};day.total++;if(row.result==="win")day.wins++;daily.set(date,day)}};
 for(const [date,rows] of Object.entries(db.days||{}))add(date,rows);
 for(const s of Array.isArray(db.sessions)?db.sessions:[])if(s)add(s.date,s.rows);
}catch{readFailed=true}
const now=new Date(),monthOf=date=>{const [y,m]=date.split("-").map(Number);return y*12+m-1},current=now.getFullYear()*12+now.getMonth(),months=[...daily.keys()].map(monthOf),latest=Math.max(current,...months),earliest=Math.min(latest,...months);
let shown=latest;const $=id=>host.querySelector("#"+id);
host.innerHTML='<div class="mc-nav"><button type="button" id="mc-prev" aria-label="前の月">◀</button><strong id="mc-month"></strong><button type="button" id="mc-next" aria-label="次の月">▶</button><span>日別勝率</span></div><div class="mc-plot"><div class="mc-grid" aria-hidden="true"><div><span>100%</span></div><div><span>50%</span></div><div><span>0%</span></div></div><div id="mc-bars" class="mc-bars" aria-label="日ごとの勝率"></div><div class="mc-dates" id="mc-dates" aria-hidden="true"></div><div id="mc-popup" class="mc-popup" role="status" aria-live="polite" hidden></div><div id="mc-empty" class="mc-empty" hidden></div></div>';
const popup=$("mc-popup"),bars=$("mc-bars");
function close(){popup.hidden=true;bars.querySelectorAll('[aria-pressed="true"]').forEach(b=>b.setAttribute("aria-pressed","false"))}
function render(){
 close();const year=Math.floor(shown/12),month=shown%12+1,count=new Date(year,month,0).getDate(),prefix=year+"-"+String(month).padStart(2,"0")+"-";
 $("mc-month").textContent=year+"年"+month+"月";$("mc-prev").disabled=shown<=earliest;$("mc-next").hidden=shown>=latest;bars.replaceChildren();let recorded=false;
 for(let day=1;day<=count;day++){
  const data=daily.get(prefix+String(day).padStart(2,"0")),button=document.createElement("button");button.type="button";button.className="mc-day";button.disabled=!data;
  button.setAttribute("aria-label",month+"月"+day+"日 "+(data?(100*data.wins/data.total).toFixed(1)+"% "+data.total+"戦"+data.wins+"勝"+(data.total-data.wins)+"敗":"記録なし"));
  if(data){recorded=true;button.setAttribute("aria-pressed","false");const fill=document.createElement("span");fill.style.height=(100*data.wins/data.total)+"%";button.append(fill);button.onclick=()=>{const wasOpen=button.getAttribute("aria-pressed")==="true";close();if(wasOpen)return;button.setAttribute("aria-pressed","true");popup.replaceChildren();const title=document.createElement("span"),value=document.createElement("strong"),detail=document.createElement("small");title.textContent=month+"月"+day+"日";value.textContent=(100*data.wins/data.total).toFixed(1)+"%";detail.textContent=data.total+"戦 "+data.wins+"勝"+(data.total-data.wins)+"敗";popup.append(title,value,detail);popup.hidden=false;const width=bars.clientWidth,half=popup.offsetWidth/2;popup.style.left=Math.max(half,Math.min(width-half,width*(day-.5)/count))+"px"};}
  bars.append(button);
 }
 $("mc-dates").replaceChildren(...[1,10,20,count].map(day=>{const label=document.createElement("span");label.textContent=day;return label}));
 $("mc-empty").hidden=recorded;$("mc-empty").textContent=readFailed?"記録を読み込めませんでした":"この月の記録はありません";
}
$("mc-prev").onclick=()=>{if(shown>earliest){shown--;render()}};$("mc-next").onclick=()=>{if(shown<latest){shown++;render()}};
document.addEventListener("pointerdown",event=>{if(!popup.hidden&&!popup.contains(event.target)&&!event.target.closest(".mc-day:not(:disabled)"))close()});
document.addEventListener("keydown",event=>{if(event.key==="Escape")close()});
render();
})();
