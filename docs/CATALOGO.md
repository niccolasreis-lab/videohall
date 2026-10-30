# Catálogo central e cargas Toledo

No menu **Produtos e cargas**, importe um ITENSMGV de até 1 MB ou configure uma pasta. O leitor usa os campos fixos comuns documentados pela Toledo. Departamento e código formam a identidade do produto: `01:001002`. O catálogo armazena todos os registros, inclusive preços zero e itens ausentes da última carga.

## Fluxo de trabalho

1. **Importar ITENSMGV** ou **Verificar agora** prepara a revisão: novos, alterados, inalterados, preço zero e ausentes. A comparação considera a última carga aplicada; uma revisão desatualizada é recusada e deve ser reenviada para nova análise.
2. **Aplicar carga ao catálogo** atualiza o cadastro central em uma transação. Itens ausentes não são apagados; ficam indisponíveis. Arquivos idênticos não criam cargas repetidas.
3. Nos editores de tabela/cartaz/oferta, **Selecionar produto do catálogo** busca por nome ou código. Preços zero e produtos ausentes não podem ser selecionados.
4. **Aplicar catálogo aos rascunhos** atualiza peças por código/departamento. Linhas manuais sem código não são alteradas. Se um código existir em mais de um departamento e a linha não informar departamento, ela permanece intacta. Linhas ausentes/zeradas ficam inativas; a reativação é uma decisão manual. Ofertas vinculadas ficam fora da reprodução enquanto o produto estiver indisponível.
5. **Enviar conteúdos às TVs** publica somente as peças alteradas nas versões já publicadas. Nome, ordem e outras mudanças independentes de rascunho continuam pendentes. A lista de peças a enviar persiste após recarregar a página.

As tabelas aceitam até cinquenta produtos; cartazes até seis. O limite pertence à peça, não ao catálogo.

## Pasta automática

Foi configurada a pasta autorizada `C:\Users\operador\Downloads\teste\carga`. A verificação ocorre a cada sessenta segundos enquanto o servidor estiver em execução. Ela considera somente arquivos `itensmgv*.txt` ou `itensmgv*.mgv`, sem varrer subpastas. O arquivo mais recente precisa ter tamanho/data estáveis entre duas verificações e não pode superar 5 MB. `Verificar agora` também executa uma verificação.

Arquivos novos ficam **pendentes de revisão**; não alteram preços ou telas automaticamente. Erros de leitura/formato aparecem na área da pasta e são tentados novamente na próxima verificação. Desmarque a opção no formulário para interromper o acompanhamento. O processo não é um serviço do Windows e ainda não inicia sozinho após reiniciar o computador.

## Teste real realizado

A carga local `itensmgv.txt` foi detectada, revisada e aplicada: 906 registros; 453 com preço positivo, 453 com preço zero. A tabela **Teste Toledo — 50 produtos** recebeu os vínculos por departamento e teve sua programação republicada. A playlist original **s** do ponto **loja** permaneceu atribuída.

Histórico, catálogo, configurações e pendências ficam no SQLite em `data/`. Inclua essa pasta no backup do projeto.
