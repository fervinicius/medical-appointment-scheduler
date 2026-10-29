import { Controller, Get, Query } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ExamsService } from './exams.service';

class SearchExamsQuery {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get()
  search(@Query() query: SearchExamsQuery) {
    return this.examsService.search(query.search ?? '');
  }
}
