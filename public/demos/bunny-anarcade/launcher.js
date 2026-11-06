(() => {
  const section=document.querySelector('#drop');
  const launcher=section.querySelector('.ba-arcade');
  const grid=section.querySelector('.drop-grid');
  const play=launcher.querySelector('[data-play]');
  const stop=launcher.querySelector('[data-stop]');
  const panel=launcher.querySelector('[data-panel]');
  const host=launcher.querySelector('[data-canvas]');
  const status=launcher.querySelector('[data-status]');
  const $=sel=>launcher.querySelector(sel);
  const hudScore=$('[data-score]'),hudStreak=$('[data-streak]'),hudLives=$('[data-lives]');
  const over=$('[data-over]'),final=$('[data-final]'),bestOut=$('[data-best]'),again=$('[data-again]'),shop=$('[data-shop]');
  const BEST_KEY='ba-voxel-rabbit-best';
  function readBest(){try{return Number(localStorage.getItem(BEST_KEY))||0;}catch{return 0;}}
  function saveBest(n){try{localStorage.setItem(BEST_KEY,String(n));}catch{}}
  function hud(stats){
    hudScore.textContent=stats.score;hudStreak.textContent=stats.streak;
    hudLives.textContent='♥'.repeat(Math.max(0,stats.lives))+'♡'.repeat(Math.max(0,3-stats.lives));
    if(stats.event==='miss'&&stats.lives>0)status.textContent=`MISSED ONE. ${stats.lives} ${stats.lives===1?'LIFE':'LIVES'} LEFT.`;
    if(stats.event==='gameover'){
      const best=Math.max(readBest(),stats.score);saveBest(best);
      final.textContent=stats.score;bestOut.textContent=best;over.hidden=false;
      status.textContent=`GAME OVER. SCORE ${stats.score}. BEST ${best}.`;again.focus({preventScroll:true});
    }
  }
  const input={left:false,right:false,hop:false,restart:false}, active={current:true};
  let running=false, dispose=null, timeout=null, loadPromise=null, generation=0;
  const held = new Set();
  function clear(){held.clear();input.left=input.right=input.hop=false;}
  function quit(message='SHOP RESTORED. SAME CHAOS. SAME CART.'){
    if(!running)return;
    running=false;generation++;clearTimeout(timeout);clear();
    if(dispose){dispose();dispose=null;}
    host.replaceChildren(); over.hidden=true; panel.hidden=true; stop.hidden=true;
    grid.hidden=false;grid.inert=false;play.hidden=false;play.disabled=false;
    status.textContent=message;play.focus({preventScroll:true});
  }
  function load(){
    if(window.BunnyArcade)return Promise.resolve();
    if(!loadPromise)loadPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='bunny-anarcade/game.bundle.js';
      script.onload=resolve;script.onerror=()=>{script.remove();loadPromise=null;reject();};
      document.head.append(script);
    });
    return loadPromise;
  }
  play.addEventListener('click',async()=>{
    running=true;const token=++generation;play.hidden=true;stop.hidden=false;
    grid.hidden=true;grid.inert=true;panel.hidden=false;panel.focus({preventScroll:true});
    status.textContent='BOOTING THE RABBIT…';
    timeout=setTimeout(()=>quit('GAME COULD NOT START. THE SHOP IS READY.'),20000);
    try{
      await load();if(!running||token!==generation)return;
      dispose=window.BunnyArcade.mount(host,{input,active,hud,
        ready:()=>{if(running){clearTimeout(timeout);status.textContent='CATCH THE DROP. MISS THREE AND YOU\'RE OUT.';}},
        fail:()=>{setTimeout(()=>{if(token===generation)quit('WEBGL STOPPED. THE SHOP IS READY.');},0);}
      });
    }catch{if(token===generation)quit('GAME UNAVAILABLE. THE SHOP IS READY.');}
  });
  stop.addEventListener('click',()=>quit());
  again.addEventListener('click',()=>{input.restart=true;over.hidden=true;status.textContent='ROUND TWO. CATCH THE DROP.';panel.focus({preventScroll:true});});
  shop.addEventListener('click',()=>{quit('SHOP RESTORED. GO GET THE REAL ONES.');grid.scrollIntoView({behavior:'smooth',block:'start'});});
  const keys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'hop'};
  launcher.addEventListener('keydown',event=>{
    if(!running)return;
    if(event.code==='Escape'){event.preventDefault();quit();return;}
    if(panel.contains(event.target)&&!event.target.closest('button')&&keys[event.code]){
      event.preventDefault();held.add(event.code);if(!event.repeat)input[keys[event.code]]=true;
    }
  });
  launcher.addEventListener('keyup',event=>{held.delete(event.code);if(keys[event.code] && keys[event.code]!=='hop'){input[keys[event.code]]=[...held].some(code=>keys[code]===keys[event.code]);}});
  launcher.addEventListener('focusout',event=>{if(!launcher.contains(event.relatedTarget))clear();});
  window.addEventListener('blur',clear);
  document.addEventListener('visibilitychange',()=>{active.current=!document.hidden;if(document.hidden)clear();});
  new IntersectionObserver(([entry])=>{active.current=entry.isIntersecting&&!document.hidden;if(!active.current)clear();}).observe(panel);
  launcher.querySelectorAll('[data-control]').forEach(button=>{
    const key=button.dataset.control;
    button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);input[key]=true;});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>{if(key!=='hop')input[key]=false;});
    button.addEventListener('keydown',event=>{if(event.code==='Enter'||event.code==='Space'){event.preventDefault();event.stopPropagation();if(!event.repeat)input[key]=true;}});
    button.addEventListener('keyup',()=>{if(key!=='hop')input[key]=false;});
    button.addEventListener('blur',()=>{if(key!=='hop')input[key]=false;});
  });
  play.disabled=false;
})();
