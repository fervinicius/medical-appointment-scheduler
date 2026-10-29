import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from './exam.entity';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { SeedService } from '../seed.service';
import { Doctor } from '../doctors/doctor.entity';
import { DoctorShift } from '../doctors/doctor-shift.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Exam, Doctor, DoctorShift])],
  controllers: [ExamsController],
  providers: [ExamsService, SeedService],
  exports: [TypeOrmModule],
})
export class ExamsModule {}
