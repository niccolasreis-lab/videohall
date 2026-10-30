# Análise da criação de cartaz Musardos

Fonte: [Novo Cartaz, VideoWall Musardos v3.9.7](https://videowall.musardos.com/#/conteudocartaz/new), inspecionada na sessão aberta em 30/10/2026. Foram examinados formulário, opções avançadas, busca de produto, diálogo de temas e painel de colagem. Nenhum cartaz ou tema foi salvo no sistema de referência.

## Funções observadas

| Área | Controles presentes | Situação e proposta para nosso projeto |
|---|---|---|
| Identificação | Carga, nome e categoria | Já temos nome e catálogo Toledo central. Acrescentar seleção de carga/departamento e categorias para organizar peças. |
| Produtos | Até 6 campos de busca, resultados por código e nome e unidade editável | Já aceitamos 6 produtos no modelo de cartaz. Criar seletor visual ligado ao catálogo, reaproveitando a busca já usada nas ofertas. |
| Colagem | Uma linha por produto, aceitando SKU/EAN, nome ou ambos; o aviso diz que substitui a seleção | Nosso CSV importa nomes/preços e vínculos Toledo. Acrescentar resolução de códigos/nomes contra o catálogo, com revisão de ambiguidades e itens não encontrados antes de substituir. EAN só deve ser resolvido se estiver disponível na carga; não presumir esse dado no ITENSMGV. |
| Tempos | Tempo por produto e duração total identificada como itens × tempo por item | Já temos tempo por produto, mas o tempo da playlist é independente. Calcular e propor a duração, deixando claro o efeito de cada layout. |
| Layout | Lista + Destaque, Destaque Único, Campanha e Grade Estática | Já existem quatro variantes básicas. A referência mostra lista junto de um destaque que alterna; nosso modelo Lista e destaque ainda exige evolução visual para esse comportamento. |
| Orientação | Horizontal, vertical, variantes invertidas e chave de rotação | Já temos horizontal/vertical. Adicionar rotação 90/180/270 com prévia e dimensões coerentes, sem alterar cartazes existentes. |
| Temas | Busca, Aplicar, Definir padrão e salvar configuração como Meu Tema | Implementar temas reutilizáveis e tema padrão. Foram vistos Nostalgia e padrões de açougue, aves, bovinos, hortifruti, padaria e suínos. Criar identidade visual própria com esses setores como referência funcional. |
| Fundo | Upload e visualização do fundo atual | Atualmente a peça usa cor de fundo. Adicionar imagem da biblioteca com validação e inclusão no download offline da publicação. |
| Fontes | Várias famílias e tamanhos separados para item, preço, item em destaque e preço em destaque | Temos apenas três famílias genéricas e tamanhos definidos por CSS. Adicionar controles tipográficos independentes e fontes armazenadas localmente. |
| Cores | Fundo de destaque/caixa de preço, tags Oferta/Clube, texto, preços, linhas pares/ímpares | Temos cores gerais. Adicionar paleta por componente, sem usar HTML livre. |
| Aparência | Cantos arredondados, degradê, unidade visível e ocultação do cabeçalho | Implementar opções independentes, com valores padrão compatíveis. |
| Texto e validade | Título/texto opcionais e datas inicial/final | Já existem título, mensagem e validade; a referência permite título vazio, enquanto nosso cartaz exige título. Definir opção de ocultar sem remover o nome da biblioteca. |
| Playlists | Seleção de playlists dentro do formulário | Já há envio direto pela biblioteca. Integrar essa seleção ao cadastro, mantendo inclusão no rascunho e publicação explícita. |
| Prévia | Quadro de prévia vivo que alterna o destaque e identifica layout/orientação | Nosso editor de playlist agora tem prévia de sequência. Criar também prévia ao vivo dentro do formulário do cartaz, usando o mesmo renderizador do player. |
| Saída | Seleção de HD 1280×720/Full HD 1920×1080 e Vídeo/Slides | A interface oferece esses controles; não foi executada uma geração. Nosso formato atual é HTML configurável. Manter esse modo primeiro; tratar exportação para vídeo/imagens como etapa separada com renderização e testes próprios. |
| ERP | Preenchimento automático com ofertas | Há um controle visível, mas o comportamento e a integração não foram testados. O ITENSMGV atual não deve ser tratado como fonte comprovada de promoções, preços de clube ou vigência de oferta. |

## Ordem recomendada de implementação

1. Seletor de até 6 produtos do catálogo com pesquisa e preço/unidade preenchidos, revisão da colagem e prévia ao vivo.
2. Cálculo de duração e aprimoramento real dos quatro layouts, principalmente lista com destaque alternado.
3. Temas próprios reutilizáveis, paleta por componente, tamanhos de fonte, tags e visibilidade do cabeçalho/unidade.
4. Fundo com imagem e rotação, garantindo que todos os recursos entrem no cache offline e nos snapshots publicados.
5. Seleção de playlists no cadastro; depois, exportação HD/Full HD e integrações ERP quando existirem dados e regras confirmados.

As configurações novas devem ter valores padrão para preservar os cartazes e publicações atuais. O servidor deve validar os dados e a prévia compartilhar a renderização do player, evitando divergências. Geração de vídeo, seleção automática de ofertas e preços de clube não foram comprovadas apenas pela existência dos controles.

## Estado da implementação em 30/10/2026

Implementado e verificado nesta etapa:

- seletor de produtos do catálogo por linha, com preço e unidade preenchidos;
- prévia ao vivo no formulário, usando o renderizador do player em um palco Full HD reduzido;
- resumo do ciclo `produtos ativos × tempo por produto` para os layouts que alternam;
- **Lista e destaque** com a lista completa e um item destacado por vez, avançando no tempo configurado;
- opções de unidade, cantos arredondados, fundo degradê, cabeçalho oculto e quatro tamanhos de fonte independentes;
- título vazio aceito somente quando o cabeçalho está oculto.

Permanecem propostos, sem implementação: temas reutilizáveis e tema padrão, paleta por componente, tags, imagem de fundo, rotação 90/180/270, seleção de playlists dentro do formulário, exportação HD/Full HD e integração ERP. A descrição do que está disponível, com limites, está em [CARTAZ.md](CARTAZ.md).
