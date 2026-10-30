# Conteúdos do VideoWall próprio

A biblioteca mantém os arquivos de imagem e vídeo já cadastrados e acrescenta conteúdos digitais. A duração dos arquivos de vídeo é a duração original; para os demais tipos, o tempo de exibição é definido no item da playlist.

| Tipo | Cadastro e reprodução disponíveis |
| --- | --- |
| Imagem | Upload de PNG, JPEG, WebP e GIF, preview e reprodução no player |
| Vídeo | Upload de MP4 e WebM, preview, reprodução automática sem áudio e eventos |
| YouTube / Shorts | Link HTTPS validado e incorporação pelo domínio sem cookies do YouTube |
| Web | Página HTTPS em iframe isolado, durante o tempo configurado |
| Cartaz | Título, mensagem, até seis produtos, preços, cores, orientação, quatro layouts, ciclo de alternância, prévia ao vivo e opções de aparência |
| Imagens de produtos | Associação de um nome de produto a uma imagem existente na biblioteca |
| Oferta | Nome do produto, preço atual, preço anterior opcional, condições e cores |
| Tabela de preços | Título, até cinquenta produtos, preços e ativação individual; player alterna páginas de cinco produtos |
| Previsão do tempo | Cidade e coordenadas; consulta do tempo atual pela API Open-Meteo no player |
| Tabela Online | Seleção do ponto, edição dos conteúdos de produtos da playlist e publicação da atualização |

## Publicar e atualizar

Tabelas grandes são paginadas automaticamente no player, sem rolagem manual. O tempo do item na playlist é dividido entre as páginas. Para cinquenta produtos, recomenda-se cinquenta segundos, resultando em dez páginas de cinco segundos cada.

No editor de tabela, **Estilo da tabela** permite escolher **Cores personalizadas** ou **Supermercado — escuro com preços amarelos**. O tema usa a folha `public/retail.css`, compartilhada entre a prévia do painel e o player. Salve e publique novamente a playlist para atualizar uma tela já vinculada.

Crie o conteúdo, adicione-o à playlist, salve o rascunho e publique. Alterar um conteúdo comum marca como pendente a playlist que o utiliza. A tela conserva o último retrato publicado até uma nova publicação.

No cartaz, o resumo do editor calcula o ciclo interno (`produtos ativos × tempo por produto`) e a prévia ao vivo usa o renderizador do player em um palco Full HD reduzido. Esse ciclo não substitui a duração do item na playlist. Os controles de unidade, cantos, degradê, cabeçalho e tamanhos de fonte estão descritos em [Cartazes](CARTAZ.md).

O modo Tabela Online permite editar cartazes, ofertas e tabelas da programação de um ponto e publicar a atualização após salvar. A atualização alcança as programações publicadas que referenciam o conteúdo e os pontos que as utilizam. Essa operação atualiza somente o conteúdo escolhido no retrato publicado; alterações independentes de ordem ou nome que estiverem no rascunho continuam pendentes.

Os arquivos associados a imagens de produtos e os conteúdos utilizados nas playlists ou publicações atuais têm proteção contra exclusão.

## Validade e importação de produtos

Nos editores dos conteúdos digitais (cartaz, oferta, tabela, imagem de produto, clima, YouTube e Web), os campos de validade são opcionais. Datas são digitadas no horário do computador e armazenadas em UTC. O início é inclusivo e o fim é exclusivo. Salve e publique novamente a playlist para enviar a validade às telas. Se todas as peças estiverem fora da validade, o player aguarda o próximo início programado. Peças vencidas continuam na biblioteca para edição; arquivos de imagem/vídeo enviados diretamente ainda não têm editor de validade.

Em cartazes e tabelas, abra **Importar produtos de CSV**. Escolha um arquivo ou cole o texto, com cabeçalhos `codigo;nome;preco;unidade`. Apenas `nome` e `preco` são obrigatórios. O importador aceita preços como `12,90`, campos entre aspas, cabeçalhos acentuados e arquivos até 1 MB. A carga substitui as linhas do formulário somente após a validação completa. Confira a lista e salve o conteúdo; no modo comum, publique a playlist para aplicar às telas. Cartazes aceitam seis produtos e tabelas cinquenta; cargas maiores devem ser divididas. Exemplo em `examples/produtos.csv`.

## Dependências externas e recursos pendentes

### Teste de carga Toledo ITENSMGV

O leitor local em `public/toledo.js` extrai departamento, tipo, PLU, preço em centavos e as primeiras duas linhas de descrição do layout fixo documentado pela Toledo. Tipos por peso são apresentados em KG; tipos por unidade em UN. O teste preserva códigos com zeros à esquerda e sinaliza preços zero. Não interpreta informações nutricionais, validade de alimento ou preço promocional como regras de publicação da TV.

Execute `node scripts/test-toledo.mjs "caminho/do/itensmgv.txt"`. O resultado fica em `data/testes-toledo/`: relatório JSON, CSV completo e amostra dos primeiros cinquenta produtos com preço positivo. O script não altera o arquivo de origem, banco ou playlists. O editor continua importando CSV; use o CSV de amostra para testar na tabela de preços, ou divida o CSV completo em grupos de até cinquenta. Não há monitoramento automático da pasta de rede.

- YouTube precisa permitir incorporação e o dispositivo precisa ter internet. A apresentação pelo iframe não equivale ao download ou à conversão do vídeo.
- Links diretos de Instagram/Reels não são importados automaticamente. Use um arquivo de vídeo obtido com autorização e envie pela biblioteca.
- Páginas Web podem recusar iframe por configuração da própria origem. A aplicação não consegue remover essa restrição.
- O clima usa o tempo atual retornado pelo Open-Meteo; não reproduz todos os modelos de previsão do serviço de referência.
- Produtos podem ser digitados, importados de CSV por peça ou selecionados do catálogo central Toledo. O acompanhamento da pasta prepara cargas para revisão e o envio às TVs continua controlado pelo operador. Veja [Catálogo e cargas](CATALOGO.md). Outros formatos de balança e conexão direta ao banco do ERP permanecem pendentes.
- Os cartazes são renderizados pelo navegador. Temas reutilizáveis, imagem de fundo, rotação e paleta por componente ainda não foram implementados; também não há geração de MP4, catálogo de fundos e fontes do Musardos nem exportação de vídeo.
- Usuários de grupo Gerente de Loja, categorias e exclusão automática após validade permanecem pendentes.

Esta é uma implementação independente dos fluxos principais observados. A presença de uma opção no menu original não prova que seu comportamento interno tenha sido reproduzido integralmente.
