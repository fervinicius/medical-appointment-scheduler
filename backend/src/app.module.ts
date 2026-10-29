import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamsModule } from './exams/exams.module';
import { DoctorsModule } from './doctors/doctors.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { Exam } from './exams/exam.entity';
import { Doctor } from './doctors/doctor.entity';
import { DoctorShift } from './doctors/doctor-shift.entity';
import { Appointment } from './appointments/appointment.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DB_PATH ?? 'data/agendamentos.sqlite',
      entities: [Exam, Doctor, DoctorShift, Appointment],
      synchronize: true,
      autoLoadEntities: false,
    }),
    ExamsModule,
    DoctorsModule,
    AppointmentsModule,
  ],
})
export class AppModule {}
