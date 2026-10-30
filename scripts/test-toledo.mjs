import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {parseToledoMgv,decodeProductText,productsToCsv} from '../public/toledo.js';

const inputs=process.argv.slice(2);
if (!inputs.length) throw new Error('Informe os arquivos ITENSMGV para testar.');
const output=resolve('data','testes-toledo'); await mkdir(output,{recursive:true});
const reports=[];
for (const [index,input] of inputs.entries()) {
 const bytes=await readFile(input), decoded=decodeProductText(bytes), result=parseToledoMgv(decoded.text);
 const report={source:input,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,encoding:decoded.encoding,records:result.products.length,zeroPrices:result.zeroPrices,positivePrices:result.products.length-result.zeroPrices,departments:result.departments,lineLengths:result.lineLengths,samples:result.products.filter(p=>p.price>0).slice(0,5)};
 // Arquivos gerados apenas no diretório local de testes; não altera fonte, banco ou playlists.
 const eligible=result.products.filter(p=>p.price>0);
 await writeFile(join(output,`carga-${index+1}-completa.csv`),productsToCsv(result.products));
 await writeFile(join(output,`carga-${index+1}-amostra-50.csv`),productsToCsv(eligible.slice(0,50)));
 await writeFile(join(output,`carga-${index+1}-relatorio.json`),JSON.stringify(report,null,2));
 reports.push(report);
}
console.log(JSON.stringify({reports,identical:reports.length>1?reports.every(r=>r.sha256===reports[0].sha256):null,output},null,2));
