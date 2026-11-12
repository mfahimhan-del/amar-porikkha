const KEY="amarPorikkhaQuestions", RES="amarPorikkhaResults";
const sample=[
{id:1,level:"N5",chapter:1,subject:"Vocabulary",type:"MCQ",text:"「ありがとう」 শব্দের অর্থ কী?",choices:["ধন্যবাদ","সুপ্রভাত","বিদায়","দুঃখিত"],answer:"ধন্যবাদ"},
{id:2,level:"N5",chapter:1,subject:"Vocabulary",type:"লিখিত",text:"「先生」 শব্দের বাংলা অর্থ লিখুন।",choices:[],answer:"শিক্ষক"},
{id:3,level:"N5",chapter:1,subject:"Grammar",type:"শূন্যস্থান",text:"わたし ___ がくせいです。 শূন্যস্থানে কী বসবে?",choices:[],answer:"は"}
];
let questions=JSON.parse(localStorage.getItem(KEY)||"null")||sample;
let selected=new Set(), activeExam=[], timerHandle=null;
const $=id=>document.getElementById(id);
const chapterNumbers=Array.from({length:50},(_,i)=>i+1);

function persist(){localStorage.setItem(KEY,JSON.stringify(questions))}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function chosenChapters(){return [...$("chapterList").querySelectorAll("input:checked")].map(x=>Number(x.value))}
function fillChapterControls(){
 $("chapterList").innerHTML=chapterNumbers.map(n=>`<label class="chapter"><input type="checkbox" value="${n}" checked><span>অধ্যায় ${n}</span></label>`).join("");
 $("qchapter").innerHTML=chapterNumbers.map(n=>`<option value="${n}">অধ্যায় ${n}</option>`).join("");
 $("chapterList").querySelectorAll("input").forEach(x=>x.onchange=renderQuestions);
}
function tabs(){
 document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));
  document.querySelectorAll("main section").forEach(s=>s.hidden=s.id!==b.dataset.tab);
  if(b.dataset.tab==="make")renderQuestions();
  if(b.dataset.tab==="results")renderResults();
 });
}
function filteredQuestions(){
 const chapters=chosenChapters();
 return questions.filter(q=>
  q.level===$("level").value &&
  ($("type").value==="all"||q.type===$("type").value) &&
  ($("subject").value==="all"||q.subject===$("subject").value) &&
  chapters.includes(Number(q.chapter||1))
 );
}
function renderQuestions(){
 const list=filteredQuestions();
 $("availableInfo").textContent=`এই সেটিংসে পাওয়া যাচ্ছে ${list.length}টি প্রশ্ন।`;
 $("questionList").innerHTML=list.length?list.map(q=>`<div class="qitem"><label><input type="checkbox" data-id="${q.id}" ${selected.has(q.id)?"checked":""}><span><b>${esc(q.text)}</b><br><span class="muted">${esc(q.level)} · অধ্যায় ${Number(q.chapter||1)} · ${esc(q.subject)} · ${esc(q.type)}</span></span></label></div>`).join(""):"এই ফিল্টারে প্রশ্ন নেই। প্রশ্ন যোগ ট্যাব থেকে প্রশ্ন তৈরি করুন।";
 $("questionList").querySelectorAll("input").forEach(c=>c.onchange=()=>c.checked?selected.add(Number(c.dataset.id)):selected.delete(Number(c.dataset.id)));
}
["level","type","subject","count"].forEach(id=>$(id).onchange=renderQuestions);
$("selectAllChapters").onclick=()=>{$("chapterList").querySelectorAll("input").forEach(x=>x.checked=true);renderQuestions()};
$("clearChapters").onclick=()=>{$("chapterList").querySelectorAll("input").forEach(x=>x.checked=false);renderQuestions()};
$("qtype").onchange=()=>{$("choices").hidden=$("qtype").value!=="MCQ"};
$("save").onclick=()=>{
 const text=$("qtext").value.trim(),answer=$("answer").value.trim();
 if(!text||!answer){$("saveMsg").textContent="প্রশ্ন ও উত্তর দুটোই লিখুন।";return}
 const choices=$("qtype").value==="MCQ"?[...document.querySelectorAll(".choice")].map(x=>x.value.trim()).filter(Boolean):[];
 if($("qtype").value==="MCQ"&&choices.length<2){$("saveMsg").textContent="কমপক্ষে ২টি অপশন দিন।";return}
 questions.push({id:Date.now(),level:$("qlevel").value,chapter:Number($("qchapter").value),subject:$("qsubject").value,type:$("qtype").value,text,choices,answer});
 persist();$("qtext").value="";$("answer").value="";document.querySelectorAll(".choice").forEach(x=>x.value="");
 $("saveMsg").textContent="প্রশ্ন সংরক্ষিত হয়েছে।";renderQuestions();
};
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function startExam(list){
 if(!list.length){alert("এই সেটিংসে কোনো প্রশ্ন পাওয়া যায়নি। আগে প্রশ্ন যোগ করুন বা অধ্যায় নির্বাচন করুন।");return}
 activeExam=list;
 $("exam").hidden=false;
 const seconds=Math.max(1,Math.min(300,Number($("minutes").value)||15))*60;
 const end=Date.now()+seconds*1000;
 $("exam").innerHTML=`<h3>পরীক্ষা চলছে</h3><p id="timer" class="timer"></p><form id="examForm">${activeExam.map((q,i)=>`<div class="examq"><b>${i+1}. ${esc(q.text)}</b><div class="muted">অধ্যায় ${Number(q.chapter||1)} · ${esc(q.type)}</div>${q.type==="MCQ"?q.choices.map(c=>`<label class="answer-choice"><input type="radio" name="a${i}" value="${esc(c)}"> ${esc(c)}</label>`).join(""):`<input name="a${i}" placeholder="উত্তর লিখুন" autocomplete="off">`}</div>`).join("")}<button class="primary" type="submit">পরীক্ষা জমা দিন</button></form>`;
 const form=$("examForm");
 function grade(){
  if(timerHandle)clearInterval(timerHandle);
  const data=new FormData(form);let score=0;
  activeExam.forEach((q,i)=>{const a=String(data.get("a"+i)||"").trim();if(a.toLowerCase()===String(q.answer).trim().toLowerCase())score++});
  const arr=JSON.parse(localStorage.getItem(RES)||"[]");
  arr.unshift({date:new Date().toLocaleString("bn-BD"),score,total:activeExam.length});
  localStorage.setItem(RES,JSON.stringify(arr));
  $("exam").innerHTML=`<h3>পরীক্ষা শেষ!</h3><p class="result-score">তোমার নম্বর: ${score} / ${activeExam.length}</p><p>ফলাফল ট্যাবে তোমার আগের পরীক্ষার রেকর্ড থাকবে।</p><button class="primary" id="backFromExam">ফিরে যাও</button>`;
  $("backFromExam").onclick=()=>$("exam").hidden=true;
 }
 timerHandle=setInterval(()=>{
  const left=Math.max(0,Math.ceil((end-Date.now())/1000));
  $("timer").textContent=`বাকি সময়: ${Math.floor(left/60)}:${String(left%60).padStart(2,"0")}`;
  if(!left)grade();
 },500);
 form.onsubmit=e=>{e.preventDefault();grade()};
}
$("start").onclick=()=>{
 const chosen=questions.filter(q=>selected.has(q.id)&&filteredQuestions().some(f=>f.id===q.id));
 if(!chosen.length){alert("আগে তালিকা থেকে অন্তত একটি প্রশ্ন নির্বাচন করুন।");return}
 startExam(chosen);
};
$("randomStart").onclick=()=>{
 const pool=filteredQuestions(),count=Number($("count").value)||20;
 if(!chosenChapters().length){alert("অন্তত একটি অধ্যায় নির্বাচন করুন।");return}
 if(pool.length<count)alert(`এই সেটিংসে ${pool.length}টি প্রশ্ন আছে। তাই ${pool.length}টি প্রশ্ন দিয়েই পরীক্ষা শুরু হবে।`);
 startExam(shuffle(pool).slice(0,count));
};
function renderResults(){
 const a=JSON.parse(localStorage.getItem(RES)||"[]");
 $("resultList").innerHTML=a.length?a.map(x=>`<div class="qitem">${esc(x.date)} — <b>${x.score}/${x.total}</b></div>`).join(""):"এখনো কোনো ফলাফল নেই।";
}
fillChapterControls();tabs();$("choices").hidden=false;renderQuestions();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
