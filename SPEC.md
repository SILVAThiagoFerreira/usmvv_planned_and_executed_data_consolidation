# SPEC

## Objetivo

Consolidar MVV e RD no navegador, gerar um workbook Excel e permitir que o usuario apenas anexe os arquivos de entrada.
Tambem existe um fluxo RD-only para formatar apenas o executado em um workbook separado.

## Decisoes obrigatorias

- O processamento ocorre 100% no navegador.
- Nenhum arquivo e enviado para servidor.
- A interface abre em portugues por padrao.
- O seletor de idioma permite portugues, ingles e chines simplificado.
- A troca de idioma altera apenas a interface da pagina, nao o workbook gerado.
- O titulo exibido na area de trabalho e `Consolidação MVV × RD`.
- A marca antiga nao aparece na interface.
- A interface usa fundo branco, estilo minimalista e uma unica marca OpenBlast na barra superior.
- O badge `Somente local` nao aparece na interface.
- O botao principal em portugues exibe `Consolidar MVV + RD`.
- As ações MVV-only e RD-only ficam dentro do detalhe recolhido `Outras saídas` e exibem `Organizar planejado` e `Organizar executado`.
- O quadro O-PitDev exibe `Organizar somente o levantado` como ação independente do plano.
- O subtitulo longo de validacao nao aparece na interface em portugues.
- O fluxo em portugues exibe `PLANEJADO.xlsx` e `REALIZADO.txt` nos cartões de entrada.
- Os uploads em portugues exibem `PLANEJADO.xlsx`, `REALIZADO.txt`, `Plano de perfuração` e `Coordenadas de topografia`.
- O status inicial em portugues exibe `Anexe o planejado para começar.`.
- Quando apenas o arquivo executado estiver carregado, o status deve indicar que o usuario pode organizar somente o executado.
- O bloco principal em portugues usa `Arquivos de entrada`; o log tecnico fica em um detalhe expansivel.
- O resumo fica oculto enquanto não há saída válida e aparece após a geração; em caso de erro, permanece disponível para o diagnóstico.
- A seção `Outras saídas` inicia recolhida e reúne os fluxos MVV-only e RD-only.
- Os links de download permanecem ocultos ate que um workbook valido seja gerado.
- O quadro O-PitDev inicia recolhido e pode ser expandido pelo usuario sem alterar o fluxo MVV/RD.
- Os quatro seletores de arquivo e as ações de processamento permanecem focaveis por teclado, com nome e formato associados para tecnologia assistiva.
- Os estados de processamento sao anunciados com `role`, `aria-live` e `aria-busy`; erros usam alerta explicito.
- Parametros invalidos de furos auxiliares exibem mensagem no formulario e preservam os arquivos selecionados.
- Os prefixos de levantamento `L-` e `L_` têm prioridade sobre `E-` na RD.
- Se houver levantamento e executado para o mesmo furo, o registro `L` é mantido na base tratada.
- Se nao houver RD para um furo, os campos finais usam MVV.
- O workbook final e gerado como download.
- A interface tambem permite anexar somente o arquivo planejado e gerar um plano planejado organizado, sem exigir realizado.
- A interface tambem permite anexar somente o arquivo executado e gerar um workbook com `ID`, `Y`, `X`, `Z` e `Profundidade`.
- A planilha `.xlsx` deve ser identificada pelo contrato de abas e cabeçalhos antes da organização; a extensão do arquivo, sozinha, nao determina que ele seja um `PLANEJADO.xlsx` MVV.
- Perfis legados reconhecidos em `config.json`, como `REG43`, devem ser bloqueados quando nao contiverem o conjunto completo de colunas do plano. A mensagem deve informar o perfil, as colunas ausentes e que nenhum XLSX foi gerado.
- Nenhum campo ausente de um perfil incompatível pode ser preenchido por cálculo, outra aba ou valor padrão sem um mapeamento de fonte documentado.

## Entradas

### MVV

