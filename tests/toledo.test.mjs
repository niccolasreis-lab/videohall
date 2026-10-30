import test from 'node:test';
import assert from 'node:assert/strict';
import {parseToledoMgv,decodeProductText,productsToCsv} from '../public/toledo.js';
import {parseProductCsv} from '../public/content-utils.js';

const line = (code,price,type='0') => '01'+type+code+price+'014'+'QUEIJO TESTE'.padEnd(25)+'DESCRICAO ADICIONAL'.padEnd(25)+'0'.repeat(208);
test('Toledo mantém zeros do PLU, converte centavos e diferencia KG/UN',()=>{
 const parsed=parseToledoMgv(line('001002','007560')+'\r\n'+line('021002','000000')+'\r\n'+line('001003','000278','1'));
 assert.equal(parsed.products[0].price,75.6); assert.equal(parsed.products[0].code,'001002');
 assert.equal(parsed.products[0].name,'QUEIJO TESTE DESCRICAO ADICIONAL');
 assert.equal(parsed.zeroPrices,1); assert.equal(parsed.products[1].active,false);
 assert.equal(parsed.products[2].unit,'UN'); assert.equal(parsed.products[2].price,2.78);
 assert.equal(parseProductCsv(productsToCsv([parsed.products[0]]))[0].price,75.6);
 const continuous='010001020003400014'+'LINGUICA DICALANI DEFUMADA'.padEnd(50)+'0'.repeat(208);
 assert.equal(parseToledoMgv(continuous).products[0].name,'LINGUICA DICALANI DEFUMADA');
});
test('Toledo rejeita linhas desconhecidas e duplicatas sem importar parcialmente',()=>{
 assert.throws(()=>parseToledoMgv('codigo;nome;preco'),/Layout/);
 assert.throws(()=>parseToledoMgv(line('001002','007560')+'\n'+line('001002','007560')),/duplicado/);
 assert.throws(()=>parseToledoMgv(line('001002','007560')+'\n'+'invalida'),/linha 2/);
 assert.equal(decodeProductText(Uint8Array.from([67,65,70,201])).text,'CAFÉ');
});
