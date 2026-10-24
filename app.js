(()=>{
"use strict";
const VERSION="1.2.0-beta.1",KEY="fuyumoe-senseki-v1",SELECTED="fuyumoe-senseki-selected", $=id=>document.getElementById(id);
const clone=v=>JSON.parse(JSON.stringify(v)),today=()=>new Date().toLocaleDateString("sv-SE");
let db={schema:1,days:{},sessions:[]},selection={kind:"legacy",day:today()},undo=[],loadError=false;
const notify=message=>{const el=$("toast");el.textContent=message;el.style.display="block";clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.style.display="none",2600)};
function validRow(r){return r&&["win","loss"].includes(r.result)&&[null,"promotion","demotion",undefined].includes(r.tag)}
function valid(v){return v&&v.schema===1&&v.days&&!Array.isArray(v.days)&&typeof v.days==="object"&&Object.entries(v.days).every(([d,rs])=>/^\d{4}-\d\d-\d\d$/.test(d)&&Array.isArray(rs)&&rs.length<=50000&&rs.every(validRow))&&(!("sessions"in v)||(Array.isArray(v.sessions)&&v.sessions.length<=20000&&v.sessions.every(s=>s&&typeof s.id==="string"&&/^\d{4}-\d\d-\d\d$/.test(s.date)&&typeof s.started==="string"&&Array.isArray(s.rows)&&s.rows.length<=50000&&s.rows.every(validRow))))}
function save(){if(loadError){notify("保存データに問題があります。記録を保護するため書き込みを停止しました");return false}try{localStorage.setItem(KEY,JSON.stringify(db));return true}catch{notify("保存できません。空き容量を確認してください");return false}}
function load(){try{const raw=localStorage.getItem(KEY);if(raw){const v=JSON.parse(raw);if(valid(v))db=v;else{loadError=true;notify("保存データが不正です。上書きせずバックアップを確認してください")}}if(!db.sessions)db.sessions=[];const s=JSON.parse(localStorage.getItem(SELECTED)||"null");if(s&&s.kind==="session"&&db.sessions.some(x=>x.id===s.id))selection=s;else if(s&&s.kind==="legacy"&&typeof s.day==="string")selection=s}catch{loadError=true;notify("記録の読み込みに失敗しました。データは上書きしません")}}
function current(){return selection.kind==="session"?db.sessions.find(s=>s.id===selection.id):null}
function rows(){return selection.kind==="session"?current()?.rows||[]:db.days[selection.day]||[]}
function date(){return current()?.date||selection.day}
function select(next){selection=next;localStorage.setItem(SELECTED,JSON.stringify(selection));render()}
function edit(fn){const before=clone(db);fn();if(!save()){db=before;render();return false}undo.push(before);if(undo.length>40)undo.shift();render();return true}
function counts(a){const w=a.filter(r=>r.result==="win").length;return `${a.length}戦 ${w}勝 ${a.length-w}敗`}
function percent(a){return a.length?(Math.round(a.filter(r=>r.result==="win").length/a.length*1000)/10).toFixed(1)+"%":"0%"}
function dateLabel(d){const [y,m,n]=d.split("-").map(Number);const weekday=["日","月","火","水","木","金","土"][new Date(y,m-1,n).getDay()];return `${y}年 ${m}/${n}（${weekday}）`}
function historyEntries(){const legacy=Object.keys(db.days).map(day=>({kind:"legacy",day,date:day,started:"00:00",rows:db.days[day]}));const sessions=db.sessions.map(s=>({...s,kind:"session"}));return [...legacy,...sessions].sort((a,b)=>(b.date+" "+b.started).localeCompare(a.date+" "+a.started))}
function sessionIndex(){const s=current();if(!s)return 1;return db.sessions.filter(x=>x.date===s.date).findIndex(x=>x.id===s.id)+1+Number(Object.hasOwn(db.days,s.date))}
function render(){
 const a=rows(),s=current();
 $("dateLabel").textContent=dateLabel(date());
 $("sessionLabel").textContent=s?`第${sessionIndex()}回・${s.started}〜`:"日付別記録";
 $("totalText").textContent=counts(a);$("rate").textContent=percent(a);
 for(const [tag,id,label] of [["promotion","promotionStat","昇格戦"],["demotion","demotionStat","降格戦"]])$(""+id).textContent=`${label}：${counts(a.filter(r=>r.tag===tag))}`;
 const sequence=$("sequence");sequence.replaceChildren();
 a.forEach((r,i)=>{const mark=document.createElement("span");mark.className=r.result==="win"?"mark-win":"mark-loss";mark.textContent=r.result==="win"?"〇":"✕";sequence.append(mark);if(r.tag){const tag=document.createElement("span");tag.className="tag-inline";tag.textContent=r.tag==="promotion"?"（←昇格戦）":"（←降格戦）";sequence.append(tag)}});
 if(!a.length){const empty=document.createElement("span");empty.className="hint";empty.textContent="〇または✕を押して記録を開始";sequence.append(empty)}
 const last=a.at(-1);for(const tag of ["promotion","demotion"])$(""+tag).classList.toggle("selected",last?.tag===tag);
 if($("log").hidden===false)renderLog();renderHistory();
}
function renderLog(){const box=$("log");box.replaceChildren();rows().forEach((r,i)=>{const line=document.createElement("div");line.className="logrow";const mark=document.createElement("span");mark.textContent=r.result==="win"?"〇":"✕";mark.className=r.result==="win"?"mark-win":"mark-loss";const info=document.createElement("span");info.className="meta";info.textContent=`${i+1}試合目${r.tag?" · "+(r.tag==="promotion"?"昇格戦":"降格戦"):""}`;const btn=document.createElement("button");btn.textContent="削除";btn.addEventListener("click",()=>{if(confirm(`${i+1}試合目を削除しますか？`))edit(()=>rows().splice(i,1))});line.append(mark,info,btn);box.append(line)});if(!rows().length)box.textContent="削除できる記録はありません"}
function renderHistory(){const box=$("historyItems");if(!$("history").classList.contains("open"))return;box.replaceChildren();historyEntries().forEach(e=>{const btn=document.createElement("button");btn.className="history-item";const active=e.kind===selection.kind&&(e.kind==="session"?e.id===selection.id:e.day===selection.day);if(active)btn.classList.add("active");const left=document.createElement("span");left.textContent=`${dateLabel(e.date)} ${e.kind==="session"?e.started+"〜":"日付別"}`;const right=document.createElement("span");right.textContent=counts(e.rows);btn.append(left,right);btn.addEventListener("click",()=>{select(e.kind==="session"?{kind:"session",id:e.id}:{kind:"legacy",day:e.day});$("history").classList.remove("open");window.scrollTo({top:0,behavior:"smooth"})});box.append(btn)})}
for(const result of ["win","loss"])$(result).addEventListener("click",()=>edit(()=>{if(selection.kind==="legacy")(db.days[selection.day]??=[]).push({id:crypto.randomUUID(),result,tag:null});else current().rows.push({id:crypto.randomUUID(),result,tag:null})}));
for(const tag of ["promotion","demotion"])$(tag).addEventListener("click",()=>{if(!rows().length)return notify("先に勝敗を入力してください");edit(()=>{const last=rows().at(-1);last.tag=last.tag===tag?null:tag})});
$("undo").addEventListener("click",()=>{if(!undo.length)return notify("取り消せる操作はありません");const previous=undo.pop(),after=db;db=previous;if(save())render();else db=after});
$("deleteOne").addEventListener("click",()=>{$("log").hidden=!$("log").hidden;if(!$("log").hidden)renderLog();$("log").scrollIntoView({behavior:"smooth",block:"nearest"})});
$("newSession").addEventListener("click",()=>{if(!confirm("新しい記録を開始しますか？ 現在の記録は履歴に残ります。"))return;const now=new Date(),s={id:crypto.randomUUID(),date:today(),started:now.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit",hour12:false}),rows:[]};if(!edit(()=>db.sessions.push(s)))return;select({kind:"session",id:s.id});$("log").hidden=true;notify("新しい記録を開始しました")});
$("historyBtn").addEventListener("click",()=>{$("history").classList.toggle("open");renderHistory();if($("history").classList.contains("open"))$("history").scrollIntoView({behavior:"smooth",block:"nearest"})});
function plainSession(e){const a=e.rows;const marks=a.map(r=>(r.result==="win"?"〇":"✕")+(r.tag?`（←${r.tag==="promotion"?"昇格戦":"降格戦"}）`:"")).join("");return `${dateLabel(e.date)} ${e.kind==="session"?e.started+"〜":"日付別"}\n${marks}\n${counts(a)}　勝率 ${percent(a)}\n昇格戦：${counts(a.filter(r=>r.tag==="promotion"))}\n降格戦：${counts(a.filter(r=>r.tag==="demotion"))}`}
$("copy").addEventListener("click",async()=>{const all=historyEntries();const str=all.length?all.map(plainSession).join("\n\n"):"記録はありません";try{await navigator.clipboard.writeText(str);notify("全ての戦績をコピーしました")}catch{notify("コピーできませんでした。ブラウザの権限を確認してください")}});
$("backup").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="senseki-backup-"+today()+".json";link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);notify("バックアップを保存しました")});
$("restore").addEventListener("click",()=>$("file").click());
$("file").addEventListener("change",async ev=>{const file=ev.target.files[0];if(!file)return;try{const imported=JSON.parse(await file.text());if(!valid(imported))throw new Error("形式が違います");if(!confirm("現在の記録をバックアップで置き換えますか？ 先に現在のバックアップを保存してください。"))return;const old=clone(db),wasError=loadError;db=imported;loadError=false;if(!db.sessions)db.sessions=[];if(save()){undo.push(old);select({kind:"legacy",day:today()});notify("バックアップを復元しました")}else{db=old;loadError=wasError}}catch(e){notify("復元できません："+e.message)}finally{ev.target.value=""}});
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
load();$("version").textContent="v"+VERSION;render();if(sessionStorage.getItem("senseki-updated")===VERSION){sessionStorage.removeItem("senseki-updated");notify("最新版に更新しました")}
})();
