import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class WhatsAppIncomingDto {
  @ApiProperty({
    example: '911234567890',
  })
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiProperty({
    example: 'transformer kharab ho gya h',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class WhatsAppIncomingServiceDto {
  @ApiProperty({
    example: '911234567890',
  })
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiProperty({
    example: 'transformer kharab ho gya h',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    example: '/help',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  command?: string;

  @ApiProperty({
    example: 2,
  })
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  id?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  date?: string;

  /** ML classify: ISO-like instant (preferred over date + time). */
  @ApiProperty({ example: '2026-05-16T16:16:01.981350', required: false })
  @IsString()
  @IsOptional()
  datetime?: string | null;

  /** ML classify: time fragment to combine with date (e.g. 16:16:01). */
  @ApiProperty({ example: '16:16:01', required: false })
  @IsString()
  @IsOptional()
  time?: string | null;

  /** ML classify: due instant (e.g. `YYYY-MM-DD`, or naive `YYYY-MM-DDTHH:mm:ss` = IST). */
  @ApiProperty({ example: '2026-05-17T10:00:00', required: false })
  @IsString()
  @IsOptional()
  deadline?: string | null;

  /** ML classify: e.g. "@1" or "@ajay" for /mgrassign */
  @ApiProperty({ example: '@1', required: false })
  @IsString()
  @IsOptional()
  worker_slug?: string | null;

  /** ML /depart_assign: slug matching factory department (e.g. it, sales). */
  @ApiProperty({ example: 'it', required: false })
  @IsString()
  @IsOptional()
  depart_slug?: string | null;

  /** ML /mgrreject: reason text for owner notification. */
  @ApiProperty({ example: 'Not our department scope', required: false })
  @IsString()
  @IsOptional()
  reject_reason?: string | null;
}
