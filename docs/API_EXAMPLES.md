# Exemplos de uso da API

> Troque a data pelos próximos dias e escolha uma data em que o médico atenda. Os exemplos usam a segunda-feira `2026-11-02`; confirme a disponibilidade antes de tentar criar um agendamento, pois os horários passados são rejeitados.

## 1. Buscar exames

```bash
curl -s "http://localhost:3000/api/exams?search=ultrassonografia"
```

## 2. Listar médicos

```bash
curl -s "http://localhost:3000/api/doctors"
```

## 3. Ver horários livres

```bash
curl -s "http://localhost:3000/api/appointments/availability?doctorId=1&examId=1&date=2026-11-02"
```

A resposta inclui `slots`, com `startAt` e `endAt` em ISO UTC. Se não houver horários para o dia, `slots` será um array vazio.

## 4. Criar agendamento

Use um `startAt` copiado da resposta de disponibilidade. O timestamp precisa conter fuso/offset.

```bash
curl -i -X POST "http://localhost:3000/api/appointments" \
  -H "Content-Type: application/json" \
  -d '{
    "patientName": "Marina Souza",
    "examId": 1,
    "doctorId": 1,
    "startAt": "2026-11-02T08:00:00-03:00"
  }'
```

## 5. Listar agendamentos

```bash
curl -s "http://localhost:3000/api/appointments"
```

## Respostas de erro esperadas

- `400 Bad Request`: data ou corpo inválido, horário no passado, segundos diferentes de zero, horário fora do turno ou não alinhado ao slot.
- `404 Not Found`: médico ou exame inexistente.
- `409 Conflict`: sobreposição com um agendamento já salvo.

As mensagens são deliberadamente amigáveis para que a interface possa exibir o erro ao paciente.
