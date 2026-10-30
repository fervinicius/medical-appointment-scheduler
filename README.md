# Clara — Agendamento de Exames de Imagem

Aplicação fullstack de demonstração para pesquisar exames, consultar horários livres de um médico e agendar um exame. O projeto usa **monorepo** com `backend/` e `frontend/`, NestJS + TypeScript + SQLite na API e React + TypeScript + Vite na interface.

## Funcionalidades

- Busca de exames por nome (30 registros carregados de `backend/data/exames.csv`).
- Listagem dos cinco médicos e suas agendas semanais informadas em `backend/data/medicos.md`.
- Consulta de disponibilidade por médico, exame e dia.
- Agendamento com validação de paciente, exame, médico, turno, duração, horário futuro e conflitos.
- SQLite criado automaticamente no primeiro start em `backend/data/agendamentos.sqlite`.
- Testes unitários das regras de geração de horários, intervalos e serialização local dos agendamentos concorrentes.
- Coleção Postman e comandos cURL em `postman/` e `docs/API_EXAMPLES.md`.

## Arquitetura MVC (Visão Geral)

```text
frontend (React + TypeScript :5173)
  └── api.ts (fetch, erros HTTP, tipos de resposta)
       └── HTTP /api
backend (NestJS + ValidationPipe :3000)
    ├── ExamsModule       → GET /exams
    ├── DoctorsModule     → GET /doctors
    ├── AppointmentsModule→ disponibilidade e criação
    ├── scheduling.rules  → slots, duração e sobreposição (regra pura/testável)
    ├── SeedService       → CSV + agenda base de médicos
    └── TypeORM → SQLite (backend/data/agendamentos.sqlite)
```

A interface não é a fonte da regra: mesmo que um cliente chame a API diretamente, o backend revalida os dados e o horário antes de salvar.

## Requisitos

- Node.js 20+ (recomendado Node.js 22 LTS) e npm 10+.
- Não é necessário instalar SQLite ou Docker: o driver SQLite cria/usa o arquivo local.
- Portas livres: `3000` para a API e `5173` para o frontend.

## Instalação e Execução

Na raiz do repositório:

```bash
npm install
npm run dev
```

A API ficará disponível em `http://localhost:3000/api`. O frontend ficará em `http://localhost:5173` e usa como padrão a API em `http://localhost:3000/api`.

Na primeira inicialização, a API cria as tabelas e carrega os exames e médicos. O banco é persistido no arquivo `backend/data/agendamentos.sqlite`. Para usar uma URL diferente no frontend, crie `frontend/.env` com:

```env
VITE_API_URL=http://localhost:3000/api
```

Para personalizar o backend, copie `backend/.env.example` para `backend/.env`; o backend carrega esse arquivo no início. `PORT` altera a porta da API, `FRONTEND_ORIGIN` configura a origem permitida pelo CORS e `DB_PATH` define o caminho do SQLite, relativo à pasta `backend/` ao iniciar pelos scripts do workspace.

### Executar Separadamente

Terminal 1:

```bash
npm run start:dev --workspace=@agenda/backend
```

Terminal 2:

```bash
npm run dev --workspace=@agenda/frontend

## Banco e dados iniciais

As tabelas são gerenciadas pelo TypeORM com `synchronize: true`, adequado ao desafio local. `SeedService` lê o CSV e inclui/atualiza os exames por ID. Os médicos e turnos são inicializados a partir da transcrição documentada das agendas no arquivo fornecido `medicos.md`. Reiniciar a API não duplica esses dados.

Para reiniciar o banco localmente, pare a API e remova `backend/data/agendamentos.sqlite` (e arquivos auxiliares `-shm`/`-wal`, caso existam). O próximo start recriará as tabelas e carregará os dados de apoio.

## Testes e build

```bash
# Testes unitários do núcleo de regras
npm test

# Cobertura do núcleo de regras em scheduling.rules.ts
npm run test:cov

