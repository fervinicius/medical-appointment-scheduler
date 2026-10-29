import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from './doctor.entity';
import { DoctorShift } from './doctor-shift.entity';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, DoctorShift])],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [TypeOrmModule, DoctorsService],
})
export class DoctorsModule {}
