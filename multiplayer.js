/* ===== Paws & Keys: Online Battle =====
   A public lobby: everyone on the Online screen can see each other and send a battle challenge.
   Battles are live: both players type at the same time, and every clean word (no mistakes) hits the other side.
   There is no chat. Players only see a name, a fighter and a battle.
   The live connection is the /api/live WebSocket on the Cloudflare host (play.nikhilharsh.com). */
(function(){
  if(typeof SCREENS === 'undefined' || typeof go !== 'function') return;

  const LIVE_OK = !/github\.io$/.test(location.hostname) && location.protocol !== 'file:';
  const WS_URL = () => (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/api/live';

  let ws = null, myId = null, lobby = [], fighterChoice = 'pet', battle = null, pending = null, retryT = null;

  /* ---------- fighter: what other players see of you ---------- */
  function myFighter(){
    const st = typeof playerStage === 'function' ? playerStage(P) : 0;
    if(fighterChoice !== 'pet' && P.critters && P.critters[fighterChoice] && critterById(fighterChoice)){
      const c = critterById(fighterChoice);
      return {kind:'critter', id:c.id, name:c.name, max:46 + 8*c.rare, power:1 + .12*c.rare};
    }
    const pet = activePet();
    return {kind:'pet', pet:{kind:pet.kind, color:pet.color||'natural', acc:pet.acc||'none'}, stage:st, name:pet.name, max:50 + 8*st, power:1 + .15*st};
  }
  // Draw another player's fighter from a small description, never from their raw markup.
  function fighterArt(f){
    if(!f) return '';
    if(f.kind === 'critter'){ const c = critterById(f.id); return c ? critterSVG(c) : ''; }
    const p = f.pet || {};
    return petSVG({kind:String(p.kind||''), color:String(p.color||'natural'), acc:String(p.acc||'none')}, 'pt', Math.max(0, Math.min(9, +f.stage||0)));
  }

  /* ---------- connection ---------- */
  function send(o){ if(ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
  function connect(){
    if(!LIVE_OK || ws) return;
    try{ ws = new WebSocket(WS_URL()); }catch(e){ ws = null; return; }
    ws.onopen = () => send({t:'hello', name:P.name, fighter:myFighter()});
    ws.onmessage = e => { let m; try{ m = JSON.parse(e.data); }catch(err){ return; } onMsg(m); };
    ws.onclose = () => {
      ws = null; myId = null; lobby = [];
      if(battle && !battle.over){ battleEnd({result:'dropped'}); }
      if(currentScreen === 'online'){ renderLobby('Reconnecting...'); clearTimeout(retryT); retryT = setTimeout(connect, 3000); }
    };
  }
  function disconnect(){ clearTimeout(retryT); if(ws){ const w = ws; ws = null; try{ w.close(); }catch(e){} } }
  document.addEventListener('visibilitychange', () => {
    if(document.hidden && currentScreen === 'online' && !battle) disconnect();
    else if(!document.hidden && currentScreen === 'online' && !ws) connect();
  });

  function onMsg(m){
    if(m.t === 'welcome'){ myId = m.id; }
    else if(m.t === 'lobby'){ lobby = Array.isArray(m.players) ? m.players : []; if(currentScreen === 'online' && !battle && !MODAL) renderLobby(); }
    else if(m.t === 'challenged'){
      if(battle || currentScreen !== 'online'){ send({t:'decline', from:m.from}); return; }
      sfx('pet'); say(`${m.name} wants to battle!`);
      openModal(`<h2>Battle?</h2><div class="caughtrow"><div class="cc">${fighterArt(m.fighter)}<b>${esc(m.name)}</b></div></div><p><b>${esc(m.name)}</b> wants to battle you!</p>
        <div class="acts"><button class="btn" data-m="no">No thanks</button><button class="btn big grass" data-m="yes" data-default>Let's battle!</button></div>`,
        {no:()=>{ closeModal(); send({t:'decline', from:m.from}); renderLobby(); }, yes:()=>{ closeModal(); send({t:'accept', from:m.from}); renderLobby('Starting...'); }});
    }
    else if(m.t === 'declined'){ pending = null; if(currentScreen === 'online' && !battle){ closeModal(); renderLobby(`${esc(m.name||'They')} said not right now.`); } }
    else if(m.t === 'busy'){ pending = null; if(currentScreen === 'online' && !battle){ closeModal(); renderLobby('They are already in a battle. Try someone else!'); } }
    else if(m.t === 'start'){ pending = null; closeModal(); battleStart(m); }
    else if(m.t === 'word' && battle){ battleWord(m.word); }
    else if(m.t === 'hit' && battle){ battleHit(m); }
    else if(m.t === 'end' && battle){ battleEnd(m); }
  }

  /* ---------- lobby screen ---------- */
  SCREENS.online = () => {
    currentScreen = 'online';
    battle = null;
    if(!LIVE_OK){
      app.innerHTML = topbar() + `<div class="main wrap"><div class="card" style="max-width:620px;margin:20px auto;padding:22px;text-align:center"><h2>Online Battle</h2><p>Online battles work at <b>play.nikhilharsh.com</b>.</p></div></div>`;
      return;
    }
    renderLobby('Finding players...');
    connect();
    if(ws && ws.readyState === 1) send({t:'hello', name:P.name, fighter:myFighter()});
    cleanups.push(() => { if(!battle) disconnect(); });
  };
  function renderLobby(status){
    if(currentScreen !== 'online') return;
    const others = lobby.filter(p => p.id !== myId);
    const mine = CRITTERS.filter(c => P.critters && P.critters[c.id]);
    const pet = activePet();
    const pick = (id, art, name) => `<button class="pp ${fighterChoice===id?'on':''}" data-act="ofight" data-id="${esc(id)}" style="${fighterChoice===id?'background:#D6F8E1;outline:4px solid var(--grass);outline-offset:2px':''}">${art}<b>${esc(name)}</b></button>`;
    app.innerHTML = topbar() + `<div class="main wrap"><div class="online" style="max-width:980px;margin:0 auto;display:flex;flex-direction:column;gap:14px">
      <div class="card" style="padding:16px 18px;display:flex;flex-direction:column;gap:8px">
        <h2 style="font-size:34px;margin:0">Online Battle</h2>
        <p style="margin:0">Pick a player and send a battle! Both of you type at the same time. <b>Clean words</b> (no mistakes) hit. First to knock out the other wins.</p>
        ${status ? `<p class="note" style="margin:0">${status}</p>` : ''}
      </div>
      <div class="card" style="padding:14px 18px"><h3 style="font-family:var(--display);font-size:22px;margin:0 0 8px">Your fighter</h3>
        <div class="pickpartner" style="justify-content:flex-start">${pick('pet', petSVG(pet), pet.name)}${mine.map(c => pick(c.id, critterSVG(c), c.name)).join('')}</div></div>
      <div class="card" style="padding:14px 18px"><h3 style="font-family:var(--display);font-size:22px;margin:0 0 8px">Players online ${others.length ? `(${others.length})` : ''}</h3>
        ${others.length ? `<div class="pickpartner" style="justify-content:flex-start">${others.map(p => `<button class="pp" data-act="ochal" data-id="${esc(p.id)}" ${p.busy?'disabled style="opacity:.5"':''}>${fighterArt(p.fighter)}<b>${esc(p.name)}</b><small>${p.busy ? 'In a battle' : 'Tap to battle'}</small></button>`).join('')}</div>`
          : `<p class="note" style="margin:0">Nobody else is here yet. Stay on this screen and you will see players when they come online.</p>`}
      </div></div></div>`;
    SCR.ofight = b => { fighterChoice = b.dataset.id; sfx('pet'); send({t:'hello', name:P.name, fighter:myFighter()}); renderLobby(); };
    SCR.ochal = b => {
      const p = lobby.find(x => x.id === b.dataset.id); if(!p || p.busy) return;
      pending = p.id; send({t:'challenge', to:p.id}); sfx('key');
      openModal(`<h2>Waiting...</h2><div class="caughtrow"><div class="cc">${fighterArt(p.fighter)}<b>${esc(p.name)}</b></div></div><p>Asking <b>${esc(p.name)}</b> to battle.</p><div class="acts"><button class="btn" data-m="cancel" data-default>Cancel</button></div>`,
        {cancel:()=>{ closeModal(); send({t:'cancel', to:p.id}); pending = null; renderLobby(); }});
    };
  }

  /* ---------- live battle ---------- */
  function battleStart(m){
    const me = m.you, foe = m.foe;
    battle = {me, foe, typer:null, over:false, keys:0, firstOK:0, chars:0, clean:0, words:0, start:Date.now()};
    app.innerHTML = topbar() + `<div class="main wrap fit"><div class="typing"><div class="card game-area arena"></div></div></div>`;
    const area = $('.arena');
    area.innerHTML = `<div class="fighter me" id="fMe"><div class="hpbox"><b>${esc(me.name)}</b><div class="hp"><i id="hpMe"></i></div></div><div class="fart">${fighterArt(me.fighter)}</div></div>
      <div class="bmsg" id="bmsg">Battle with <b>${esc(foe.name)}</b>! Type clean words to hit.</div>
      <div class="fighter foe" id="fFoe"><div class="hpbox"><b>${esc(foe.name)}</b><div class="hp"><i id="hpFoe"></i></div></div><div class="fart">${fighterArt(foe.fighter)}</div></div>`;
    $('.typing').insertAdjacentHTML('beforeend', `<div class="card wordbox"><div class="lbl" id="wlbl">Get ready...</div><div class="line" id="line"></div></div>${keyboardHTML('abcdefghijklmnopqrstuvwxyz ', false)}`);
    requestAnimationFrame(() => layoutDots());
    bars(me.hp, me.max, foe.hp, foe.max);
    say(`Battle with ${foe.name}! Type clean words to hit.`);
    cleanups.push(() => { if(battle && !battle.over){ send({t:'forfeit'}); battle = null; disconnect(); } });
  }
  function bars(mh, mm, fh, fm){
    const a = $('#hpMe'), b = $('#hpFoe'); if(!a || !b) return;
    a.style.width = Math.max(0, mh/mm*100) + '%'; b.style.width = Math.max(0, fh/fm*100) + '%';
    a.classList.toggle('low', mh/mm < .3); b.classList.toggle('low', fh/fm < .3);
  }
  const msg = t => { const el = $('#bmsg'); if(el) el.innerHTML = t; };
  const pop = (sel, text, cls='') => { const el = $(sel); if(!el) return; const d = document.createElement('div'); d.className = 'dmg ' + cls; d.textContent = text; el.appendChild(d); setTimeout(() => d.remove(), 1000); };
  const anim = (sel, cls) => { const el = $(sel); if(!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  function battleWord(word){
    if(!battle || battle.over || !$('#line')) return;
    battle.words++;
    $('#wlbl').textContent = `Word ${battle.words}`;
    battle.typer = makeTyper($('#line'), String(word), {
      onWrong: T => { if(T.errAt.size === 1) msg('Oops, a mistake! This one will miss. Finish the word.'); },
      onDone: T => {
        keyHandler = null;
        battle.keys += T.keys; battle.firstOK += T.firstOK; battle.chars += T.text.length;
        const clean = T.errAt.size === 0; if(clean) battle.clean++;
        send({t:'done', word:T.text, clean});
      }
    });
    keyHandler = k => battle && battle.typer && battle.typer.key(k);
  }
  function battleHit(m){
    if(!battle) return;
    const iHit = m.by === myId;
    if(m.miss){
      if(iHit){ sfx('miss'); anim('#fMe','whiff'); pop('#fMe','miss','miss'); msg('Missed! Clean words always hit.'); }
      else { anim('#fFoe','whiff'); pop('#fFoe','miss','miss'); msg(`${esc(battle.foe.name)} missed!`); }
    } else if(iHit){
      anim('#fMe','lunge'); sfx('hit'); setTimeout(() => anim('#fFoe','hurt'), 220); pop('#fFoe','-' + m.dmg, m.fast ? 'fast' : '');
      msg(m.fast ? `Speedy clean hit! <b>${m.dmg}</b>` : `Clean hit! <b>${m.dmg}</b>`);
    } else {
      anim('#fFoe','lunge-r'); sfx('dig'); setTimeout(() => anim('#fMe','hurt'), 220); pop('#fMe','-' + m.dmg);
      msg(`${esc(battle.foe.name)} hits! <b>${m.dmg}</b>`);
    }
    bars(m.you, battle.me.max, m.foe, battle.foe.max);
  }
  function battleEnd(m){
    if(!battle || battle.over) return;
    battle.over = true; keyHandler = null; try{ kbHighlight(null); }catch(e){}
    const b = battle, result = m.result;
    const win = result === 'win' || result === 'foe-left';
    const acc = b.chars ? b.firstOK / b.chars : 1;
    P.games.battle = P.games.battle || {plays:0, wins:0};
    P.games.online = P.games.online || {plays:0, wins:0};
    P.games.online.plays++; if(win) P.games.online.wins++;
    P.stats.keys += b.keys; P.stats.correct += b.firstOK;
    const coins = result === 'dropped' ? 0 : win ? 20 : 8;
    if(coins) addCoins(coins);
    const goal = result === 'dropped' ? null : recordActivity(Date.now() - b.start);
    const bd = checkBadges(); save();
    if(win){ anim('#fFoe','beaten'); confetti(); sfx('win'); } else sfx('line');
    const title = result === 'win' ? 'You won!' : result === 'foe-left' ? 'You won!' : result === 'lose' ? 'Good battle!' : result === 'draw' ? 'It\'s a tie!' : 'Connection lost';
    const text = result === 'win' ? `You beat <b>${esc(b.foe.name)}</b>!` : result === 'foe-left' ? `<b>${esc(b.foe.name)}</b> left the battle.` : result === 'lose' ? `<b>${esc(b.foe.name)}</b> won this time. Clean words hit hardest!` : result === 'draw' ? 'Time is up and you are even!' : 'The internet dropped. Try again in a moment.';
    say(result === 'win' || result === 'foe-left' ? 'You won the battle!' : result === 'lose' ? 'Good battle! Try again!' : '');
    setTimeout(() => {
      if(currentScreen !== 'online') return;
      openModal(`<h2>${title}</h2><p>${text}</p>
        <div class="stats"><div class="stat"><b>${b.clean}/${b.words}</b><span>clean words</span></div><div class="stat"><b>${Math.round(acc*100)}%</b><span>right on first try</span></div><div class="stat"><b>+${coins}</b><span>coins</span></div></div>
        ${goal ? `<p><b>${goal}</b></p>` : ''}
        <div class="acts"><button class="btn" data-m="home">Home</button><button class="btn big grass" data-m="again" data-default>Find another battle</button></div>`,
        {home:()=>{ battle = null; disconnect(); go('home'); }, again:()=>{ closeModal(); battle = null; renderLobby(); send({t:'hello', name:P.name, fighter:myFighter()}); }});
      setTimeout(() => badgeToasts(bd), 900);
    }, win ? 900 : 500);
  }

  /* ---------- home tile ---------- */
  const homeOrig = SCREENS.home;
  SCREENS.home = function(){
    homeOrig.apply(this, arguments);
    const tiles = document.querySelector('.tiles'), anchor = tiles && tiles.querySelector('.battlet');
    if(!tiles) return;
    const t = document.createElement('button');
    t.className = 'tile battlet onlinet'; t.dataset.act = 'online';
    t.style.background = 'linear-gradient(135deg,#FFD0E1,#C9F0FF)';
    t.innerHTML = `<h3>Online Battle</h3><p>Battle other players live</p><span class="art" style="font-size:58px;display:grid;place-items:center">⚔️</span>`;
    if(anchor) anchor.after(t); else tiles.appendChild(t);
    SCR.online = () => go('online');
  };
})();
