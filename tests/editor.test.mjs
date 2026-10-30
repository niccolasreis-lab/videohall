import test from 'node:test';import assert from 'node:assert/strict';
import {moveSequence,sequenceDuration,durationLabel,matchesLibrary} from '../public/editor-utils.js';
test('reordenação preserva identidade, duplicatas do conteúdo, duração e o vetor original',()=>{
 const items=[{id:'a',mediaId:'same',seconds:5},{id:'b',mediaId:'same',seconds:8},{id:'c',mediaId:'other',seconds:10}];
 assert.deepEqual(moveSequence(items,'a','c',true).map(i=>i.id),['b','c','a']);
 assert.deepEqual(moveSequence(items,'c','a').map(i=>i.id),['c','a','b']);
 assert.deepEqual(items.map(i=>i.id),['a','b','c']);assert.equal(moveSequence(items,'missing','a'),items);
 assert.equal(moveSequence(items,'a','a'),items);assert.equal(moveSequence(items,'a','b',true).find(i=>i.id==='a').seconds,5);
});
test('duração soma vídeos completos e repetições sem mascarar arquivos desconhecidos',()=>{
 const media=[{id:'v',kind:'video'},{id:'p',kind:'poster'}],items=[{mediaId:'v',seconds:0},{mediaId:'p',seconds:10},{mediaId:'v',seconds:0}];
 assert.deepEqual(sequenceDuration(items,media,new Map([['v',15.8]])),{seconds:41.6,unknown:0});
 assert.deepEqual(sequenceDuration(items,media,new Map()),{seconds:10,unknown:2});
 assert.deepEqual(sequenceDuration([{mediaId:'gone',seconds:10}],media,new Map()),{seconds:0,unknown:1});
 assert.equal(durationLabel(75.8),'1min 15,8s');assert.equal(durationLabel(0),'0s');
});
test('pesquisa ignora acentos e caixa sem mudar a seleção de conteúdos',()=>{
 const item={name:'Promoção de Pães',kind:'poster'};assert.equal(matchesLibrary(item,'PROMOCAO'),true);assert.equal(matchesLibrary(item,'pães'),true);assert.equal(matchesLibrary(item,'video'),false);assert.equal(matchesLibrary(item,''),true);
});
