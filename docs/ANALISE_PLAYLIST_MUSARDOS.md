# Análise dos tutoriais Musardos

Atualização da implementação: envio direto a múltiplas playlists e validade de imagens/vídeos entregues na primeira etapa. Consulte [o guia da biblioteca](BIBLIOTECA.md). A comparação abaixo registra o diagnóstico feito antes dessa etapa.

Análise em 30/10/2026. Fonte: playlist **Treinamento Mídia Indoor**, 13 vídeos, do canal Musardos Soluções Digitais. Foram lidos os títulos e as transcrições automáticas dos 13 vídeos pelo navegador aberto, e comparados com `public/app.js`, `src/app.mjs`, `src/content.mjs` e `src/database.mjs` do projeto local. As transcrições podem conter erros de reconhecimento; os vídeos não comprovam detalhes que não narram.

## Comparação

| Tutorial | Função apresentada | Projeto atual | Aperfeiçoamento proposto |
|---|---|---|---|
| [1 — Carga de balança](https://www.youtube.com/watch?v=RrOWnh1NgeI) | Subir TXT e selecionar o formato da balança | Importação ITENSMGV, revisão e acompanhamento de pasta | Assistente com indicação explícita de formato. Novos adaptadores dependem de amostras reais; o tutorial não identifica todos os formatos aceitos. |
| [2 — Tabela de preços](https://www.youtube.com/watch?v=FmaiJLbfUNs) | Selecionar ponto, nomear, escolher itens e visualizar | Tabelas, produtos vinculados por código e catálogo central | Seletor visual de produtos com pesquisa, preço, unidade e departamento; atalho a partir do ponto. |
| [3 — Oferta](https://www.youtube.com/watch?v=uM3HyBmm970) | Escolher ponto e procurar produto para criar oferta | Oferta com preço, preço anterior e vínculo por código | Buscar diretamente no catálogo e preencher os dados, mantendo revisão antes da publicação. |
| [4 — Imagens](https://www.youtube.com/watch?v=fV5whVkJzg0) | Cadastro, nome e upload | Já implementado | Melhorar edição dos metadados e validade dos arquivos. A seleção de cliente do vídeo corresponde a um cenário de múltiplos clientes, que ainda não existe aqui. |
| [5 — Prévia](https://www.youtube.com/watch?v=yBRrdeJ4GhI) | Visualizar a aparência do conteúdo | Prévia individual já disponível | Prévia da playlist inteira com sequência e temporização. |
| [6 — Envio para playlist](https://www.youtube.com/watch?v=QNztrAW1wqs) | Enviar da biblioteca para uma ou todas as playlists | Inclusão pelo editor de cada playlist | Ação “Adicionar às playlists” na biblioteca, seleção múltipla e duração; preservar publicação explícita. |
| [7 — Vídeo](https://www.youtube.com/watch?v=lOuDtgq3aec) | Cadastro e upload | Já implementado, incluindo cache offline | Ler duração e dimensões do arquivo para apresentar duração total real da playlist. |
| [8 — Validade](https://www.youtube.com/watch?v=1NnXEM5PL_s) | Definir início/fim no cadastro ou na edição posterior | Validade em peças digitais; arquivos de imagem/vídeo têm política de preço offline, mas não a mesma edição de validade | Unificar calendário no envio e edição de todos os tipos. Validade da campanha e limite de 24 h offline são regras distintas. |
| [9 — Conteúdo social](https://www.youtube.com/watch?v=3wE1C3on-rc) | Cadastro de conteúdo por URL na categoria YouTube/Shorts/Reels | YouTube e Shorts; não há integração dedicada para Instagram | Provedor Instagram separado, com validação e prévia. O tutorial não comprova se há download, API ou incorporação; não presumir funcionamento offline. |
| [10 — Clima](https://www.youtube.com/watch?v=NuIrX-kPK_k) | País, estado, cidade, orientação, duração e envio à playlist | Clima por coordenadas, orientação e duração via playlist | Busca por cidade que preencha coordenadas; atalho de envio direto. |
| [11 — Editor de playlist](https://www.youtube.com/watch?v=XBP7yMQOuvQ) | Pesquisa, inclusão, duração total, arrastar ordem, remover, dias/horários, salvar e prévia | Inclusão, remoção, duração por item, ordem por setas e publicação | Pesquisa dentro do editor, arrastar e soltar, duração incluindo vídeos, programação semanal e player de prévia. |
| [12 — Subplaylist](https://www.youtube.com/watch?v=ZyKUifcRG7c) | Cadastro com nome, tipo de exibição e inclusão de conteúdos | Não implementado | Proposta: blocos reutilizáveis inseridos em playlists principais. O vídeo não explica os valores do tipo de exibição nem as regras de repetição/herança; defini-los antes de implementar. |
| [13 — Apresentação comercial](https://www.youtube.com/watch?v=zsDhWuFWMCc) | Menciona integração de mídia, tabelas, chamada de senha, terminais de consulta, marca própria e auditoria | Mídia, tabelas e relatórios locais de reprodução | Fila/senhas, consulta de preços e múltiplos clientes são projetos adicionais. A apresentação não demonstra suas telas, protocolos ou regras. |

## Ordem recomendada

### Primeiro: aproveitar o que já está pronto

1. Adicionar um conteúdo a várias playlists diretamente da biblioteca, com duração e confirmação do resultado.
2. Estender validade para imagens e vídeos no cadastro e na edição.
3. Escolher produtos do catálogo com pesquisa para criar ofertas e tabelas, evitando digitação de códigos.

### Depois: tornar a programação mais flexível

4. Programar playlists por dias da semana, faixas de horário e fuso definido. Definir prioridade quando horários se sobrepõem e programação de fallback. A programação deve continuar sendo respeitada offline.
5. Adicionar pesquisa, arrastar e soltar, duração completa e prévia de sequência ao editor.
6. Criar subplaylists reutilizáveis, com prevenção de ciclos e publicação consistente dos conteúdos dependentes. Expandir a sequência numa publicação imutável permite manter o download completo e a reprodução offline existentes.

### Por último: ampliar integrações

7. Busca de cidade para clima e integração dedicada de conteúdo social.
8. Se houver interesse comercial, estudar chamada de senhas, terminal de consulta, marca própria e contas separadas por cliente.

## Cuidados de projeto

- O envio à biblioteca/playlist deve alterar o rascunho; publicar continua sendo uma ação explícita, preservando o fluxo já adotado no projeto.
- Prévia da playlist é simulação da sequência. Captura remota da TV continua sendo outra funcionalidade.
- Agendamento semanal complementa a validade por datas e o limite de preços offline, sem substituí-los.
- Não foram implementadas funções novas nesta análise. O teste físico em TV/Android continua adiado conforme solicitado.
