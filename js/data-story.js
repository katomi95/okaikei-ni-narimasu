/* data-story.js — フラグ・トーク履歴・イベント・エンディング */
/* ---------- 行動→フラグ ---------- */
const AUTOFLAG={
  bank_open:'bankSeen', bank_transfer:'otpFail', pasmo_open:'pasmoSeen',
  cont_scroll:'contSeen', web_search1:'webSeen', web_review:'reviewSeen',
  ai_ask1:'aiSeen', ai_ask2:'aiSeen2', sns_post:'snsPosted', flea_open:'fleaPosted',
  clerk_askpay:'knowPay', look_window:'sawPhoneBox', nb_talk:'nbTalked',
  clerk_explain:'kindnessKnown', clerk_mgr:'mgrMet',
  line_family:'lineAny', line_friend:'lineAny', line_col:'lineAny', line_old:'lineOld', line_group:'lineAny'
};

/* ---------- チャットログ（ライソ画面用） ---------- */
const CHATS={
  family:{name:'母', log:[['me','財布忘れた'],['me','店まで来られる？']], read:''},
  friend:{name:'ヤマダ', log:[['me','やばい 財布忘れた'],['me','◯◯の定食屋にいる']], read:''},
  col:{name:'同僚 佐々木', log:[['me','すみません、財布忘れて詰んでます']], read:'既読'},
  old:{name:'旧友 タカハシ', log:[['me','久しぶり！ 実は今めちゃくちゃ困ってて']], read:'既読'},
  group:{name:'◯◯高校の会（42）', log:[['me','誰か◯◯駅の近くにいる人いませんか']], read:'既読 11'}
};

/* =========================================================
   イベント（時間・条件で自動発火）
   ========================================================= */
const EVENTS=[
{id:'ev_queue', when:()=>S.min>=12,
 lines:[['sys','入口のドアが開く。'],['sys','客が2人、入ってくる。'],['sys','レジの前に、人が並びはじめた。'],
        ['clerk','少々お待ちください',{face:'worry'}],['inner','列だ。'],['inner','俺のうしろに、列ができている。'],
        ['inner','俺は今、この店の詰まりの原因だ。']],
 fx:{attention:10, conf:5}},

{id:'ev_shift', when:()=>S.min>=30,
 lines:[['sys','厨房から、男性の店員が出てくる。'],['clerk2','小島さん、休憩入っていいよ'],
        ['clerk','あ、はい……',{face:'worry'}],['sys','店員さんが、こちらをちらっと見る。'],
        ['clerk','……あの、まだ大丈夫ですか？',{face:'gentle'}],['me','大丈夫です',{}],
        ['sys','店員さんは、休憩に行かなかった。'],['inner','俺のせいで、休憩が消えた。'],
        ['inner','1,480円で、人の休憩を奪っている。']],
 fx:{conf:8, kindness:5, shame:10}},

{id:'ev_lowbatt', when:()=>S.batt<=12,
 lines:[['sys','ピロン。',{sfx:'buzz'}],['sys','「バッテリー残量が少なくなっています」'],['sys','「低電力モードに切り替えますか？」'],
        ['inner','待て待て待て。'],['inner','スマホが死んだら、'],['inner','俺の解決手段は、ゼロになる。'],
        ['sys','',{fx:'black'}],['inner','現代人の生命線は、パーセントで表示される。',{drama:'残り 12%',sfx:'drama'}],
        ['sys','',{fx:'unblack'}]],
 fx:{shame:5}},

{id:'ev_deadbatt', when:()=>S.batt<=0,
 lines:[['sys','画面が、すっと暗くなった。'],['sys','',{fx:'shake'}],['inner','……',{}],['sys','電源ボタンを押す。'],
        ['sys','バッテリー残量ゼロのマーク。'],['inner','終わった。'],['inner','決済も、連絡も、検索も、全部いま死んだ。'],
        ['inner','手元に残ったのは、'],['inner','ハンカチ、イヤホン、家の鍵、名刺8枚、ガム。'],
        ['inner','そして俺の口。'],['inner','……口はある。'],['inner','口だけは、充電がいらない。']],
 fx:{conf:5}, unlock:['clerk_explain']},

{id:'ev_attention', when:()=>S.attention>=50,
 lines:[['sys','店内の視線を感じる。'],['sys','隣の客。列に並ぶ客。厨房の中。'],['sys','誰も何も言わない。'],
        ['sys','ただ、みんな知っている。'],['inner','あの席の人、なんかある。'],['inner','そう思われている。'],
        ['inner','1,480円で、こんなに有名になれるとは思わなかった。']],
 fx:{shame:10}},

{id:'ev_fugitive', when:()=>S.fugitive>=45,
 lines:[['sys','',{fx:'black'}],['sys','店長が、厨房からこちらを見ている。',{drama:'逃亡犯感 MAX',sfx:'drama'}],
        ['sys','',{fx:'unblack'}],['inner','見られている。'],['inner','俺は逃げない。'],['inner','逃げないのに、'],
        ['inner','逃げない人の動きを、俺は一つもしていない。']],
 fx:{trust:-5}},

{id:'ev_line_reply', when:()=>has('lineOld') && S.waitCount>=2,
 lines:[['sys','ピロン。',{sfx:'ding'}],['sys','通知：タカハシ'],['me','！',{}],['sys','LINEを開く。'],
        ['friend','今見た'],['friend','どしたの'],['me','来た！！！',{}],['inner','4年ぶりの友人が、'],
        ['inner','今、俺の人生に戻ってきた。'],['sys','返信を打つ。'],['me','財布忘れて定食屋で詰んでる',{}],
        ['friend','わろた'],['friend','どこ？'],['me','◯◯駅の◯◯食堂',{}],['friend','近い'],['friend','5分で行く'],
        ['sys','','',{}]],
 fx:{trust:20, conf:-10}, unlock:['wait_friend']},

{id:'ev_shame_max', when:()=>S.shame>=100,
 lines:[['sys','',{fx:'black'}],['inner','もう、どうにでもなれ。',{drama:'羞恥心 限界突破',sfx:'drama'}],
        ['sys','',{fx:'unblack'}],['inner','不思議なもので、'],['inner','恥ずかしさが振り切れると、'],
        ['inner','ちょっと楽になる。'],['inner','これが悟りか。'],['inner','1,480円で悟った。']],
 fx:{shame:-20, trust:5}}
];

