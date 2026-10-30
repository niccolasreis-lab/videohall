let database;
export function openOfflineDatabase(){
 if(!database)database=new Promise((resolve,reject)=>{
  const request=indexedDB.open('videowall-player-offline',1);
  request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore('state');db.createObjectStore('events',{keyPath:'id'});};
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
 return database;
}
async function transact(name,mode,action){
 const db=await openOfflineDatabase();
 return new Promise((resolve,reject)=>{const tx=db.transaction(name,mode);let value;
  tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(tx.error||new Error('Falha no armazenamento do player.'));
  action(tx.objectStore(name),result=>{value=result;});
 });
}
export const getState=key=>transact('state','readonly',(store,done)=>{const request=store.get(key);request.onsuccess=()=>done(request.result);});
export const putState=(key,value)=>transact('state','readwrite',store=>store.put(value,key));
export const removeState=key=>transact('state','readwrite',store=>store.delete(key));
export const listEvents=()=>transact('events','readonly',(store,done)=>{const request=store.getAll();request.onsuccess=()=>done(request.result.sort((a,b)=>a.createdAt-b.createdAt));});
export const putEvent=event=>transact('events','readwrite',store=>store.put(event));
export const deleteEvents=ids=>transact('events','readwrite',store=>{for(const id of ids)store.delete(id);});
export const clearEvents=()=>transact('events','readwrite',store=>store.clear());
export async function markEventsOffline(){
 return transact('events','readwrite',store=>{const request=store.openCursor();request.onsuccess=()=>{const cursor=request.result;if(cursor){cursor.update({...cursor.value,offline:true});cursor.continue();}};});
}
