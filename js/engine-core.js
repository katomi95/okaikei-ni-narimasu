/* engine-core.js — 音・状態・HUD・シーン描画・会話プレイヤー */
/* =========================================================
   お会計になります  ―  engine
   ========================================================= */
"use strict";

/* ---------- tiny audio ---------- */
const Snd = (()=>{
  let ctx=null, on=true;
  function ac(){ if(!ctx){ try{ctx=new (window.AudioContext||window.webkitAudioContext)()}catch(e){} } return ctx; }
  function tone(f,d,type,vol,slideTo){
    if(!on) return; const c=ac(); if(!c) return;
    const o=c.createOscillator(), g=c.createGain();
    o.type=type||'sine'; o.frequency.setValueAtTime(f,c.currentTime);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo,c.currentTime+d);
    g.gain.setValueAtTime(0.0001,c.currentTime);
    g.gain.exponentialRampToValueAtTime(vol||0.06,c.currentTime+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+d);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+d+0.02);
  }
  return {
    toggle(){ on=!on; return on; },
    isOn(){ return on; },
    tap(){ tone(620,0.05,'square',0.03); },
    type(){ tone(1400,0.012,'square',0.008); },
    ok(){ tone(660,0.09,'triangle',0.06); setTimeout(()=>tone(990,0.16,'triangle',0.06),90); },
    fail(){ tone(300,0.16,'sawtooth',0.05,140); },
    deny(){ tone(200,0.3,'square',0.04,90); },
    drama(){ tone(58,1.5,'sine',0.14); tone(87,1.5,'sine',0.05); },
    ring(){ tone(440,0.3,'sine',0.05); setTimeout(()=>tone(440,0.3,'sine',0.05),450); },
    ding(){ tone(880,0.07,'sine',0.05); setTimeout(()=>tone(1320,0.13,'sine',0.05),70); },
    buzz(){ tone(120,0.5,'sawtooth',0.05); }
  };
})();

/* ---------- helpers ---------- */
const $ = s=>document.querySelector(s);
const $$ = s=>Array.from(document.querySelectorAll(s));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const yen = n=>'¥'+n.toLocaleString('ja-JP');

/* ---------- state ---------- */
let S;
function freshState(){
  return {
    trust:50, shame:5, conf:0,
    fugitive:0, annoy:0, kindness:70, attention:0,
    batt:47, min:0, acts:0,
    flags:new Set(), done:new Set(), count:{},
    unlocked:new Set(), seenNew:new Set(),
    app:null, playing:false, ended:null, waitCount:0,
    tab:'search', log:[]
  };
}
function has(f){ return S.flags.has(f); }
function on(f){ S.flags.add(f); }
function clockStr(){
  const t=13*60+12+S.min;
  return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
}

/* ---------- notices & deltas ---------- */
function notice(txt,kind){
  const el=document.createElement('div');
  el.className='notice'+(kind?' '+kind:''); el.textContent=txt;
  $('#noticeLayer').appendChild(el);
  setTimeout(()=>{ el.style.transition='opacity .4s'; el.style.opacity='0'; setTimeout(()=>el.remove(),400); },2600);
}
const PARAM_LABEL={trust:'信用度',shame:'羞恥心',conf:'店員の困惑',fugitive:'逃亡犯感',annoy:'面倒な客度',kindness:'店員の優しさ',attention:'周囲の注目度'};
function showDelta(key,v){
  const el=document.createElement('div');
  el.className='delta';
  el.textContent=PARAM_LABEL[key]+' '+(v>0?'+':'')+v;
  const bad=(key==='trust'||key==='kindness')?v<0:v>0;
  el.style.color= bad?'#ff9f8f':'#9fe8bf';
  el.style.left=(18+Math.random()*46)+'%';
  el.style.top=(30+Math.random()*34)+'%';
  $('#deltaLayer').appendChild(el);
  setTimeout(()=>el.remove(),1400);
}
function applyFx(fx){
  if(!fx) return;
  let i=0;
  for(const k in fx){
    const v=fx[k]; if(!v) continue;
    S[k]=clamp(S[k]+v, 0, k==='trust'||k==='kindness'?100:200);
    setTimeout(((kk,vv)=>()=>showDelta(kk,vv))(k,v), i*180); i++;
  }
  renderHUD();
}

