import { IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength } from 'class-validator';

/**
 * Recording a fee payment. `amount` must be a real, positive number — without
 * this a negative or NaN amount silently flips a PAID invoice back to PARTIAL /
 * PENDING and corrupts the ledger. (NaN from the client arrives as JSON null and
 * is rejected by @IsNumber.)
 */
export class RecordPaymentDto {
  @IsNumber()
  @IsPositive()
  @Max(10_000_000)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  txnRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  receiptUrl?: string;
}
