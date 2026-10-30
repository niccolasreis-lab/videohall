# Editor de playlists

Em **Playlists → Editar**, a biblioteca possui pesquisa por nome, ignorando caixa e acentos. O filtro não remove itens da sequência.

Arraste a alça **⠿** de um item para outra posição. Soltar na metade superior de uma linha insere antes; na metade inferior, depois. As setas **↑/↓** continuam disponíveis para teclado, toque e navegadores sem suporte a arraste nativo. Repetições de um mesmo conteúdo mantêm identificadores e durações próprios.

A duração total soma os tempos configurados e a duração completa dos vídeos, lida pelo navegador com metadados dos arquivos. Vídeos repetidos contam a cada ocorrência. Metadados não disponíveis deixam uma indicação explícita de total parcial; não se presume duração zero. O cálculo é informativo e não altera o arquivo ou a publicação.

## Prévia da sequência

Clique em **Prévia da sequência** para reproduzir uma cópia do rascunho atual, inclusive alterações ainda não salvas. Os controles permitem pausar, continuar, avançar e voltar. Imagens e peças digitais respeitam o tempo configurado; vídeos avançam ao terminar. Cartazes e tabelas usam o mesmo módulo de renderização do player real.

A prévia é manual: não aplica a agenda, validade ou bloqueio de preços offline, para permitir inspecionar todas as peças. Não é captura remota da TV. Não publica, não cria vínculo de dispositivo e não registra exibições. Fontes externas continuam dependendo de conexão e permissão de incorporação.

Ao mudar ordem ou duração depois de abrir a prévia, ela é encerrada e pede uma nova visualização. Ao fechar o editor, a prévia e as leituras de metadados pendentes são encerradas.

## Validação em 30/10/2026

A suíte completa passou com 30 testes. Os novos testes verificam reordenação com conteúdos repetidos, preservação de identidade/duração, duração dos vídeos e indicação de valores desconhecidos, além da pesquisa sem acentos.

No navegador, foi utilizado somente **Teste — envio pela biblioteca**, sem publicação ou pontos atribuídos. A busca por vídeo filtrou a biblioteca; o vídeo de 15,833333 segundos mais o cartaz de 10 segundos resultou em **25,8s**. A ordem foi alterada, salva e reaberta como vídeo seguido de cartaz. A prévia reproduziu o vídeo e respondeu à pausa. A reordenação pela seta foi conferida pela interface; a lógica de inserção usada pelo arraste foi testada automaticamente.

Não houve migração de banco nesta etapa. As publicações existentes continuam preservadas. O cache do player foi versionado para incluir o módulo visual compartilhado.
