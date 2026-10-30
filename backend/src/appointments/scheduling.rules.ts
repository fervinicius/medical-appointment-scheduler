export const SAO_PAULO_OFFSET = '-03:00';

export interface ShiftInput {
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface IntervalInput {
  startAt: Date;
  endAt: Date;
}

export interface Slot {
  startAt: Date;
  endAt: Date;
}

export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function weekdayFromDateOnly(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function minutesFromTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function buildSaoPauloDate(date: string, minuteOfDay: number): Date {
  const hours = Math.floor(minuteOfDay / 60).toString().padStart(2, '0');
  const minutes = (minuteOfDay % 60).toString().padStart(2, '0');
  return new Date(`${date}T${hours}:${minutes}:00${SAO_PAULO_OFFSET}`);
}

export function overlaps(a: IntervalInput, b: IntervalInput): boolean {
  // Intervals are half-open [start, end): one appointment may end exactly when another begins.
  return a.startAt.getTime() < b.endAt.getTime() && a.endAt.getTime() > b.startAt.getTime();
}

export function generateAvailableSlots(
  date: string,
  durationMinutes: number,
  shifts: ShiftInput[],
  existingAppointments: IntervalInput[],
  now: Date = new Date(),
): Slot[] {
  const weekday = weekdayFromDateOnly(date);
  const matchingShifts = shifts.filter((shift) => shift.weekday === weekday);
  const slots: Slot[] = [];

  for (const shift of matchingShifts) {
    const shiftStart = minutesFromTime(shift.startTime);
    const shiftEnd = minutesFromTime(shift.endTime);

    for (let minute = shiftStart; minute + durationMinutes <= shiftEnd; minute += durationMinutes) {
      const startAt = buildSaoPauloDate(date, minute);
      const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);
      const slot = { startAt, endAt };

      if (startAt.getTime() <= now.getTime()) continue;
      if (existingAppointments.some((appointment) => overlaps(slot, appointment))) continue;
      slots.push(slot);
    }
  }

  return slots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

export function hasTimezoneOffset(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
}

export function isMinuteAligned(value: Date): boolean {
  return value.getSeconds() === 0 && value.getMilliseconds() === 0;
}
