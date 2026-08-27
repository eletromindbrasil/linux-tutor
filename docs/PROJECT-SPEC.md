# Linux Tutor — Especificação Canônica do Projeto

> Status: ativo
>
> Última atualização: 2026-08-02
>
> Repositório: `https://github.com/eletromindbrasil/linux-tutor`
>
> Raiz local: diretório em que o repositório foi clonado
>
> Runtime local: `http://127.0.0.1:4173`

## 1. Função deste documento

Este arquivo é a fonte de continuidade do Linux Tutor. Ele deve permitir que uma nova thread,
ou uma thread cujo contexto tenha sido compactado, entenda rapidamente:

- o que o produto pretende ser;
- as decisões já aprovadas pelo usuário;
- o que está implementado e validado;
- o que ainda deve ser construído;
- a ordem sugerida de evolução;
- o mapa completo de tópicos didáticos;
- onde procurar a implementação real.

Este documento **não deve conter o conteúdo completo das aulas**. Explicações, exemplos,
exercícios, dicas e soluções pertencem ao arquivo individual de cada lição. A spec mantém
somente identificador, título, escopo, nível, dependências e status.

### Regra de atualização

Toda thread que implementar, remover ou alterar materialmente uma funcionalidade ou lição deve,
na mesma entrega:

1. atualizar o status correspondente nesta spec;
2. registrar decisões novas na seção de decisões;
3. atualizar limitações conhecidas quando aplicável;
4. executar as validações proporcionais à mudança;
5. não marcar uma lição como implementada antes de ambiente, reset e verificadores funcionarem.

## 2. Visão do produto

O Linux Tutor é uma aplicação web pessoal com autenticação para ensinar Linux, terminal e
ferramentas de linha de comando a desenvolvedores iniciantes, evoluindo até tópicos avançados.

O aprendizado acontece por prática:

1. o sistema apresenta uma explicação curta;
2. mostra exemplos de comandos;
3. propõe uma tarefa objetiva;
4. disponibiliza um terminal Linux real e isolado;
5. verifica o estado produzido e, quando necessário, o histórico de comandos;
6. fornece feedback por critério;
7. registra a conclusão e libera a continuação.

### Objetivos

- Ensinar por execução real, não por simulação de comandos.
- Permitir experimentação segura e reinicialização previsível.
- Aceitar soluções equivalentes quando o resultado final estiver correto.
- Explicar falhas com mensagens específicas e úteis.
- Manter o material modular para criação e revisão lição por lição.
- Cobrir desde orientação básica no terminal até administração e diagnóstico avançados.

### Fora do escopo atual

- Cadastro público, recuperação de senha por e-mail ou sincronização em nuvem.
- Publicação direta do container sem proxy HTTPS e controles de perímetro.
- Certificação formal ou emissão de certificados.
- Ambiente multiusuário compartilhado.
- Conteúdo completo das aulas dentro desta spec.

## 3. Decisões aprovadas

| ID | Decisão | Estado |
|---|---|---|
| DEC-001 | O projeto é totalmente independente do CortexPro. | vigente |
| DEC-002 | A experiência principal é uma aplicação web local. | vigente |
| DEC-003 | Não há autenticação; o uso é pessoal e local. | superada por DEC-013 |
| DEC-004 | O terminal deve executar Linux real em contêiner descartável. | vigente |
| DEC-005 | A correção prioriza estado final; histórico só é exigido quando o comando faz parte do objetivo. | vigente |
| DEC-006 | As lições devem ser independentes, reiniciáveis e reproduzíveis. | vigente |
| DEC-007 | O progresso básico pode permanecer no navegador durante o protótipo. | vigente |
| DEC-008 | A navegação desktop usa sidebar mini e expande por hover. | vigente |
| DEC-009 | A área de leitura possui tipografia confortável e scroll independente do terminal. | vigente |
| DEC-010 | O conteúdo didático de cada lição será produzido individualmente e fora desta spec. | vigente |
| DEC-011 | Tarefas que exigirem kernel, boot, discos reais ou privilégios amplos deverão usar VM ou laboratório específico, não o contêiner padrão. | vigente |
| DEC-012 | A primeira versão do contrato de conteúdo usa um `lesson.json` validado por lição; formatos adicionais só devem ser adotados com migração compatível. | vigente |
| DEC-013 | O acesso usa conta persistida, sessão HttpOnly e troca obrigatória da senha temporária no primeiro login. | vigente |
| DEC-014 | A senha oficial exige no mínimo 10 caracteres e é armazenada somente como hash `scrypt`. | vigente |
| DEC-015 | O PostgreSQL da aplicação não publica portas e usa rede interna e volume exclusivos do projeto Compose. | vigente |

