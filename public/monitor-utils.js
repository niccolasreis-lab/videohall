export function pointState(point) {
 if(!point.paired)return {key:'unpaired',label:'Não vinculado'};
 if(!point.online)return {key:'offline',label:'Offline'};
 if(!point.publishedVersion)return {key:'no_playlist',label:'Sem publicação'};
 if(point.playbackState==='scheduled')return {key:'scheduled',label:'Fora do horário'};
 if(point.playbackState==='error')return {key:'error',label:'Falha na reprodução'};
 if(point.playbackState==='playing' && point.currentMedia)return {key:'playing',label:'Reproduzindo'};
 return {key:'waiting',label:'Online sem exibir'};
}
export function matchesPointFilter(point,filter) {
 if(filter==='all')return true;
 if(filter==='online')return point.online;
 if(filter==='offline')return !point.online;
 return pointState(point).key===filter;
}

export function offlineLabel(point){
 const s=point.offline||{};
 if(s.state==='ready')return 'Salvo no aparelho: v'+s.version+' · '+s.files+' arquivo(s)';
 if(s.state==='downloading')return 'Baixando: '+s.files+'/'+s.total+' arquivo(s)';
 if(s.state==='error')return 'Download pendente: '+s.error;
 if(s.state==='unsupported')return 'Offline indisponível: '+s.error;
 return 'Offline sem confirmação';
}
