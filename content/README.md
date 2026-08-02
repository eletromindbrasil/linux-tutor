# Conteúdo das lições

Cada diretório em `content/lessons` representa uma lição e contém `lesson.json`.

O catálogo é carregado pelo backend em tempo de execução. Como `content` é montado como volume
somente leitura no Compose, mudanças de conteúdo não exigem recompilar o frontend. O schema é
validado antes de uma sessão ser criada.

## Validar

```bash
docker compose exec -T app npm run lessons:validate
```

## Regras de autoria

- O nome do diretório deve ser igual ao campo `id`.
- `id`, `curriculumId` e `order` devem ser únicos.
- Pré-requisitos usam IDs técnicos existentes.
- `setupCommand` deve preparar somente o sandbox da lição.
- Checks não devem alterar a resposta do aluno.
- `smokeCommands` representa uma solução de referência e não é enviado ao navegador.
- Toda lição nova deve passar no validador e no smoke test completo.

O contrato de produto e o mapa curricular permanecem em `docs/PROJECT-SPEC.md`.
