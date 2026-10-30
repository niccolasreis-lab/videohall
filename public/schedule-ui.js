const weekdays=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
function windowFields(window={days:[1,2,3,4,5],start:'08:00',end:'18:00'}){
 return `<section class="schedule-window"><div class="schedule-days">${weekdays.map((day,index)=>`<label><input type="checkbox" data-day="${index}" ${window.days.includes(index)?'checked':''}> ${day}</label>`).join('')}</div><div class="schedule-times"><label>Início<input type="time" data-start value="${window.start}" required></label><label>Fim<input type="time" data-end value="${window.end}" required></label><button class="btn small" type="button" data-remove-window>Remover faixa</button></div></section>`;
}
export function scheduleFields(schedule={enabled:false},escapeHtml){
 const zones=['America/Sao_Paulo','America/Manaus','America/Rio_Branco','America/Noronha','UTC'];if(schedule.timeZone&&!zones.includes(schedule.timeZone))zones.push(schedule.timeZone);
 return `<fieldset class="field playlist-schedule"><legend>Programação semanal</legend><label class="offline-price-option"><input type="checkbox" name="scheduleEnabled" ${schedule.enabled?'checked':''}> Limitar por dias e horários</label><div data-schedule-fields><label class="field"><span>Fuso horário da programação</span><select name="scheduleZone">${zones.map(zone=>`<option ${zone===(schedule.timeZone||'America/Sao_Paulo')?'selected':''}>${escapeHtml(zone)}</option>`).join('')}</select></label><div data-schedule-windows>${(schedule.windows||[undefined]).map(windowFields).join('')}</div><button class="btn small" type="button" data-add-window>Adicionar faixa</button></div><small>Faixas podem se sobrepor. Se o fim for anterior ao início, a faixa termina no dia seguinte. Fora das faixas, o player aguarda e retoma automaticamente; a regra vale também offline. Publique para aplicar.</small></fieldset>`;
}
export function bindSchedule(form){
 const group=form.querySelector('[data-schedule-fields]'),toggle=form.elements.scheduleEnabled;
 const update=()=>{for(const field of group.querySelectorAll('input,select,button'))field.disabled=!toggle.checked;};
 form.querySelector('[data-add-window]').onclick=()=>{
  if(group.querySelectorAll('.schedule-window').length>=14)return;
  group.querySelector('[data-schedule-windows]').insertAdjacentHTML('beforeend',windowFields());update();
 };
 group.addEventListener('click',event=>{const button=event.target.closest('[data-remove-window]');if(button)button.closest('.schedule-window').remove();});
 toggle.onchange=update;update();
}
export function readSchedule(form){
 if(!form.elements.scheduleEnabled.checked)return {enabled:false};
 return {enabled:true,timeZone:form.elements.scheduleZone.value,windows:[...form.querySelectorAll('.schedule-window')].map(row=>({days:[...row.querySelectorAll('[data-day]:checked')].map(input=>Number(input.dataset.day)),start:row.querySelector('[data-start]').value,end:row.querySelector('[data-end]').value}))};
}
