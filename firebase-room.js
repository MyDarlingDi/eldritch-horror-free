(function(){
  'use strict';

  const config=window.FIREBASE_CONFIG||{};
  const configured=()=>config.apiKey&&!String(config.apiKey).includes('ВСТАВЬТЕ')&&config.databaseURL&&!String(config.databaseURL).includes('ВСТАВЬТЕ');
  const authKey='eh-firebase-auth-v1';
  let roomEtag='';
  let authPromise=null;

  function configMessage(){
    return '<h2>Подключение общей комнаты</h2><p>Сайт уже готов к бесплатной Firebase, но сначала нужно вставить три значения проекта в файл <b>firebase-config.js</b>.</p><div class="sync-note">После настройки здесь появятся кнопки создания комнаты и входа по коду.</div>';
  }

  async function getAuth(){
    if(authPromise)return authPromise;
    authPromise=(async()=>{
      if(!configured())throw new Error('Firebase не настроена');
      let cached={};
      try{cached=JSON.parse(localStorage.getItem(authKey)||'{}')}catch{}
      if(cached.idToken&&cached.expiresAt>Date.now()+60000)return cached;
      if(cached.refreshToken){
        const body=new URLSearchParams({grant_type:'refresh_token',refresh_token:cached.refreshToken});
        const response=await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(config.apiKey)}`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
        if(response.ok){
          const data=await response.json();
          cached={idToken:data.id_token,refreshToken:data.refresh_token,uid:data.user_id,expiresAt:Date.now()+(Number(data.expires_in)||3600)*1000};
          localStorage.setItem(authKey,JSON.stringify(cached));
          return cached;
        }
      }
      const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(config.apiKey)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({returnSecureToken:true})});
      if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.error?.message||'Не удалось войти в Firebase')}
      const data=await response.json();
      cached={idToken:data.idToken,refreshToken:data.refreshToken,uid:data.localId,expiresAt:Date.now()+(Number(data.expiresIn)||3600)*1000};
      localStorage.setItem(authKey,JSON.stringify(cached));
      return cached;
    })();
    try{return await authPromise}finally{authPromise=null}
  }

  async function dbRequest(code,{method='GET',body,etag}={}){
    const auth=await getAuth();
    const base=String(config.databaseURL).replace(/\/$/,'');
    const headers={};
    if(body!==undefined)headers['content-type']='application/json';
    if(method==='GET')headers['X-Firebase-ETag']='true';
    if(etag)headers['if-match']=etag;
    const response=await fetch(`${base}/rooms/${encodeURIComponent(code)}.json?auth=${encodeURIComponent(auth.idToken)}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    return response;
  }

  function code(){
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes=new Uint8Array(6);crypto.getRandomValues(bytes);
    return Array.from(bytes,n=>chars[n%chars.length]).join('');
  }

  async function refreshEtag(){
    if(!roomCode)return null;
    const response=await dbRequest(roomCode);
    if(!response.ok)throw new Error('Не удалось прочитать комнату');
    roomEtag=response.headers.get('etag')||'';
    return response.json();
  }

  async function firebaseCreateRoom(){
    if(!configured()){modal(configMessage());return}
    try{
      const auth=await getAuth();
      for(let attempt=0;attempt<5;attempt++){
        const nextCode=code(),now=Date.now();
        const response=await dbRequest(nextCode,{method:'PUT',etag:'null_etag',body:{state,createdAt:now,updatedAt:now,ownerUid:auth.uid}});
        if(response.status===412)continue;
        if(!response.ok)throw new Error('Firebase отклонила создание комнаты');
        roomCode=nextCode;remoteUpdatedAt=now;localStorage.setItem('eh-room-code',roomCode);
        await refreshEtag();
        document.querySelector('#modal').close();renderRoomStatus();
        return;
      }
      throw new Error('Не удалось подобрать код комнаты');
    }catch(error){alert(`Не удалось создать комнату. ${error.message}`)}
  }

  async function firebaseJoinRoom(){
    const input=document.querySelector('#join-code');
    const nextCode=(input?.value||'').trim().toUpperCase();
    if(!/^[A-Z2-9]{6}$/.test(nextCode))return alert('Введите шестизначный код комнаты.');
    try{
      const response=await dbRequest(nextCode);
      if(!response.ok)throw new Error('Firebase не отвечает');
      const data=await response.json();
      if(!data?.state)return alert('Комната с таким кодом не найдена.');
      roomCode=nextCode;roomEtag=response.headers.get('etag')||'';remoteUpdatedAt=data.updatedAt||0;
      localStorage.setItem('eh-room-code',roomCode);
      applyingRemote=true;state={...structuredClone(base),...data.state};normalizeState();render();applyingRemote=false;
      document.querySelector('#modal').close();renderRoomStatus();
    }catch(error){alert(`Не удалось войти в комнату. ${error.message}`)}
  }

  async function firebasePushRoom(){
    if(!roomCode||applyingRemote||!configured())return;
    try{
      const auth=await getAuth(),now=Date.now();
      if(!roomEtag)await refreshEtag();
      const response=await dbRequest(roomCode,{method:'PUT',etag:roomEtag,body:{state,createdAt:Math.min(remoteUpdatedAt||now,now),updatedAt:now,ownerUid:auth.uid}});
      if(response.status===412){await firebasePullRoom(true);return}
      if(!response.ok)throw new Error();
      remoteUpdatedAt=now;
      await refreshEtag();renderRoomStatus();
    }catch{const status=document.querySelector('#room-status');if(status)status.textContent='Нет связи · сохранено локально'}
  }

  async function firebasePullRoom(force=false){
    if(!roomCode||document.hidden&&!force||!configured())return;
    try{
      const response=await dbRequest(roomCode);
      if(!response.ok)return;
      const data=await response.json();
      if(!data?.state){roomCode='';localStorage.removeItem('eh-room-code');renderRoomStatus();return}
      roomEtag=response.headers.get('etag')||roomEtag;
      if(force||(data.updatedAt||0)>remoteUpdatedAt){
        remoteUpdatedAt=data.updatedAt||0;applyingRemote=true;
        state={...structuredClone(base),...data.state};normalizeState();render();applyingRemote=false;
      }
    }catch{}
  }

  function firebaseRoomModal(){
    if(!configured()){modal(configMessage());return}
    modal(roomCode?`<h2>Комната ${roomCode}</h2><p>Все телефоны с этим кодом видят одну партию. Изменения синхронизируются автоматически.</p><div class="sync-note">Передайте игрокам адрес сайта и код <b>${roomCode}</b>.</div><div class="form-stack"><button class="ghost" type="button" onclick="leaveRoom()">Выйти из комнаты</button></div>`:'<h2>Общая комната</h2><p>Создайте комнату из текущей партии или войдите в уже созданную.</p><div class="room-choice"><button class="primary" type="button" onclick="createRoom()">Создать комнату</button><button class="ghost" type="button" onclick="showJoinRoom()">Войти по коду</button></div>');
  }

  function firebaseRoomStatus(){
    const status=document.querySelector('#room-status'),label=document.querySelector('#room-code'),button=document.querySelector('.room-button');
    if(!status)return;
    status.textContent=!configured()?'Нужно подключить Firebase':roomCode?'Синхронизация включена':'Локальная партия';
    label.textContent=roomCode?`Комната ${roomCode}`:'Общая комната';button?.classList.toggle('online',!!roomCode);
  }

  createRoom=firebaseCreateRoom;joinRoom=firebaseJoinRoom;pushRoom=firebasePushRoom;pullRoom=firebasePullRoom;openRoomModal=firebaseRoomModal;renderRoomStatus=firebaseRoomStatus;
  window.createRoom=firebaseCreateRoom;window.joinRoom=firebaseJoinRoom;window.leaveRoom=()=>{roomCode='';roomEtag='';remoteUpdatedAt=0;localStorage.removeItem('eh-room-code');document.querySelector('#modal').close();renderRoomStatus()};
  renderRoomStatus();
  if(roomCode&&configured())firebasePullRoom(true);
  setInterval(firebasePullRoom,2000);
})();
