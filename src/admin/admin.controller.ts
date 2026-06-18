import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('leads')
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: ['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED'] })
  @ApiQuery({ name: 'programOfInterest', required: false, enum: ['PREP', 'ACADEMICS', 'UPSKILL', 'CAREER', 'NOT_SURE'] })
  getLeads(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('programOfInterest') programOfInterest?: string,
  ) {
    return this.adminService.getLeads(+page, +limit, status, programOfInterest);
  }

  @Get('leads/:id')
  getLeadById(@Param('id') id: string) {
    return this.adminService.getLeadById(id);
  }

  @Patch('leads/:id')
  updateLead(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.adminService.updateLead(id, dto);
  }

  @Delete('leads/:id')
  @HttpCode(HttpStatus.OK)
  deleteLead(@Param('id') id: string) {
    return this.adminService.deleteLead(id);
  }
}
