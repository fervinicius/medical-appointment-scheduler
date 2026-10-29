import { BadRequestException, Controller, Get, Post, Query, Body } from '@nestjs/common';
import { IsDateString, IsInt, Min } from 'class-validator';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './appointment.dto';

class AvailabilityQuery {
  @IsInt()
  @Min(1)
  doctorId!: number;

  @IsInt()
  @Min(1)
  examId!: number;

  @IsDateString({ strict: true })
  date!: string;
}

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get('availability')
  availability(@Query() query: AvailabilityQuery) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(query.date)) {
      throw new BadRequestException('date deve estar no formato YYYY-MM-DD.');
    }
    return this.appointmentsService.getAvailability(query.doctorId, query.examId, query.date);
  }

  @Post()
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto);
  }

  @Get()
  list() {
    return this.appointmentsService.list();
  }
}
