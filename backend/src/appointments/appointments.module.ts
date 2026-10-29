import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './appointment.entity';
import { Exam } from '../exams/exam.entity';
import { Doctor } from '../doctors/doctor.entity';
import { DoctorShift } from '../doctors/doctor-shift.entity';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Exam, Doctor, DoctorShift])],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
