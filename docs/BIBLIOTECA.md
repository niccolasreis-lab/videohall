# Envio direto e validade de arquivos

## Adicionar a várias playlists

Em **Conteúdos**, clique em **Adicionar às playlists** no conteúdo desejado. Marque uma ou mais playlists, ou use **Selecionar todas as disponíveis**. Para conteúdos que não são vídeos, escolha a duração por exibição. Vídeos usam a duração do arquivo.

O conteúdo é acrescentado ao fim de cada rascunho selecionado. Uma playlist que já contém o conteúdo fica desabilitada para impedir duplicação. Os tempos e posições dos itens existentes são preservados.

O envio não publica nem altera a programação das TVs. Revise os rascunhos e publique cada playlist quando desejar. Se alguma seleção estiver desatualizada, não existir ou exceder o limite de 500 itens, todo o lote é cancelado. Reabra a seleção após resolver a causa. A operação aceita até 200 playlists por envio.

## Validade de imagens e vídeos

No envio de um arquivo, os campos **Exibir a partir de** e **Exibir até** são opcionais. Para editar um arquivo existente, clique em **Validade, preços e offline** no cartão.

Os horários são digitados no fuso do computador do painel e armazenados em UTC. O início é inclusivo e o fim é exclusivo. Ao vencer, o player pula o conteúdo, mesmo sem conexão. Campos vazios deixam o arquivo sem limite por datas.

Salvar uma edição atualiza os rascunhos; publicações existentes mantêm suas datas anteriores até serem republicadas. A configuração continua separada da opção **Este arquivo contém preços ou ofertas**: a regra de ocultar preços após 24 horas sem confirmação da programação permanece funcionando. Imagens de produtos e demais peças digitais continuam usando seus próprios campos de validade.

Arquivos anteriores à atualização começam sem limite por datas. Uma nova coluna aditiva guarda a validade; nenhum upload ou playlist é removido pela migração.

## Verificação da entrega

Em 30/10/2026, a suíte completa passou com 19 testes. Os testes adicionais verificam lote atômico, conflitos de revisão, ausência de duplicações, preservação das publicações, datas no envio/edição, manutenção da política de preços e início/fim da validade em imagens e vídeos.

Pela interface, foi criada a playlist **Teste — envio pela biblioteca**, apenas como rascunho, sem atribuição a pontos. O **Cartaz de boas-vindas** foi adicionado pela biblioteca, e a janela seguinte confirmou que o item já estava presente. Nenhuma publicação existente foi substituída. Os campos de validade foram conferidos no vídeo existente, cancelando a edição para preservar sua configuração.

Backup do banco anterior à migração: `backups/antes-biblioteca-20261030-131010/`.
