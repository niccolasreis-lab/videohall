# Programação semanal das playlists

Em **Playlists → Editar**, marque **Limitar por dias e horários**. Escolha o fuso e configure de 1 a 14 faixas, selecionando os dias e os horários de início/fim. Salve o rascunho e publique quando desejar levar a regra às telas.

- A programação vem desativada nas playlists existentes. A migração não altera publicações ou atribuições dos pontos.
- O início é inclusivo e o fim é exclusivo. Se o fim for anterior ao início, a faixa atravessa a meia-noite e os dias selecionados representam o dia em que ela começa. Exemplo: sexta 22:00–02:00 termina no sábado às 02:00.
- Faixas sobrepostas simplesmente mantêm a mesma playlist ativa; não duplicam a sequência.
- Fora das faixas, o player mostra que está fora do horário e aguarda a próxima faixa. Não troca automaticamente por outra playlist. O painel identifica esse estado como **Fora do horário**.
- O player verifica as fronteiras de minuto, usando o fuso publicado e o relógio sincronizado. As regras funcionam offline com a publicação armazenada. A validade de cada conteúdo e o limite dos preços offline continuam sendo aplicados.
- O fuso independe do computador do painel ou da TV. A interface oferece São Paulo, Manaus, Rio Branco, Noronha e UTC; a API aceita fusos IANA válidos.
- Para permitir todos os dias durante 24 horas, deixe a limitação desativada. Início e fim iguais são recusados para evitar ambiguidade.

Alterar o agendamento não substitui a agenda publicada até republicar. Atualizações direcionadas de conteúdo também preservam o agendamento já publicado e mantêm pendentes as mudanças de horário do rascunho.

## Verificação em 30/10/2026

A suíte completa passou com 27 testes: dias/fuso, início/fim, meia-noite, sobreposição, transições de horário de verão, regra offline e isolamento entre rascunho/publicação, além dos fluxos anteriores.

Na interface foi configurado somente o rascunho **Teste — envio pela biblioteca**, de segunda a sexta, 08:00–18:00 em `America/Sao_Paulo`. O rascunho foi salvo e reaberto para confirmar a persistência. Não foi publicado nem atribuído a um ponto. As playlists das telas existentes permaneceram com a programação anterior.

Backup anterior à migração: `backups/antes-agendamento-20261030-132027/`.

## Correção de continuidade do vídeo

Durante a verificação anterior à implementação, o vídeo estava pausado em 11,674913 segundos, sem avançar entre duas leituras separadas por mais de 16 segundos, apesar do estado de reprodução informado ao servidor.

Foi adicionado um supervisor do elemento de vídeo: tenta retomar pausas enquanto a tela está visível, recarrega uma vez após 12 segundos sem progresso e informa falha caso a reprodução continue parada. O sinal de reprodução passa a depender de `playing`/progresso, em vez de apenas `loadeddata`. O supervisor para quando o conteúdo sai da tela ou deixa de ser válido e evita interpretar uma aba oculta como travamento.

Após a correção, o vídeo de 15,83 segundos avançou e reiniciou; o servidor recebeu `ended` seguido de `started`, e o navegador informou `paused=false`, `readyState=4`, sem erro. Isso comprova os ciclos observados, sem substituir um teste prolongado no aparelho de destino.