/* ---------- HUD ---------- */
function renderHUD(){
  $('#vTrust').textContent=S.trust; $('#bTrust').style.width=S.trust+'%';
  $('#vShame').textContent=S.shame; $('#bShame').style.width=clamp(S.shame,0,100)+'%';
  $('#vConf').textContent=S.conf;   $('#bConf').style.width=clamp(S.conf,0,100)+'%';
  $('#clock').textContent=clockStr();
  $('#pClock').textContent=clockStr();
  const b=Math.round(S.batt);
  $('#battLv').style.width=clamp(b,0,100)+'%';
  $('#battTx').textContent=b+'%';
  $('#pBatt').textContent=(b<=10?'🪫':'🔋')+b+'%';
  const w=$('#battWrap'); w.className='batt'+(b<=10?' crit':(b<=20?' low':''));
  $('#handset').classList.toggle('dead', b<=0);
}

/* ---------- scene ---------- */
const FACES={
  normal:{eyes:['circle','circle'],mouth:'M-7 38 q7 5 14 0',brow:'flat'},
  smile:{mouth:'M-8 37 q8 7 16 0',brow:'up'},
  worry:{mouth:'M-7 40 q7 -4 14 0',brow:'down'},
  confused:{mouth:'M-7 39 q4 -4 7 1 q3 4 7 -1',brow:'tilt'},
  gentle:{mouth:'M-7 38 q7 6 14 0',brow:'up'},
  blank:{mouth:'M-7 39 h14',brow:'flat'}
};
function setFace(name){
  const f=FACES[name]||FACES.normal;
  $('#faceMouth').setAttribute('d',f.mouth);
  const bl=$('#faceBrowL'), br=$('#faceBrowR');
  const B={up:['M-14 15 q5 -4 10 -1','M4 14 q5 3 10 1'],
           flat:['M-14 16 q5 -3 10 0','M4 16 q5 -3 10 0'],
           down:['M-14 17 q5 -4 10 -4','M4 13 q5 4 10 4'],
           tilt:['M-14 16 q5 -5 10 -3','M4 14 q5 1 10 3']};
  const s=B[f.brow]||B.flat; bl.setAttribute('d',s[0]); br.setAttribute('d',s[1]);
}
function clerkEmote(ch){
  const e=$('#clerkEmote'); e.textContent=ch||'';
  e.setAttribute('opacity', ch?'1':'0');
  if(ch) setTimeout(()=>e.setAttribute('opacity','0'),2200);
}
function nbEmote(ch){
  const e=$('#nbEmote'); e.textContent=ch||'';
  e.setAttribute('opacity', ch?'1':'0');
  if(ch) setTimeout(()=>e.setAttribute('opacity','0'),2200);
}
const QUEUE_COLORS=['#7d6b8f','#5f7f6b','#8f6b5f','#5f6f8f','#8f8a5f'];
function renderScene(){
  // clerk expression by confusion
  if(S.conf>=70) setFace('confused');
  else if(S.conf>=40) setFace('worry');
  else if(S.kindness>=70) setFace('gentle');
  else setFace('normal');
  // queue grows with time
  const q=$('#queue'); const want=clamp(Math.floor((S.min-6)/5),0,5);
  while(q.childElementCount>want) q.lastElementChild.remove();
  while(q.childElementCount<want){
    const i=q.childElementCount;
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('transform','translate('+(592-i*42)+',206) scale(.62)');
    g.setAttribute('opacity','0');
    g.innerHTML='<ellipse cx="0" cy="126" rx="24" ry="6" fill="#00000022"/>'+
      '<path d="M-22 56 q22 -14 44 0 l5 66 h-54 z" fill="'+QUEUE_COLORS[i%5]+'"/>'+
      '<circle cx="0" cy="26" r="22" fill="#eec8a4"/>'+
      '<path d="M-23 18 q23 -30 46 0 q-6 -20 -23 -20 q-17 0 -23 20z" fill="#3a2b21"/>'+
      '<circle cx="-8" cy="26" r="2" fill="#2a231c"/><circle cx="8" cy="26" r="2" fill="#2a231c"/>';
    q.appendChild(g);
    requestAnimationFrame(()=>{ g.style.transition='opacity .6s'; g.setAttribute('opacity','1'); });
  }
  $('#clockFace').textContent=clockStr();
}
function fxBlack(v){ $('#sceneFx').classList.toggle('on',!!v); }
function fxShake(){ const s=$('#scene'); s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); }
function fxDrama(txt){
  const d=$('#dramaText');
  if(!txt){ d.classList.remove('on'); return; }
  d.textContent=txt; d.classList.remove('on'); void d.offsetWidth; d.classList.add('on'); Snd.drama();
}

