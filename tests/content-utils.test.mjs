import test from 'node:test';
import assert from 'node:assert/strict';
import { isContentActive, nextContentBoundary, parseProductCsv, productPages } from '../public/content-utils.js';
import { validateContent } from '../src/content.mjs';

test('validade inclui o início, exclui o fim e identifica a próxima transição', () => {
  const from = '2026-10-30T12:00:00Z', until = '2026-10-30T13:00:00Z';
  const item = {config:{validFrom:from, validUntil:until}};
  assert.equal(isContentActive(item,Date.parse(from)-1),false);
  assert.equal(isContentActive(item,Date.parse(from)),true);
  assert.equal(isContentActive(item,Date.parse(until)),false);
  assert.equal(nextContentBoundary([item],Date.parse(from)),Date.parse(until));
  assert.equal(nextContentBoundary([item],Date.parse(until)),null);
  assert.equal(isContentActive({kind:'video'}),true);
  const normalized = validateContent({name:'Oferta',kind:'offer',config:{title:'Café',price:10,validFrom:'2026-10-30T09:00:00-03:00',validUntil:until}});
  assert.equal(Date.parse(normalized.config.validFrom),Date.parse(from));
  assert.throws(() => validateContent({name:'x',kind:'poster',config:{title:'x',validFrom:until,validUntil:from}}),/posterior/);
  assert.throws(() => validateContent({name:'x',kind:'poster',config:{title:'x',validFrom:'amanhã'}}),/validade/);
});

test('CSV importa produtos com cabeçalhos, aspas, acentos, códigos e preços locais', () => {
  const rows = parseProductCsv('\uFEFFcódigo;nome;preço;unidade\r\n001;"Café; especial";12,90;KG\r\n002;Arroz;1.234,56;UN');
  assert.equal(rows[0].name,'Café; especial');
  assert.equal(rows[0].code,'001');
  assert.equal(rows[0].price,12.9);
  assert.equal(rows[1].price,1234.56);
  assert.equal(parseProductCsv('nome,preco\n"Café, especial",9.50')[0].price,9.5);
  assert.throws(() => parseProductCsv('nome;preco\nCafé;abc'),/linha 2/);
  assert.throws(() => parseProductCsv('nome;preco\nCafé;10\nArroz;20',1),/até 1/);
  assert.throws(() => parseProductCsv('nome;preco\n"Café;10'),/aspas/);
  assert.throws(() => parseProductCsv('produto;valor\nCafé;10'),/cabeçalho/);
});

test('cinquenta produtos alternam em dez páginas sem omissão ou duplicação', () => {
 const rows=Array.from({length:50},(_,index)=>({code:String(index),price:index}));
 const pages=productPages(rows);
 assert.equal(pages.length,10);
 assert.deepEqual(pages.flat(),rows);
 assert.equal(productPages([...rows,{code:'inactive',active:false}]).flat().length,50);
 assert.equal(productPages([]).length,0);
 assert.throws(()=>productPages(rows,0),/inválido/);
});
