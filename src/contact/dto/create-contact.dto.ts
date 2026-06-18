import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ProgramOfInterest {
  PREP = 'PREP',
  ACADEMICS = 'ACADEMICS',
  UPSKILL = 'UPSKILL',
  CAREER = 'CAREER',
  NOT_SURE = 'NOT_SURE',
}

export class CreateContactDto {
  @ApiProperty({ example: 'Delphi Lipschitz' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'delphi@euler.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+234 801 234 5678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ enum: ProgramOfInterest, example: ProgramOfInterest.PREP })
  @IsEnum(ProgramOfInterest)
  programOfInterest: ProgramOfInterest;

  @ApiProperty({ example: 'I am interested in your prep program' })
  @IsString()
  @MinLength(10)
  message: string;
}
