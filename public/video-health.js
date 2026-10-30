// O heartbeat deve refletir o elemento de vídeo, não apenas seu carregamento.
export function superviseVideo(video,{onPlaying,onWaiting,onFailure,isAllowed=()=>true,visible=()=>!document.hidden,now=()=>performance.now(),schedule=setInterval,cancel=clearInterval}){
 let stopped=false,busy=false,lastTime=video.currentTime,lastProgress=now(),lastAttempt=-Infinity,reloaded=false,interval;
 const alive=()=>!stopped&&video.isConnected&&isAllowed();
 function dispose(){if(stopped)return;stopped=true;cancel(interval);video.removeEventListener('playing',playing);video.removeEventListener('pause',waiting);video.removeEventListener('waiting',waiting);}
 function fail(message){if(!alive())return dispose();dispose();onFailure(message);}
 function playing(){if(!alive())return dispose();lastProgress=now();lastTime=video.currentTime;onPlaying();}
 function waiting(){if(!alive()||video.ended)return;onWaiting();tick();}
 function resume(){
  if(busy||now()-lastAttempt<2000)return;
  busy=true;lastAttempt=now();
  Promise.resolve().then(()=>{if(alive())return video.play();}).catch(()=>fail('O navegador não permitiu retomar o vídeo.')).finally(()=>{busy=false;});
 }
 function tick(){
  if(!alive())return dispose();
  const time=now();
  if(!visible()){lastProgress=time;return;}
  if(video.ended)return;
  if(video.currentTime!==lastTime){lastTime=video.currentTime;lastProgress=time;reloaded=false;if(!video.paused&&video.readyState>=3)onPlaying();return;}
  if(video.paused){onWaiting();resume();}
  if(time-lastProgress<12000)return;
  onWaiting();
  if(reloaded)return fail('O vídeo não avançou mesmo após tentar recarregar o arquivo.');
  reloaded=true;lastProgress=time;video.load();resume();
 }
 video.addEventListener('playing',playing);video.addEventListener('pause',waiting);video.addEventListener('waiting',waiting);
 interval=schedule(tick,2000);tick();
 return dispose;
}
