import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from './doctor.entity';

@Injectable()
export class DoctorsService {
  constructor(@InjectRepository(Doctor) private readonly doctors: Repository<Doctor>) {}

  async list(): Promise<Array<{ id: number; name: string; crm: string }>> {
    const doctors = await this.doctors.find({ order: { id: 'ASC' } });
    return doctors.map(({ id, name, crm }) => ({ id, name, crm }));
  }
}
