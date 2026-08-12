/* main.js — 進行エンジン・選択肢/スマホ描画・開始とリスタート */
/* =========================================================
   進行エンジン
   ========================================================= */
const EXTRA_UNLOCK={
  web_crime:['tel_110'], meishi:['clerk_meishi'], earphone:['flea_open'],
  clerk_explain:['clerk_later','clerk_mgr','clerk_dishwash','clerk_key','clerk_conveni',
                 'clerk_work','clerk_discount','clerk_apolo','clerk_thanks','clerk_gohome',
                 'clerk_phone','clerk_police','clerk_meishi'],
  nb_giveup:['clerk_explain'], bank_transfer:['clerk_mgr']
};
const INIT_UNLOCK=[
 'pocket','bag','jacket','chair','recall','teleport','mirror','receipt',
 'breathe','water','gum','wait','look_around','clerk_askpay','clerk_explain',
 'qr_paypay','line_family','line_friend','line_col','tel_friendA','tel_110',
 'bank_open','pasmo_open','cont_scroll','web_search1','web_review','ai_ask1',
 'sns_post','cam_wallet','set_power','set_wallet'
];
const CATS=[{id:'search',name:'探す・思い出す'},{id:'clerk',name:'店員と話す'},{id:'around',name:'まわり'},{id:'misc',name:'その他'}];
const byId={}; ACTS.forEach(a=>byId[a.id]=a);

function usedCount(id){ return S.count[id]||0; }
function maxOf(a){ return a.max|| (a.linesBy?a.linesBy.length:1); }
function available(a){
  if(!S.unlocked.has(a.id)) return false;
  if(usedCount(a.id) >= maxOf(a)) return false;
  if(a.req && !a.req()) return false;
  if(a.cat==='phone' && S.batt<=0) return false;
  return true;
}
function linesFor(a){
  if(a.linesBy){ const i=Math.min(usedCount(a.id), a.linesBy.length-1); return a.linesBy[i]; }
  return a.lines||[['sys','……']];
}

function doAction(id){
  const a=byId[id]; if(!a||S.playing||S.ended) return;
  if(a.risky && !S.count['__c_'+id]){
    $('#confirmText').textContent=a.risky;
    $('#confirmOv').classList.add('on');
    $('#cYes').onclick=()=>{ $('#confirmOv').classList.remove('on'); S.count['__c_'+id]=1; doAction(id); };
    $('#cNo').onclick=()=>{ $('#confirmOv').classList.remove('on'); };
    return;
  }
  Snd.tap();
  S.count[id]=usedCount(id)+1;
  S.done.add(id); S.acts++;
  S.min += (a.time||1);
  const bd = (a.batt!==undefined) ? a.batt : (a.cat==='phone' ? -2 : 0);
  S.batt = clamp(S.batt + bd, 0, 100);
  if(a.fn) a.fn();
  if(a.flag) on(a.flag);
  if(AUTOFLAG[a.id]) on(AUTOFLAG[a.id]);
  if(a.chat) on('chat_'+a.chat);
  const uls=[].concat(a.unlock||[], EXTRA_UNLOCK[a.id]||[]);
  uls.forEach(u=>{ if(byId[u] && !S.unlocked.has(u)){ S.unlocked.add(u); S.seenNew.add(u); } });
  applyFx(a.fx);
  renderScene(); renderHUD();
  play(linesFor(a), ()=>{
    if(a.end){ endGame(a.end); return; }
    afterAction();
  });
}

function afterAction(){
  renderScene(); renderHUD();
  // events
  for(const ev of EVENTS){
    if(S.flags.has('ev_'+ev.id)) continue;
    if(ev.when()){
      on('ev_'+ev.id);
      applyFx(ev.fx);
      if(ev.id==='ev_line_reply') on('friendComing');
      (ev.unlock||[]).forEach(u=>{ if(byId[u]){ S.unlocked.add(u); S.seenNew.add(u); } });
      play(ev.lines, afterAction);
      return;
    }
  }
  // TRUE END
  if((S.done.size>=28 || S.acts>=38) && !S.ended && !has('trueStarted')){
    on('trueStarted');
    play(TRUE_LINES, ()=>endGame('true_found'));
    return;
  }
  renderActions(); renderPhone();
}

