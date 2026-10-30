import test from 'node:test';
import assert from 'node:assert/strict';
import {superviseVideo} from '../public/video-health.js';
function setup(){
 let at=0,tick,allowed=true,visible=true;const signals=[],video=new EventTarget();Object.assign(video,{isConnected:true,currentTime:0,paused:false,ended:false,readyState:4,plays:0,loads:0,play:async()=>{video.plays++;video.paused=false;video.dispatchEvent(new Event('playing'));},load:()=>{video.loads++;}});
 const stop=superviseVideo(video,{onPlaying:()=>signals.push('playing'),onWaiting:()=>signals.push('waiting'),onFailure:message=>signals.push(message),now:()=>at,visible:()=>visible,isAllowed:()=>allowed,schedule:fn=>{tick=fn;return 1;},cancel:()=>{}});
 return {video,signals,stop,advance:ms=>{at+=ms;tick();},allow:value=>{allowed=value;},show:value=>{visible=value;}};
}
test('vídeo pausado tenta retomar e só informa reprodução quando volta a tocar',async()=>{
 const h=setup();h.video.paused=true;h.video.dispatchEvent(new Event('pause'));
 assert.ok(h.signals.length>0&&h.signals.every(signal=>signal==='waiting'));await new Promise(resolve=>setImmediate(resolve));assert.equal(h.video.plays,1);assert.equal(h.signals.at(-1),'playing');h.stop();
});
test('vídeo sem progresso recarrega uma vez e informa falha se continuar parado',()=>{
 const h=setup();h.advance(12000);assert.equal(h.video.loads,1);h.advance(12000);assert.match(h.signals.at(-1),/não avançou/);h.advance(12000);assert.equal(h.video.loads,1);
});
test('supervisor para quando a tela sai ou o conteúdo vence e não acusa travamento por aba oculta',()=>{
 const h=setup();h.show(false);h.advance(60000);assert.equal(h.video.loads,0);h.show(true);h.advance(2000);assert.equal(h.video.loads,0);h.allow(false);h.video.paused=true;h.advance(20000);assert.equal(h.video.plays,0);assert.equal(h.video.loads,0);
});
