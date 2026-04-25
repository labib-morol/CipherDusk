/* ============================================================
   APP STATE
============================================================ */
let stage=0,decision='',chat=[],fileContext='',selectedOpt='',roundNum=0;
let prevConf=0,deepChat=[],deepRoundNum=0;
let autoAudio=false;
let history=JSON.parse(localStorage.getItem('cd_history')||'[]');
const panel=document.getElementById('panel');
const insightPanel=document.getElementById('insight-panel');

/* —— INSIGHT HOVER TRACKING —— */
insightPanel.addEventListener('mousemove',e=>{
  const card=e.target.closest('.insight-card');
  if(!card)return;
  const r=card.getBoundingClientRect();
  card.style.setProperty('--mx',(e.clientX-r.left)+'px');
  card.style.setProperty('--my',(e.clientY-r.top)+'px');
});

const TIPS=[
  'The friction is the point. Slow decisions beat fast mistakes.',
  'What you avoid saying is often the most important thing.',
  'Every option has a cost. Even inaction.',
  'What would you regret more — doing it or not doing it?',
  'CipherDusk sees what you\'re not saying.',
];
let tipIdx=0;
setInterval(()=>{
  tipIdx=(tipIdx+1)%TIPS.length;
  const el=document.getElementById('tip-body');
  if(el){el.style.opacity=0;setTimeout(()=>{el.textContent=TIPS[tipIdx];el.style.opacity=1;},300);}
},12000);

const BIASES={
  'sunk cost':       {icon:'💸',desc:'Valuing past investment over future potential. Past effort is gone regardless of your next move.'},
  'survivorship':    {icon:'🏆',desc:'Only seeing success stories. The failures are invisible — but they\'re the majority.'},
  'optimism bias':   {icon:'🌅',desc:'Overestimating good outcomes and underestimating how hard this will actually be.'},
  'fomo':            {icon:'⏳',desc:'Fear of missing out is distorting urgency. Most "now or never" moments aren\'t.'},
  'confirmation':    {icon:'🔵',desc:'Seeking information that confirms what you already want to do.'},
  'dunning-kruger':  {icon:'📈',desc:'Early confidence in a new domain peaks before real competence develops.'},
  'status quo':      {icon:'🔒',desc:'Overvaluing the current situation simply because it\'s familiar.'},
  'anchoring':       {icon:'⚓',desc:'Too attached to the first number or option encountered.'},
  'availability':    {icon:'📰',desc:'Recent or vivid events are skewing your sense of probability.'},
  'planning fallacy':{icon:'📅',desc:'Underestimating time, costs, and risks — almost everyone does this.'},
};

