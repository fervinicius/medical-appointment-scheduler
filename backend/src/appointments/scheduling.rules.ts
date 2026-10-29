import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Index, ValueTransformer } from 'typeorm';
import { Exam } from '../exams/exam.entity';
import { Doctor } from '../doctors/doctor.entity';

const isoDateTransformer: ValueTransformer = {
  to: (value: Date) => value.toISOString(),
  from: (value: string | Date) => value instanceof Date ? value : new Date(value),
};

@Entity('appointments')
@Index(['doctor', 'startAt'])
export class Appointment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 120 })
  patientName!: string;

  @ManyToOne(() => Exam, { nullable: false, onDelete: 'RESTRICT' })
  exam!: Exam;

  @ManyToOne(() => Doctor, { nullable: false, onDelete: 'RESTRICT' })
  doctor!: Doctor;

  /** Persisted as UTC by the application. API returns ISO-8601 timestamps. */
  @Column({ type: 'varchar', length: 30, transformer: isoDateTransformer })
  startAt!: Date;

  @Column({ type: 'varchar', length: 30, transformer: isoDateTransformer })
  endAt!: Date;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
