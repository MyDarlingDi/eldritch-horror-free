/* Streamlined v0.3 — one clean, phase-first interface. */
function currentInvestigatorIndex(){
  if(!state.investigators.length)return -1;
  if(roomCode){const owned=state.investigators.findIndex(x=>x.ownerId===playerId);if(owned>=0)return owned}
  return state.investigators.findIndex(canEdit);
}

function activateTab(id){
  document.querySelectorAll('.tabs button,.panel').forEach(x=>x.classList.remove('active'));
  document.querySelector(`[data-tab="${id}"]`)?.classList.add('active');
  document.querySelector(`#${id}`)?.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}

window.openCurrentPhase=()=>{
  if(state.phase==='mythos'){activateTab('mythos');return}
  if(state.phase==='contacts'){activateTab('encounter');return}
  const i=currentInvestigatorIndex();
  if(i<0){action('add-investigator');return}
  activateTab('investigators');
};

window.openMyContact=()=>{
  const i=currentInvestigatorIndex();
  if(i<0)return action('add-investigator');
  contactResultModal(i);
};
window.openMyCombat=(ambush=false)=>{
  const i=currentInvestigatorIndex();
  if(i<0)return action('add-investigator');
  combatPicker(i,ambush);
};
window.showAllInvestigators=()=>{
  document.body.classList.toggle('show-all-investigators');
  render();
};

function renderPhaseFirst(){
  const i=currentInvestigatorIndex(),x=state.investigators[i];
  const phase=state.phase==='mythos'?'Фаза Мифа':state.phase==='contacts'?'Фаза контактов':'Фаза действий';
  const summary=document.querySelector('#phase-summary');
  if(summary)summary.innerHTML=`<div><span>Сейчас</span><b>${phase}</b><small>Раунд ${state.round}</small></div><div><span>Расследование</span><b>Глава ${state.campaign?.chapter||1} из 3</b><small>${state.campaign?.won?'Ктулху побеждён':'Общий прогресс сохраняется'}</small></div><div><span>Угрозы</span><b>${state.monsters.length} монстр. · ${state.processes.length} процесс.</b><small>${state.openGates.length} открытых врат</small></div>`;

  const alerts=document.querySelector('#party-alerts');
  if(alerts)alerts.innerHTML=`${state.processes.length?`<button type="button" onclick="activateTab('rules')"><b>${state.processes.length} активных процессов</b><span>Открыть слухи и расплату →</span></button>`:''}${state.monsters.length?`<button type="button" onclick="activateTab('rules')"><b>${state.monsters.length} монстров на поле</b><span>Открыть список и здоровье →</span></button>`:''}`;

  const dash=document.querySelector('#encounter-dashboard');
  if(dash)dash.innerHTML=x?`<article class="encounter-hero"><p class="kicker">Ваш сыщик</p><h3>${esc(x.name)}</h3><p>${x.contactDone?'Контакт этого раунда уже записан.':'Сначала проверьте монстров, затем проведите один доступный контакт.'}</p><div class="encounter-actions"><button class="combat-action" type="button" onclick="openMyCombat(false)"><span>⚔</span><b>Бой с монстром</b><small>Выбрать монстра на поле и рассчитать броски</small></button><button class="ambush-action" type="button" onclick="openMyCombat(true)"><span>◉</span><b>Засада</b><small>Один внезапный бой без выкладывания монстра</small></button><button class="contact-action" type="button" onclick="openMyContact()"><span>✧</span><b>${x.contactDone?'Изменить результат':'Записать контакт'}</b><small>Улика, город, врата, потери и сюжетный результат</small></button></div></article>`:`<article class="empty-state"><h3>Сначала выберите сыщика</h3><p>После выбора здесь появятся бой, засада и запись результата контакта.</p><button class="primary" data-act="add-investigator">Выбрать сыщика</button></article>`;

  document.body.classList.toggle('has-owned-investigator',i>=0);
  document.querySelectorAll('#investigator-list .investigator').forEach((card,n)=>{
    card.classList.toggle('owned-card',n===i);
    card.classList.toggle('other-card',n!==i);
  });
  const list=document.querySelector('#investigator-list');
  if(list&&state.investigators.length>1&&!list.querySelector('.all-investigators-toggle')){
    list.insertAdjacentHTML('beforeend',`<button class="all-investigators-toggle ghost" type="button" onclick="showAllInvestigators()">${document.body.classList.contains('show-all-investigators')?'Скрыть остальных сыщиков':'Показать остальных сыщиков'}</button>`)
  }
}

const renderV14Clean=render;
render=function(){renderV14Clean();renderPhaseFirst()};

document.addEventListener('click',e=>{
  const tab=e.target.closest('[data-tab]');
  if(tab)setTimeout(()=>window.scrollTo({top:0}),0);
});

document.querySelector('.phase-cta')?.setAttribute('aria-label','Продолжить текущую фазу');
render();
