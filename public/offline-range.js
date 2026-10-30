// Cache Storage contém o arquivo completo; vídeos podem pedir apenas um intervalo.
export async function cachedMediaResponse(response,range,head=false){
 if(!range)return head?new Response(null,{status:200,headers:response.headers}):response;
 const blob=await response.blob(),size=blob.size,match=/^bytes=(\d*)-(\d*)$/.exec(range);
 const headers=new Headers(response.headers);headers.set('Accept-Ranges','bytes');headers.delete('Content-Encoding');
 const invalid=()=>{headers.set('Content-Range',`bytes */${size}`);headers.set('Content-Length','0');return new Response(null,{status:416,headers});};
 if(!match||!size||!match[1]&&!match[2])return invalid();
 let start,end;
 if(!match[1]){const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)return invalid();start=Math.max(0,size-suffix);end=size-1;}
 else{start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),size-1):size-1;}
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||start>end)return invalid();
 headers.set('Content-Range',`bytes ${start}-${end}/${size}`);headers.set('Content-Length',String(end-start+1));
 return new Response(head?null:blob.slice(start,end+1),{status:206,headers});
}