# Compilar backend e frontend
npm run build
```

Os testes de regra usam relógio fixo e validam: passo de duração, slot que termina exatamente no fim do turno, exclusão de conflito, intervalos adjacentes, horários passados, validação de data e conversão de fuso. O teste de mutex valida serialização de tentativas da mesma chave em um processo. A cobertura coletada concentra-se no módulo puro de regras de agenda.

## API

Todas as rotas usam o prefixo `/api`.

| Método | Rota | Objetivo |
| --- | --- | --- |
| `GET` | `/api/exams?search=raio-x` | Buscar exames pelo nome; `search` é opcional. |
| `GET` | `/api/doctors` | Listar médicos. |
| `GET` | `/api/appointments/availability?doctorId=1&examId=1&date=2026-11-02` | Obter slots para um médico, exame e data. |
| `POST` | `/api/appointments` | Criar agendamento. |
| `GET` | `/api/appointments` | Listar agendamentos criados (apoio a teste/demonstração). |

Ver `docs/API_EXAMPLES.md` e `postman/agenda-exames.postman_collection.json` para exemplos.

### Corpo Para Criação

```json
{
  "patientName": "Marina Souza",
  "examId": 1,
  "doctorId": 1,
  "startAt": "2026-11-02T08:00:00-03:00"
}
```

O cliente envia apenas o início. `endAt` é calculado no backend com a duração do exame, em UTC internamente. `startAt` precisa ser ISO-8601 e conter `Z` ou offset explícito. A API responde com horários em ISO UTC; o frontend mostra o horário de `America/Sao_Paulo`.

## Decisões e Premissas

1. **Fuso:** horários de agenda são interpretados em `America/Sao_Paulo` (offset usado na geração: `-03:00`). O JSON da API retorna timestamps ISO UTC para evitar ambiguidade entre serviços. Se as regras de fuso brasileiras mudarem, a conversão fixa deve ser substituída por uma biblioteca que aplique o banco IANA de fusos.
2. **Data:** disponibilidade recebe `YYYY-MM-DD`, que representa a data local do consultório.
3. **Dias da semana:** domingo = `0`, segunda = `1`, ... sábado = `6`, seguindo JavaScript. As agendas seguem exatamente o arquivo de apoio.
4. **Intervalos:** todos os intervalos são semiabertos `[início, término)`. Assim, um atendimento que termina às 10:00 não conflita com outro que começa às 10:00.
5. **Slots:** gerados a partir do começo de cada turno em passos iguais à duração do exame. O bloco inteiro precisa terminar até o limite do turno.
6. **Sobreposição:** qualquer cruzamento de intervalos para o mesmo médico elimina um slot e impede a criação. O backend também serializa tentativas de agendamento por médico/data no processo atual; para múltiplas réplicas, deve-se adicionar coordenação transacional/lock no banco.
7. **Passado:** um início igual ou anterior ao instante atual é recusado. A interface inicia sugerindo amanhã, mas permite selecionar hoje; a API elimina horários passados e valida a regra de forma independente.
8. **Catálogo:** todos os médicos podem realizar todos os exames, conforme a nota de apoio. Não há paciente cadastrado previamente: o nome é salvo no agendamento.
9. **Persistência:** `synchronize: true` simplifica a criação de tabelas. Em produção, usar migrations e backups.

## Próximos Passos

- Autenticação e autorização de pacientes/profissionais, recuperação de agendamento e cancelamento/remarcação.
- Testes de integração/e2e com banco temporário e teste de contrato frontend/API.
- Migrations formais, Dockerfile/Compose, pipeline CI e linting padronizado.
- Transação/lock com garantia entre múltiplas instâncias, idempotência do POST e restrições adicionais no banco.
- Testes de acessibilidade com ferramenta automatizada e validação com leitores de tela.
- LGPD em ambiente real: política de retenção, consentimento, controle de acesso, criptografia, auditoria e observabilidade.
- Cadastro/autenticação do paciente; notificações por e-mail/SMS; regras por unidade e equipamentos; feriados, bloqueios e pausas entre exames.

## Referências técnicas

- [NestJS — Controllers](https://docs.nestjs.com/controllers)
- [NestJS — Validation](https://docs.nestjs.com/techniques/validation)
- [NestJS — Database / TypeORM](https://docs.nestjs.com/data/overview)
- [TypeORM — SQLite](https://typeorm.io/docs/drivers/sqlite/)
- [React — Managing State](https://react.dev/learn/managing-state)
- [React — Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [Vite — Getting Started](https://vite.dev/guide/)
- [OWASP — Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

## MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