## 4. Estado atual da implementação

### 4.1 Funcionalidades implantadas

| ID | Funcionalidade | Status | Evidência principal |
|---|---|---|---|
| SYS-001 | Aplicação React/Vite servida localmente | done | build Docker e health check |
| SYS-002 | Backend Node/Express com autenticação | done | login, sessão, logout e troca de senha |
| SYS-003 | Terminal web com xterm.js e WebSocket | done | smoke test das 40 lições |
| SYS-004 | Terminal conectado a Debian real | done | comandos executados no sandbox |
| SYS-005 | Contêiner descartável por sessão de lição | done | criação e remoção pela API |
| SYS-006 | Sandbox sem rede e com limites de CPU, memória, processos e capabilities | done | configuração Dockerode |
| SYS-007 | Reinício completo do ambiente | done | ação `Reiniciar` |
| SYS-008 | Verificação por estado do filesystem | done | lição de arquivos |
| SYS-009 | Verificação por histórico de comandos | done | lições de navegação e arquivos |
| SYS-010 | Feedback individual por critério | done | painel de verificação |
| SYS-011 | Dicas progressivas | done | ação `Pedir dica` |
| SYS-012 | Progresso persistido por usuário no PostgreSQL | done | conclusão sobrevive a navegador e reinício |
| SYS-013 | Avanço para próxima lição | done | fluxo verificado |
| SYS-014 | Proteção contra resize atrasado durante troca de lição | done | teste `lesson-transition` |
| SYS-015 | Sidebar mini com expansão por hover | done | layout desktop atual |
| SYS-016 | Estado visual de lições concluídas e pendentes | done | números verdes/cinzas |
| SYS-017 | Área de leitura e terminal com scroll independente | done | layout desktop atual |
| SYS-018 | Layout responsivo com menu completo no mobile | done | media queries atuais |
| SYS-019 | Inicialização e encerramento por scripts | done | `iniciar.sh` e `parar.sh` |
| SYS-020 | Health check do serviço no Compose | done | serviço `app` saudável |
| SYS-021 | Smoke test end-to-end | done | `npm run smoke` |
| SYS-022 | Auditoria de dependências sem vulnerabilidades conhecidas | done | `npm audit --omit=dev` |
| SYS-023 | Catálogo carregado de arquivos individuais | done | `content/lessons/<id>/lesson.json` |
| SYS-024 | Schema v1 e validador de catálogo | done | `npm run lessons:validate` |
| SYS-025 | Solução de referência testada para cada lição | done | smoke percorre o catálogo completo |
| SYS-026 | Troca obrigatória de senha no primeiro login | done | APIs protegidas retornam 403 até a troca |
| SYS-027 | Banco isolado em rede interna e volume dedicado | done | serviço sem porta publicada |
| SYS-028 | Autorização de sessões HTTP e WebSocket por usuário | done | cookie HttpOnly e ownership de sandbox |
| SYS-029 | Reconexão automática do terminal | done | três tentativas antes de orientar reinício |
| SYS-030 | Deploy automático em produção | done | GitHub Actions, Portainer, Traefik e smoke pós-deploy |

### 4.2 Lições implantadas

`done-prototype` significa que a lição funciona ponta a ponta, mas seu conteúdo ainda pode passar
por revisão didática antes de ser considerado definitivo.

