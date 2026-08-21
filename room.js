(function(){
  const cfg=window.FIREBASE_CONFIG||{},authKey='eh-v05-auth',deviceKey='eh-v05-device';
  const deviceId=localStorage.getItem(deviceKey)||crypto.randomUUID();localStorage.setItem(deviceKey,deviceId);
  let authCache=null,listeners=[],poller=null,pushing=false;
  const configured=()=>cfg.apiKey&&!cfg.apiKey.includes('ВСТАВЬТЕ')&&cfg.databaseURL&&!cfg.databaseURL.includes('ВСТАВЬТЕ');
  async function auth(){
    if(authCache&&authCache.expiresAt>Date.now()+60000)return authCache;
    try{authCache=JSON.parse(localStorage.getItem(authKey)||'null')}catch{}
    if(authCache?.expiresAt>Date.now()+60000)return authCache;
    if(authCache?.refreshToken){
      const body=new URLSearchParams({grant_type:'refresh_token',refresh_token:authCache.refreshToken});
      const r=await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(cfg.apiKey)}`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
      if(r.ok){const d=await r.json();authCache={uid:d.user_id,idToken:d.id_token,refreshToken:d.refresh_token,expiresAt:Date.now()+Number(d.expires_in)*1000};localStorage.setItem(authKey,JSON.stringify(authCache));return authCache}
    }
    const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(cfg.apiKey)}`,{method:'POST',headers:{'content-type':'application/json'},body:'{"returnSecureToken":true}'});
    if(!r.ok)throw Error('Не удалось войти в Firebase');
    const d=await r.json();authCache={uid:d.localId,idToken:d.idToken,refreshToken:d.refreshToken,expiresAt:Date.now()+Number(d.expiresIn)*1000};localStorage.setItem(authKey,JSON.stringify(authCache));return authCache;
  }
  async function request(path,{method='GET',body}={}){
    if(!configured())throw Error('Firebase не настроена');const a=await auth(),base=cfg.databaseURL.replace(/\/$/,'');
    return fetch(`${base}/${path}.json?auth=${encodeURIComponent(a.idToken)}`,{method,headers:body===undefined?{}:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  }
  function makeCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=crypto.getRandomValues(new Uint8Array(6));return [...bytes].map(x=>chars[x%chars.length]).join('')}
  async function create(initial){
    const a=await auth();for(let i=0;i<5;i++){const code=makeCode(),now=Date.now(),room={meta:{code,hostUid:a.uid,cohostUid:'',started:false,status:'lobby',createdAt:now,updatedAt:now},world:initial.world,campaign:initial.campaign,players:{},log:initial.log||[],undo:[]};const r=await request(`rooms/${code}`,{method:'PUT',body:room});if(r.ok){localStorage.setItem('eh-v05-room',code);return {code,room,uid:a.uid,deviceId}}}throw Error('Не удалось создать комнату')
  }
  async function join(code){code=String(code).trim().toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code))throw Error('Код состоит из шести знаков');const a=await auth(),r=await request(`rooms/${code}`);if(!r.ok)throw Error('Комната недоступна');const room=await r.json();if(!room)throw Error('Комната не найдена');localStorage.setItem('eh-v05-room',code);return {code,room,uid:a.uid,deviceId}}
  async function patch(code,path,value){pushing=true;try{const r=await request(`rooms/${code}/${path}`,{method:'PUT',body:value});if(!r.ok)throw Error('Изменение не сохранено')}finally{pushing=false}}
  async function update(code,changes){pushing=true;try{changes['meta/updatedAt']=Date.now();const r=await request(`rooms/${code}`,{method:'PATCH',body:changes});if(!r.ok)throw Error('Изменения не сохранены')}finally{pushing=false}}
  async function remove(code){const r=await request(`rooms/${code}`,{method:'DELETE'});if(!r.ok)throw Error('Не удалось сбросить комнату')}
  async function pull(code){const r=await request(`rooms/${code}`);return r.ok?r.json():null}
  function watch(code,cb){stop();let last='';const tick=async()=>{if(document.hidden||pushing)return;try{const room=await pull(code),stamp=room?.meta?.updatedAt||0;if(room&&String(stamp)!==last){last=String(stamp);cb(room)}}catch{}};tick();poller=setInterval(tick,1600);listeners.push(()=>clearInterval(poller));return stop}
  function stop(){listeners.splice(0).forEach(fn=>fn());poller=null}
  async function identity(){const a=configured()?await auth():{uid:'local-'+deviceId};return {uid:a.uid,deviceId}}
  window.RoomAPI={configured,create,join,patch,update,remove,pull,watch,stop,identity,deviceId};
})();
