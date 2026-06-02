import { IsEmail, IsEnum, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { Board, Role } from '@prisma/client';

export class RegisterSchoolDto {
  @IsString() @MinLength(2) schoolName: string;
  @IsString() @Length(3, 32) subdomain: string;
  @IsEnum(Board) @IsOptional() board?: Board;

  @IsString() @MinLength(2) adminName: string;
  @IsEmail() adminEmail: string;
  @IsString() @MinLength(6) adminPassword: string;
}

export class LoginDto {
  @IsString() subdomain: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
}

export class RequestOtpDto {
  @IsString() subdomain: string;
  @IsString() identifier: string; // phone or email
}

export class VerifyOtpDto {
  @IsString() subdomain: string;
  @IsString() identifier: string;
  @IsString() @Length(4, 8) code: string;
}

export class CreateUserDto {
  @IsEnum(Role) role: Role;
  @IsString() name: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() password?: string;
  @IsString() @IsOptional() sectionId?: string;
  @IsString() @IsOptional() rollNumber?: string;
}
