import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './appointment.entity';
import { Exam } from '../exams/exam.entity';
import { Doctor } from '../doctors/doctor.entity';
import { DoctorShift } from '../doctors/doctor-shift.entity';
import { CreateAppointmentDto } from './appointment.dto';
import { generateAvailableSlots, hasTimezoneOffset, isMinuteAligned, isValidDateOnly, overlaps, ShiftInput } from './scheduling.rules';
import { KeyedMutex } from './keyed-mutex';

@Injectable()
export class AppointmentsService {
  private readonly bookingMutex = new KeyedMutex();

  constructor(
    @InjectRepository(Appointment) private readonly appointments: Repository<Appointment>,
    @InjectRepository(Exam) private readonly exams: Repository<Exam>,
    @InjectRepository(Doctor) private readonly doctors: Repository<Doctor>,
    @InjectRepository(DoctorShift) private readonly shifts: Repository<DoctorShift>,
  ) {}

  async getAvailability(doctorId: number, examId: number, date: string) {
    if (!isValidDateOnly(date)) throw new BadRequestException('date deve ser uma data válida no formato YYYY-MM-DD.');
    const doctor = await this.doctors.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Médico não encontrado.');
    const exam = await this.exams.findOne({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exame não encontrado.');

    const shifts = (await this.shifts.find({ where: { doctor: { id: doctorId } } })) as ShiftInput[];
    const existing = await this.appointments.find({ where: { doctor: { id: doctorId } } });
    const appointmentsForDate = existing.filter((appointment) => this.isSameLocalDate(appointment.startAt, date));
    const slots = generateAvailableSlots(
      date,
      exam.durationMinutes,
      shifts,
      appointmentsForDate.map(({ startAt, endAt }) => ({ startAt, endAt })),
    );

    return {
      doctor: { id: doctor.id, name: doctor.name, crm: doctor.crm },
      exam: { id: exam.id, name: exam.name, durationMinutes: exam.durationMinutes },
      date,
      timezone: 'America/Sao_Paulo',
      slots: slots.map(({ startAt, endAt }) => ({ startAt: startAt.toISOString(), endAt: endAt.toISOString() })),
    };
  }

  async create(dto: CreateAppointmentDto) {
    const patientName = dto.patientName.trim().replace(/\s+/g, ' ');
    if (patientName.length < 2) throw new BadRequestException('Informe o nome completo ou um nome com pelo menos 2 caracteres.');
    if (!hasTimezoneOffset(dto.startAt)) {
      throw new BadRequestException('startAt precisa conter fuso horário, por exemplo 2026-11-02T08:00:00-03:00.');
    }
    const startAt = new Date(dto.startAt);
    if (Number.isNaN(startAt.getTime())) throw new BadRequestException('startAt não é uma data/hora válida.');
    if (!isMinuteAligned(startAt)) throw new BadRequestException('O horário deve começar exatamente no minuto, sem segundos ou milissegundos.');
    if (startAt.getTime() <= Date.now()) throw new BadRequestException('Não é possível agendar no passado.');
    const date = this.formatLocalDate(startAt);

    return this.bookingMutex.runExclusive(`${dto.doctorId}:${date}`, async () => {
      const doctor = await this.doctors.findOne({ where: { id: dto.doctorId } });
      if (!doctor) throw new NotFoundException('Médico não encontrado.');
      const exam = await this.exams.findOne({ where: { id: dto.examId } });
      if (!exam) throw new NotFoundException('Exame não encontrado.');

      const shifts = (await this.shifts.find({ where: { doctor: { id: doctor.id } } })) as ShiftInput[];
      const existing = await this.appointments.find({ where: { doctor: { id: doctor.id } } });
      const appointmentsForDate = existing.filter((appointment) => this.isSameLocalDate(appointment.startAt, date));
      const requestedEnd = new Date(startAt.getTime() + exam.durationMinutes * 60_000);
      const requested = { startAt, endAt: requestedEnd };

      if (appointmentsForDate.some((appointment) => overlaps(requested, appointment))) {
        throw new ConflictException('Este horário conflita com outro agendamento do médico. Escolha outro horário.');
      }

      const validSlots = generateAvailableSlots(
        date,
        exam.durationMinutes,
        shifts,
        appointmentsForDate.map(({ startAt: bookedStart, endAt }) => ({ startAt: bookedStart, endAt })),
      );
      const slotIsValid = validSlots.some((slot) => slot.startAt.getTime() === startAt.getTime());
      if (!slotIsValid) {
        throw new BadRequestException('Horário fora dos turnos do médico ou não alinhado à duração do exame. Consulte os horários disponíveis.');
      }

      // The end time is always derived from the selected exam duration; clients cannot choose it.
      const saved = await this.appointments.save(this.appointments.create({
        patientName,
        exam,
        doctor,
        startAt,
        endAt: requestedEnd,
      }));
      return this.toResponse(saved, exam, doctor);
    });
  }

  async list() {
    const appointments = await this.appointments.find({ relations: { exam: true, doctor: true }, order: { startAt: 'ASC' } });
    return appointments.map((appointment) => this.toResponse(appointment, appointment.exam, appointment.doctor));
  }

  private toResponse(appointment: Appointment, exam: Exam, doctor: Doctor) {
    return {
      id: appointment.id,
      patientName: appointment.patientName,
      exam: { id: exam.id, name: exam.name, durationMinutes: exam.durationMinutes },
      doctor: { id: doctor.id, name: doctor.name, crm: doctor.crm },
      startAt: new Date(appointment.startAt).toISOString(),
      endAt: new Date(appointment.endAt).toISOString(),
      timezone: 'America/Sao_Paulo',
    };
  }

  private isSameLocalDate(date: Date, expectedDate: string): boolean {
    return this.formatLocalDate(date) === expectedDate;
  }

  private formatLocalDate(value: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(value);
    const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  }
}
