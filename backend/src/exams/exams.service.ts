import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exam } from './exam.entity';

@Injectable()
export class ExamsService {
  constructor(@InjectRepository(Exam) private readonly exams: Repository<Exam>) {}

  async search(search: string): Promise<Array<{ id: number; name: string; durationMinutes: number }>> {
    const normalized = search.trim().toLocaleLowerCase('pt-BR');
    const all = await this.exams.find({ order: { name: 'ASC' } });
    return all
      .filter((exam) => exam.name.toLocaleLowerCase('pt-BR').includes(normalized))
      .map(({ id, name, durationMinutes }) => ({ id, name, durationMinutes }));
  }
}
