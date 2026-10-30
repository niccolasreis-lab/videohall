const localDate=value=>{if(!value)return '';const date=new Date(value);return new Date(date-date.getTimezoneOffset()*60000).toISOString().slice(0,16);};
export function validityFields(config={}){
 return `<fieldset class="field"><legend>Validade do conteúdo</legend><label class="field"><span>Exibir a partir de (horário deste computador)</span><input type="datetime-local" name="validFrom" value="${localDate(config.validFrom)}"></label><label class="field"><span>Exibir até (horário deste computador)</span><input type="datetime-local" name="validUntil" value="${localDate(config.validUntil)}"></label><small>Deixe vazio para não limitar por data. Ao vencer, o player pula este conteúdo. A validade será aplicada às telas quando a playlist for publicada.</small></fieldset>`;
}
export function readValidity(form){
 return Object.fromEntries(['validFrom','validUntil'].map(key=>[key,form.elements[key].value?new Date(form.elements[key].value).toISOString():null]));
}
export function libraryActions({api,openModal,closeModal,escapeHtml:e,refresh,toast,getPlaylists}){
 const modal=document.querySelector('#modal');
 return {
  settings(item){
   openModal(`<form id="media-policy-form"><div class="modal-head"><h2>Validade, preços e offline</h2><button type="button" class="icon-button" data-close aria-label="Fechar">×</button></div><div class="modal-body"><p>${e(item.name)}</p>${validityFields(item.config)}<label class="offline-price-option"><input type="checkbox" name="hasPrices" ${item.hasPrices!==false?'checked':''}> Este arquivo contém preços ou ofertas</label><p class="modal-note">Conteúdos com preços são ocultados após 24 horas sem confirmação da programação. Esse limite offline continua valendo mesmo quando não há data final.</p><p class="form-error" role="alert"></p></div><div class="modal-footer"><button type="button" class="btn" data-close>Cancelar</button><button type="submit" class="btn primary">Salvar no rascunho</button></div></form>`);
   for(const button of modal.querySelectorAll('[data-close]'))button.onclick=closeModal;
   modal.querySelector('form').onsubmit=async event=>{
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type=submit]');button.disabled=true;
    try{await api('/api/media/'+item.id,{method:'PUT',body:JSON.stringify({...readValidity(form),hasPrices:form.elements.hasPrices.checked})});closeModal();await refresh();toast('Validade e política salvas. Republique as playlists que usam este arquivo.');}
    catch(error){form.querySelector('.form-error').textContent=error.message;}finally{button.disabled=false;}
   };
  },
  attach(item){
   const playlists=getPlaylists();
   if(!playlists.length){toast('Crie uma playlist antes de adicionar conteúdos.',true);return;}
   openModal(`<form id="attach-content-form"><div class="modal-head"><h2>Adicionar às playlists</h2><button type="button" class="icon-button" data-close aria-label="Fechar">×</button></div><div class="modal-body"><p><strong>${e(item.name)}</strong></p><p class="modal-note">O conteúdo será acrescentado ao fim dos rascunhos selecionados. As TVs recebem a alteração somente depois de publicar cada playlist. Conteúdos já presentes não serão duplicados.</p>${item.kind==='video'?'<p class="modal-note">O vídeo será exibido até o final do arquivo.</p>':'<label class="field"><span>Duração por exibição (segundos)</span><input type="number" name="seconds" value="10" min="1" max="3600" required></label>'}<label class="offline-price-option"><input type="checkbox" id="attach-all"> Selecionar todas as disponíveis</label><div class="attach-playlists">${playlists.map(playlist=>{const exists=playlist.items.some(entry=>entry.mediaId===item.id);return `<label class="attach-playlist"><input type="checkbox" name="target" value="${e(playlist.id)}" ${exists?'disabled':''}><span><strong>${e(playlist.name)}</strong><small>${exists?'Já contém este conteúdo':playlist.publishedVersion?'Publicada · inclusão ficará no rascunho':'Ainda não publicada'}</small></span></label>`;}).join('')}</div><p class="form-error" role="alert"></p></div><div class="modal-footer"><button type="button" class="btn" data-close>Cancelar</button><button type="submit" class="btn primary" ${playlists.every(p=>p.items.some(entry=>entry.mediaId===item.id))?'disabled':''}>Adicionar aos rascunhos</button></div></form>`);
   for(const button of modal.querySelectorAll('[data-close]'))button.onclick=closeModal;
   const boxes=[...modal.querySelectorAll('[name=target]:not(:disabled)')],all=modal.querySelector('#attach-all');
   const selection=()=>{all.checked=!!boxes.length&&boxes.every(box=>box.checked);all.indeterminate=boxes.some(box=>box.checked)&&!all.checked;};
   all.disabled=!boxes.length;all.onchange=()=>{for(const box of boxes)box.checked=all.checked;selection();};for(const box of boxes)box.onchange=selection;
   modal.querySelector('form').onsubmit=async event=>{
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type=submit]');button.disabled=true;
    try{
     const selected=new Set(boxes.filter(box=>box.checked).map(box=>box.value));
     if(!selected.size)throw new Error('Selecione pelo menos uma playlist.');
     const targets=playlists.filter(p=>selected.has(p.id)).map(p=>({id:p.id,revision:p.revision}));
     const result=await api('/api/content/'+item.id+'/playlists',{method:'POST',body:JSON.stringify({targets,seconds:item.kind==='video'?0:Number(form.elements.seconds.value)})});
     closeModal();await refresh();toast(`Adicionado a ${result.added.length} rascunho(s). Publique as playlists para atualizar as telas.`);
    }catch(error){form.querySelector('.form-error').textContent=error.message;}finally{button.disabled=false;}
   };
  }
 };
}
