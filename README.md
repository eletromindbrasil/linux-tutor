# Linux Tutor

Aplicação web local para aprender Linux praticando em terminais reais e isolados.

Repositório: <https://github.com/eletromindbrasil/linux-tutor>

A visão, o estado de implementação, o backlog e o mapa curricular canônico estão em
[`docs/PROJECT-SPEC.md`](docs/PROJECT-SPEC.md). Novas threads devem ler essa spec antes de
alterar o projeto.

Este protótipo contém nove lições:

1. Navegação com `pwd`, `ls` e `cd`.
2. Caminhos relativos, absolutos, `..` e `~`.
3. Listagens detalhadas e arquivos ocultos com opções de `ls`.
4. Ajuda local com `type`, `--help`, `man` e `apropos`.
5. Criação de diretórios e arquivos com `mkdir`, `touch`, `echo` e `cat`.
6. Cópia, movimentação e renomeação com `cp` e `mv`.
7. Remoção consciente com `rm`, `rmdir` e `rm -r`.
8. Links simbólicos e hard links com `ln`, `readlink` e inodes.
9. Estrutura essencial do Linux: `/etc`, `/var/log`, `/tmp` e identificação da distribuição.

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

Para acompanhar os logs:

```bash
docker compose logs -f app
```

Para encerrar e remover os contêineres:

```bash
./parar.sh
```

## Segurança do protótipo

- A aplicação é publicada apenas em `127.0.0.1`.
- Cada lição usa um contêiner descartável sem acesso à rede.
- O terminal roda como usuário não privilegiado.
- CPU, memória, processos e capabilities são limitados.
- Reiniciar a lição remove o contêiner anterior.

O app monta o socket local do Docker para criar e remover os ambientes de prática. Por esse
motivo, ele deve continuar restrito à máquina local e não deve ser publicado na internet sem
uma arquitetura de isolamento adicional.

## Contribuir e licença

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para preparar mudanças e validar novas lições.
O projeto é distribuído sob a [licença MIT](LICENSE).