| ID curricular | ID técnico atual | Título | Status |
|---|---|---|---|
| M01-L01 | `primeiros-passos` | Onde estou? — `pwd`, `ls` e `cd` | done-prototype |
| M01-L02 | `caminhos-linux` | Encontre o caminho — relativos, absolutos, `..` e `~` | done-prototype |
| M01-L03 | `listagens-detalhadas` | Veja além dos nomes — `ls -a`, `-l` e `-h` | done-prototype |
| M01-L04 | `ajuda-no-terminal` | Pergunte ao próprio Linux — `type`, `--help`, `man` e `apropos` | done-prototype |
| M02-L01 | `arquivos-e-pastas` | Crie seu espaço de prática — `mkdir`, `touch`, `echo`, `>` e `cat` | done-prototype |
| M02-L02 | `copiar-mover-renomear` | Copie, mova e renomeie — `cp` e `mv` | done-prototype |
| M02-L03 | `remocao-segura` | Remova somente o necessário — `rm`, `rmdir` e `rm -r` | done-prototype |
| M02-L04 | `links-linux` | Crie links simbólicos e físicos — `ln`, `readlink` e inodes | done-prototype |
| M02-L05 | `estrutura-linux` | Explore os diretórios essenciais — FHS básico | done-prototype |
| M03-L01 | `ler-arquivos` | Leia arquivos do começo ao fim — `cat`, `less`, `head` e `tail` | done-prototype |
| M03-L02 | `editar-com-nano` | Edite um texto com Nano | done-prototype |
| M03-L03 | `fundamentos-vim` | Entenda os modos do Vim | done-prototype |
| M03-L04 | `tipos-encoding` | Reconheça tipo, encoding e fim de linha | done-prototype |
| M03-L05 | `comparar-arquivos` | Encontre diferenças com `diff` e `cmp` | done-prototype |
| M04-L01 | `fluxos-padrao` | Conheça stdin, stdout e stderr | done-prototype |
| M04-L02 | `redirecionamentos` | Redirecione com `>`, `>>`, `<` e `2>` | done-prototype |
| M04-L03 | `pipes` | Monte pipelines pequenos | done-prototype |
| M04-L04 | `tee-dev-null` | Mostre, grave e descarte saídas | done-prototype |
| M04-L05 | `codigos-de-saida` | Decida com `$?`, `&&`, `||` e `;` | done-prototype |
| M05-L01 | `localizar-com-find` | Localize arquivos com `find` | done-prototype |
| M05-L02 | `localizar-com-locate` | Pesquise rapidamente com `locate` | done-prototype |
| M05-L03 | `buscar-com-grep` | Encontre texto com `grep` | done-prototype |
| M05-L04 | `regex-basica` | Expresse padrões com regex | done-prototype |
| M05-L05 | `contar-ordenar-unicos` | Conte, ordene e elimine duplicados | done-prototype |
| M06-L01 | `identidade-usuario` | Descubra usuário, UID e grupos | done-prototype |
| M06-L02 | `permissoes-rwx` | Leia permissões de arquivos e diretórios | done-prototype |
| M06-L03 | `alterar-permissoes` | Altere permissões com `chmod` | done-prototype |
| M06-L04 | `dono-e-grupo` | Ajuste dono e grupo com segurança | done-prototype |
| M06-L05 | `umask-padroes` | Defina padrões seguros com `umask` | done-prototype |
| M06-L06 | `sudo-menor-privilegio` | Use sudo somente quando necessário | done-prototype |
| M07-L01 | `variaveis-ambiente` | Expanda variáveis com segurança | done-prototype |
| M07-L02 | `aspas-globbing` | Controle aspas, escaping e globbing | done-prototype |
| M07-L03 | `path-executaveis` | Entenda a prioridade do PATH | done-prototype |
| M07-L04 | `aliases-funcoes` | Crie aliases e funções simples | done-prototype |
| M07-L05 | `historico-produtividade` | Reutilize o histórico do shell | done-prototype |
| M08-L01 | `processos-pids` | Encontre processos e PIDs | done-prototype |
| M08-L02 | `monitoramento-top` | Observe o sistema com top | done-prototype |
| M08-L03 | `jobs-foreground-background` | Alterne entre foreground e background | done-prototype |
| M08-L04 | `sinais-processos` | Envie sinais a processos | done-prototype |
| M08-L05 | `nohup-sessoes` | Proteja uma tarefa com nohup | done-prototype |

### 4.3 Estrutura atual relevante

```text
LinuxTutor/
├── compose.yaml                  # Orquestra app e imagem do sandbox
├── Dockerfile                    # Build/runtime da aplicação
├── Dockerfile.sandbox            # Debian usado nas lições
├── iniciar.sh / parar.sh         # Operação local simples
├── content/
│   ├── README.md                 # Regras de autoria e validação
│   └── lessons/<id>/lesson.json  # Conteúdo, setup, checks e solução de referência
├── server/
│   ├── index.ts                  # API, sessões Docker e WebSocket
│   ├── lessonRepository.ts       # Leitura e validação do schema v1
│   ├── validateLessons.ts        # Validador executável do catálogo
│   └── smoke.ts                  # Teste de todas as lições e regressões
├── shared/
│   └── lessons.ts                # Contratos TypeScript do schema
├── src/
│   ├── App.tsx                   # Fluxo principal e progresso
│   ├── components/TerminalPanel.tsx
│   └── styles.css
└── docs/
    └── PROJECT-SPEC.md           # Esta fonte de continuidade
```

### 4.4 Limitações conhecidas

