# Monitoramento dos pontos

No painel, abra **Monitoramento** e clique em **Playlist e log** no ponto desejado. O mesmo botão está disponível em **Pontos**.

- O painel consulta os pontos a cada 10 segundos enquanto a página está visível e nenhuma janela está aberta.
- Os filtros incluem todos, online, offline, não vinculados, online sem exibir, sem publicação, falhas e reproduzindo. Offline inclui pontos ainda não vinculados; os filtros podem se sobrepor.
- A janela mostra a versão publicada atribuída ao ponto, a sequência e a duração dos conteúdos, o último sinal do player e o conteúdo informado por ele.
- O histórico da janela abrange os últimos 30 minutos e retorna até 200 eventos, do mais recente para o mais antigo. O histórico geral permanece em **Atividade**.
- A janela atualiza a cada 5 segundos e permite pausar ou atualizar manualmente.

Online significa comunicação nos últimos 25 segundos. Reproduzindo exige vínculo, sinal recente, publicação e estado `playing` com conteúdo informado. A prévia é do conteúdo cadastrado e não confirma visualmente os pixels da TV. A janela mostra separadamente a publicação atribuída, a versão em uso informada pelo player e sua última confirmação de armazenamento. Consulte [o guia offline](OFFLINE.md) para os requisitos e limites dessa confirmação.

O endpoint administrativo `GET /api/points/:id/monitor` exige sessão e consulta a publicação salva e os eventos daquele ponto. Alterações em rascunho não substituem a sequência publicada nessa janela.

## Validação

A suíte local cobre autenticação da consulta, entrega da publicação, exclusão de eventos anteriores a 30 minutos e classificação dos estados. A conferência no navegador verificou a playlist **s**, versão 1, no ponto **loja**, e a playlist **Teste Toledo — carga local**, versão 4, no ponto de teste ainda não vinculado. Nenhuma atribuição foi alterada durante essa conferência.
