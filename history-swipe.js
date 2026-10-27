(()=>{
"use strict";
const list=document.getElementById("historyList");if(!list)return;
const KEY="fuyumoe-senseki-v1",TRASH="historyTrash";
const notice=document.createElement("div");notice.id="historyUndo";notice.hidden=true;notice.setAttribute("role","status");notice.setAttribute("aria-live","polite");
const message=document.createElement("span"),undo=document.createElement("button");undo.type="button";undo.textContent="取り消す";notice.append(message,undo);list.before(notice);
let open=null;
function read(){const raw=localStorage.getItem(KEY);if(!raw)throw Error("記録が見つかりません。画面を再読み込みしてください。");const db=JSON.parse(raw);if(db.schema!==1||!db.days||typeof db.days!=="object"||Array.isArray(db.days)||(db.sessions&&!Array.isArray(db.sessions))||(db[TRASH]&&!Array.isArray(db[TRASH])))throw Error("記録を読み込めません。データは変更していません。");return db}
function say(text,canUndo=false){message.textContent=text;notice.hidden=false;undo.hidden=!canUndo}
function refresh(){document.dispatchEvent(new Event("senseki-history-changed"))}
function setOpen(row,show){if(open&&open!==row)setOpen(open,false);row.classList.toggle("swipe-open",show);row.querySelector(".history-remove").tabIndex=show?0:-1;row.querySelector(".history-remove").disabled=!show;row.querySelector(".history-remove").setAttribute("aria-hidden",String(!show));if(show)open=row;else if(open===row)open=null}
function removeEntry(kind,id){
 const db=read();let entry,index=-1;
 if(kind==="legacy"){if(!Object.hasOwn(db.days,id))throw Error("記録が更新されています。画面を再読み込みしてください。");entry=db.days[id];delete db.days[id]}
 else if(kind==="session"){index=(db.sessions||[]).findIndex(s=>s.id===id);if(index<0)throw Error("記録が更新されています。画面を再読み込みしてください。");entry=db.sessions.splice(index,1)[0]}
 else throw Error("記録の種類が不正です。");
 (db[TRASH]??=[]).push({kind,id,entry,index,deletedAt:Date.now()});
 localStorage.setItem(KEY,JSON.stringify(db));
}
function restoreEntry(){
 const db=read(),trash=db[TRASH]||[],saved=trash.at(-1);if(!saved)return false;
 if(saved.kind==="legacy"){if(Object.hasOwn(db.days,saved.id))throw Error("同じ日付の記録があります。上書きせず復元を停止しました。");db.days[saved.id]=saved.entry}
 else if(saved.kind==="session"){db.sessions??=[];if(db.sessions.some(s=>s.id===saved.id))throw Error("同じ記録が存在するため復元を停止しました。");db.sessions.splice(Math.max(0,Math.min(saved.index,db.sessions.length)),0,saved.entry)}
 else throw Error("削除記録の形式が不正です。");
 trash.pop();localStorage.setItem(KEY,JSON.stringify(db));return true;
}
function makeRow(link){
 if(link.parentElement.classList.contains("history-swipe"))return;
 const query=new URL(link.href,location.href).searchParams,kind=query.get("kind"),id=query.get("id");
 const row=document.createElement("div");row.className="history-swipe";link.before(row);row.append(link);
 const del=document.createElement("button");del.type="button";del.className="history-remove";del.tabIndex=-1;del.disabled=true;del.setAttribute("aria-hidden","true");del.setAttribute("aria-label",link.querySelector("strong").textContent+"を削除");
 del.innerHTML='<svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg><span>削除</span>';row.append(del);
 let start=null,axis=null,moved=false,suppressUntil=0;
 link.addEventListener("pointerdown",e=>{if(!e.isPrimary||e.button!==0)return;start={x:e.clientX,y:e.clientY,wasOpen:row.classList.contains("swipe-open")};axis=null;moved=false});
 link.addEventListener("pointermove",e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(!axis&&Math.max(Math.abs(dx),Math.abs(dy))>10)axis=Math.abs(dx)>Math.abs(dy)*1.25?"x":"y";if(axis!=="x")return;moved=true;suppressUntil=Date.now()+500;if(Math.abs(dx)>28)setOpen(row,dx<0);});
 const end=()=>{if(moved)suppressUntil=Date.now()+500;start=null;axis=null};link.addEventListener("pointerup",end);link.addEventListener("pointercancel",end);
 link.addEventListener("click",e=>{if(Date.now()<suppressUntil||row.classList.contains("swipe-open")){e.preventDefault();if(Date.now()>=suppressUntil)setOpen(row,false)}});
 link.addEventListener("keydown",e=>{if(e.key==="ArrowLeft"||e.key==="Delete"){e.preventDefault();setOpen(row,true);del.focus()}else if(e.key==="Escape")setOpen(row,false)});
 del.onclick=()=>{try{removeEntry(kind,id);row.remove();open=null;if(!list.querySelector(".item"))list.textContent="履歴はまだありません。";say("記録を削除しました",true);refresh()}catch(e){say(e.message,true)}};
}
function rebuild(){
 const db=read(),entries=[...Object.entries(db.days).filter(([,rows])=>Array.isArray(rows)).map(([date,rows])=>({kind:"legacy",id:date,date,started:"",rows})),...(db.sessions||[]).filter(s=>Array.isArray(s.rows)).map(s=>({...s,kind:"session"}))].sort((a,b)=>(b.date+" "+b.started).localeCompare(a.date+" "+a.started));
 list.replaceChildren();open=null;
 for(const e of entries){const link=document.createElement("a"),title=document.createElement("strong"),info=document.createElement("small"),[y,m,d]=e.date.split("-").map(Number),wins=e.rows.filter(r=>r.result==="win").length;link.className="item card";link.href="./detail.html?id="+encodeURIComponent(e.id)+"&kind="+e.kind;title.textContent=y+"年 "+m+"/"+d+"（"+"日月火水木金土"[new Date(y,m-1,d).getDay()]+"）"+(e.kind==="session"?" "+e.started+"〜":" 日付別記録");info.textContent=e.rows.length+"戦 "+wins+"勝 "+(e.rows.length-wins)+"敗　勝率 "+(e.rows.length?(100*wins/e.rows.length).toFixed(1)+"%":"0%");link.append(title,info);list.append(link);makeRow(link)}
 if(!entries.length)list.textContent="履歴はまだありません。";
}
undo.onclick=()=>{try{if(!restoreEntry())return;rebuild();refresh();say("削除した記録を戻しました",!!read()[TRASH]?.length)}catch(e){say(e.message,true)}};
list.querySelectorAll(".item").forEach(makeRow);
document.addEventListener("pointerdown",e=>{if(open&&!open.contains(e.target))setOpen(open,false)});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&open)setOpen(open,false)});
window.addEventListener("storage",e=>{if(e.key===KEY){try{rebuild();refresh()}catch(error){say(error.message)}}});
window.addEventListener("pageshow",e=>{if(e.persisted){try{rebuild();refresh()}catch(error){say(error.message)}}});
try{if(read()[TRASH]?.length)say("削除した記録を戻せます",true)}catch{}
})();
