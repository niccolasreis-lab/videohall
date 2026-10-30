# Reprodução offline

Abra o player conectado e espere o aviso **Offline pronto · vN · X arquivo(s) salvo(s)**. A programação e os arquivos ficam no navegador desse aparelho. Depois disso, é possível recarregar a página com o servidor indisponível.

## Comportamento definido

- Imagens, vídeos e imagens de produtos são baixados integralmente. Cartazes, ofertas e tabelas guardam a configuração publicada.
- A nova versão só é ativada quando todos os arquivos necessários terminam de baixar e a programação é salva. Download interrompido ou falta de espaço mantém a anterior.
- YouTube, páginas web e clima são pulados quando o player não consegue sincronizar com o painel. Se nada válido restar, aparece **Conteúdo temporariamente indisponível**.
- Ofertas, tabelas e cartazes com produtos são ocultados após 24 horas sem confirmação daquela versão pelo servidor. A validade programada mais curta continua prevalecendo. Uma versão antiga mantida durante um download pendente não renova o prazo dos seus preços.
- Imagens, vídeos e imagens de produtos são considerados possíveis conteúdos com preços por padrão, inclusive arquivos antigos. Para uma peça sem preços, abra **Conteúdos → Preços e offline**, desmarque **Este arquivo contém preços ou ofertas** e republique as playlists que a utilizam. A opção também está no envio de arquivos. Não há reconhecimento automático dos preços desenhados dentro das imagens ou vídeos.
- O histórico permanece no aparelho por até 7 dias. Quando reconecta, envia lotes de até 200 eventos, mantendo horário original e identificação **recuperado offline**. O servidor deduplica os reenvios e só aceita eventos de publicações entregues àquele vínculo.
- O painel informa a última versão que o player disse ter armazenado e a versão que está usando. Isso não equivale a uma captura dos pixels da TV.

## Requisitos e limites

Preparado para navegadores Chromium atuais: Chrome/Edge no Windows e Chrome no Android. O teste físico desta entrega foi feito no navegador desta máquina; Android ainda precisa de teste no aparelho de destino.

Service worker exige HTTPS, com exceção dos endereços locais confiáveis como `localhost` e `127.0.0.1`. Para abrir de uma TV ou Android na rede, use um endereço HTTPS válido; um IP da rede com HTTP não habilita esta implementação offline. Veja a [documentação de service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API).

O primeiro acesso e o primeiro download precisam de conexão. O navegador precisa manter cookies, Cache Storage e IndexedDB. Limpar dados do site, modo privado, remoção de dados pelo navegador ou falta de armazenamento podem eliminar a cópia local. O player solicita armazenamento persistente, cuja concessão depende do navegador.

O relógio deve permanecer correto. O player usa o horário do servidor e um relógio monotônico durante a sessão; detectando retrocesso importante do relógio entre aberturas, oculta preços até sincronizar novamente.

Desvincular só é conhecido pelo aparelho quando ele reconecta. Ao receber o desvínculo ou uma nova identidade, remove a programação e os eventos locais. Não há acesso remoto a uma TV completamente desconectada. Ligar a TV e iniciar o navegador automaticamente continua dependendo do aparelho e do modo quiosque.

Se o contexto não suporta armazenamento offline, o player mostra a orientação para usar HTTPS/localhost e não ativa uma nova programação sem concluir o preparo. O cache não transforma fontes externas em conteúdo offline.

## Teste realizado em 30/10/2026

1. O player do ponto **loja**, playlist **s**, versão 1, confirmou um arquivo salvo.
2. O servidor na porta 3210 foi desligado; a checagem da porta confirmou indisponibilidade.
3. O player foi recarregado. Mostrou **Sem conexão · programação salva · 1 evento(s) pendente(s)** e o vídeo avançou com `readyState=4`, `paused=false` e sem erro.
4. O servidor foi religado. O player voltou a **Offline pronto** e o painel recebeu o evento identificado como **recuperado offline**, no horário original.

Evidência: `../../analise-videowall/player-sem-servidor.png` e `../../analise-videowall/monitoramento-offline-recuperado.png`. As atribuições dos pontos e as playlists existentes foram preservadas. O banco anterior à migração foi copiado para `backups/antes-offline-20261030-124725/`.

## Manutenção

`player-sw.js` guarda apenas a página do player e seus recursos, sem guardar o painel administrativo ou respostas de API. Os arquivos de mídia são servidos do cache da publicação ativa somente para clientes do player; solicitações parciais de vídeo recebem respostas 206 e faixas inválidas recebem 416. O tratamento segue a necessidade de [armazenar vídeos completos antes da reprodução e atender Range](https://developer.chrome.com/docs/workbox/serving-cached-audio-and-video).

Ao alterar os arquivos que compõem o player, incremente a versão `SHELL` em `public/player-sw.js` para atualizar também a cópia offline. O cache da mídia ativa só é trocado depois de persistir a publicação; caches anteriores desse player são removidos após a troca bem-sucedida.
