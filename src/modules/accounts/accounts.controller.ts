import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @Permissions('accounts.view')
  async findAll() {
    return { data: await this.accountsService.findAll() };
  }

  @Get(':id')
  @Permissions('accounts.view')
  async findOne(@Param('id') id: string) {
    return { data: await this.accountsService.findById(id) };
  }

  @Post()
  @Permissions('accounts.create')
  async create(@Body() body: CreateAccountDto) {
    return { data: await this.accountsService.create(body) };
  }

  @Patch(':id')
  @Permissions('accounts.edit')
  async update(@Param('id') id: string, @Body() body: UpdateAccountDto) {
    return { data: await this.accountsService.update(id, body) };
  }

  @Get(':id/reveal')
  @Permissions('vault.reveal_passwords')
  async reveal(@Param('id') id: string) {
    return { data: await this.accountsService.reveal(id) };
  }

  @Post(':id/regenerate-backup-codes')
  @Permissions('accounts.edit')
  async regenerateBackupCodes(@Param('id') id: string) {
    return { data: await this.accountsService.regenerateBackupCodes(id) };
  }

  @Delete(':id')
  @Permissions('accounts.delete')
  async remove(@Param('id') id: string) {
    return { data: await this.accountsService.remove(id) };
  }
}
