import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Doctor } from './doctor.entity';

@Entity('doctor_shifts')
export class DoctorShift {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Doctor, (doctor) => doctor.shifts, { onDelete: 'CASCADE' })
  doctor!: Doctor;

  /** JavaScript weekday: 0 = Sunday, 1 = Monday, ..., 6 = Saturday. */
  @Column({ type: 'integer' })
  weekday!: number;

  @Column({ type: 'varchar', length: 5 })
  startTime!: string;

  @Column({ type: 'varchar', length: 5 })
  endTime!: string;
}
