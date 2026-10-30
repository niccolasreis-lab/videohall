import {pointState,offlineLabel} from './monitor-utils.js';

export function monitorUi({api,escapeHtml:e,formatDate,mediaPreview,openModal,closeModal,toast}) {
 return async function showMonitor(id){
  const modal=document.querySelector('#modal');let closed=false,timer,busy=false;
  const cleanup=()=>{closed=true;clearInterval(timer);};
  openModal('<div class="modal-head"><h2 id="monitor-title">Monitoramento do ponto</h2><button class="icon-button" type="button" id="monitor-close" aria-label="Fechar monitoramento">×</button></div><div class="monitor-controls"><span id="monitor-updated" role="status">Carregando…</span><label><input id="monitor-auto" type="checkbox" checked> Atualizar a cada 5 segundos</label><button type="button" class="btn small" id="monitor-refresh">Atualizar agora</button></div><p id="monitor-error" class="form-error" role="alert"></p><div id="monitor-detail" class="monitor-detail"></div>','monitor-dialog');
  modal.addEventListener('close',cleanup,{once:true});
  const $=s=>modal.querySelector(s);
  $('#monitor-close').onclick=closeModal;
  async function load(){
   if(closed||busy||!modal.open||!$('#monitor-detail'))return;
   busy=true;$('#monitor-refresh').disabled=true;
   try{
    const data=await api('/api/points/'+id+'/monitor');if(closed||!$('#monitor-detail'))return;
    const p=data.point,s=pointState(p),pub=data.publication;
    $('#monitor-title').textContent=p.name+' · playlist e atividade';$('#monitor-updated').textContent='Atualizado '+new Date(data.serverTime).toLocaleTimeString('pt-BR');$('#monitor-error').textContent='';
    const oldList=$('.monitor-sequence')?.scrollTop||0,oldLog=$('.monitor-events')?.scrollTop||0;
    $('#monitor-detail').innerHTML=`<div class="monitor-summary"><span class="status-chip ${s.key==='playing'?'online':''}">${e(s.label)}</span><span>${e(offlineLabel(p))}</span>${p.activePublishedVersion?`<span>Versão em uso: <strong>v${p.activePublishedVersion}</strong></span>`:''}<span>Último sinal: ${formatDate(p.lastSeen)}</span><span>Conteúdo informado: <strong>${e(p.currentMedia?.name || '—')}</strong></span><span>Playlist: <strong>${e(pub?.playlistName || 'Nenhuma publicação')}</strong>${pub?' · v'+pub.version:''}</span></div><div class="monitor-split"><section><h3>Ordem publicada <span class="count-tag">${pub?.items.length||0}</span></h3><div class="monitor-sequence">${pub?.items.length?pub.items.map((item,index)=>`<article class="monitor-sequence-item ${p.online && p.activePublicationId===pub.id && p.currentMedia?.id===item.mediaId?'is-current':''}"><div class="monitor-thumb">${mediaPreview(item)}</div><div><small>#${index+1} · ${item.kind==='video'?'Duração do arquivo':item.seconds+' segundos'}</small><strong>${e(item.name)}</strong><span>${p.online && p.activePublicationId===pub.id && p.currentMedia?.id===item.mediaId?e(s.label):'Publicado'}</span></div></article>`).join(''):'<p class="modal-note">Atribua e publique uma playlist para este ponto.</p>'}</div><p class="monitor-footnote">Prévia do conteúdo cadastrado; não é uma captura remota da TV. O armazenamento indicado é a última confirmação enviada pelo player.</p></section><section><h3>Eventos dos últimos 30 minutos</h3><div class="monitor-events">${data.events.length?`<table class="data-table"><thead><tr><th>Horário</th><th>Conteúdo</th><th>Evento</th></tr></thead><tbody>${data.events.map(event=>`<tr><td>${formatDate(event.created_at)}</td><td>${e(event.media_name || '—')}</td><td><span class="log-type ${event.type==='error'?'error':''}">${event.type==='started'?'Iniciou':event.type==='ended'?'Concluiu':'Falhou'}${event.offline?' · recuperado offline':''}</span>${event.detail?`<p class="detail-error">${e(event.detail)}</p>`:''}</td></tr>`).join('')}</tbody></table>`:'<p class="modal-note">Nenhum evento nesse período. O histórico geral continua disponível em Atividade.</p>'}</div><p class="monitor-footnote">${data.eventsTruncated?'Mostrando os 200 eventos mais recentes.':data.events.length+' eventos no período.'}</p></section></div>`;
    $('.monitor-sequence').scrollTop=oldList;$('.monitor-events').scrollTop=oldLog;
   }catch(error){if(!closed&&$('#monitor-error'))$('#monitor-error').textContent=error.message;}
   finally{busy=false;if(!closed&&$('#monitor-refresh'))$('#monitor-refresh').disabled=false;}
  }
  $('#monitor-refresh').onclick=load;
  timer=setInterval(()=>{if(!modal.open||!$('#monitor-detail'))return cleanup();if($('#monitor-auto').checked&&!document.hidden)void load();},5000);
  await load();
 };
}