- O formato v1 concentra conteúdo, setup, checks e solução em `lesson.json`; a separação em Markdown/scripts pode ser avaliada quando o contrato estabilizar.
- Reiniciar o backend encerra sessões em andamento.
- Não existe retomada do estado de um contêiner após fechar o navegador.
- O histórico é um arquivo Bash simples, não um registro estruturado com timestamp, cwd e exit code.
- Os tipos de verificadores ainda são comandos shell definidos diretamente em cada lição.
- Existe validador de schema, mas ainda não existe uma interface ou gerador assistido de autoria.
- Não existem bloqueios por pré-requisito ou teste de nivelamento.
- O app monta o socket do Docker; a publicação deve permanecer em loopback atrás de proxy HTTPS.
- Não há recuperação de senha por e-mail; uma redefinição administrativa ainda exige acesso ao banco.
- O contêiner padrão não serve para tarefas reais de boot, kernel, systemd, discos ou root amplo.
- A qualidade pedagógica final das 40 aulas ainda não foi formalmente revisada.

## 5. Arquitetura alvo

```text
Navegador local
├── catálogo, leitura e progresso
├── terminal xterm.js
└── verificação, dicas e feedback
             │ HTTP/WebSocket
             ▼
Servidor local
├── catálogo e carregador de lições
├── gerenciador de sessões
├── adaptador de terminal
├── biblioteca de verificadores
├── motor de progresso
└── limpeza e observabilidade
             │ Docker API
             ▼
Ambiente da lição
├── imagem/versionamento próprios
├── setup idempotente
├── shell do usuário `aluno`
├── filesystem descartável
└── verificações somente leitura
```

### 5.1 Separação atual das lições

O schema v1 implantado usa:

```text
content/
├── README.md
└── lessons/
    └── <lesson-id>/
        └── lesson.json            # Metadados, conteúdo, setup, checks e smoke
```

O backend relê e valida o catálogo em tempo de execução. O volume `content` é montado como somente
leitura, portanto mudanças de conteúdo não exigem recompilar o frontend. Uma evolução futura pode
extrair textos para Markdown, setup para scripts e fixtures para arquivos próprios, desde que
preserve IDs, schema versionado e compatibilidade do progresso.

### 5.2 Contrato mínimo de uma lição

Cada lição deverá possuir, fora desta spec:

- ID estável e único.
- Módulo, nível, ordem e pré-requisitos.
- Título e objetivo observável.
- Tempo estimado.
- Imagem/ambiente e diretório inicial.
- Setup reproduzível e seguro.
- Explicação e exemplos.
- Tarefa com critérios objetivos.
- Dicas progressivas.
- Verificadores sem efeito colateral.
- Mensagens específicas para cada falha.
- Solução de referência usada apenas por testes ou ação explícita do usuário.
- Teste automatizado de sucesso e, quando relevante, de falhas comuns.

### 5.3 Princípios dos verificadores

1. Verificar resultado final sempre que possível.
2. Não exigir uma sequência exata quando comandos diferentes produzem resultado válido.
3. Verificar histórico quando o objetivo é praticar um comando específico.
4. Nunca corrigir ou alterar silenciosamente a solução do aluno.
5. Produzir mensagens que indiquem o objeto incorreto, como nome, caminho, permissão ou conteúdo.
6. Executar com timeout e sem acesso desnecessário ao host.
7. Ser repetível: verificar duas vezes deve produzir o mesmo resultado.

## 6. Backlog funcional do motor

| ID | Item | Prioridade | Status | Critério resumido de conclusão |
|---|---|---|---|---|
| ENG-001 | Extrair lições para arquivos individuais | P0 | done | conteúdo carregado sem recompilar o app |
| ENG-002 | Schema e validação de metadados | P0 | done | erro claro para definição inválida |
| ENG-003 | Biblioteca declarativa de checks | P0 | partial | arquivos, conteúdo, modo, owner, processo, saída e histórico |
| ENG-004 | Test runner de lições | P0 | done | setup e solução de referência testados em CI/local |
| ENG-005 | Registro estruturado de comandos | P1 | planned | comando, cwd, horário, exit code e duração |
| ENG-006 | Persistência PostgreSQL | P1 | done | progresso independe do perfil do navegador |
| ENG-007 | Pré-requisitos e desbloqueio | P1 | planned | trilha respeita dependências configuradas |
| ENG-008 | Retomar última lição | P1 | partial | abre a primeira lição incompleta; ainda não restaura sessão |
| ENG-009 | Catálogo, busca e filtros | P1 | planned | localizar por módulo, nível ou comando |
| ENG-010 | Modo livre/sandbox sem tarefa | P1 | planned | terminal seguro fora da trilha |
| ENG-011 | Solução explícita com confirmação | P1 | planned | consulta registrada sem concluir automaticamente |
| ENG-012 | Dicas condicionais por falha | P1 | planned | dica usa o resultado dos checks |
| ENG-013 | Revisão de tentativas anteriores | P2 | planned | histórico de verificações e erros |
| ENG-014 | Estatísticas locais | P2 | planned | tempo, tentativas e tópicos concluídos |
| ENG-015 | Importar/exportar progresso | P2 | planned | backup local legível e versionado |
| ENG-016 | Múltiplas imagens de laboratório | P1 | planned | Debian/Ubuntu e ambientes especializados |
| ENG-017 | Backend de VM para tópicos privilegiados | P2 | planned | exercícios de boot/kernel/disco isolados do host |
| ENG-018 | Limpeza robusta após encerramento abrupto | P0 | partial | nenhum sandbox órfão após crash/restart |
| ENG-019 | Recuperação visual de terminal desconectado | P0 | done | reconecta até três vezes e oferece reset do ambiente |
| ENG-020 | Acessibilidade e navegação por teclado | P1 | planned | fluxo principal utilizável sem mouse |
| ENG-021 | Testes visuais desktop/mobile | P1 | planned | snapshots das telas e estados principais |
| ENG-022 | Empacotamento/atalho desktop opcional | P2 | planned | iniciar sem usar comandos manualmente |
| ENG-023 | Versionamento e migração de lições | P1 | planned | progresso preservado após mudança de conteúdo |
| ENG-024 | Validador de segurança de setup/checks | P0 | planned | rejeitar padrões perigosos antes da execução |

