/* Streamlined v0.3 — mythos presentation: story, action, result. */
const MYTHOS_GAME_ICONS=new Set(['omen','reckoning','gate','surge','clue','rumor']);
const MYTHOS_PLACE_NAMES={
  2:'воды Тихого океана'
};
const MYTHOS_SCENES={
  omen:['Звёзды меняют свой ход','Над горизонтом проступает новый узор. Моря замирают, стрелки компасов дрожат, и открытые разломы отвечают на зов небес.'],
  reckoning:['Наступает час расплаты','То, что сыщики оставили без внимания, начинает действовать. Старые клятвы, проклятия и чудовища одновременно напоминают о себе.'],
  gate:['Мир даёт трещину','Воздух становится холодным и прозрачным. На несколько мгновений сквозь привычный мир проступает чужое небо.'],
  surge:['Из разломов приходит ответ','За открытыми вратами начинается движение. Чужие силуэты один за другим пересекают границу нашего мира.'],
  clue:['Новые свидетельства','В разных концах света люди видят то, чему не могут подобрать названия. Их разрозненные рассказы складываются в новые зацепки.'],
  rumor:['Слух обретает силу','Сначала это лишь испуганный шёпот. Но слишком многие повторяют одну и ту же историю, и вскоре она начинает изменять сам мир.']
};

function mythosPlace(value){
  const raw=String(value||'').trim(),match=raw.match(/^(?:локация\s*)?(\d+)$/i);
  if(!match)return raw;
  const number=+match[1],name=MYTHOS_PLACE_NAMES[number];
  return name?`${name} (локация ${number})`:`участок маршрута (локация ${number})`;
}

function pureMythosStory(card){
  if(card.id==='MYT-47')return 'Над водами Тихого океана отражение луны внезапно раздваивается. Волны расходятся в противоположные стороны, а за бортом на мгновение проступают берега двух разных миров. Моряки шепчут, что сам Р’льех ищет дорогу к поверхности.';
  const sentences=String(card.story||'').match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[];
  const literary=sentences.filter(s=>!/(\bлокаци[яи]\s*\d|\b\d+\s+жетон|расплат|безысходност|\bконтакт|автомат|нажмит|приложени)/i.test(s));
  return (literary.length?literary:sentences.slice(0,1)).join(' ').trim();
}

function effectScene(card){
  if(/слух|процесс/i.test(card.category)){
    const location=(card.icons||[]).find(x=>/^локация\s*\d+/i.test(x));
    const place=location?mythosPlace(location):'одном из тревожных мест мира';
    if(card.id==='MYT-47')return `Разлом над ${place} не исчезает. Две версии реальности продолжают бороться за право стать настоящей, и каждую ночь граница между ними становится тоньше.`;
    return `Рассказ о случившемся в ${place} распространяется быстрее газет. Слух укореняется в мире и будет требовать внимания, пока сыщики не положат ему конец.`;
  }
  return `События этой ночи оставляют след. «${card.title}» становится ещё одной главой общего расследования.`;
}

function actionFor(type,card){
  const fixed={
    omen:'Передвиньте знамение. Приложение само посчитает совпавшие врата и изменение безысходности.',
    reckoning:'Разыграйте показанные ниже эффекты расплаты по очереди: монстры, Ктулху, слухи, имущество и состояния.',
    gate:'Вытяните жетон врат. Затем укажите его знак, место и появившегося монстра.',
    surge:'Проведите наплыв монстров у врат текущего знамения и внесите появившихся монстров.',
    clue:'Вытяните нужное по числу сыщиков количество улик. В следующем окне можно указать до пяти мест.',
    rumor:card.effect
  };
  return fixed[type]||card.effect||'Выполните текст карты.';
}

mythosSteps=function(card){
  const iconSteps=(card.icons||[]).filter(icon=>MYTHOS_GAME_ICONS.has(icon)).map(icon=>({
    title:MYTHOS_SCENES[icon]?.[0]||card.title,
    text:MYTHOS_SCENES[icon]?.[1]||pureMythosStory(card),
    action:actionFor(icon,card),type:icon
  }));
  const isPersistent=/слух|процесс/i.test(card.category);
  return [
    {title:card.title,text:pureMythosStory(card),action:'Прочитайте вступление и ничего не меняйте.',type:'story'},
    ...iconSteps,
    {title:isPersistent?'Угроза остаётся в мире':'Последствия события',text:effectScene(card),action:card.effect,type:'effect'},
    {title:'Изменения применены',text:'Мир запомнил последствия этой карты. Проверьте итог перед завершением фазы.',action:'Проверьте перечисленные изменения. Если физическое поле отличается, исправьте данные вручную в разделе «Ещё».',type:'report'}
  ];
};

function mythosReport(card){
  const rows=state.mythosReports?.[card.id]||[];
  if(!rows.length)return '<li>Автоматических изменений на этом шаге не было.</li>';
  return rows.map(x=>`<li>${esc(x)}</li>`).join('');
}
function addMythosReport(card,text){
  state.mythosReports=state.mythosReports||{};
  state.mythosReports[card.id]=state.mythosReports[card.id]||[];
  state.mythosReports[card.id].push(text);
}