/* ---------- エンディング直行アクション（イベント経由） ---------- */
ACTS.push(
{id:'wait_friend', cat:'misc', label:'友人を待つ', sub:'5分で来ると言った', req:()=>has('friendComing'), end:'good_friend',
 lines:[['sys','5分。'],['sys','店の外に、走ってくる人影。'],['sys','ドアが開く。'],['friend','おーい'],
        ['sys','4年ぶりの友人が、息を切らして立っている。'],['friend','ほんとに詰んでたんだ'],['me','詰んでた',{}],
        ['sys','友人がレジに向かう。'],['friend','これで'],['clerk','ありがとうございます！',{face:'smile',emote:'😊'}],
        ['sys','ピッ。'],['sys','会計が、3秒で終わった。'],['sys','30分かけて解けなかった問題が、3秒で解けた。'],
        ['me','……一生忘れない',{}],['friend','1,480円で重いわ'],['sys','店を出る。'],['sys','外は明るい。'],
        ['friend','てかお前、電話番号変わってんの知らんかったろ'],['me','知らんかった',{}],['friend','だよな'],
        ['sys','',{fx:'black'}]],
 fx:{}}
);

/* =========================================================
   エンディング
   ========================================================= */
const ENDINGS={
 good_friend:{tag:'GOOD END', name:'友よ', kind:'good',
  desc:'4年ぶりに連絡した友人が、5分で来てくれた。\n\n電話番号は変わっていた。LINEは4年止まっていた。\nそれでも、走ってきてくれる人が、328件のうちにひとりいた。\n\n1,480円は、そのことを確認するには高すぎたし、安すぎた。'},
 normal_later:{tag:'NORMAL END', name:'後日で結構ですよ', kind:'normal',
  desc:'紙に名前と連絡先を書いて、店を出た。\n\n翌日、財布を持って払いに行った。\n店長は「あ、どうも」とだけ言った。店員さんは笑って会釈した。\n\n主人公「……あんなに焦る必要、なかったんじゃ」\n\nなかった。最初からなかった。'},
 bad_dish:{tag:'BAD END', name:'皿洗い', kind:'bad',
  desc:'「そういうのは、いいんで」\n\n厨房から、皿を洗う音がする。店長が洗っている。\n主人公は席に座ったまま、その音を聞いている。\n\n誰も怒っていない。誰も責めていない。\nただ、妙な空気だけが、店内に残った。'},
 bad_phone:{tag:'BAD END', name:'スマホを置いていく', kind:'bad',
  desc:'スマホを担保に、財布を取りに帰ることになった。\n\n店を出て、駅の改札の前で、主人公は立ち止まる。\n\n主人公「……電車、乗れないじゃん」\n\nモバイルPASMOは、スマホの中にあった。\n定期入れは、家の引き出しの中にあった。'},
 bad_run:{tag:'BAD END', name:'逃亡犯', kind:'bad',
  desc:'「本当に戻ってきますから！」\n\n言えば言うほど、逃げる人にしか見えなかった。\n名前を書く手が震えていた。震えるようなことは、何もしていないのに。\n\n主人公は、本当に財布を取りに帰った。そして本当に戻ってきた。\nでも、あの30秒の空気は、たぶん一生忘れない。'},
 bad_police:{tag:'BAD END', name:'大ごと', kind:'bad',
  desc:'「落ち着いてください」\n\n店長にそう言われた時点で、負けだった。\n警察は呼ばれなかった。呼ぶ必要がなかったからだ。\n\n1,480円の会計を、一人だけ大事件にした男として、\n主人公はこの店で長く語り継がれることになる。'},
 true_found:{tag:'TRUE END', name:'ありました', kind:'true',
  desc:'椅子の下に、財布はあった。\nずっと、そこにあった。\n\n家族に連絡し、友人に電話し、隣の客に頭を下げ、\nAIに相談し、銀行と戦い、店長を呼び出して、\nそのあいだずっと、財布は椅子の下で待っていた。\n\n主人公「……カードで」\n店員「はい」'}
};