/* ---------- 選択肢描画 ---------- */
function renderActions(){
  setLock(S.playing);
  const tabs=$('#tabs'), list=$('#actionList');
  const avail={}; CATS.forEach(c=>avail[c.id]=[]);
  ACTS.forEach(a=>{ if(a.cat!=='phone' && available(a)) avail[a.cat] && avail[a.cat].push(a); });
  tabs.innerHTML=CATS.map(c=>{
    const n=avail[c.id].length;
    const isNew=avail[c.id].some(a=>S.seenNew.has(a.id));
    return '<button class="tab'+(S.tab===c.id?' on':'')+'" data-t="'+c.id+'">'+c.name+'<span class="n">'+n+'</span>'+(isNew?'<span class="dot"></span>':'')+'</button>';
  }).join('');
  tabs.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{ S.tab=b.dataset.t; Snd.tap(); renderActions(); });
  const arr=avail[S.tab]||[];
  if(!arr.length){ list.innerHTML='<div class="emptyNote">ここには、もう試せることがない。<br>別のタブか、スマホを見てみよう。</div>'; return; }
  list.innerHTML=arr.map(a=>{
    const rest = maxOf(a)>1 ? '（あと'+(maxOf(a)-usedCount(a.id))+'回）' : '';
    return '<button class="act'+(S.seenNew.has(a.id)?' new':'')+(a.risky?' risky':'')+'" data-a="'+a.id+'">'+
      a.label+'<span class="sub">'+(a.sub||'')+rest+'</span></button>';
  }).join('');
  list.querySelectorAll('.act').forEach(b=>b.onclick=()=>{
    if(S.playing) return;
    S.seenNew.delete(b.dataset.a);
    doAction(b.dataset.a);
  });
}

/* ---------- スマホ描画 ---------- */
function appActs(app){ return ACTS.filter(a=>a.cat==='phone'&&a.app===app&&available(a)); }
function renderPhone(){
  const sc=$('#pscreen');
  const badge=$('#ptBadge');
  if(S.batt<=0){ sc.innerHTML='<div class="pnote" style="text-align:center;padding-top:60px">画面は真っ暗だ。<br><br>充電が、ない。</div>'; if(badge) badge.textContent=''; return; }
  if(!S.app){
    let total=0;
    const grid=APPS.map(ap=>{
      const n=appActs(ap.id).filter(a=>S.seenNew.has(a.id)).length;
      total+=appActs(ap.id).length;
      return '<button class="appicon" data-app="'+ap.id+'"><span class="ic" style="background:'+ap.color+'">'+ap.icon+
        (n?'<span class="badge">'+n+'</span>':'')+'</span>'+ap.name+'</button>';
    }).join('');
    sc.innerHTML='<div class="phome">'+grid+'</div>'+
      '<div class="pnote">アプリを開いて、できることを探す。<br>電池は有限。時間も有限。1,480円は不変。</div>';
    sc.querySelectorAll('.appicon').forEach(b=>b.onclick=()=>{ if(S.playing) return; Snd.tap(); S.app=b.dataset.app; renderPhone(); });
    if(badge) badge.textContent = total?' ('+total+')':'';
    return;
  }
  const ap=APPS.find(x=>x.id===S.app);
  const acts=appActs(S.app);
  let extra='';
  if(S.app==='bank' && has('bankSeen')) extra='<div class="pbal"><div class="l">普通預金 残高</div><div class="v">¥312,450</div></div>';
  if(S.app==='pasmo' && has('pasmoSeen')) extra='<div class="pbal"><div class="l">モバイルPASMO 残高</div><div class="v">¥4,832</div></div>';
  if(S.app==='qr') extra='<div class="pbal"><div class="l">ペイペイ君 残高</div><div class="v">¥8,320</div></div>';
  if(S.app==='cont') extra='<div class="pbal"><div class="l">連絡先</div><div class="v">328件</div></div>';
  if(S.app==='line'){
    const keys=Object.keys(CHATS).filter(k=>has('chat_'+k));
    extra=keys.map(k=>{
      const c=CHATS[k];
      return '<div class="pnote" style="padding:2px 2px 4px;color:#c9d0de">'+c.name+'</div><div class="chat">'+
        c.log.map((m,i)=>'<div class="bub me">'+m[1]+(i===c.log.length-1&&c.read?'<span class="read">'+c.read+'</span>':'')+'</div>').join('')+
        (has('friendComing')&&k==='old'?'<div class="bub them">今見た</div><div class="bub them">5分で行く</div>':'')+
        '</div>';
    }).join('');
    if(!keys.length) extra='<div class="pnote">トークルーム一覧。<br>最後のやりとりが、どれも半年以上前だ。</div>';
  }
  sc.innerHTML='<div class="apptitle"><button id="pback">‹ ホーム</button><h3>'+ap.name+'</h3></div>'+extra+
    (acts.length? acts.map(a=>{
      const rest = maxOf(a)>1 ? '（あと'+(maxOf(a)-usedCount(a.id))+'回）' : '';
      return '<button class="prow" data-a="'+a.id+'">'+a.label+'<span class="sub">'+(a.sub||'')+rest+'</span></button>';
    }).join('') : '<div class="pnote">このアプリで今できることは、もうない。</div>')+
    (ap.note?'<div class="pnote">'+ap.note+'</div>':'');
  $('#pback').onclick=()=>{ Snd.tap(); S.app=null; renderPhone(); };
  sc.querySelectorAll('.prow').forEach(b=>b.onclick=()=>{
    if(S.playing) return;
    S.seenNew.delete(b.dataset.a);
    doAction(b.dataset.a);
    if(window.innerWidth<=860){ $('#phone').classList.remove('open'); $('#phoneToggle').innerHTML='📱 スマホ<span id="ptBadge"></span>'; }
  });
  if(badge) badge.textContent='';
}

