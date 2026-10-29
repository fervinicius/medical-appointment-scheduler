import { buildSaoPauloDate, generateAvailableSlots, hasTimezoneOffset, isMinuteAligned, isValidDateOnly, minutesFromTime, overlaps, ShiftInput, weekdayFromDateOnly } from './scheduling.rules';

describe('regras de geração de horários', () => {
  // Monday, 2026-11-02. Fixed clock keeps tests deterministic regardless of current date.
  const date = '2026-11-02';
  const now = new Date('2026-10-29T12:00:00Z');
  const morning: ShiftInput[] = [{ weekday: 1, startTime: '08:00', endTime: '12:00' }];

  it('gera slots em passos da duração e inclui o último que termina exatamente no fim do turno', () => {
    const slots = generateAvailableSlots(date, 40, morning, [], now);
    expect(slots.map(({ startAt }) => startAt.toISOString())).toEqual([
      '2026-11-02T11:00:00.000Z',
      '2026-11-02T11:40:00.000Z',
      '2026-11-02T12:20:00.000Z',
      '2026-11-02T13:00:00.000Z',
      '2026-11-02T13:40:00.000Z',
      '2026-11-02T14:20:00.000Z',
    ]);
  });

  it('gera horários de 30 minutos a partir do início do turno', () => {
    const slots = generateAvailableSlots(date, 30, morning, [], now);
    expect(slots).toHaveLength(8);
    expect(slots[0].startAt.toISOString()).toBe('2026-11-02T11:00:00.000Z');
    expect(slots[7].endAt.toISOString()).toBe('2026-11-02T15:00:00.000Z');
  });

  it('remove todos os slots que se sobrepõem a um agendamento existente', () => {
    const booked = [{
      startAt: new Date('2026-11-02T12:20:00.000Z'),
      endAt: new Date('2026-11-02T13:00:00.000Z'),
    }];
    const slots = generateAvailableSlots(date, 20, morning, booked, now);
    expect(slots.some((slot) => overlaps(slot, booked[0]))).toBe(false);
    expect(slots.map(({ startAt }) => startAt.toISOString())).not.toContain('2026-11-02T12:20:00.000Z');
  });

  it('aceita intervalos adjacentes sem considerá-los sobreposição', () => {
    expect(overlaps(
      { startAt: new Date('2026-11-02T11:00:00Z'), endAt: new Date('2026-11-02T11:20:00Z') },
      { startAt: new Date('2026-11-02T11:20:00Z'), endAt: new Date('2026-11-02T11:40:00Z') },
    )).toBe(false);
  });

  it('não oferece horários no passado ou que ultrapassem o fim do turno', () => {
    const lateNow = new Date('2026-11-02T13:30:00Z');
    const slots = generateAvailableSlots(date, 40, morning, [], lateNow);
    expect(slots.every(({ startAt, endAt }) => startAt > lateNow && endAt <= new Date('2026-11-02T15:00:00Z'))).toBe(true);
    expect(slots).toHaveLength(2);
  });
});


describe('utilitários de data e hora', () => {
  it('valida datas ISO de calendário sem aceitar datas impossíveis', () => {
    expect(isValidDateOnly('2026-11-02')).toBe(true);
    expect(isValidDateOnly('2026-02-30')).toBe(false);
    expect(isValidDateOnly('02-11-2026')).toBe(false);
  });

  it('mapeia o dia da semana e converte horários locais de São Paulo para um instante UTC', () => {
    expect(weekdayFromDateOnly('2026-11-02')).toBe(1);
    expect(minutesFromTime('11:40')).toBe(700);
    expect(buildSaoPauloDate('2026-11-02', 8 * 60).toISOString()).toBe('2026-11-02T11:00:00.000Z');
  });

  it('exige timezone explícito e horários alinhados ao minuto', () => {
    expect(hasTimezoneOffset('2026-11-02T08:00:00-03:00')).toBe(true);
    expect(hasTimezoneOffset('2026-11-02T08:00:00')).toBe(false);
    expect(isMinuteAligned(new Date('2026-11-02T11:00:00.000Z'))).toBe(true);
    expect(isMinuteAligned(new Date('2026-11-02T11:00:30.000Z'))).toBe(false);
  });
});