## 7. Roadmap de implementação

### Fase 0 — Protótipo funcional

Status: **concluída**.

- Aplicação local.
- Terminal Docker real.
- Duas lições.
- Verificação, dicas, reset e progresso básico.
- Layout desktop/mobile.
- Smoke test e health check.

### Fase 1 — Fundação do motor de conteúdo

Status: **em andamento**.

- ENG-001, ENG-002 e ENG-004 concluídos.
- Quarenta lições usam arquivos individuais com schema v1.
- Catálogo e soluções de referência são validados por comandos próprios.
- Regras de autoria estão documentadas em `content/README.md`.
- ENG-003 permanece parcial: checks ainda são comandos shell, não tipos declarativos.

### Fase 2 — Progresso e experiência de aprendizagem

- Implementar ENG-006 a ENG-012.
- Melhorar retomada, desbloqueio, feedback e solução explícita.
- Adicionar estados vazios, carregamento, falha e recuperação.
- Concluir revisão de acessibilidade.

### Fase 3 — Expansão dos verificadores

- Filesystem, texto, permissões, usuários e processos.
- Rede, portas, pacotes e serviços.
- Scripts com testes de entrada/saída.
- Timeouts, diagnósticos e mensagens de erro específicas.

### Fase 4 — Produção progressiva do currículo

- Produzir uma lição por vez seguindo a ordem curricular.
- Testar cada setup, solução e erro comum.
- Atualizar a tabela de status desta spec após cada entrega.
- Revisar dependências ao concluir cada módulo.

### Fase 5 — Laboratórios avançados

- Imagens especializadas com ferramentas necessárias.
- VM descartável para systemd, boot, kernel e storage real.
- Cenários de troubleshooting e incidentes reproduzíveis.
- Snapshot/reset seguro e limites de recursos.

### Fase 6 — Qualidade e distribuição pessoal

- Testes visuais e de acessibilidade.
- Backup/exportação de progresso.
- Atualização segura de imagens e conteúdo.
- Atalho desktop ou pacote instalável opcional.

## 8. Mapa curricular completo

### Convenções

- `done-prototype`: funciona ponta a ponta, ainda sujeito a revisão didática.
- `planned`: tópico previsto, sem conteúdo/ambiente completo.
- `vm-required`: planejado, mas exige backend de VM ou laboratório privilegiado.
- Os IDs devem permanecer estáveis depois que uma lição for publicada.

### Nível iniciante

