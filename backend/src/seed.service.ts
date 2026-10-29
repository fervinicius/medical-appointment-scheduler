import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Exam } from './exams/exam.entity';
import { Doctor } from './doctors/doctor.entity';
import { DoctorShift } from './doctors/doctor-shift.entity';

interface DoctorSeed { id: number; name: string; crm: string; shifts: Array<[number, string, string]>; }

const doctorSeeds: DoctorSeed[] = [
  { id: 1, name: 'Dra. Helena Marques', crm: 'CRM-MG 11111', shifts: [
    [1,'08:00','12:00'],[1,'14:00','18:00'],[2,'08:00','12:00'],[2,'14:00','18:00'],[3,'08:00','12:00'],[3,'14:00','18:00'],[4,'08:00','12:00'],[4,'14:00','18:00'],[5,'08:00','12:00'],[5,'14:00','18:00'],
  ]},
  { id: 2, name: 'Dr. Rafael Teixeira', crm: 'CRM-MG 22222', shifts: [
    [1,'07:00','13:00'],[3,'07:00','13:00'],[5,'07:00','13:00'],[2,'13:00','19:00'],[4,'13:00','19:00'],
  ]},
  { id: 3, name: 'Dra. Beatriz Nogueira', crm: 'CRM-MG 33333', shifts: [
    [1,'09:00','12:00'],[1,'18:00','22:00'],[2,'09:00','12:00'],[2,'18:00','22:00'],[3,'09:00','12:00'],[3,'18:00','22:00'],[4,'09:00','12:00'],[4,'18:00','22:00'],
  ]},
  { id: 4, name: 'Dr. Thiago Fontes', crm: 'CRM-MG 44444', shifts: [
    [2,'08:00','12:00'],[3,'08:00','12:00'],[4,'08:00','12:00'],[5,'08:00','12:00'],[6,'08:00','12:00'],[3,'19:00','22:00'],[5,'19:00','22:00'],
  ]},
  { id: 5, name: 'Dra. Camila Andrade', crm: 'CRM-MG 55555', shifts: [
    [1,'10:00','14:00'],[2,'10:00','14:00'],[3,'10:00','14:00'],[4,'10:00','14:00'],[5,'10:00','14:00'],[6,'08:00','12:00'],
  ]},
];

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);
  constructor(
    @InjectRepository(Exam) private readonly exams: Repository<Exam>,
    @InjectRepository(Doctor) private readonly doctors: Repository<Doctor>,
    @InjectRepository(DoctorShift) private readonly shifts: Repository<DoctorShift>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedExams();
    await this.seedDoctors();
  }

  private async seedExams(): Promise<void> {
    const csvPath = join(process.cwd(), 'data', 'exames.csv');
    const csv = await readFile(csvPath, 'utf8');
    const rows = csv.trim().split(/\r?\n/).slice(1);
    for (const row of rows) {
      const [rawId, name, rawDuration] = row.split(',');
      const id = Number(rawId);
      const durationMinutes = Number(rawDuration);
      if (!id || !name || ![20, 30, 40].includes(durationMinutes)) {
        throw new Error(`Linha inválida no catálogo de exames: ${row}`);
      }
      const existing = await this.exams.findOne({ where: { id } });
      if (!existing) await this.exams.save(this.exams.create({ id, name, durationMinutes }));
      else if (existing.name !== name || existing.durationMinutes !== durationMinutes) {
        await this.exams.update(id, { name, durationMinutes });
      }
    }
    this.logger.log(`${rows.length} exames carregados do CSV.`);
  }

  private async seedDoctors(): Promise<void> {
    for (const seed of doctorSeeds) {
      let doctor = await this.doctors.findOne({ where: { id: seed.id } });
      if (!doctor) doctor = await this.doctors.save(this.doctors.create({ id: seed.id, name: seed.name, crm: seed.crm }));
      else if (doctor.name !== seed.name || doctor.crm !== seed.crm) {
        await this.doctors.update(doctor.id, { name: seed.name, crm: seed.crm });
      }
      const count = await this.shifts.count({ where: { doctor: { id: doctor.id } } });
      if (count === 0) {
        for (const [weekday, startTime, endTime] of seed.shifts) {
          await this.shifts.save(this.shifts.create({ doctor, weekday, startTime, endTime }));
        }
      }
    }
    this.logger.log(`${doctorSeeds.length} médicos e agendas iniciais verificados.`);
  }
}
