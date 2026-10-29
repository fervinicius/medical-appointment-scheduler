import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DoctorShift } from './doctor-shift.entity';

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 140 })
  name!: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  crm!: string;

  @OneToMany(() => DoctorShift, (shift) => shift.doctor)
  shifts!: DoctorShift[];
}