| ID | Tópico da lição | Status |
|---|---|---|
| M00-L01 | Como o terminal, shell, prompt e comandos se relacionam | planned |
| M00-L02 | Anatomia de um comando: opções, argumentos e ajuda | planned |
| M00-L03 | Segurança no laboratório, reset e leitura de erros | planned |
| M01-L01 | Orientação e navegação com `pwd`, `ls` e `cd` | done-prototype |
| M01-L02 | Caminhos absolutos, relativos, `.`, `..` e `~` | done-prototype |
| M01-L03 | Listagens detalhadas, ocultos e opções comuns de `ls` | done-prototype |
| M01-L04 | Ajuda com `man`, `--help`, `apropos` e `type` | done-prototype |
| M02-L01 | Criar diretórios e arquivos; primeira escrita e leitura | done-prototype |
| M02-L02 | Copiar, mover e renomear com `cp` e `mv` | done-prototype |
| M02-L03 | Remover com segurança usando `rm` e `rmdir` | done-prototype |
| M02-L04 | Links simbólicos e hard links com `ln` | done-prototype |
| M02-L05 | Estrutura de diretórios Linux e FHS essencial | done-prototype |
| M03-L01 | Ler arquivos com `cat`, `less`, `head` e `tail` | done-prototype |
| M03-L02 | Criar e editar texto com `nano` | done-prototype |
| M03-L03 | Fundamentos de Vim: modos, edição, salvar e sair | done-prototype |
| M03-L04 | Tipos de arquivo, `file`, encoding e finais de linha | done-prototype |
| M03-L05 | Comparar arquivos com `diff` e `cmp` | done-prototype |
| M04-L01 | Saída padrão, erro padrão e entrada padrão | done-prototype |
| M04-L02 | Redirecionamento com `>`, `>>`, `<` e `2>` | done-prototype |
| M04-L03 | Pipes e composição de comandos | done-prototype |
| M04-L04 | `tee`, `/dev/null` e captura simultânea de saída | done-prototype |
| M04-L05 | Códigos de saída e encadeamento com `&&`, `||` e `;` | done-prototype |
| M05-L01 | Localizar arquivos com `find` | done-prototype |
| M05-L02 | Localização rápida com `locate` e bancos de índice | done-prototype |
| M05-L03 | Buscar texto com `grep` | done-prototype |
| M05-L04 | Expressões regulares básicas para busca | done-prototype |
| M05-L05 | Contar, ordenar e eliminar duplicados com `wc`, `sort` e `uniq` | done-prototype |
| M06-L01 | Usuário, grupo e identidade com `whoami`, `id` e `groups` | done-prototype |
| M06-L02 | Permissões de leitura, escrita e execução | done-prototype |
| M06-L03 | Alterar permissões com `chmod` simbólico e octal | done-prototype |
| M06-L04 | Dono e grupo com `chown` e `chgrp` | done-prototype |
| M06-L05 | `umask` e permissões padrão | done-prototype |
| M06-L06 | Princípios de `sudo` e menor privilégio | done-prototype |
| M07-L01 | Variáveis de ambiente e expansão com `$` | done-prototype |
| M07-L02 | Aspas simples, duplas, escaping e globbing | done-prototype |
| M07-L03 | `PATH`, localização e prioridade de executáveis | done-prototype |
| M07-L04 | Aliases, funções simples e configuração do shell | done-prototype |
| M07-L05 | Histórico, busca reversa e produtividade no prompt | done-prototype |
| M08-L01 | Processos e PIDs com `ps` e `pgrep` | done-prototype |
| M08-L02 | Monitoramento interativo com `top` e alternativas | done-prototype |
| M08-L03 | Foreground, background, `jobs`, `fg` e `bg` | done-prototype |
| M08-L04 | Sinais, `kill`, `pkill` e encerramento responsável | done-prototype |
| M08-L05 | Processos persistentes com `nohup` e noções de sessão | done-prototype |

### Nível intermediário

