import test from 'node:test';
import assert from 'node:assert/strict';
import {canPlay,nextPlaybackBoundary,hasPrices,PRICE_TTL} from '../public/offline-policy.js';
import {cachedMediaResponse} from '../public/offline-range.js';
import {OfflinePlayer} from '../public/offline-player.js';

test('offline oculta preços após 24 h, respeita validade e pula fontes externas',()=>{
 const confirmedAt=Date.UTC(2026,9,30),base={confirmedAt,now:confirmedAt+1000,connected:false};
 const offer={kind:'offer',config:{}};
 assert.equal(canPlay(offer,base),true);
 assert.equal(canPlay(offer,{...base,now:confirmedAt+PRICE_TTL}),false);
 assert.equal(canPlay(offer,{...base,clockUnsafe:true}),false);
 assert.equal(canPlay({kind:'poster',config:{body:'Boas-vindas'}},{...base,now:confirmedAt+2*PRICE_TTL}),true);
 for(const kind of ['youtube','web','weather']){assert.equal(canPlay({kind},base),false);assert.equal(canPlay({kind},{...base,connected:true}),true);}
 assert.equal(canPlay({...offer,config:{validUntil:new Date(confirmedAt+500).toISOString()}},base),false);
 assert.equal(hasPrices({kind:'image'}),true,'arquivos antigos são tratados como possíveis ofertas');
 assert.equal(hasPrices({kind:'image',hasPrices:false}),false);
 assert.equal(nextPlaybackBoundary([offer],base),confirmedAt+PRICE_TTL);
 assert.equal(nextPlaybackBoundary([{kind:'poster'}],base),null);
});

test('vídeo em cache atende intervalos, sufixos, HEAD e faixas inválidas',async()=>{
 const response=()=>new Response('0123456789',{headers:{'Content-Type':'video/mp4','Content-Length':'10'}});
 let result=await cachedMediaResponse(response(),'bytes=2-5');assert.equal(result.status,206);assert.equal(await result.text(),'2345');assert.equal(result.headers.get('Content-Range'),'bytes 2-5/10');
 result=await cachedMediaResponse(response(),'bytes=-3');assert.equal(await result.text(),'789');
 result=await cachedMediaResponse(response(),'bytes=8-99');assert.equal(await result.text(),'89');
 result=await cachedMediaResponse(response(),'bytes=1-2',true);assert.equal(await result.text(),'');assert.equal(result.headers.get('Content-Length'),'2');
 for(const range of ['bytes=10-','bytes=4-1','bytes=-0','bytes=0-1,4-5','abc']){result=await cachedMediaResponse(response(),range);assert.equal(result.status,416);}
});

function harness(fetcher,{failCommit=false}={}){
 const entries=new Map(),cacheStorage={open:async name=>{if(!entries.has(name))entries.set(name,new Map());const cache=entries.get(name);return {match:async key=>cache.get(key)?.clone(),put:async(key,response)=>{cache.set(key,response.clone());}};},keys:async()=>[...entries.keys()],delete:async name=>entries.delete(name)};
 let saved;const storage={putState:async(key,value)=>{if(failCommit)throw new Error('Sem espaço no banco');saved=value;}};
 const player=new OfflinePlayer({storage,cacheStorage,fetcher});player.available=true;
 const old={cacheName:'videowall-media-v1-old',data:{point:{id:'p'},publication:{id:'old',items:[]}}};player.snapshot=old;
 return {player,entries,get saved(){return saved;},old};
}
const publication={point:{id:'p'},publication:{id:'new',version:2,items:[{kind:'image',url:'/media/a'},{kind:'video',url:'/media/b'}]},serverTime:Date.now()};
test('download incompleto mantém a publicação anterior e remove o cache parcial',async()=>{
 let calls=0;const h=harness(async()=>{if(++calls===2)throw new Error('Conexão caiu');return new Response('file',{headers:{'Content-Length':'4'}});});
 await assert.rejects(h.player.prepare(publication,new AbortController().signal),/Conexão caiu/);
 assert.equal(h.player.snapshot,h.old);assert.equal(h.saved,undefined);assert.equal(h.entries.has('videowall-media-v1-p-new'),false);
});
test('só ativa após download integral e conserva a versão anterior se o banco falhar',async()=>{
 const fetcher=async()=>new Response('file',{headers:{'Content-Length':'4'}});
 const h=harness(fetcher);const ready=await h.player.prepare(publication,new AbortController().signal);
 assert.equal(h.player.snapshot,h.old);assert.equal(ready.files,2);assert.equal(ready.bytes,8);
 await h.player.commit(ready);assert.equal(h.saved,ready);assert.equal(h.player.status.state,'ready');
 const failed=harness(fetcher,{failCommit:true});const candidate=await failed.player.prepare(publication,new AbortController().signal);
 await assert.rejects(failed.player.commit(candidate),/Sem espaço/);assert.equal(failed.player.snapshot,failed.old);assert.equal(failed.entries.has(candidate.cacheName),false);assert.equal(failed.player.status.state,'error');
});