renderMythos=function(){
  const d=document.querySelector('#mythos-step'),card=mythosCards.find(x=>x.id===state.currentMythos);
  if(!card){d.innerHTML=`<span>Колода Ктулху · ${state.mythosDeck.length||15} карт</span><h3>Фаза Мифа</h3><p class="mythos-prose">Ночь сгущается над миром. Когда все готовы, вытяните следующую главу этой истории.</p><div class="mythos-action"><b>Что сделать сейчас</b><p>Нажмите «Вытянуть карту».</p></div>`;return}
  const steps=mythosSteps(card),step=steps[state.mythosCardStep]||steps[0];
  let context='';
  if(step.type==='reckoning'){
    const monsters=state.monsters.filter(x=>x.reckoning),conditions=state.investigators.flatMap(x=>(x.conditions||[]).map(c=>({name:x.name,data:conditionCatalog[c.type]}))).filter(x=>x.data?.reckoning||/расплат/i.test(x.data?.front||''));
    context=`<div class="reckoning-story"><h4>Сейчас пробуждаются</h4>${monsters.map(x=>`<p><b>${esc(x.name)}:</b> ${esc(x.reckoning)}</p>`).join('')||'<p>У монстров на поле нет известных эффектов расплаты.</p>'}<p><b>Ктулху:</b> примените его расплату к сыщикам в морских локациях.</p>${state.processes.map(x=>`<p><b>${esc(x.name)}:</b> ${esc(x.note||'проверьте активную карту')}</p>`).join('')}${conditions.map(x=>`<p><b>${esc(x.name)} · ${esc(x.data.name)}:</b> ${esc(x.data.reckoning||x.data.front)}</p>`).join('')}</div>`;
  }
  if(step.type==='report')context=`<div class="mythos-report"><b>Приложение изменило</b><ul>${mythosReport(card)}</ul><button type="button" onclick="activateTab('rules')">Открыть данные партии для проверки</button></div>`;
  d.innerHTML=`<span>${esc(card.color.toUpperCase())} · осталось ${state.mythosDeck.length} · сцена ${state.mythosCardStep+1}/${steps.length}</span><h3>${esc(step.title)}</h3><p class="mythos-prose">${esc(step.text)}</p><div class="mythos-action"><b>${step.type==='story'?'Сейчас':'Что сделать сейчас'}</b><p>${esc(step.action)}</p></div>${context}`;
};

function cluesLiteraryText(locations){
  const visions=['рыбаки увидели под водой огни затонувшего города','ночной сторож услышал колокола там, где не было ни одной церкви','путешественница заметила на карте берег, которого не существовало вчера','ребёнок нарисовал существо, одинаково описанное свидетелями на другом конце света','радиостанция поймала голос, повторявший имя Р’льех'];
  return locations.map((place,i)=>`В ${mythosPlace(place)} ${visions[i%visions.length]}.`).join(' ');
}
function clueModal(){
  modal(`<h2>Где появились улики?</h2><p>Вытяните нужное количество физических жетонов. Заполните только столько строк, сколько улик появилось; остальные оставьте пустыми.</p><div class="form-stack clue-location-list">${Array.from({length:5},(_,i)=>`<label>Улика ${i+1}<input class="mythos-clue-location" placeholder="Название или номер локации"></label>`).join('')}<button class="primary" type="button" onclick="saveMythosClues()">Выложить улики</button></div>`);
}
window.saveMythosClues=()=>{
  const locations=[...document.querySelectorAll('.mythos-clue-location')].map(x=>x.value.trim()).filter(Boolean);
  if(!locations.length)return alert('Укажите хотя бы одну локацию.');
  const card=mythosCards.find(x=>x.id===state.currentMythos);
  state.totals.clue=(state.totals.clue||0)+locations.length;
  const story=cluesLiteraryText(locations);
  logEvent(`${story} На поле выложено улик: ${locations.length}.`);
  addMythosReport(card,`Добавлено улик: ${locations.length} — ${locations.map(mythosPlace).join(', ')}.`);
  state.mythosCardStep++;
  document.querySelector('#modal').close();
  modal(`<h2>Новые свидетельства</h2><p class="mythos-prose">${esc(story)}</p><button class="primary wide" type="button" onclick="document.querySelector('#modal').close();render()">Продолжить историю</button>`);
};

advanceMythosCard=function(){
  const card=mythosCards.find(x=>x.id===state.currentMythos);if(!card)return drawMythosCard();
  const steps=mythosSteps(card),current=steps[state.mythosCardStep];
  if(current?.type==='gate'){
    const key=`${card.id}:${state.mythosCardStep}`;
    if(!state.resolvedMythosGates.includes(key)){gateModal(card,state.mythosCardStep);return}
  }
  if(current?.type==='clue'){clueModal();return}
  if(current?.type==='omen'){
    const before=state.doom;advanceOmen();addMythosReport(card,`Знамение передвинуто; безысходность ${before} → ${state.doom}.`);
  }
  if(current?.type==='effect'){
    if(/слух|процесс/i.test(card.category)&&!state.processes.some(x=>x.id===card.id)){
      const location=(card.icons||[]).find(x=>/^локация\s*\d+/i.test(x));
      state.processes.push({id:card.id,name:card.title,location:location?mythosPlace(location):'',note:[card.reckoning,card.tokens,card.completion].filter(Boolean).join(' · ')});
      addMythosReport(card,`Слух «${card.title}» добавлен в активные процессы${location?` — ${mythosPlace(location)}`:''}.`);
      if(card.tokens)addMythosReport(card,`Начальные жетоны слуха: ${card.tokens.replace(/\.$/,'')}.`);
      logEvent(`Слух «${card.title}» вошёл в игру.`);
    }else addMythosReport(card,'Текст события показан группе; проверьте применённые к сыщикам результаты.');
  }
  if(current?.type==='report'){
    state.mythosDiscard.push(state.currentMythos);state.currentMythos=null;state.mythosCardStep=0;state.phase='actions';state.round++;state.investigators.forEach(x=>{x.actions=0;x.contactDone=false});render();return;
  }
  state.mythosCardStep=Math.min(state.mythosCardStep+1,steps.length-1);render();
};

const normalizeV16=normalizeState;
normalizeState=function(){normalizeV16();state.mythosReports=state.mythosReports||{}};
normalizeState();render();