| ID | Tópico da lição | Status |
|---|---|---|
| M09-L01 | Compactação e arquivos com `tar`, `gzip`, `bzip2` e `xz` | planned |
| M09-L02 | ZIP, extração segura e inspeção antes de extrair | planned |
| M09-L03 | Checksums com `sha256sum` e verificação de integridade | planned |
| M09-L04 | Sincronização e cópia eficiente com `rsync` | planned |
| M10-L01 | Distribuições, repositórios e gerenciadores de pacotes | planned |
| M10-L02 | `apt`: buscar, instalar, atualizar e remover | planned |
| M10-L03 | Dependências, pacotes, arquivos e versões instaladas | planned |
| M10-L04 | Formatos portáteis: noções de Snap, Flatpak e AppImage | planned |
| M11-L01 | Interfaces, endereços e rotas com `ip` | planned |
| M11-L02 | DNS com `dig`, `host` e `resolvectl` | planned |
| M11-L03 | Testes de conectividade com `ping` e `traceroute` | planned |
| M11-L04 | Requisições HTTP com `curl` e `wget` | planned |
| M11-L05 | Portas e sockets com `ss` e `lsof` | planned |
| M11-L06 | Diagnóstico de rede por camadas | planned |
| M12-L01 | Hostname, relógio, locale e informações do sistema | planned |
| M12-L02 | Logs com `journalctl` e arquivos em `/var/log` | planned |
| M12-L03 | Serviços com `systemctl` | vm-required |
| M12-L04 | Units, dependências e estados do systemd | vm-required |
| M12-L05 | Agendamento com `cron`, `at` e timers | vm-required |
| M13-L01 | Discos, partições e block devices com `lsblk` | vm-required |
| M13-L02 | Uso de espaço com `df`, `du` e análise de consumo | planned |
| M13-L03 | Montagem, desmontagem e `/etc/fstab` | vm-required |
| M13-L04 | Filesystems, inodes e limites | vm-required |
| M13-L05 | LVM e visão geral de RAID | vm-required |
| M14-L01 | Primeiro script Bash, shebang e execução | planned |
| M14-L02 | Variáveis, argumentos e parâmetros especiais | planned |
| M14-L03 | Condições, `test`, `[[ ]]` e operadores | planned |
| M14-L04 | Laços `for`, `while` e leitura de entrada | planned |
| M14-L05 | Funções, escopo e códigos de retorno | planned |
| M14-L06 | Entrada robusta, aspas e tratamento de erros | planned |
| M15-L01 | Arrays e manipulação de strings em Bash | planned |
| M15-L02 | Substituição de comandos, aritmética e subshells | planned |
| M15-L03 | `set -euo pipefail`, traps e limpeza | planned |
| M15-L04 | Parsing de opções com `getopts` | planned |
| M15-L05 | Testes e lint de scripts com ShellCheck | planned |
| M16-L01 | Regex intermediária e avançada | planned |
| M16-L02 | Transformações com `sed` | planned |
| M16-L03 | Processamento tabular com `awk` | planned |
| M16-L04 | Recorte e composição com `cut`, `paste`, `tr` e `xargs` | planned |
| M16-L05 | JSON e APIs no terminal com `jq` e `curl` | planned |
| M17-L01 | Git no terminal: configuração, init, status e commit | planned |
| M17-L02 | Branches, merge, rebase e resolução de conflitos | planned |
| M17-L03 | Remotos, fetch, pull e push | planned |
| M17-L04 | Ferramentas de build e variáveis de projeto | planned |
| M17-L05 | Sessões produtivas com `tmux` | planned |
| M17-L06 | Investigação de comandos e syscalls com `strace` básico | planned |
| M18-L01 | SSH: conexão, identidade e host keys | planned |
| M18-L02 | Chaves SSH e `ssh-agent` | planned |
| M18-L03 | Transferência com `scp`, `sftp` e `rsync` remoto | planned |
| M18-L04 | Túnel local, remoto e SOCKS | planned |
| M18-L05 | Configuração segura em `~/.ssh/config` | planned |

### Nível avançado

| ID | Tópico da lição | Status |
|---|---|---|
| M19-L01 | Modelo de segurança Linux, root e capabilities | planned |
| M19-L02 | Bits especiais: setuid, setgid e sticky bit | planned |
| M19-L03 | ACLs e atributos estendidos | planned |
| M19-L04 | Firewall com nftables/ufw | vm-required |
| M19-L05 | Auditoria, hardening e princípio do menor privilégio | vm-required |
| M20-L01 | Namespaces, cgroups e fundamentos de contêineres | planned |
| M20-L02 | Imagens, containers, volumes e redes Docker | planned |
| M20-L03 | Dockerfile, camadas, cache e builds seguros | planned |
| M20-L04 | Docker Compose e ciclo de vida de serviços | planned |
| M20-L05 | Diagnóstico, limites e segurança de contêineres | planned |
| M21-L01 | Processo de boot: firmware, bootloader, kernel e init | vm-required |
| M21-L02 | Kernel, módulos e parâmetros com `uname`, `lsmod` e `sysctl` | vm-required |
| M21-L03 | Filesystems virtuais `/proc`, `/sys` e `/dev` | planned |
| M21-L04 | Devices, udev e eventos de hardware | vm-required |
| M21-L05 | Initramfs, targets e recuperação de boot | vm-required |
| M21-L06 | Compilação e gerenciamento de módulos: visão prática controlada | vm-required |
| M22-L01 | Metodologia de troubleshooting e coleta de evidências | planned |
| M22-L02 | CPU, load average e escalonamento | planned |
| M22-L03 | Memória, swap, OOM e page cache | planned |
| M22-L04 | I/O, latência de disco e gargalos | vm-required |
| M22-L05 | Rede avançada com captura de pacotes e `tcpdump` | planned |
| M22-L06 | Logs, correlação temporal e análise de incidentes | planned |
| M23-L01 | Processos órfãos, zombies, descritores e limites | planned |
| M23-L02 | `lsof`, `/proc/<pid>` e investigação de recursos | planned |
| M23-L03 | Priorização com nice, scheduling e afinidade | vm-required |
| M23-L04 | Profiling introdutório com `perf` e ferramentas equivalentes | vm-required |
| M24-L01 | Automação idempotente e scripts operacionais seguros | planned |
| M24-L02 | Configuração declarativa e introdução a Ansible | planned |
| M24-L03 | Rotinas de backup, restauração e teste de recuperação | planned |
| M24-L04 | Observabilidade e health checks automatizados | planned |
| M25-L01 | Projeto final: preparar um ambiente Linux de desenvolvimento | planned |
| M25-L02 | Projeto final: publicar e diagnosticar um serviço local | planned |
| M25-L03 | Projeto final: automatizar backup e restauração | planned |
| M25-L04 | Projeto final: investigar e resolver um incidente simulado | planned |

