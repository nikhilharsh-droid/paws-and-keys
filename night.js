/* ===== Paws & Keys: Night Watch (Block Builder) =====
   Day lasts a minute, then night falls and monsters walk in from both edges toward your pet and critter friends.
   - Type the word over a monster to zap it (a clean word hits hardest). Tap a monster for a small hit.
   - Walls stop walkers. Spiders climb walls. Bats fly over. Every monster is scared of Lantern blocks.
   - Survive the night to earn coins and new blocks. Each night brings a few more monsters. */
(function(){
  if(typeof SCREENS === 'undefined' || !SCREENS.build) return;

  const CELL = 24, DAY_SECS = 60, MAX_HEARTS = 5;
  const MOBS = {
    zombie:   {name:'Zombie',   hp:3, speed:.42, from:0},
    slime:    {name:'Slime',    hp:4, speed:.30, from:0},
    skeleton: {name:'Skeleton', hp:3, speed:.58, from:1},
    spider:   {name:'Spider',   hp:2, speed:.85, from:2, climbs:true},
    bat:      {name:'Bat',      hp:1, speed:.75, from:3, flies:true}
  };
  const ink = '#22305A', st = `stroke="${ink}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
  // Original cartoon monsters, drawn in a 32 x 40 box with feet at the bottom middle.
  const ART = {
    zombie: `<g transform="translate(-16,-40)">
      <rect x="9" y="17" width="14" height="16" rx="3" fill="#7A5C9E" ${st}/><path d="M9,27 l3,3 l3,-3 l3,3 l3,-3 l2,2" fill="none" ${st}/>
      <rect x="10" y="32" width="5" height="7" rx="2" fill="#5B4A3A" ${st}/><rect x="17" y="32" width="5" height="7" rx="2" fill="#5B4A3A" ${st}/>
      <rect x="22" y="19" width="10" height="5" rx="2.5" fill="#9CC48A" ${st}/><rect x="22" y="25" width="9" height="5" rx="2.5" fill="#9CC48A" ${st}/>
      <rect x="7" y="2" width="18" height="16" rx="6" fill="#9CC48A" ${st}/>
      <circle cx="13" cy="9" r="3.2" fill="#fff" ${st}/><circle cx="13" cy="9.5" r="1.4" fill="${ink}"/><circle cx="20.5" cy="10" r="2" fill="${ink}"/>
      <path d="M11,14.5 h9" ${st} fill="none"/><path d="M13,13.5 v2 M16,13.5 v2 M19,13.5 v2" ${st} stroke-width="1.2"/><path d="M8,6 l3,1" ${st} stroke-width="1.4"/></g>`,
    skeleton: `<g transform="translate(-16,-40)">
      <path d="M16,17 v14" ${st} stroke="#fff" stroke-width="3"/><path d="M16,17 v14" ${st} stroke-width="1" opacity=".5"/>
      <path d="M10,20 q6,3 12,0 M10,24 q6,3 12,0 M11,28 q5,2 10,0" fill="none" stroke="#F4F1E8" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M10,20 q6,3 12,0 M10,24 q6,3 12,0 M11,28 q5,2 10,0" fill="none" stroke="${ink}" stroke-width=".8" opacity=".6"/>
      <path d="M12,31 l-2,8 M20,31 l2,8 M9,19 l-4,7 M23,19 l5,5" stroke="#F4F1E8" stroke-width="3" stroke-linecap="round"/>
      <path d="M12,31 l-2,8 M20,31 l2,8 M9,19 l-4,7 M23,19 l5,5" stroke="${ink}" stroke-width=".8" stroke-linecap="round" opacity=".6"/>
      <path d="M7,10 a9,9 0 0 1 18,0 v3 q0,3 -3,3 h-12 q-3,0 -3,-3 z" fill="#F4F1E8" ${st}/>
      <ellipse cx="12.5" cy="10" rx="2.6" ry="3" fill="${ink}"/><ellipse cx="19.5" cy="10" rx="2.6" ry="3" fill="${ink}"/>
      <path d="M15.2,13 l.8,-1.5 l.8,1.5 z" fill="${ink}"/><path d="M11,16 v-2 M14,16 v-2 M17,16 v-2 M20,16 v-2" stroke="${ink}" stroke-width="1"/></g>`,
    spider: `<g transform="translate(-16,-40)">
      <path d="M10,28 q-6,-6 -9,2 M10,30 q-7,-2 -9,8 M22,28 q6,-6 9,2 M22,30 q7,-2 9,8 M11,32 q-4,2 -5,7 M21,32 q4,2 5,7 M12,26 q-5,-9 -10,-6 M20,26 q5,-9 10,-6" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse cx="16" cy="29" rx="9" ry="7.5" fill="#4B3B70" ${st}/><circle cx="16" cy="22" r="6" fill="#5C4A86" ${st}/>
      <circle cx="13.5" cy="21" r="1.6" fill="#FF5D6C"/><circle cx="18.5" cy="21" r="1.6" fill="#FF5D6C"/><circle cx="15" cy="24" r="1" fill="#FF5D6C"/><circle cx="17" cy="24" r="1" fill="#FF5D6C"/>
      <path d="M13,27 l2,2 l2,-2 l2,2" fill="none" stroke="#B9A6E8" stroke-width="1.2"/></g>`,
    slime: `<g transform="translate(-16,-40)">
      <path d="M3,39 q-1,-20 13,-22 q14,2 13,22 z" fill="#79D98C" fill-opacity=".9" ${st}/>
      <path d="M8,27 q2,-5 6,-6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>
      <circle cx="12" cy="29" r="2.6" fill="${ink}"/><circle cx="20" cy="29" r="2.6" fill="${ink}"/><circle cx="12.8" cy="28.2" r=".9" fill="#fff"/><circle cx="20.8" cy="28.2" r=".9" fill="#fff"/>
      <path d="M13,34 q3,2 6,0" fill="none" ${st} stroke-width="1.6"/><circle cx="24" cy="35" r="1.5" fill="#fff" opacity=".6"/></g>`,
    bat: `<g transform="translate(-16,-40)"><g class="wing">
      <path d="M16,26 q-6,-10 -15,-6 q4,2 3,6 q4,-2 5,3 q4,-3 7,-3 z" fill="#7B5BC2" ${st}/><path d="M16,26 q6,-10 15,-6 q-4,2 -3,6 q-4,-2 -5,3 q-4,-3 -7,-3 z" fill="#7B5BC2" ${st}/></g>
      <ellipse cx="16" cy="26" rx="5.5" ry="6" fill="#5A3F99" ${st}/><path d="M12,21 l1,-4 l2,3 M20,21 l-1,-4 l-2,3" fill="#5A3F99" ${st}/>
      <circle cx="14" cy="25" r="1.4" fill="#FFE066"/><circle cx="18" cy="25" r="1.4" fill="#FFE066"/><path d="M15,29 l.5,1.5 l.5,-1.5 M17,29 l.5,1.5 l.5,-1.5" fill="#fff" stroke="none"/></g>`
  };

  const css = document.createElement('style');
  css.textContent = `
  .worldcard{position:relative}
  .nightlayer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
  .nightlayer .mob{pointer-events:auto;cursor:pointer}
  .nightlayer .mob.hurt .art{animation:mobhurt .3s}
  .nightlayer .mob.dead{transition:opacity .45s,transform .45s;opacity:0}
  .nightlayer .mob .wing{animation:flap .35s infinite alternate;transform-origin:16px 26px}
  .nightlayer .bubble rect{fill:#fff;stroke:${ink};stroke-width:1.5}
  .nightlayer .bubble text{font-family:var(--kid);font-weight:700;font-size:12px;fill:${ink}}
  .nightlayer .bubble.on rect{fill:var(--sun)}
  .nightlayer .zap{stroke:#FFE066;stroke-width:3;fill:none;filter:drop-shadow(0 0 4px #FFE066);animation:zap .4s forwards}
  .nhud{position:absolute;top:8px;left:8px;right:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;pointer-events:none;z-index:2}
  .nhud>*{pointer-events:auto}
  .nhud .pill{background:var(--paper);border:3px solid var(--line);border-radius:999px;padding:4px 12px;font-family:var(--display);font-weight:800;font-size:17px;display:flex;gap:6px;align-items:center}
  .nhud .btn{min-height:40px;font-size:16px;padding:4px 12px}
  .ntype{position:absolute;left:50%;top:56px;transform:translateX(-50%);background:var(--paper);border:3px solid var(--line);border-radius:16px;padding:4px 14px;display:flex;gap:10px;align-items:center;z-index:2;box-shadow:0 4px 0 var(--shadow)}
  .ntype .lbl{font-weight:600;font-size:14px;color:var(--ink2)}
  .ntype .line{font-size:clamp(24px,3.4vw,34px);letter-spacing:1px}
  @keyframes mobhurt{0%,100%{transform:none}30%{transform:translateX(-3px)}60%{transform:translateX(3px)}}
  @keyframes flap{to{transform:scaleY(.6)}}
  @keyframes zap{from{opacity:1}to{opacity:0}}
  @media (prefers-reduced-motion:reduce){.nightlayer .mob .wing{animation:none}}`;
  document.head.appendChild(css);

  const buildOrig = SCREENS.build;
  SCREENS.build = function(){
    buildOrig.apply(this, arguments);
    const card = document.querySelector('.worldcard'), wsvg = document.getElementById('wsvg');
    if(!card || !wsvg) return;
    P.world.nights = P.world.nights || 0;

    const W = WORLD_W, H = WORLD_H;
    const ns = 'http://www.w3.org/2000/svg';
    card.insertAdjacentHTML('beforeend', `
      <svg class="nightlayer" id="nsvg" viewBox="0 0 ${W*CELL} ${H*CELL}" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <defs><radialGradient id="lglow"><stop offset="0" stop-color="#FFE9A0" stop-opacity=".75"/><stop offset="1" stop-color="#FFE9A0" stop-opacity="0"/></radialGradient></defs>
        <rect id="ndark" x="-400" y="-400" width="${W*CELL+800}" height="${H*CELL+800}" fill="#0B1240" opacity="0" style="transition:opacity 2s"/>
        <g id="nsky" opacity="0" style="transition:opacity 2s"></g>
        <g id="nglow"></g><g id="nhome"></g><g id="nmobs"></g><g id="nfx"></g>
      </svg>
      <div class="nhud" id="nhud"></div>
      <div class="ntype" id="ntype" hidden><span class="lbl">Type to zap:</span><div class="line" id="nline"></div></div>`);
    const $n = id => document.getElementById(id);
    // stars and moon
    let sky = `<circle cx="${W*CELL-40}" cy="34" r="16" fill="#FFF6C9"/><circle cx="${W*CELL-33}" cy="29" r="14" fill="#0B1240" opacity=".9"/>`;
    for(let i=0;i<26;i++) sky += `<circle cx="${(i*97)%(W*CELL)}" cy="${(i*53)%(H*CELL*0.45)}" r="${i%3?1:1.6}" fill="#fff" opacity="${.5+(i%4)*.12}"/>`;
    $n('nsky').innerHTML = sky;

    const cellsNow = () => worldCells();
    const solid = ch => ch !== '.';
    function surface(cells, col){ col = Math.max(0, Math.min(W-1, col)); for(let y=0;y<H;y++) if(solid(cells[y*W+col])) return y; return H; }
    function lanterns(cells){ const out = []; for(let i=0;i<cells.length;i++) if(cells[i]==='t') out.push({x:i%W + .5, y:Math.floor(i/W) + .5}); return out; }
    function homes(){
      const list = (P.world.c||[]).filter(f => f && f.length >= 3).map(f => ({x:f[0] + .5, id:f[2]}));
      return list.length ? list : [{x:W/2, id:'pet', drawn:true}];
    }

    let phase = 'day', dayLeft = DAY_SECS, raf = 0, last = performance.now();
    let mobs = [], wave = 0, spawned = 0, spawnT = 0, hearts = MAX_HEARTS, kills = 0, target = null, typer = null, words = [], wordI = 0;
    let keys = 0, firstOK = 0, nightStart = 0, nextId = 1;

    function hud(){
      const h = $n('nhud'); if(!h) return;
      if(phase === 'day'){
        const s = Math.ceil(dayLeft);
        h.innerHTML = `<span class="pill">☀️ Day · night in ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}</span><button class="btn small" data-act="nskip">🌙 Skip to night</button>${P.world.nights ? `<span class="pill">Nights survived: ${P.world.nights}</span>` : ''}`;
      } else {
        const left = wave - kills - (mobs.filter(m=>m.gone && !m.killed).length);
        h.innerHTML = `<span class="pill">🌙 Night ${P.world.nights + 1}</span><span class="pill">${Math.max(0,left)} monster${left===1?'':'s'} left</span><span class="pill">${'❤️'.repeat(hearts)}${'🤍'.repeat(MAX_HEARTS-hearts)}</span>`;
      }
    }
    SCR.nskip = () => { if(phase === 'day'){ sfx('key'); startNight(); } };

    function drawGlow(cells){
      $n('nglow').innerHTML = phase === 'night' ? lanterns(cells).map(l => `<circle cx="${l.x*CELL}" cy="${l.y*CELL}" r="${CELL*2.2}" fill="url(#lglow)"/>`).join('') : '';
      const hs = homes();
      if(phase === 'night' && hs[0].drawn){
        const y = surface(cells, Math.floor(hs[0].x));
        $n('nhome').innerHTML = petSVG(activePet()).replace(/^<svg /, `<svg x="${hs[0].x*CELL-22}" y="${y*CELL-44}" width="44" height="44" `);
      } else $n('nhome').innerHTML = '';
    }

    function startNight(){
      phase = 'night'; nightStart = Date.now();
      wave = 4 + Math.min(P.world.nights, 8); spawned = 0; spawnT = 1.2; hearts = MAX_HEARTS; kills = 0; mobs = []; target = null;
      words = typeof practiceWords === 'function' ? practiceWords(60, 2).filter(w => w.length <= 5) : [];
      if(words.length < 4) words = gameLetters();
      wordI = 0;
      $n('ndark').setAttribute('opacity', '.55'); $n('nsky').setAttribute('opacity', '1');
      $n('ntype').hidden = false;
      drawGlow(cellsNow()); hud();
      const hs = homes();
      say(hs[0].drawn ? `Night is here! Protect ${activePet().name}! Type the words to zap the monsters.` : 'Night is here! Protect your friends! Type the words to zap the monsters.');
      retarget();
    }
    function nextWord(){ const w = words[wordI % words.length]; wordI++; return w; }
    function spawn(){
      const pool = Object.keys(MOBS).filter(k => MOBS[k].from <= P.world.nights);
      const type = pool[Math.floor(Math.random() * pool.length)], def = MOBS[type];
      const left = spawned % 2 === 0, x = left ? -0.6 : W - 0.4;
      const cells = cellsNow(), y = def.flies ? 2.5 + Math.random()*2 : surface(cells, left ? 0 : W-1);
      const m = {id:nextId++, type, def, x, y, hp:def.hp, word:nextWord(), dir:left ? 1 : -1, wob:Math.random()*6, gone:false, killed:false, stuck:0};
      const g = document.createElementNS(ns, 'g'); g.setAttribute('class', 'mob'); g.dataset.mob = m.id;
      g.innerHTML = `<g class="body"><g class="art">${ART[type]}</g></g><g class="bubble"><rect x="-1" y="-62" rx="6" height="18" width="10"/><text x="0" y="-49" text-anchor="middle"></text></g>`;
      g.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); hit(m, 1, false); });
      $n('nmobs').appendChild(g); m.el = g;
      setWord(m, m.word);
      mobs.push(m); spawned++;
    }
    function setWord(m, w){
      m.word = w;
      const t = m.el.querySelector('.bubble text'), r = m.el.querySelector('.bubble rect');
      t.textContent = w; const wpx = Math.max(18, w.length * 8 + 10);
      r.setAttribute('width', wpx); r.setAttribute('x', -wpx/2);
    }
    function alive(){ return mobs.filter(m => !m.gone); }
    function danger(m){ const hs = homes(); return Math.min(...hs.map(h => Math.abs(h.x - m.x))); }
    function retarget(){
      if(typer && target && !target.gone && typer.pos > 0) return;   // never swap words in the middle of typing one
      const a = alive();
      const best = a.length ? a.reduce((p, c) => danger(c) < danger(p) ? c : p) : null;
      mobs.forEach(m => m.el && m.el.querySelector('.bubble').classList.toggle('on', m === best));
      if(best === target && typer) return;
      target = best;
      const line = $n('nline'); if(!line) return;
      if(!target){ line.innerHTML = ''; keyHandler = null; typer = null; return; }
      typer = makeTyper(line, target.word, {
        onDone: T => {
          keys += T.keys; firstOK += T.firstOK;
          const m = target; if(!m || m.gone) { retarget(); return; }
          zap(m); hit(m, T.errAt.size === 0 ? 3 : 2, true);
          if(!m.gone){ setWord(m, nextWord()); typer = null; target = null; }
          retarget();
        }
      });
      keyHandler = k => typer && typer.key(k);
    }
    function zap(m){
      const x = m.x*CELL, y = (m.y - 1)*CELL;
      const p = document.createElementNS(ns, 'path'); p.setAttribute('class', 'zap');
      p.setAttribute('d', `M${x+6},-10 L${x-4},${y*0.4} L${x+5},${y*0.6} L${x-3},${y}`);
      $n('nfx').appendChild(p); setTimeout(() => p.remove(), 450);
    }
    function hit(m, dmg, typed){
      if(m.gone || phase !== 'night') return;
      m.hp -= dmg; sfx(typed ? 'hit' : 'dig');
      const b = m.el; b.classList.remove('hurt'); void b.getBoundingClientRect(); b.classList.add('hurt');
      if(m.hp <= 0){ m.gone = true; m.killed = true; kills++; sfx('pop'); b.classList.add('dead'); setTimeout(() => b.remove(), 500); if(m === target){ target = null; typer = null; } retarget(); hud(); checkDawn(); }
    }
    function scare(m, home){
      m.gone = true; hearts--; sfx('miss');
      const who = home.id === 'pet' ? activePet().name : (critterById(home.id) ? critterById(home.id).name : 'your friend');
      toast(`${m.def.name} scared ${esc(who)}!`);
      m.el.classList.add('dead'); setTimeout(() => m.el.remove(), 500);
      if(m === target){ target = null; typer = null; }
      retarget(); hud();
      if(hearts <= 0) return dawn(false);
      checkDawn();
    }
    function checkDawn(){ if(phase === 'night' && spawned >= wave && !alive().length) dawn(hearts > 0); }

    function dawn(won){
      if(phase !== 'night') return;
      phase = 'day'; dayLeft = DAY_SECS; keyHandler = null; typer = null; target = null;
      mobs.forEach(m => { if(!m.gone){ m.gone = true; m.el.classList.add('dead'); setTimeout(() => m.el.remove(), 500); } });
      $n('ndark').setAttribute('opacity', '0'); $n('nsky').setAttribute('opacity', '0'); $n('ntype').hidden = true;
      try{ kbHighlight(null); }catch(e){}
      drawGlow(cellsNow());
      P.stats.keys += keys; P.stats.correct += firstOK; keys = 0; firstOK = 0;
      let coins = 0, gift = {};
      if(won){
        P.world.nights++;
        coins = 5 + 2*kills;
        const tier = blockTier(), pool = BLOCKS.filter(b => b.tier <= tier);
        for(let i=0;i<Math.max(3, kills);i++){ const b = pool[Math.floor(Math.random()*pool.length)]; gift[b.id] = (gift[b.id]||0) + 1; P.blocks[b.id] = (P.blocks[b.id]||0) + 1; }
      } else coins = kills;
      if(coins) addCoins(coins);
      const goal = recordActivity(Date.now() - nightStart);
      const bd = checkBadges(); save();
      if(won){ sfx('win'); confetti(); say('Sunrise! You protected your world!'); } else { sfx('line'); say('The monsters got in this time. Build walls and lanterns, then try again!'); }
      openModal(`<h2>${won ? 'Sunrise!' : 'Morning came'}</h2>
        <p>${won ? `You protected your world through night ${P.world.nights}!` : 'The monsters scared everyone this time. Walls slow them down, and lanterns keep them away!'}</p>
        <div class="stats"><div class="stat"><b>${kills}</b><span>monsters zapped</span></div><div class="stat"><b>+${coins}</b><span>coins</span></div></div>
        ${won ? `<p style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;align-items:center">New blocks: ${Object.keys(gift).map(k => `${blockIcon(k, 30)}<b>×${gift[k]}</b>`).join(' ')}</p>` : ''}
        ${goal ? `<p><b>${goal}</b></p>` : ''}
        <div class="acts"><button class="btn big grass" data-m="ok" data-default>${won ? 'Keep building' : 'Get ready'}</button></div>`,
        {ok:() => { closeModal(); go('build'); }});
      setTimeout(() => badgeToasts(bd), 900);
    }

    function step(dt){
      const cells = cellsNow(), lamps = lanterns(cells), hs = homes();
      if(phase === 'day'){
        const before = Math.ceil(dayLeft); dayLeft -= dt;
        if(Math.ceil(dayLeft) !== before) hud();
        if(dayLeft <= 0) startNight();
        return;
      }
      spawnT -= dt;
      if(spawned < wave && spawnT <= 0){ spawn(); spawnT = Math.max(2.2, 5 - P.world.nights*0.3); hud(); }
      for(const m of mobs){
        if(m.gone) continue;
        const home = hs.reduce((p, c) => Math.abs(c.x - m.x) < Math.abs(p.x - m.x) ? c : p);
        const dir = Math.sign(home.x - m.x) || m.dir; m.dir = dir;
        if(Math.abs(home.x - m.x) < 0.45){ scare(m, home); continue; }
        const nx = m.x + dir * m.def.speed * dt;
        const col = Math.floor(m.x), ncol = Math.floor(nx + dir*0.3);
        let blocked = false;
        if(lamps.some(l => Math.abs(l.x - (nx + dir*0.3)) < 1.6 && Math.abs(l.y - (m.y - .5)) < 2.6)) blocked = true;
        let ny = m.y;
        if(!blocked && !m.def.flies && ncol !== col && ncol >= 0 && ncol < W){
          const rise = surface(cells, col) - surface(cells, ncol);
          if(rise > 1 && !m.def.climbs) blocked = true;
        }
        if(!blocked){ m.x = nx; m.stuck = 0; } else m.stuck += dt;
        if(m.def.flies){ m.wob += dt*3; ny = 2.6 + Math.sin(m.wob)*0.8; }
        else { const c = Math.max(0, Math.min(W-1, Math.floor(m.x))); ny = surface(cells, c); }
        m.y += (ny - m.y) * Math.min(1, dt * (m.def.climbs ? 3 : 8));
        const bob = m.def.flies ? 0 : Math.abs(Math.sin(performance.now()/180 + m.id)) * (blocked ? 0 : 1.5);
        m.el.setAttribute('transform', `translate(${(m.x*CELL).toFixed(1)} ${(m.y*CELL - bob).toFixed(1)})`);
        m.el.querySelector('.body').setAttribute('transform', dir < 0 ? 'scale(-1,1)' : '');
      }
      if(Math.random() < dt) { drawGlow(cells); retarget(); }
    }
    function loop(now){
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if(!MODAL || phase === 'night') step(MODAL ? 0 : dt);
      raf = requestAnimationFrame(loop);
    }
    cleanups.push(() => { cancelAnimationFrame(raf); keyHandler = null; });
    hud(); drawGlow(cellsNow());
    raf = requestAnimationFrame(t => { last = t; loop(t); });
  };
})();
