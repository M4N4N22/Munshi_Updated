import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DbService } from 'src/core/services/db-service/db.service';
import { Attendance } from './attendance.schema';
import { waSection } from 'src/modules/whatsapp/whatsapp.templates';
import { getTodayCalendarDateIST } from 'src/core/time/india-defaults';

export class CreateAttendanceDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  user_id: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  factory_id: number;

  @ApiProperty({ example: '2026-05-13' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  is_present: boolean;
}

export class ListAttendanceQuery {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  factory_id?: number;

  @ApiPropertyOptional({ example: '2026-05-13' })
  @IsOptional()
  @IsDateString()
  date?: string;
}

@Injectable()
export class AttendanceService {
  private readonly attendanceModel: typeof Attendance;
  constructor(private readonly dbService: DbService) {
    this.attendanceModel = this.dbService.sqlService.Attendance;
  }

  async isMarkedToday(user_id: number, factory_id: number) {
    const today = getTodayCalendarDateIST();

    const record = await this.attendanceModel.findOne({
      where: {
        user_id,
        factory_id,
        date: today,
      },
    });

    return !!record;
  }

  async markAttendance(
    user_id: number,
    factory_id: number,
    is_present: boolean,
  ) {
    const today = getTodayCalendarDateIST();

    const existing = await this.attendanceModel.findOne({
      where: {
        user_id,
        factory_id,
        date: today,
      },
    });

    if (existing) {
      await existing.update({ is_present });
      return waSection(
        'Attendance updated',
        `Your attendance for today has been updated to *${is_present ? 'Present' : 'Absent'}*.`,
      );
    }

    try {
      await this.attendanceModel.create({
        user_id,
        factory_id,
        date: today,
        is_present,
      } as any);

      return waSection(
        'Attendance recorded',
        `You have been marked *${is_present ? 'Present' : 'Absent'}* for today.`,
      );
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new BadRequestException('Attendance already marked for today');
      }
      throw error;
    }
  }

  async create(dto: CreateAttendanceDto) {
    return this.attendanceModel.create(dto as any);
  }

  async list(opts: { factory_id?: number; date?: string; user_id?: number }) {
    const where: any = {};
    if (opts.factory_id) where.factory_id = opts.factory_id;
    if (opts.date) where.date = opts.date;
    if (opts.user_id) where.user_id = opts.user_id;

    return this.attendanceModel.findAll({
      where,
      include: [
        {
          model: this.dbService.sqlService.User,
          as: 'user',
          attributes: ['id', 'name', 'phone_number'],
        },
      ],
      order: [['date', 'DESC']],
    });
  }

  async findOne(id: number) {
    const record = await this.attendanceModel.findByPk(id, {
      include: [
        {
          model: this.dbService.sqlService.User,
          as: 'user',
          attributes: ['id', 'name', 'phone_number'],
        },
      ],
    });
    if (!record) throw new NotFoundException('Attendance record not found');
    return record;
  }
}

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  list(
    @Query('factory_id') factory_id?: string,
    @Query('date') date?: string,
    @Query('user_id') user_id?: string,
  ) {
    return this.attendanceService.list({
      factory_id: factory_id ? Number(factory_id) : undefined,
      user_id: user_id ? Number(user_id) : undefined,
      date,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.attendanceService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAttendanceDto) {
    return this.attendanceService.create(dto);
  }
}