function endGame(id){
  const e=ENDINGS[id]||ENDINGS.normal_later;
  S.ended=id;
  try{ localStorage.setItem('okaikei_'+id,'1'); }catch(err){}
  const seen = Object.keys(ENDINGS).filter(k=>{ try{return !!localStorage.getItem('okaikei_'+k)}catch(err){return k===id} });
  if(seen.indexOf(id)<0) seen.push(id);
  const list = Object.keys(ENDINGS).map(k=>{
    const got=seen.indexOf(k)>=0;
    return '<div>'+(got?'<span class="got">✔ '+ENDINGS[k].tag+'「'+ENDINGS[k].name+'」</span>':'<span>✖ ？？？？？</span>')+'</div>';
  }).join('');
  $('#endCard').innerHTML =
    '<div class="etag">'+e.tag+'</div><h2>『'+e.name+'』</h2>'+
    '<div class="edesc">'+e.desc+'</div>'+
    '<div class="stats">'+
      '<div><span>試した行動</span><b>'+S.acts+' 手</b></div>'+
      '<div><span>経過時間</span><b>'+S.min+' 分</b></div>'+
      '<div><span>信用度</span><b>'+S.trust+'</b></div>'+
      '<div><span>羞恥心</span><b>'+S.shame+'</b></div>'+
      '<div><span>店員の困惑度</span><b>'+S.conf+'</b></div>'+
      '<div><span>逃亡犯感</span><b>'+S.fugitive+'</b></div>'+
      '<div><span>面倒な客度</span><b>'+S.annoy+'</b></div>'+
      '<div><span>店員の優しさ</span><b>'+S.kindness+'</b></div>'+
      '<div><span>周囲の注目度</span><b>'+S.attention+'</b></div>'+
      '<div><span>バッテリー</span><b>'+Math.round(S.batt)+'%</b></div>'+
      '<div><span>支払額</span><b>¥1,480</b></div>'+
      '<div><span>結局</span><b>財布を忘れただけ</b></div>'+
    '</div>'+
    '<div class="endlist"><b>エンディング</b>'+list+'</div>'+
    '<div style="margin-top:16px"><button class="bigbtn" id="btnAgain" style="width:100%">もう一度、財布を忘れる</button><div style="font-size:11.5px;color:var(--ink2);text-align:center;margin-top:8px">別の悪あがきを試すと、別の結末になります</div></div>';
  $('#endOv').classList.add('on');
  $('#btnAgain').onclick=()=>{ restartGame('again'); };
  Snd[e.kind==='good'||e.kind==='true'?'ok':'deny']();
}

/* ---------- TRUE END 演出 ---------- */
const TRUE_LINES=[
 ['sys','',{fx:'unblack'}],
 ['clerk','あの……',{face:'gentle'}],
 ['me','はい？',{}],
 ['clerk','……',{face:'gentle'}],
 ['clerk','椅子の下に落ちてるの、',{face:'gentle'}],
 ['clerk','お財布じゃないですか？',{face:'smile',sfx:'ding'}],
 ['sys','……',{slow:true}],
 ['sys','ゆっくりと、椅子の下に目をやる。',{slow:true}],
 ['sys','',{slow:true}],
 ['sys','財布。',{slow:true,sfx:'drama',wallet:true}],
 ['sys','',{slow:true}],
 ['me','…………',{slow:true}],
 ['sys','',{slow:true}],
 ['sys','',{slow:true}],
 ['inner','いつから？',{slow:true}],
 ['inner','座った時？',{slow:true}],
 ['inner','ポケットから落ちた？',{slow:true}],
 ['sys','',{slow:true}],
 ['sys','家族に連絡した。',{slow:true}],
 ['sys','友人に電話した。',{slow:true}],
 ['sys','隣の客に頭を下げた。',{slow:true}],
 ['sys','AIに相談した。',{slow:true}],
 ['sys','銀行と戦った。',{slow:true}],
 ['sys','店長を呼んだ。',{slow:true}],
 ['sys','',{slow:true}],
 ['sys','そのあいだ、財布はずっと、椅子の下にいた。',{slow:true}],
 ['sys','',{slow:true}],
 ['me','……',{slow:true}],
 ['sys','財布を拾う。',{slow:true}],
 ['sys','いつもの重さ。',{slow:true}],
 ['sys','',{slow:true}],
 ['me','……カードで',{slow:true}],
 ['clerk','はい',{face:'smile'}],
 ['sys','ピッ。'],
 ['sys','',{fx:'black'}]
];
