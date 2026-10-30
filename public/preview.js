import {renderVirtual} from './content-renderer.js';
import {durationLabel} from './editor-utils.js';
const root=document.querySelector('#player'),info=document.querySelector('#preview-info'),pause=document.querySelector('#pause');
const embedded=new URLSearchParams(location.search).get('embed')==='1';if(embedded)document.body.classList.add('embed');
let items=[],index=0,timer=null,paused=false,remaining=0,deadline=0,loaded=false,turn=0;
function message(value){root.replaceChildren();const p=document.createElement('p');p.className='preview-message';p.textContent=value;root.append(p);}
function status(suffix=''){info.textContent=items.length?`${index+1}/${items.length} · ${items[index].name||'Conteúdo'}${suffix?' · '+suffix:''}`:'Sequência vazia';}
function arm(){clearTimeout(timer);if(embedded)return;if(!paused&&loaded&&remaining>0){deadline=performance.now()+remaining;timer=setTimeout(()=>next(1),remaining);}}
function next(step){if(!items.length)return;index=(index+step+items.length)%items.length;play();}
function play(){
 const own=++turn;clearTimeout(timer);root.querySelector('video')?.pause();root.replaceChildren();paused=false;loaded=false;pause.textContent='Pausar';remaining=Math.max(1,Number(items[index].seconds)||10)*1000;
 const item=items[index],container=document.createElement('section');container.className='screen';root.append(container);status('carregando');
 const ready=()=>{if(own!==turn)return;loaded=true;status(paused?'pausado':item.kind==='video'?'vídeo completo':durationLabel(remaining/1000));if(item.kind!=='video')arm();};
 const failed=detail=>{if(own!==turn)return;clearTimeout(timer);status(detail);message(detail);if(!paused)timer=setTimeout(()=>next(1),3000);};
 if(['video','image','product_image'].includes(item.kind)){
  if(typeof item.url!=='string'||!/^\/media\/[\w-]+$/.test(item.url))return failed('Arquivo indisponível para prévia.');
  if(item.kind==='video'){
   const video=document.createElement('video');video.src=item.url;video.muted=true;video.playsInline=true;container.append(video);video.onplaying=ready;video.onended=()=>next(1);video.onerror=()=>failed('Não foi possível reproduzir este vídeo.');
   video.play().catch(()=>{if(own!==turn)return;paused=true;pause.textContent='Reproduzir';status('clique em Reproduzir para iniciar');});
  }else{const image=document.createElement('img');image.alt=item.name;image.onload=ready;image.onerror=()=>failed('Não foi possível carregar esta imagem.');image.src=item.url;container.append(image);}
 }else if(renderVirtual(item,container,ready,failed)!=='pending')ready();
 if(!loaded)timer=setTimeout(()=>{if(!loaded)failed('O conteúdo não confirmou carregamento.');},30000);
}
pause.onclick=()=>{
 if(!items.length)return;const video=root.querySelector('video');
 paused=!paused;pause.textContent=paused?'Continuar':'Pausar';
 if(video){if(paused)video.pause();else video.play().catch(()=>{paused=true;pause.textContent='Reproduzir';status('reprodução bloqueada pelo navegador');});}
 else{if(paused){if(loaded)remaining=Math.max(1,deadline-performance.now());clearTimeout(timer);}else arm();}
 status(paused?'pausado':'reproduzindo');
};
document.querySelector('#next').onclick=()=>next(1);document.querySelector('#previous').onclick=()=>next(-1);
window.addEventListener('message',event=>{
 if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='videowall-preview')return;
 const snapshot=event.data.snapshot;if(!Array.isArray(snapshot?.items)||snapshot.items.length>500)return;
 items=snapshot.items.filter(item=>item&&['image','video','product_image','poster','offer','price_table','weather','youtube','web'].includes(item.kind));index=0;
 if(items.length)play();else{clearTimeout(timer);turn++;message('Nenhum conteúdo disponível na sequência.');status();}
});
