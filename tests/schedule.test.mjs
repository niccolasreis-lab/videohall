import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSchedule,isPlaylistScheduled,nextScheduleCheck} from '../public/playlist-schedule.js';
import {canPlay,nextPlaybackBoundary} from '../public/offline-policy.js';
const schedule={enabled:true,timeZone:'America/Sao_Paulo',windows:[{days:[5],start:'08:00',end:'18:00'}]};
test('programação respeita fuso, dias e início inclusivo/fim exclusivo, inclusive offline',()=>{
 assert.equal(isPlaylistScheduled(undefined,Date.now()),true);
 for(const [date,expected] of [['2026-10-30T10:59:59Z',false],['2026-10-30T11:00:00Z',true],['2026-10-30T20:59:59Z',true],['2026-10-30T21:00:00Z',false],['2026-10-31T11:00:00Z',false]]){
  const now=Date.parse(date);assert.equal(isPlaylistScheduled(schedule,now),expected);assert.equal(canPlay({kind:'poster'},{now,connected:false,schedule}),expected);
 }
 const now=Date.parse('2026-10-30T10:59:59Z');assert.equal(nextScheduleCheck(schedule,now),Date.parse('2026-10-30T11:00:00Z'));assert.equal(nextPlaybackBoundary([],{now,schedule}),Date.parse('2026-10-30T11:00:00Z'));
});
test('faixas podem atravessar a meia-noite e se sobrepor sem duplicar conteúdo',()=>{
 const overnight={...schedule,windows:[{days:[5],start:'22:00',end:'02:00'}]};
 assert.equal(isPlaylistScheduled(overnight,Date.parse('2026-10-31T01:00:00Z')),true);assert.equal(isPlaylistScheduled(overnight,Date.parse('2026-10-31T04:59:59Z')),true);assert.equal(isPlaylistScheduled(overnight,Date.parse('2026-10-31T05:00:00Z')),false);
 const twice={...schedule,windows:[...schedule.windows,...schedule.windows]};assert.equal(isPlaylistScheduled(twice,Date.parse('2026-10-30T12:00:00Z')),true);
});
test('programação segue o relógio local durante mudanças de horário de verão',()=>{
 const local={enabled:true,timeZone:'America/New_York',windows:[{days:[0],start:'01:00',end:'02:00'}]};
 assert.equal(isPlaylistScheduled(local,Date.parse('2026-11-01T05:30:00Z')),true);assert.equal(isPlaylistScheduled(local,Date.parse('2026-11-01T06:30:00Z')),true);assert.equal(isPlaylistScheduled(local,Date.parse('2026-11-01T07:00:00Z')),false);
});
test('recusa fuso, horários e dias inválidos e mantém agendas antigas desativadas',()=>{
 assert.deepEqual(validateSchedule(undefined),{enabled:false});
 for(const value of [null,{...schedule,timeZone:'Invalido/Fuso'},{...schedule,windows:[]},{...schedule,windows:[{days:[],start:'08:00',end:'18:00'}]},{...schedule,windows:[{days:[7],start:'08:00',end:'18:00'}]},{...schedule,windows:[{days:[1],start:'24:00',end:'18:00'}]},{...schedule,windows:[{days:[1],start:'08:00',end:'08:00'}]}])assert.throws(()=>validateSchedule(value));
});