/* ---------- dialogue player ---------- */
const NAME={
  me:'主人公', inner:'（心の声）', clerk:'店員', clerk2:'店員（男性）', mgr:'店長',
  nb:'隣の客', nb2:'学生風の客', sys:'', phone:'📱', ai:'AIチャット',
  voice:'自動音声', friend:'友人', mom:'母', tel:'☎', line:'LINE'
};
let dq=[], dqDone=null, typing=null, typedFull='';
function setLock(v){
  document.getElementById('choices').classList.toggle('locked', !!v);
  document.getElementById('phoneLock').style.display = v ? 'flex' : 'none';
}
function play(lines, done){
  dq = (lines||[]).slice(); dqDone = done||null; S.playing=true;
  $('#dlgNext').classList.remove('on');
  setLock(true); renderActions();
  nextLine();
}
function nextLine(){
  if(typing){ clearInterval(typing); typing=null; }
  if(!dq.length){
    S.playing=false; $('#dlgNext').classList.remove('on');
    setLock(false);
    const d=dqDone; dqDone=null; renderActions(); renderPhone();
    if(d) d();
    return;
  }
  const L=dq.shift();
  const who=L[0], text=L[1]||'', o=L[2]||{};
  if(o.face) setFace(o.face);
  if(o.emote) clerkEmote(o.emote);
  if(o.nbEmote) nbEmote(o.nbEmote);
  if(o.fx==='black') fxBlack(true);
  if(o.fx==='unblack'){ fxBlack(false); fxDrama(null); }
  if(o.fx==='shake') fxShake();
  if(o.drama) fxDrama(o.drama);
  if(o.sfx && Snd[o.sfx]) Snd[o.sfx]();
  if(o.batt) { S.batt=clamp(S.batt+o.batt,0,100); renderHUD(); }
  if(o.wallet){ const w=document.getElementById('wallet'); w.style.transition='opacity 1.6s'; w.setAttribute('opacity','1'); }
  $('#dlgName').textContent = NAME[who]!==undefined?NAME[who]:who;
  const target=$('#dlgText');
  target.className = (who==='inner')?'':'';
  typedFull=text;
  target.innerHTML='';
  const span=document.createElement('span');
  if(who==='inner') span.className='inner';
  target.appendChild(span);
  let i=0;
  const speed = o.slow?46:(text.length>60?16:22);
  typing=setInterval(()=>{
    i++; span.textContent=text.slice(0,i);
    if(i%3===0) Snd.type();
    if(i>=text.length){ clearInterval(typing); typing=null; $('#dlgNext').classList.add('on'); }
  }, speed);
  if(o.wait){ setTimeout(()=>{}, 0); }
}
function advance(){
  if(!S.playing) return;
  if(typing){ clearInterval(typing); typing=null;
    $('#dlgText').firstChild.textContent=typedFull; $('#dlgNext').classList.add('on'); return; }
  nextLine();
}
$('#dialogue').addEventListener('click', advance);
$('#lockNote').addEventListener('click', advance);
$('#phoneLock').addEventListener('click', advance);
$('#scene').addEventListener('click', e=>{ if(e.target.closest('#phoneToggle')) return; if(S.playing) advance(); });
$('#choices').addEventListener('click', e=>{ if(S.playing){ e.preventDefault(); e.stopPropagation(); advance(); } }, true);
$('#pscreen').addEventListener('click', e=>{ if(S.playing){ e.preventDefault(); e.stopPropagation(); advance(); } }, true);
document.addEventListener('keydown', e=>{
  if(e.key===' '||e.key==='Enter'){ if(S.playing){ e.preventDefault(); advance(); } }
});
