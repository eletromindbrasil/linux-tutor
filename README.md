# Linux Tutor

Aplicação web para aprender Linux praticando em terminais reais e isolados, com autenticação e
progresso persistente por usuário.

Repositório: <https://github.com/eletromindbrasil/linux-tutor>

A visão, o estado de implementação, o backlog e o mapa curricular canônico estão em
[`docs/PROJECT-SPEC.md`](docs/PROJECT-SPEC.md). Novas threads devem ler essa spec antes de
alterar o projeto.

Este protótipo contém 48 lições, organizadas em dez módulos:

1. Fundamentos do terminal, navegação, caminhos, listagens e ajuda local.
2. Criação, organização, remoção e links de arquivos, além da estrutura Linux.
3. Leitura, edição com Nano e Vim, tipos, encoding e comparação de textos.
4. stdin, stdout, stderr, redirecionamentos, pipes, `tee` e códigos de saída.
5. Busca com `find`, `locate`, `grep`, regex, contagem, ordenação e valores únicos.
6. Identidade, grupos, permissões, ownership, `umask`, `sudo` e menor privilégio.
7. Variáveis, aspas, globbing, `PATH`, aliases, funções e histórico do shell.
8. Processos, PIDs, monitoramento, jobs, sinais e tarefas persistentes com `nohup`.
9. Arquivamento, compressão, ZIP, checksums e sincronização com `rsync`.
10. Distribuições, repositórios, operações seguras com `apt`, `dpkg` e formatos portáteis.

As aulas ficam em `content/lessons/<id>/lesson.json`. Para validar o catálogo:

```bash
docker compose exec -T app npm run lessons:validate
```

## Executar

Pré-requisito: Docker Engine com Docker Compose.

Clone o projeto, inicie o ambiente e abra o navegador:

```bash
git clone https://github.com/eletromindbrasil/linux-tutor.git
cd linux-tutor
./iniciar.sh
```

Ou execute o Compose diretamente:

```bash
docker compose up --build -d
```

Abra `http://127.0.0.1:4173`.

No primeiro acesso, use:

- usuário: `eletromind.brasil@gmail.com`
- senha temporária: `12345678`

O acesso às aulas permanece bloqueado até a troca da senha. A senha oficial precisa ter pelo
menos 10 caracteres. A senha é armazenada como hash `scrypt`; o valor temporário serve somente
para criar o usuário quando o banco ainda está vazio.

O `iniciar.sh` cria um `.env` privado, com senha aleatória para o PostgreSQL e identificador único
para esta implantação. Para configurar manualmente ou usar outro domínio, copie `.env.example`
para `.env`. Em uma VPS com proxy HTTPS, defina também:

```dotenv
APP_ORIGIN=https://linux.seudominio.com
COOKIE_SECURE=true
```

O serviço continua publicado somente em `127.0.0.1:4173`; o proxy reverso deve ser o único ponto
de entrada público e precisa encaminhar upgrades WebSocket.

## Deploy de produção

Cada push na branch `main` executa o workflow `.github/workflows/deploy-production.yml`. Ele usa a
API do Portainer da VPS original para construir imagens vinculadas ao commit, atualizar a stack
Swarm `linux-tutor` e validar autenticação, troca de senha e os terminais das 48 lições. O ambiente
público é <https://linux.eletrovps.com>.

As credenciais do Portainer ficam no environment `production` do GitHub. O PostgreSQL usa volume e
rede interna exclusivos da stack, sem porta publicada. Senhas, dados e sessões permanecem na VPS e
não são copiados para o repositório ou para os logs do Actions.

Em produção, os serviços e logs ficam na stack `linux-tutor` do Portainer. Para acompanhar a
instalação local:

```bash
docker compose logs -f app
```

Para encerrar e remover os contêineres:

```bash
./parar.sh
```

## Segurança do protótipo

- Em produção, a aplicação não publica portas; apenas o Traefik da rede `eletrocloud` alcança o serviço.
- Login, troca obrigatória no primeiro acesso e sessões HttpOnly protegem todas as aulas e terminais.
- O PostgreSQL não publica portas e participa somente de uma rede Docker interna deste projeto.
- O progresso é persistido no volume Swarm `linux-tutor_postgres_data`, separado dos demais projetos
  da VPS.
- Cada lição usa um contêiner descartável sem acesso à rede.
- O terminal roda como usuário não privilegiado.
- CPU, memória, processos e capabilities são limitados.
- Reiniciar a lição remove o contêiner anterior.

O app monta o socket local do Docker para criar e remover os ambientes de prática. Esse socket
equivale a acesso administrativo ao Docker; por isso, mantenha a porta do app em loopback, use
HTTPS no proxy e não compartilhe o container da aplicação com serviços não confiáveis.

## Contribuir e licença

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para preparar mudanças e validar novas lições.
O projeto é distribuído sob a [licença MIT](LICENSE).