/* —— UTILS —— */
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');}
function attr(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;');}
function setMobile(l){const e=document.getElementById('mobile-stage-label');if(e)e.textContent=l;}
function setSys(mode,round,conf){
  const m=document.getElementById('sys-mode'),r=document.getElementById('sys-round'),c=document.getElementById('sys-conf');
  if(m)m.textContent=mode||'STANDBY';if(r)r.textContent=round||'—';if(c)c.textContent=conf?conf+'%':'—';
}

/* —— TTS —— */
function speakText(text){
  if(!window.speechSynthesis)return;
  window.speechSynthesis.cancel();
  const utt=new SpeechSynthesisUtterance(String(text).replace(/<br>/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&'));
  utt.rate=0.92;utt.pitch=0.85;
  window.speechSynthesis.speak(utt);
}
function speakStop(){if(window.speechSynthesis)window.speechSynthesis.cancel();}
function toggleAutoAudio(){
  autoAudio=!autoAudio;
  document.querySelectorAll('.auto-audio-btn').forEach(b=>{
    b.classList.toggle('active',autoAudio);
    b.title=autoAudio?'Auto-audio ON':'Auto-audio OFF';
    b.textContent=autoAudio?'🔊 AUTO':'🔇 AUTO';
  });
}

/* —— VOICE INPUT —— */
function startVoiceAnswer(){
  speakStop();
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){alert('Voice input not supported in this browser');return;}
  const btn=document.getElementById('voice-btn');
  if(btn){btn.textContent='🔴 Listening...';btn.disabled=true;}
  const rec=new SR();rec.lang='en-US';rec.interimResults=false;rec.maxAlternatives=1;
  rec.onresult=e=>{
    const t=e.results[0][0].transcript.toLowerCase().trim();
    const m=t.match(/\b(option\s*)?([a-d])\b/i)||t.match(/^([a-d])[\s,.]/i);
    if(m){
      const key=m[m.length-1].toUpperCase();
      const card=document.querySelector(`.opt-card[data-key="${key}"]`);
      if(card){selectOpt(card,key);}
    } else {
      const mi=document.getElementById('manual-inp'),mw=document.getElementById('manual-wrap');
      if(mi&&mw){mi.value=t;mw.classList.add('open');selectedOpt='D';}
    }
    if(btn){btn.textContent='🎤 Voice';btn.disabled=false;}
  };
  rec.onerror=()=>{if(btn){btn.textContent='🎤 Voice';btn.disabled=false;}};
  rec.start();
}

/* —— ACCORDION —— */
function toggleAcc(el){el.classList.toggle('open');}

/* —— UNSCRAMBLE ANIMATION —— */
const _SC='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*?';
function unscramble(el,text,dur){
  const plain=text.replace(/<br>/g,'\n');dur=dur||Math.min(900,plain.length*14+200);
  const frames=Math.ceil(dur/28);let f=0;
  function tick(){
    const p=f/frames;let out='';
    for(let i=0;i<plain.length;i++){
      if(plain[i]==='\n'){out+='<br>';continue;}
      if(i/plain.length<p)out+=esc(plain[i]);
      else out+=_SC[Math.floor(Math.random()*_SC.length)];
    }
    el.innerHTML=out;
    if(f<frames){f++;setTimeout(tick,28);}else el.innerHTML=esc(plain).replace(/\n/g,'<br>');
  }
  tick();
}

/* —— HISTORY —— */
function renderHistory(){
  const el=document.getElementById('hist-list');
  if(!history.length){el.innerHTML='<div class="no-hist">⚔️<br>No past decisions yet.</div>';return;}
  el.innerHTML=history.slice().reverse().map((h,i)=>`
    <div class="hist-item" onclick="loadHistory(${history.length-1-i})">
      <div class="hi-date">${h.date}</div>
      ${h.decision.slice(0,36)}${h.decision.length>36?'...':''}
    </div>`).join('');
}
function loadHistory(i){const h=history[i];stage=99;decision=h.decision;chat=h.chat;renderVerdict(h.verdict||'');}
function saveHistory(verdict){
  history.push({decision,chat,verdict,date:new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short'})});
  if(history.length>20)history.shift();
  localStorage.setItem('cd_history',JSON.stringify(history));
  renderHistory();
}

/* —— PROGRESS —— */
function progressHTML(){
  if(stage===4){
    const stages=['Decision','Verdict','Deep Dive','Complete'];
    return `<div class="prog-wrap"><div class="prog-track">${stages.map((_,i)=>{
      const dc=i<2?'done':i===2?'deep':'';
      return `<div class="pd ${dc}"></div>${i<stages.length-1?`<div class="ps ${i<2?'done':i===2?'deep':''}"></div>`:''}`;
    }).join('')}</div><div class="pl">${stages.map((s,i)=>`<div class="pl-label ${i<2?'done':i===2?'deep':''}">${s}</div>`).join('')}</div></div>`;
  }
  const stages=['Decision','Round 1','Round 2','Verdict'];
  const cur=Math.min(stage,3);
  return `<div class="prog-wrap"><div class="prog-track">${stages.map((_,i)=>{
    const dc=i<cur?'done':i===cur?'active':'';
    return `<div class="pd ${dc}"></div>${i<stages.length-1?`<div class="ps ${i<cur?'done':i===cur?'active':''}"></div>`:''}`;
  }).join('')}</div><div class="pl">${stages.map((s,i)=>`<div class="pl-label ${i<cur?'done':i===cur?'active':''}">${s}</div>`).join('')}</div></div>`;
}

/* —— CONFIDENCE —— */
function confColor(p){return p>=90?'#22c55e':p>=70?'var(--or)':'#ef4444';}
function confBarHTML(conf){
  const p=Math.min(100,Math.max(0,parseInt(conf)||0));
  const col=confColor(p);
  return `<div class="conf-bar-wrap">
    <div class="conf-label"><span>AI Confidence</span><span id="conf-pct" style="color:${col}">${p}%</span></div>
    <div class="conf-track"><div class="conf-fill" id="conf-bar" style="width:0%;background:${col};box-shadow:0 0 8px ${col}"></div></div>
  </div>`;
}
function animateConf(from,to){
  const fill=document.getElementById('conf-bar'),lbl=document.getElementById('conf-pct');
  if(!fill||!lbl)return;
  const col=confColor(to),st=Date.now(),dur=700;
  function tick(){
    const p2=Math.min(1,(Date.now()-st)/dur);
    const cur=Math.round(from+(to-from)*p2);
    fill.style.width=cur+'%';fill.style.background=col;fill.style.boxShadow=`0 0 8px ${col}`;
    lbl.textContent=cur+'%';lbl.style.color=col;if(p2<1)requestAnimationFrame(tick);
  }
  tick();
}

/* —— TYPEWRITER (2x faster) —— */
function typewrite(el,text){
  el.innerHTML='';let i=0;
  function tick(){if(i<text.length){el.textContent+=text[i++];setTimeout(tick,2);}}
  tick();
}

/* —— TRANSITION OVERLAY —— */
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function transitionOut(cb){
  const ov=document.getElementById('transition-overlay');
  if(!ov){cb();return;}
  ov.classList.add('active');
  setTimeout(()=>{cb();setTimeout(()=>ov.classList.remove('active'),220);},180);
}

/* —— INSIGHT UPDATE —— */
function updateInsight(insightText,confidence){
  let biasCard='';
  const lower=(insightText||'').toLowerCase();
  for(const[key,val]of Object.entries(BIASES)){
    if(lower.includes(key)){
      biasCard=`<div class="insight-card hot">
        <div class="insight-icon">${val.icon}</div>
        <div class="insight-title">Bias: ${key}</div>
        <div class="insight-body"></div>
      </div>`;break;
    }
  }
  const icons=['💡','⚠️','🎯','⚡','🔍','🧩'];
  const icon=icons[Math.floor(Math.random()*icons.length)];
  insightPanel.innerHTML=`
    <div class="insight-card hot">
      <div class="insight-icon">${icon}</div>
      <div class="insight-title">CipherDusk Intel</div>
      <div class="insight-body"></div>
    </div>
    ${biasCard}
    ${confidence?`<div class="insight-card">
      <div class="insight-icon">📊</div>
      <div class="insight-title">Confidence</div>
      <div class="insight-body"><strong style="color:var(--or)">${confidence}%</strong> — minimum 2 rounds before verdict.</div>
    </div>`:''}
    <div class="insight-card">
      <div class="insight-icon">⚔️</div>
      <div class="insight-title">Stay Honest</div>
      <div class="insight-body">CipherDusk needs context to give a verdict worth following.</div>
    </div>`;
  /* unscramble insight bodies */
  const bodies=insightPanel.querySelectorAll('.insight-card');
  bodies[0]?.querySelector('.insight-body')&&unscramble(bodies[0].querySelector('.insight-body'),insightText,800);
  if(biasCard&&bodies[1]){
    const key=lower.match(new RegExp(Object.keys(BIASES).join('|')))?.[0];
    if(key)unscramble(bodies[1].querySelector('.insight-body'),BIASES[key].desc,700);
  }
}

/* —— PARSE AI RESPONSE —— */
function parseResponse(text){
  if(!text||!text.trim()){
    const fb=["A) Yes, I've considered this carefully","B) I'm acting on instinct more than logic","C) I feel pressured or rushed into this","D) Other — I'll explain myself"];
    return{confidence:'',insight:'',question:'What is really driving this decision?',options:fb,verdict:'',why:'',risks:'',timeline:'',pattern:'',deepInsight:'',finalInsight:'',bestCase:'',worstCase:''};
  }
  const get=(key)=>{
    const m=text.match(new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z][A-Z ]+:|\\n---|$)`,'i'));
    return m?m[1].trim():'';
  };
  const confidence=get('CONFIDENCE');
  const insight=get('INSIGHT');
  const rawQ=get('QUESTION');
  const verdict=get('DEEP VERDICT')||get('VERDICT');
  const why=get('WHY');
  const risks=get('HIDDEN RISKS')||get('RISKS');
  const timeline=get('TIMELINE');
  const pattern=get('PSYCHOLOGICAL PATTERN');
  const deepInsight=get('DEEP INSIGHT SUMMARY');
  const finalInsight=get('INSIGHT');
  const bestCase=get('BEST CASE');
  const worstCase=get('WORST CASE');

  const om=text.match(/OPTIONS[\s:]*/i);
  const start=om?om.index+om[0].length:0;
  const searchIn=text.slice(start);
  const rawLines=searchIn.split('\n').map(l=>l.replace(/^\*+\s*/,'').replace(/\*+\s*$/,'').replace(/^[-•·]\s*/,'').trim()).filter(l=>l.length>0);
  const opts=[];
  for(const l of rawLines){
    if(/^[A-D][\s]*[).:\-]/i.test(l))opts.push(l);
    else if(opts.length>=2&&l.length>3&&/^[A-Z]{2}/.test(l)&&l.includes(':'))break;
    if(opts.length>=4)break;
  }
  let options=opts.length>=2?opts.map(l=>{const m2=l.match(/^([A-D])[\s]*[).:\-]\s*(.*)/i);return m2?`${m2[1].toUpperCase()}) ${m2[2].replace(/\*+/g,'').trim()}`:l;}):[];

  if(options.length<2){options=["A) Yes, I've considered this carefully","B) I'm acting on instinct more than logic","C) I feel pressured or rushed into this","D) Other — I'll explain myself"];}

  let question=rawQ;
  if(!question){
    const cands=text.split('\n').map(l=>l.trim()).filter(l=>l.length>20&&!/^[A-Z][A-Z ]+:/.test(l)&&!/^[A-D][).:]/.test(l)&&!l.startsWith('-'));
    question=cands[cands.length-1]||'What is really driving this decision?';
  }

  return{confidence,insight,question,options,verdict,why,risks,timeline,pattern,deepInsight,finalInsight,bestCase,worstCase};
}

/* —— VERDICT HELPERS —— */
function parseVerdictMainLine(text){
  const clean=text.replace(/<br>/g,' ');
  const m=clean.match(/^([^.!?]*[.!?])/);
  if(!m||m[1].length<10)return{main:'',rest:text};
  return{main:m[1].trim(),rest:text.slice(text.indexOf(m[1])+m[1].length).replace(/^[\s<br>]+/,'')};
}

function accSection(label,content,color,idx){
  if(!content)return'';
  return `<div class="v-acc" style="animation-delay:${.1+idx*.12}s">
    <div class="v-acc-hdr" onclick="toggleAcc(this.parentElement)">
      <span style="color:${color||'var(--or)'}">${label}</span>
      <span class="v-acc-icon">▶</span>
    </div>
    <div class="v-acc-body"><div class="v-acc-inner">${esc(content)}</div></div>
  </div>`;
}

/* —— RENDER —— */
function render(){
  if(stage===0){renderInput();return;}
  if(stage===99){renderVerdict('');return;}
  if(stage===4){runDeepRound();return;}
}

function renderInput(){
  speakStop();
  setMobile('Ready');setSys('STANDBY','—','—');
  panel.innerHTML=`
    <div class="q-card">
      <div class="rnd-hdr">
        <div class="rnd-dot"></div>// What decision are you facing?
        <button class="auto-audio-btn${autoAudio?' active':''}" title="${autoAudio?'Auto-audio ON':'Auto-audio OFF'}" onclick="toggleAutoAudio()">${autoAudio?'🔊 AUTO':'🔇 AUTO'}</button>
      </div>
      <div class="onboarding">
        <div class="ob-step"><span class="ob-num">01</span><span class="ob-text">State your decision — job change, startup, relationship, anything.</span></div>
        <div class="ob-step"><span class="ob-num">02</span><span class="ob-text">CipherDusk challenges your assumptions. Answer honestly.</span></div>
        <div class="ob-step"><span class="ob-num">03</span><span class="ob-text">Earn your verdict — only when the AI has enough context to decide.</span></div>
      </div>
      <span class="lbl">Your decision or plan</span>
      <textarea id="inp" placeholder='e.g. "I want to quit my job and start a startup"' style="min-height:100px"></textarea>
      <div class="upload-zone" onclick="document.getElementById('fi').click()">
        <span style="font-size:15px">📎</span>
        <div><div class="upload-text">Attach PDF or TXT for extra context (optional)</div>
        <div class="upload-name" id="fname">No file attached</div></div>
      </div>
      <input type="file" id="fi" accept=".txt,.pdf" onchange="handleFile(this)"/>
      <button class="btn primary" id="go-btn">ANALYZE MY DECISION →</button>
    </div>`;
  document.getElementById('go-btn').addEventListener('click',submitDecision);
}

/* —— QUESTION CARD —— */
function renderQuestion(parsed){
  speakStop();
  const rn=Math.min(roundNum,3);
  setMobile(`Round ${rn}/3`);setSys('ANALYZING',`${rn}/3`,parsed.confidence||'—');
  _buildQuestion(parsed);
}

function _buildQuestion(parsed){
  const conf=parseInt(parsed.confidence)||0;
  const rn=Math.min(roundNum,3);
  const qText=parsed.question||'What is really driving this decision?';
  const optsTxt=parsed.options.map(l=>l.trim().replace(/^[A-D][).]\s*/i,'')).join('. ');
  panel.innerHTML=`
    ${progressHTML()}
    ${conf?confBarHTML(conf):''}
    <div class="q-card">
      <div class="rnd-hdr">
        <div class="rnd-dot"></div>// CipherDusk challenges you
        <span class="round-badge">Round ${rn}/3</span>
        <button class="tts-btn" title="Listen" data-tts="${attr(qText+'. Options: '+optsTxt)}" onclick="speakText(this.dataset.tts)">🔊</button>
        <button class="auto-audio-btn${autoAudio?' active':''}" title="${autoAudio?'Auto-audio ON':'Auto-audio OFF'}" onclick="toggleAutoAudio()">${autoAudio?'🔊 AUTO':'🔇 AUTO'}</button>
      </div>
      ${decision?`<div class="decision-echo">Re: "${decision.slice(0,55)}${decision.length>55?'...':''}"</div>`:''}
      <div class="q-text" id="q-text"><div class="thinking"><span></span><span></span><span></span></div></div>
      <div class="options-grid" id="opts"></div>
      <div class="manual-wrap" id="manual-wrap">
        <span class="lbl">Or explain in your own words</span>
        <textarea id="manual-inp" placeholder="Be specific. Vague answers get vague results." style="min-height:65px"></textarea>
      </div>
      <div class="btn-row">
        <button class="btn primary" style="flex:1" id="go-btn">SUBMIT ANSWER →</button>
        <button class="btn sm" id="voice-btn" onclick="startVoiceAnswer()">🎤 Voice</button>
        <button class="btn sm" onclick="reset()">↺ Reset</button>
      </div>
    </div>`;
  if(conf){requestAnimationFrame(()=>animateConf(prevConf,conf));prevConf=conf;}
  const qEl=document.getElementById('q-text');
  setTimeout(()=>{
    typewrite(qEl,qText);
    if(autoAudio)setTimeout(()=>speakText(qText+'. Options: '+optsTxt),300);
  },80);
  const optsEl=document.getElementById('opts');
  const optDelay=Math.min(qText.length*2+80,250);
  if(parsed.options.length){
    setTimeout(()=>{
      optsEl.innerHTML=parsed.options.map(l=>{
        const key=l.trim()[0],txt=l.trim().replace(/^[A-D][).]\s*/i,'').trim();
        return `<button class="opt-card" data-key="${key}" onclick="selectOpt(this,'${key}')">
          <span class="opt-key">${key}</span><span class="opt-text">${esc(txt)}</span>
        </button>`;
      }).join('');
    },optDelay);
  } else {
    setTimeout(()=>{const mw=document.getElementById('manual-wrap');if(mw)mw.classList.add('open');},optDelay);
  }
  document.getElementById('go-btn').addEventListener('click',submitAnswer);
  panel.scrollIntoView({behavior:'smooth',block:'start'});
  if(window.setFightState)window.setFightState('CD_ATTACK');
}

/* —— VERDICT —— */
async function renderVerdict(fullText){
  speakStop();
  const parsed=fullText?parseResponse(fullText):{};
  const conf=parseInt(parsed.confidence)||0;
  setMobile('Verdict');setSys('VERDICT','✓',conf||'—');
  panel.innerHTML=`
    <div class="q-card" style="text-align:center;padding:2.2rem 1.4rem">
      <div class="rnd-hdr" style="justify-content:center">
        <div class="rnd-dot"></div>// CipherDusk is finalizing judgment...
      </div>
      <div class="thinking" style="justify-content:center;padding:1.1rem 0">
        <span></span><span></span><span></span>
      </div>
    </div>`;
  panel.scrollIntoView({behavior:'smooth',block:'start'});
  await delay(1200);
  panel.innerHTML=`
    <div class="verdict-stage" id="verdict-stage">
      <div class="verdict-scan-line"></div>
      <div class="verdict-slam-text" id="decided-word">DECIDED</div>
      <div class="verdict-sub-label">// ANALYSIS COMPLETE</div>
    </div>`;
  if(window.triggerVerdictVictory)window.triggerVerdictVictory();
  setTimeout(()=>{document.getElementById('decided-word')?.classList.add('verdict-decode');},400);
  setTimeout(()=>{document.getElementById('decided-word')?.classList.add('verdict-slide-out');},1800);
  setTimeout(()=>{
    const stg=document.getElementById('verdict-stage');
    if(!stg)return;
    _appendVerdictResults(stg,parsed,fullText,conf);
  },1950);
  panel.scrollIntoView({behavior:'smooth',block:'start'});
}

function _appendVerdictResults(stage,parsed,fullText,conf){
  const verdictText=parsed.verdict||(fullText?'':'Analysis complete.');
  const{main:mainLine,rest:mainRest}=verdictText?parseVerdictMainLine(verdictText):{main:'',rest:''};
  const ttsFull=(verdictText+(parsed.why?' Why: '+parsed.why:'')).replace(/<br>/g,' ');
  /* DECIDED word has already slid out — remove from layout */
  const dw=document.getElementById('decided-word');
  if(dw)dw.style.display='none';
  /* Build results box that slides up */
  const box=document.createElement('div');
  box.className='verdict-results-box';
  const accColors={'Why':'var(--or)','Best Case':'#22c55e','Worst Case':'#ef4444','Timeline':'var(--or)','Pattern':'var(--cy)','Risks':'var(--or)'};
  const accs=[
    parsed.why?{label:'Why',content:parsed.why}:null,
    parsed.bestCase?{label:'Best Case',content:parsed.bestCase}:null,
    parsed.worstCase?{label:'Worst Case',content:parsed.worstCase}:null,
    parsed.timeline?{label:'Timeline',content:parsed.timeline}:null,
    parsed.pattern?{label:'Pattern',content:parsed.pattern}:null,
    parsed.risks?{label:'Risks',content:parsed.risks}:null,
  ].filter(Boolean);
  /* Decision box always visible first */
  const decisionHtml=verdictText?`<div class="v-result-item slide-r" style="animation-delay:.1s">
    <div class="verdict-decision-box" style="margin:0 0 .5rem">
      <div class="verdict-label">Decision</div>
      ${mainLine?`<div class="verdict-mainline">${esc(mainLine)}</div>`:''}
      ${mainRest?`<div class="verdict-text" style="margin-top:.45rem;opacity:.82">${esc(mainRest)}</div>`:''}
    </div>
  </div>`:'';
  /* Accordion sections slide in alternating left/right */
  const sectHtml=accs.map((s,i)=>{
    const dir=i%2===0?'slide-l':'slide-r';
    const delay=0.25+i*0.15;
    const col=accColors[s.label]||'var(--or)';
    return `<div class="v-result-item ${dir}" style="animation-delay:${delay}s">
      <div class="v-acc v-verdict-acc">
        <div class="v-acc-hdr" onclick="toggleAcc(this.parentElement)">
          <span style="color:${col}">${s.label}</span>
          <span class="v-acc-icon">▶</span>
        </div>
        <div class="v-acc-body"><div class="v-acc-inner">${esc(s.content)}</div></div>
      </div>
    </div>`;
  }).join('');
  const sectHtmlFull=decisionHtml+sectHtml;
  box.innerHTML=`${conf?confBarHTML(conf):''}${sectHtmlFull}
    <div class="earned" style="margin-top:1rem">
      <div class="earned-word">DECIDED.</div>
      <div class="earned-sub">You earned that analysis. Now act on it.</div>
    </div>
    <div class="btn-row" style="flex-wrap:wrap">
      ${verdictText?`<button class="tts-btn tts-lg" title="Hear verdict" data-tts="${attr(ttsFull)}" onclick="speakText(this.dataset.tts)" style="margin-top:.7rem">🔊</button>`:''}
      <button class="btn green" onclick="enterDeepDive()" style="flex:1;min-width:130px">GO DEEPER →</button>
      <button class="btn primary" onclick="reset()" style="flex:1;min-width:130px">↺ New Decision</button>
    </div>`;
  stage.appendChild(box);
  if(conf)requestAnimationFrame(()=>animateConf(0,conf));
  insightPanel.innerHTML=`<div class="insight-card hot"><div class="insight-icon">🎯</div><div class="insight-title">Analysis Complete</div><div class="insight-body">Verdict delivered. Go deeper to uncover what the first pass missed.</div></div>`;
  if(autoAudio&&verdictText)setTimeout(()=>speakText(ttsFull),600);
}

/* ============================================================
   DEEP DIVE
============================================================ */
function enterDeepDive(){
  stage=4;deepChat=[...chat];deepRoundNum=0;
  if(window.startDeepRevival)window.startDeepRevival();
  runDeepRound();
}

async function runDeepRound(){
  speakStop();
  deepRoundNum++;
  const mode=`deep${Math.min(deepRoundNum,3)}`;
  const histStr=[...chat,...deepChat].map(m=>`${m.role.toUpperCase()}: ${m.content}`).join('\n');
  setMobile(`Deep ${deepRoundNum}/3`);setSys('DEEP DIVE',`${deepRoundNum}/3`,'—');
  panel.innerHTML=`${progressHTML()}<div class="q-card">
    <div class="rnd-hdr"><div class="rnd-dot" style="background:var(--gr);box-shadow:0 0 8px var(--gr)"></div>// Deep Dive — Extended Reflection<span class="round-badge">Deep ${deepRoundNum}/3</span></div>
    <div class="q-text" id="stream-prev"><div class="thinking"><span></span><span></span><span></span></div></div>
  </div>`;
  await streamTo(
    {mode,decision,history:histStr,context:fileContext},
    ()=>{},
    (full)=>{
      deepChat.push({role:'ai',content:full});
      const parsed=parseResponse(full);
      const conf=parseInt(parsed.confidence)||0;
      if((parsed.verdict&&conf>=80)||deepRoundNum>=3)runDeepSummary();
      else{if(parsed.insight)updateInsight(parsed.insight,parsed.confidence);transitionOut(()=>renderDeepQuestion(parsed));}
    }
  );
}

function renderDeepQuestion(parsed){
  _buildDeepQ(parsed);
}

function _buildDeepQ(parsed){
  const conf=parseInt(parsed.confidence)||0;
  const qText=parsed.question||'What remains unresolved?';
  const optsTxt=parsed.options.map(l=>l.trim().replace(/^[A-D][).]\s*/i,'')).join('. ');
  panel.innerHTML=`
    ${progressHTML()}
    ${conf?confBarHTML(conf):''}
    <div class="q-card">
      <div class="rnd-hdr">
        <div class="rnd-dot" style="background:var(--gr);box-shadow:0 0 8px var(--gr)"></div>// Deep Dive
        <span class="round-badge">Deep ${deepRoundNum}/3</span>
        <button class="tts-btn" title="Listen" data-tts="${attr(qText+'. Options: '+optsTxt)}" onclick="speakText(this.dataset.tts)">🔊</button>
        <button class="auto-audio-btn${autoAudio?' active':''}" onclick="toggleAutoAudio()">${autoAudio?'🔊 AUTO':'🔇 AUTO'}</button>
      </div>
      ${decision?`<div class="decision-echo">Re: "${decision.slice(0,55)}${decision.length>55?'...':''}"</div>`:''}
      <div class="q-text" id="q-text"><div class="thinking"><span></span><span></span><span></span></div></div>
      <div class="options-grid" id="opts"></div>
      <div class="manual-wrap" id="manual-wrap">
        <span class="lbl">Or explain in your own words</span>
        <textarea id="manual-inp" placeholder="Be specific." style="min-height:65px"></textarea>
      </div>
      <div class="btn-row">
        <button class="btn green" style="flex:1" id="go-btn">SUBMIT ANSWER →</button>
        <button class="btn sm" id="voice-btn" onclick="startVoiceAnswer()">🎤 Voice</button>
        <button class="btn sm" onclick="reset()">↺ Reset</button>
      </div>
    </div>`;
  if(conf){requestAnimationFrame(()=>animateConf(prevConf,conf));prevConf=conf;}
  const qEl=document.getElementById('q-text');
  setTimeout(()=>{
    typewrite(qEl,qText);
    if(autoAudio)setTimeout(()=>speakText(qText+'. Options: '+optsTxt),300);
  },80);
  const optsEl=document.getElementById('opts');
  const optDelay=Math.min(qText.length*2+80,250);
  if(parsed.options.length){
    setTimeout(()=>{
      optsEl.innerHTML=parsed.options.map(l=>{
        const key=l.trim()[0],txt=l.trim().replace(/^[A-D][).]\s*/i,'').trim();
        return `<button class="opt-card" data-key="${key}" onclick="selectOpt(this,'${key}')">
          <span class="opt-key">${key}</span><span class="opt-text">${esc(txt)}</span>
        </button>`;
      }).join('');
    },optDelay);
  } else {
    setTimeout(()=>{const mw=document.getElementById('manual-wrap');if(mw)mw.classList.add('open');},optDelay);
  }
  document.getElementById('go-btn').addEventListener('click',submitDeepAnswer);
  panel.scrollIntoView({behavior:'smooth',block:'start'});
  if(window.setFightState)window.setFightState('CD_ATTACK');
}

async function submitDeepAnswer(){
  speakStop();
  const txt=collectAnswer();if(!txt)return;
  if(window.setFightState)window.setFightState('YOU_ATTACK');
  deepChat.push({role:'user',content:txt});selectedOpt='';
  const btn=document.getElementById('go-btn');
  btn.disabled=true;btn.innerHTML='<span class="spin"></span>&nbsp;Analyzing...';
  if(deepRoundNum>=3)runDeepSummary();else runDeepRound();
}

async function runDeepSummary(){
  speakStop();
  const histStr=[...chat,...deepChat].map(m=>`${m.role.toUpperCase()}: ${m.content}`).join('\n');
  setMobile('Synthesizing');
  panel.innerHTML=`${progressHTML()}<div class="q-card">
    <div class="rnd-hdr"><div class="rnd-dot" style="background:var(--gr);box-shadow:0 0 8px var(--gr)"></div>// CipherDusk synthesizing...</div>
    <div class="q-text" id="stream-prev"><div class="thinking"><span></span><span></span><span></span></div></div>
  </div>`;
  await streamTo(
    {mode:'deep_summary',decision,history:histStr,context:fileContext},
    ()=>{},
    (full)=>{deepChat.push({role:'ai',content:full});transitionOut(()=>renderDeepVerdict(full));}
  );
}

function renderDeepVerdict(fullText){
  speakStop();
  const parsed=parseResponse(fullText);
  const conf=parseInt(parsed.confidence)||0;
  setMobile('Deep Verdict');setSys('DEEP VERDICT','✓✓',conf||'—');
  const {main:mainLine,rest:mainRest}=parsed.verdict?parseVerdictMainLine(parsed.verdict):{main:'',rest:''};
  const ttsFull=((parsed.verdict||'')+(parsed.why?' Why: '+parsed.why:'')).replace(/<br>/g,' ');
  panel.innerHTML=`
    ${progressHTML()}
    <div class="deep-verdict-card">
      <div class="verdict-stamp" style="color:var(--gr)">🌊</div>
      <div class="verdict-hdr-row">
        <div class="deep-verdict-title">DEEP VERDICT</div>
        ${parsed.verdict?`<button class="tts-btn tts-lg" title="Hear verdict" data-tts="${attr(ttsFull)}" onclick="speakText(this.dataset.tts)">🔊</button>`:''}
      </div>
      ${conf?confBarHTML(conf):''}
      ${parsed.verdict?`<div class="verdict-decision-box" style="border-color:rgba(34,197,94,.35)">
        <div class="verdict-label green">Refined Decision</div>
        ${mainLine?`<div class="verdict-mainline" style="color:var(--gr)">${esc(mainLine)}</div>`:''}
        ${mainRest?`<div class="verdict-text" style="margin-top:.45rem;opacity:.82">${esc(mainRest)}</div>`:''}
      </div>`:''}
      <div class="v-acc-grid">
        ${accSection('Why',parsed.why,'var(--gr)',0)}
        ${accSection('Deep Insight',parsed.deepInsight,'var(--gr)',1)}
        ${accSection('Hidden Risks',parsed.risks,'var(--gr)',2)}
        ${accSection('Best Case',parsed.bestCase,'#22c55e',3)}
        ${accSection('Worst Case',parsed.worstCase,'#ef4444',4)}
        ${accSection('Timeline',parsed.timeline,'var(--gr)',5)}
        ${accSection('Psychological Pattern',parsed.pattern,'var(--cy)',6)}
      </div>
    </div>
    <div class="earned" style="border-color:var(--gr)">
      <div class="earned-word" style="color:var(--gr)">DEEPER.</div>
      <div class="earned-sub">Extended reflection complete. You went further than most.</div>
    </div>
    <button class="btn primary" onclick="reset()">↺ Analyze Another Decision</button>`;
  if(conf)requestAnimationFrame(()=>animateConf(0,conf));
  insightPanel.innerHTML=`<div class="insight-card" style="border-color:var(--gr)">
    <div class="insight-icon">🌊</div><div class="insight-title" style="color:var(--gr)">Deep Dive Complete</div>
    <div class="insight-body">Three levels deeper. The reflection surfaced what the surface missed.</div>
  </div>`;
  panel.scrollIntoView({behavior:'smooth',block:'start'});
  if(autoAudio&&parsed.verdict)setTimeout(()=>speakText(ttsFull),600);
}

/* —— COLLECT ANSWER —— */
function collectAnswer(){
  const mi=document.getElementById('manual-inp');
  if(selectedOpt==='D'||!selectedOpt){
    const txt=(mi?.value||'').trim();
    if(!txt){shake(mi||document.querySelector('.opt-card'));return null;}
    return txt;
  }
  const sb=document.querySelector(`.opt-card[data-key="${selectedOpt}"]`);
  let txt=sb?sb.querySelector('.opt-text').textContent.trim():'';
  const extra=(mi?.value||'').trim();
  if(extra)txt+=' — '+extra;
  if(!txt){shake(document.querySelector('.opt-card'));return null;}
  return txt;
}

/* —— OPTION SELECT —— */
function selectOpt(btn,key){
  document.querySelectorAll('.opt-card').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');selectedOpt=key;
  const mw=document.getElementById('manual-wrap');
  if(mw)key==='D'?mw.classList.add('open'):mw.classList.remove('open');
}

/* —— FILE —— */
async function handleFile(input){
  const file=input.files[0];if(!file)return;
  const fnEl=document.getElementById('fname');
  fnEl.textContent=`Loading ${file.name}...`;fnEl.style.color='var(--mu)';
  const fd=new FormData();fd.append('file',file);
  try{
    const r=await fetch('/upload',{method:'POST',body:fd});
    if(!r.ok)throw new Error(`Server error ${r.status}`);
    const d=await r.json();
    if(d.error)throw new Error(d.error);
    fileContext=d.text||'';
    fnEl.textContent=`✓ ${file.name} (${Math.round(fileContext.length/100)/10}k chars)`;fnEl.style.color='var(--or)';
  }catch(e){
    fileContext='';
    fnEl.textContent=`✗ Failed — continuing without context`;fnEl.style.color='#ef4444';
  }
}

/* —— STREAM —— */
async function streamTo(body,onToken,onDone){
  let full='',first=true;
  try{
    const res=await fetch('/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const reader=res.body.getReader();const dec=new TextDecoder();
    while(true){
      const{done,value}=await reader.read();if(done)break;
      for(const line of dec.decode(value).split('\n')){
        if(!line.startsWith('data:'))continue;
        try{
          const d=JSON.parse(line.slice(5));full+=d.token;
          if(first){const el=document.getElementById('stream-prev');if(el)el.innerHTML='';first=false;}
          onToken(full);
        }catch(e){}
      }
    }
  }catch(e){full='Connection error. Make sure the server is running.';}
  onDone(full);
}

/* —— SUBMIT DECISION —— */
async function submitDecision(){
  const txt=(document.getElementById('inp')?.value||'').trim();
  if(!txt){shake(document.getElementById('inp'));return;}
  decision=txt;
  if(window.setFightState)window.setFightState('WALK_IN');
  const btn=document.getElementById('go-btn');
  btn.disabled=true;btn.innerHTML='<span class="spin"></span>&nbsp;Analyzing...';
  chat=[];roundNum=1;prevConf=0;
  setMobile('Round 1/3');setSys('ANALYZING','1/3','—');
  panel.innerHTML=`${progressHTML()}<div class="q-card">
    <div class="rnd-hdr"><div class="rnd-dot"></div>// Reading your decision...</div>
    <div class="q-text" id="stream-prev"><div class="thinking"><span></span><span></span><span></span></div></div>
  </div>`;
  await streamTo(
    {mode:'cd1',decision,context:fileContext},
    ()=>{},
    (full)=>{
      chat.push({role:'ai',content:full});
      const parsed=parseResponse(full);
      stage=1;
      if(parsed.insight)updateInsight(parsed.insight,parsed.confidence);
      if(!parsed.question&&parsed.verdict){
        parsed.question='What specific context led you to this decision that I should know about?';
        parsed.options=['A) Practical need or external pressure','B) Long-held desire finally acting on it','C) Escaping a current situation','D) Other — I\'ll explain myself'];
      }
      transitionOut(()=>renderQuestion(parsed));
    }
  );
}

/* —— SUBMIT ANSWER —— */
async function submitAnswer(){
  speakStop();
  const txt=collectAnswer();if(!txt)return;
  if(window.setFightState)window.setFightState('YOU_ATTACK');
  chat.push({role:'user',content:txt});selectedOpt='';roundNum++;
  stage=Math.min(roundNum,2);
  setMobile(`Round ${Math.min(roundNum,3)}/3`);
  const btn=document.getElementById('go-btn');
  btn.disabled=true;btn.innerHTML='<span class="spin"></span>&nbsp;Analyzing...';
  const histStr=chat.map(m=>`${m.role.toUpperCase()}: ${m.content}`).join('\n');
  let mode='cd2';
  if(roundNum>=4)mode='cd_final';
  setSys('ANALYZING',`${Math.min(roundNum,3)}/3`,'—');
  panel.innerHTML=`${progressHTML()}<div class="q-card">
    <div class="rnd-hdr"><div class="rnd-dot"></div>// CipherDusk is thinking...</div>
    <div class="q-text" id="stream-prev"><div class="thinking"><span></span><span></span><span></span></div></div>
  </div>`;
  await streamTo(
    {mode,decision,history:histStr,answer:txt,context:fileContext},
    ()=>{},
    (full)=>{
      chat.push({role:'ai',content:full});
      const parsed=parseResponse(full);
      const conf=parseInt(parsed.confidence)||0;
      if(conf>=80||mode==='cd_final'){
        if(parsed.verdict||mode==='cd_final'){stage=99;saveHistory(full);transitionOut(()=>renderVerdict(full));}
        else forceFinalVerdict(histStr);
      } else {
        if(parsed.insight)updateInsight(parsed.insight,parsed.confidence);
        transitionOut(()=>renderQuestion(parsed));
      }
    }
  );
}

/* —— FORCE FINAL —— */
async function forceFinalVerdict(histStr){
  panel.innerHTML=`${progressHTML()}<div class="q-card">
    <div class="rnd-hdr"><div class="rnd-dot"></div>// Confidence threshold reached — generating verdict...</div>
    <div class="q-text" id="stream-prev"><div class="thinking"><span></span><span></span><span></span></div></div>
  </div>`;
  await streamTo(
    {mode:'cd_final',decision,history:histStr,context:fileContext},
    ()=>{},
    (full)=>{chat.push({role:'ai',content:full});stage=99;saveHistory(full);transitionOut(()=>renderVerdict(full));}
  );
}

/* —— UTILS —— */
function reset(){
  speakStop();
  stage=0;decision='';chat=[];fileContext='';selectedOpt='';roundNum=0;prevConf=0;deepChat=[];deepRoundNum=0;
  if(window.resetVictory)window.resetVictory();
  if(window.setFightState)window.setFightState('IDLE');
  insightPanel.innerHTML=`
    <div class="insight-card"><div class="insight-icon">🧠</div><div class="insight-title">Insight Panel</div><div class="insight-body">CipherDusk will surface cognitive biases and psychological patterns here as you answer.</div></div>
    <div class="insight-card"><div class="insight-icon">⚔️</div><div class="insight-title">How It Works</div><div class="insight-body">Answer honestly. Minimum 2 rounds before verdict. The friction is the point.</div></div>`;
  render();
}
function shake(el){if(!el)return;el.style.borderColor='#ff4444';el.focus?.();setTimeout(()=>{if(el.style)el.style.borderColor='';},700);}

render();
renderHistory();