- Arquivo Excel `.xlsx`.
- Aba configurada em `config.json`.
- Colunas obrigatorias na ordem de extracao:
  - `ID`
  - `Type`
  - `Descricao`
  - `Diameter`
  - `X Collar`
  - `Y Collar`
  - `X Toe`
  - `Y Toe`
  - `Z Toe`
  - `Z Collar`
  - `Depth`
  - `Sub Drill`
  - `Azimuth`
  - `Dip`

### Plano MVV organizado

- Entrada: somente o arquivo planejado `.xlsx`.
- Saida: workbook `MVV_PLANO_PERFURACAO_ORGANIZADO.xlsx`.
- Aba: `PLANO_MVV`.
- A ordem e as linhas seguem a MVV.
- Somente `ID` e obrigatorio por linha; demais colunas podem sair em branco quando estiverem vazias na MVV.
- Campos numericos preenchidos devem ser numericos.
- Todas as colunas fora da lista abaixo sao removidas:
  - `ID`
  - `Type`
  - `Explosivo`
  - `Diameter`
  - `X Collar`
  - `Y Collar`
  - `Z Collar`
  - `Depth`
  - `Sub Drill`
  - `Azimuth`
  - `Dip`
  - `Tampao`
  - `Carga`

### RD

- Arquivo texto `.txt`.
- Estrutura por linha:
  - `ID do furo`
  - campo vazio
  - `Y`
  - `X`
  - `Z`

### RD-only

- Entrada: somente o arquivo executado `.txt`.
- O usuario escolhe o formato de exportação `Com profundidade` ou `Sem profundidade (somente colunas)`.
- No modo com profundidade, informa a cota do pé em metros e, quando houver, a subfuração; a profundidade é calculada para cada registro.
- No modo sem profundidade, nenhum parâmetro de cota é solicitado e a saída contém somente `ID`, `Y`, `X` e `Z`.
- Saida: workbook `RD_EXECUTADO_ORGANIZADO.xlsx`.
- Aba: `RD_EXECUTADO`.
- `ID` no RD-only usa somente o numero do furo, sem letras nem tracos.

## Regras de processamento

- O identificador de comparacao e o numero do furo sem prefixo.
- `L_157`, `L-157` e `E-157` mapeiam para `157`.
- `E-` so e usado quando nao houver `L-` nem `L_` para o mesmo furo.
- Em duplicidade com o mesmo prefixo, o primeiro registro valido e mantido.
- A ordem final segue a MVV.
- `PROFUNDIDADE_FINAL` usa `Z_RD - Z Toe` quando RD existir.
- Sem RD, `PROFUNDIDADE_FINAL` usa `Depth` da MVV.
- `PROFUNDIDADE_FINAL` e formatada com 2 casas decimais no workbook final.
- A saída mantém todas as linhas MVV na ordem de origem e, depois delas, acrescenta os furos únicos levantados (`L-` ou `L_`) ou executados (`E-`) cujo identificador normalizado não existe na MVV, em ordem numérica de furo.
- Nas linhas sem referência planejada, `ID` recebe o número de `ID_RD` sem prefixo nem traço, `Descricao` recebe `Added`, e `X Collar`, `Y Collar` e `Z Collar` espelham `X_RD`, `Y_RD` e `Z_RD` do registro selecionado.
- Nas linhas sem referência planejada, `ID_RD`, `TIPO_RD`, `Y_RD`, `X_RD` e `Z_RD` preservam a fonte RD. Como RD não contém profundidade, a interface solicita cota do pé e subfuração, sugere a moda de `Z Toe` do plano e permite editar. A fórmula `Z_RD - cota do pé + subfuração` preenche `Z Toe`, `Sub Drill`, `Depth`, `Profundidade` e `PROFUNDIDADE_FINAL`. Campos sem origem nem regra de cálculo, como `X Toe`, `Y Toe`, `Type`, `Diameter`, `Azimuth` e `Dip`, ficam vazios.
- Um registro RD com referência MVV permanece somente na linha planejada correspondente; nenhum registro duplicado é acrescentado. Se houver `L-` ou `L_` e `E-` para o mesmo número, o registro `L` é selecionado; nenhum segundo registro é acrescentado para o `E-`.
- O resumo e o log registram a quantidade e os IDs RD sem referência planejada que foram acrescentados.
- No fluxo RD-only, `Profundidade` e calculada por `Z (cota de topo) - cota do pé + subfuração` para cada linha.
- No fluxo RD-only sem profundidade, a organização mantém somente `ID`, `Y`, `X` e `Z`, sem calcular ou exportar `Profundidade`.
- No fluxo RD-only, `ID` usa o numero do furo sem prefixo e sem caracteres nao numericos.
- Para números de furo duplicados, `L-` ou `L_` (levantado) tem prioridade; `E-` (executado) só permanece quando não existe um registro `L` para o mesmo número.