## 9. Ordem recomendada de produção das próximas lições

Na próxima sequência, priorizar:

1. Concluir ENG-003 com verificadores declarativos para os tipos já necessários.
2. M00-L01 a M00-L03 — onboarding e segurança.
3. Validar didaticamente a trilha iniciante inteira antes de ampliar o volume intermediário.
4. M09 — compactação, ZIP, checksums e sincronização com `rsync`.
5. M10 — conceitos de pacotes e exercícios compatíveis com o laboratório não privilegiado.

Não produzir dezenas de conteúdos antes de o schema, o validador e o test runner de lições
estarem estáveis.

## 10. Critério de conclusão de uma lição

Uma lição só muda para `done` quando:

- possui arquivo individual e metadados válidos;
- seu ambiente inicia do zero;
- o reset restaura exatamente o estado inicial;
- a tarefa pode ser concluída pela solução de referência;
- alternativas válidas não são rejeitadas sem motivo;
- falhas comuns produzem mensagens específicas;
- dicas seguem ordem progressiva e não entregam a solução imediatamente;
- verificadores são somente leitura e repetíveis;
- o teste automatizado da lição passa;
- a navegação para a lição seguinte continua funcionando;
- esta spec foi atualizada.

## 11. Protocolo para novas threads ou contexto compactado

Antes de alterar o projeto:

1. Ler este arquivo por completo.
2. Ler `README.md`.
3. Confirmar que o diretório atual é a raiz do clone do Linux Tutor, sem relação com outros projetos.
4. Inspecionar os arquivos apontados na seção 4.3.
5. Conferir o estado do runtime:

```bash
docker compose ps -a
curl --fail http://127.0.0.1:4173/api/health
```

6. Preservar decisões vigentes e o conteúdo já criado.
7. Alterar somente o item solicitado ou a próxima fase explicitamente aprovada.
8. Atualizar esta spec ao concluir trabalho material.

### Validação mínima após mudanças no motor

```bash
docker compose up --build -d app
curl --retry 15 --retry-delay 1 --retry-connrefused --fail \
  http://127.0.0.1:4173/api/health
docker compose exec -T app npm run smoke
docker compose exec -T app npm audit --omit=dev
```

O serviço auxiliar `sandbox-image` aparecer como `Exited (0)` após o build; isso é esperado.
O serviço `app` deve aparecer como `healthy`.

## 12. Registro resumido de mudanças

| Data | Mudança |
|---|---|
| 2026-08-02 | Criado protótipo independente com terminal Docker real e duas lições. |
| 2026-08-02 | Corrigida queda do backend causada por resize atrasado na troca de lições. |
| 2026-08-02 | Sidebar convertida para modo mini com hover e leitura das lições ampliada. |
| 2026-08-02 | Criada esta especificação canônica, backlog e mapa curricular. |
| 2026-08-02 | Lições migradas para schema v1 individual e implantadas M01-L02, M01-L03 e M01-L04. |
| 2026-08-02 | Concluído o módulo M02 com lições de cópia/movimentação, remoção segura, links e estrutura de diretórios. |
| 2026-08-02 | Preparada distribuição pública com documentação portátil, guia de contribuição e licença MIT. |
| 2026-08-27 | Implantados PostgreSQL isolado, autenticação, troca obrigatória no primeiro login e progresso por usuário. |
| 2026-08-27 | Reativado e reforçado o terminal com origem compatível com proxy, ownership por usuário, reconexão e limpeza por instância. |
| 2026-08-27 | Automatizado deploy da stack original em `linux.eletrovps.com` via GitHub Actions e Portainer. |
| 2026-08-27 | Implantadas 20 novas lições, concluindo M03, M04, M05 e M06 até permissões padrão. |
| 2026-08-27 | Concluídos M06, M07 e M08 com 11 lições sobre menor privilégio, shell e processos. |
