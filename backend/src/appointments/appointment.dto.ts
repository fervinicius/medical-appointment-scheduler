import { IsInt, IsISO8601, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  patientName!: string;

  @IsInt()
  @Min(1)
  examId!: number;

  @IsInt()
  @Min(1)
  doctorId!: number;

  /** ISO-8601 timestamp with explicit timezone, for example 2026-11-02T08:00:00-03:00. */
  @IsISO8601({ strict: true, strictSeparator: true })
  startAt!: string;
}
