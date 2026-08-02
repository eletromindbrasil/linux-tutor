# Como contribuir

Contribuições para o Linux Tutor são bem-vindas.

## Preparar o ambiente

1. Instale Docker Engine com Docker Compose.
2. Faça um fork ou clone do repositório.
3. Execute `./iniciar.sh` na raiz do projeto.
4. Abra `http://127.0.0.1:4173`.

## Criar ou alterar uma lição

- Leia `docs/PROJECT-SPEC.md` e `content/README.md` antes de começar.
- Mantenha cada lição em `content/lessons/<id>/lesson.json`.
- Preserve IDs já publicados e declare pré-requisitos existentes.
- Garanta que setup, checks e solução de referência sejam reproduzíveis.

Antes de enviar uma mudança, execute:

```bash
docker compose exec -T app npm run lessons:validate
docker compose exec -T app npm run smoke
docker compose exec -T app npm audit --omit=dev
```

Atualize `docs/PROJECT-SPEC.md` quando uma funcionalidade ou lição mudar materialmente.