## Validacao

- MVV deve conter todas as colunas requeridas.
- Para o plano MVV organizado, a MVV deve conter todas as colunas da saida `PLANO_MVV`.
- Antes da validação das linhas, `validator.js` deve comparar o conjunto de abas e cabeçalhos com os perfis incompatíveis configurados. O perfil `REG43` é identificado pelas abas `PROJETO PERFURAÇÃO`, `LEV R&D`, `MEDIÇÃO` e pelos cabeçalhos `ID`, `Diametro`, `X Toe`, `Y Toe`, `Z Toe`.
- Um perfil incompatível interrompe o fluxo antes de `processor.js` e `writer.js`; o link de download permanece oculto.
- MVV deve ter as colunas numericas validas para o calculo.
- Em `Dip`, valores vazios ou exatamente `-` sao aceitos e normalizados para `0`; outros textos nao numericos continuam invalidos.
- RD deve ter exatamente 5 campos.
- O segundo campo da RD deve estar vazio.
- IDs da RD devem iniciar com `L-`, `L_` ou `E-`.
- Coordenadas da RD devem ser numericas.
- Arquivos invalidos bloqueiam o processamento.
- A profundidade informada para o fluxo RD-only deve ser numerica e maior que zero.
- A cota do pe dos auxiliares deve ser maior que zero e a subfuracao deve ser igual ou maior que zero; valores invalidos nao podem falhar silenciosamente.

## Regra de furos auxiliares

IDs do levantamento ausentes no plano são furos auxiliares. A interface solicita a cota do pé e a subfuração; a profundidade auxiliar é `Z do levantamento - cota do pé + subfuração`. Esses parâmetros valem somente para auxiliares; furos presentes no plano mantêm a profundidade planejada.

## Saidas

- Aba `CONSOLIDADO_FINAL`.
- Aba `RD_TRATADA`.
- Aba `LOG_VALIDACAO`.
- Fluxo RD-only: uma unica aba `RD_EXECUTADO`, com `ID`, `Y`, `X`, `Z` e opcionalmente `Profundidade` conforme o formato escolhido, sem log adicional.

## Consolidação de Projeto para O-PitDev

- O novo quadro funciona separadamente dos fluxos MVV/RD e processa tudo localmente no navegador.
- O `Levantamento de Campo Enaex` aceita `.csv` ou `.txt` delimitado por vírgula, com as colunas posicionais `ID`, `Y`, `X`, `Z` e, opcionalmente, uma quinta coluna vazia após a última vírgula.
- O `Plano de Perfuração Planejado` aceita `.xlsx`, usa a aba configurada em `config.json` e localiza `ID`, `Diameter`/`Diâmetro`, `Azimuth`/`Azimute`, `Angulo`/`Ângulo`/`Dip`, `Depth`/`Profundidade` e `Z Toe` por aliases configurados.
- No O-PitDev, o `Ângulo planejado` vazio ou `-` e tratado como `0`, entao `Ângulo do talude` fica `90 - 0`.
- O vínculo é feito pelo `ID` normalizado. IDs duplicados, campos ausentes ou valores não numéricos interrompem a consolidação com erro explícito.
- A coluna `Z Toe` é obrigatória no plano combinado e todos os seus valores de linhas válidas devem ser numéricos.
- A ordem da tabela exportada segue a ordem do levantamento de campo. Somente IDs presentes nos dois arquivos entram na tabela; diferenças ficam documentadas no log do workbook e na interface.
- A saída tem as colunas `ID`, `Y`, `X`, `Z`, `Diâmetro`, `Azimute`, `Ângulo planejado`, `Ângulo do talude` e `Profundidade`.
- `Ângulo do talude = 90 - Ângulo planejado`, usando o valor configurado `pitdev.angle_reference_degrees`.
- O arquivo gerado é `CONSOLIDACAO_PROJETO_O-PITDEV.xlsx`, com as abas `CONSOLIDACAO_O-PITDEV` e `LOG_O-PITDEV`.