/* ---------- 開始 / リスタート ---------- */
const INTRO=[
 ['clerk','お会計、1,480円になります',{face:'smile'}],
 ['me','はい',{}],
 ['sys','ポケットに手を入れる。'],
 ['sys','……'],
 ['sys','カバンを開ける。'],
 ['sys','……'],
 ['sys','上着の内ポケット。'],
 ['sys','……'],
 ['sys','もう一度、ポケット。'],
 ['sys','',{fx:'shake'}],
 ['me','……ない',{}],
 ['inner','財布、忘れた。'],
 ['sys','',{slow:true}],
 ['inner','……',{slow:true}],
 ['inner','まあいいか。'],
 ['inner','今どき、スマホがあれば何とかなるだろ。'],
 ['sys','',{fx:'black'}],
 ['sys','',{drama:'お会計になります',sfx:'drama',slow:true}],
 ['sys','',{fx:'unblack'}],
 ['clerk','……お客様？',{face:'gentle',emote:'？'}],
 ['me','あ、はい。今すぐ',{}]
];
const SHORT_INTRO=[
 ['sys','―― もう一度 ――'],
 ['clerk','お会計、1,480円になります',{face:'smile'}],
 ['me','はい',{}],
 ['sys','ポケット。カバン。上着。もう一度ポケット。'],
 ['sys','',{fx:'shake'}],
 ['me','……ない',{}],
 ['inner','また忘れた。'],
 ['inner','……まあいいか。'],
 ['inner','今どき、スマホがあれば何とかなるだろ。']
];
let runCount=0;
function curtain(txt, sub, mid){
  const c=$('#curtain');
  $('#curtainTxt').textContent=txt||'';
  $('#curtainSub').textContent=sub||'';
  c.classList.add('on');
  setTimeout(()=>{
    if(mid) mid();
    setTimeout(()=>c.classList.remove('on'), 780);
  }, 640);
}
function flashNewGame(txt){
  const f=$('#newGameFlash');
  f.textContent=txt;
  f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
}
function restartGame(mode){
  $('#endOv').classList.remove('on');
  $('#confirmOv').classList.remove('on');
  curtain('もう一度', 'お会計 ¥1,480 ／ 13:12', ()=>startGame(mode||'again'));
}
function startGame(mode){
  runCount++;
  S=freshState();
  const wEl=$('#wallet'); wEl.style.transition='none'; wEl.setAttribute('opacity','0');
  $('#queue').innerHTML='';
  fxBlack(false); fxDrama(null);
  INIT_UNLOCK.forEach(id=>{ if(byId[id]) S.unlocked.add(id); });
  renderHUD(); renderScene(); setFace('smile');
  $('#title').classList.remove('on');
  $('#endOv').classList.remove('on');
  const rt=$('#runTag');
  rt.textContent=runCount+'周目';
  rt.classList.toggle('on', runCount>1);
  if(runCount>1) flashNewGame('NEW GAME ・ '+runCount+'周目 ・ お会計 ¥1,480');
  if(mode==='full'){ play(INTRO, ()=>{ renderActions(); renderPhone(); }); }
  else if(mode==='again'){ play(SHORT_INTRO, ()=>{ renderActions(); renderPhone(); }); }
  else {
    S.playing=false; setLock(false);
    $('#dlgName').textContent='';
    $('#dlgText').textContent='財布がない。でもスマホはある。何とかなるはずだ。';
    $('#dlgNext').classList.remove('on');
    renderActions(); renderPhone();
  }
}
$('#btnStart').onclick=()=>{ startGame('full'); };
$('#btnSkip').onclick=()=>{ startGame('skip'); };
$('#btnRestart').onclick=()=>{
  $('#confirmText').textContent='最初からやり直しますか？\n（財布は、たぶんまた忘れます）';
  $('#confirmOv').classList.add('on');
  $('#cYes').onclick=()=>{ restartGame('again'); };
  $('#cNo').onclick=()=>{ $('#confirmOv').classList.remove('on'); };
};
$('#btnSound').onclick=e=>{ const on=Snd.toggle(); e.currentTarget.textContent=on?'🔊':'🔇'; };
$('#phoneToggle').onclick=()=>{
  const el=$('#phone'); el.classList.toggle('open'); Snd.tap();
  $('#phoneToggle').innerHTML = el.classList.contains('open') ? '✕ 閉じる' : '📱 スマホ<span id="ptBadge"></span>';
  if(!el.classList.contains('open')) renderPhone();
};
$('#phone').addEventListener('click', e=>{ if(e.target.id==='phone'){ $('#phone').classList.remove('open'); $('#phoneToggle').innerHTML='📱 スマホ<span id="ptBadge"></span>'; renderPhone(); } });

S=freshState(); renderHUD(); setFace('smile');
