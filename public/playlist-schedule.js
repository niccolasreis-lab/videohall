const clocks=new Map();
export function validateSchedule(input){
 if(input===undefined)return {enabled:false};
 if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.enabled!=='boolean')throw new Error('Programação semanal inválida.');
 if(!input.enabled)return {enabled:false};
 if(typeof input.timeZone!=='string'||input.timeZone.length>80)throw new Error('Informe um fuso horário válido.');
 try{new Intl.DateTimeFormat('pt-BR',{timeZone:input.timeZone}).format();}catch{throw new Error('Fuso horário inválido.');}
 if(!Array.isArray(input.windows)||!input.windows.length||input.windows.length>14)throw new Error('Configure de 1 a 14 faixas de horário.');
 const windows=input.windows.map(window=>{
  if(!window||!Array.isArray(window.days)||!window.days.length||window.days.some(day=>!Number.isInteger(day)||day<0||day>6)||new Set(window.days).size!==window.days.length)throw new Error('Selecione os dias da semana de cada faixa.');
  if(![window.start,window.end].every(value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value))||window.start===window.end)throw new Error('Informe início e fim distintos no formato HH:MM.');
  return {days:[...window.days].sort(),start:window.start,end:window.end};
 });
 return {enabled:true,timeZone:input.timeZone,windows};
}
const minutes=value=>Number(value.slice(0,2))*60+Number(value.slice(3));
export function isPlaylistScheduled(schedule,now=Date.now()){
 if(!schedule?.enabled)return true;
 try{
  let clock=clocks.get(schedule.timeZone);
  if(!clock){clock=new Intl.DateTimeFormat('en-CA',{timeZone:schedule.timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});if(clocks.size>32)clocks.clear();clocks.set(schedule.timeZone,clock);}
  const parts=Object.fromEntries(clock.formatToParts(now).map(p=>[p.type,p.value]));
  const day=new Date(Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day))).getUTCDay(),minute=Number(parts.hour)*60+Number(parts.minute),previous=(day+6)%7;
  return schedule.windows.some(window=>{const start=minutes(window.start),end=minutes(window.end);return start<end?window.days.includes(day)&&minute>=start&&minute<end:window.days.includes(day)&&minute>=start||window.days.includes(previous)&&minute<end;});
 }catch{return false;}
}
export const nextScheduleCheck=(schedule,now)=>schedule?.enabled?(Math.floor(now/60000)+1)*60000:null;
