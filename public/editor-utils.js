export function moveSequence(items,sourceId,targetId,after=false){
 if(sourceId===targetId||!items.some(item=>item.id===sourceId)||!items.some(item=>item.id===targetId))return items;
 const source=items.find(item=>item.id===sourceId),result=items.filter(item=>item.id!==sourceId);
 result.splice(result.findIndex(item=>item.id===targetId)+(after?1:0),0,source);return result;
}
export function sequenceDuration(items,media,durations){
 const byId=new Map(media.map(item=>[item.id,item]));let seconds=0,unknown=0;
 for(const item of items){const content=byId.get(item.mediaId);if(!content){unknown++;continue;}const value=content.kind==='video'?durations.get(content.id):Number(item.seconds);
  if(Number.isFinite(value)&&value>0)seconds+=value;else unknown++;
 }
 return {seconds,unknown};
}
export function durationLabel(value){
 const rounded=Math.round(value*10)/10,hours=Math.floor(rounded/3600),minutes=Math.floor(rounded%3600/60),seconds=Math.round(rounded%60*10)/10;
 return [hours?hours+'h':'',minutes?minutes+'min':'',seconds||!rounded?String(seconds).replace('.',',')+'s':''].filter(Boolean).join(' ');
}
export function matchesLibrary(item,query){
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');return normalize(item.name+' '+item.kind).includes(normalize(query).trim());
}