### Sugestão automática da cota do pé no O-PitDev

- Quando houver IDs do levantamento ausentes no plano, a interface calcula a sugestão da cota do pé a partir da coluna `Z Toe` do plano.
- A sugestão é a moda: o valor numérico que mais se repete entre as linhas válidas do documento.
- Em caso de empate, permanece o primeiro valor válido encontrado na ordem original do documento, garantindo comportamento determinístico.
- O campo de cota do pé é aberto já preenchido com essa sugestão; o usuário pode editar o valor e a subfuração antes de consolidar.
- A sugestão, a coluna de origem, a frequência e a quantidade de valores válidos ficam registradas no log técnico e no `LOG_O-PITDEV`.

### Organização somente do levantamento para O-PitDev

- A ação `Organizar somente o levantado` exige apenas o arquivo de campo `.csv` ou `.txt`.
- O plano planejado não é lido, validado nem solicitado nesse modo.
- A validação continua exigindo `ID`, `Y`, `X` e `Z` numéricos nas posições configuradas, aceitando uma quinta posição somente quando vazia.
- A saída preserva a ordem do levantamento e normaliza IDs numéricos conforme `normalizeIdValue` (por exemplo, `097` torna-se `97`); IDs textuais são preservados.
- A saída possui `ID`, `Y`, `X` e `Z` na aba `LEVANTAMENTO_O-PITDEV` e o log de origem na aba `LOG_LEVANTAMENTO_O-PITDEV`.
- O arquivo gerado é `LEVANTAMENTO_O-PITDEV_ORGANIZADO.xlsx`.

## Juntar projetos de desmonte em CSV

- O fluxo funciona separado dos fluxos MVV/RD e O-PitDev e processa os arquivos somente no navegador.
- O usuário pode importar dois ou mais arquivos `.csv`, sem limite definido pelo aplicativo. Novos arquivos entram no fim da lista; botões acessíveis de mover para cima ou para baixo definem explicitamente a ordem `Plano 1`, `Plano 2` e seguintes. Cada arquivo pode ser removido antes da geração.
- Todos os arquivos devem ter o mesmo cabeçalho, na mesma ordem, e exatamente uma coluna configurada como `Number`. Cada registro não vazio precisa ter a mesma quantidade de campos do cabeçalho.
- O parser aceita campos entre aspas, aspas escapadas e quebras de linha dentro de campos. Linhas completamente vazias são ignoradas.
- `Plano 1` mantém os valores de `Number` como recebidos. O plano na posição `n` recebe o acréscimo `(n - 1) × plan_merge.increment`, que por padrão é `10.000`.
- `Number` deve ser um inteiro seguro. Depois dos acréscimos, os valores de `Number` precisam continuar seguros e únicos; cabeçalhos incompatíveis, linhas malformadas, IDs inválidos ou colisões interrompem a geração com erro explícito.
- A saída preserva o cabeçalho, a ordem das colunas e das linhas, e os valores textuais das demais colunas. O único valor de célula alterado é `Number`. Um único cabeçalho é escrito, seguido pelas linhas de cada plano na ordem selecionada.
- O CSV exportado usa as opções configuradas de separador, aspas, quebra de linha e BOM. O link de download só aparece após a validação e geração bem-sucedidas.
- Nome de saída: `output.plan_merge_file_name` em `config.json`.
