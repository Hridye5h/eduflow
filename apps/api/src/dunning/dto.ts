import { IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength } from 'class-validator';

/** Starting a dunning run — same money guard as fee payments. */
export class StartDunningDto {
  @IsString()
  @MaxLength(64)
  studentId: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  feePaymentId?: string;

  @IsNumber()
  @IsPositive()
  @Max(10_000_000)
  amount: number;

  @IsString()
  @MaxLength(32)
  dueDate: string;

  @IsString()
  @MaxLength(20)
  toPhone: string;
}
