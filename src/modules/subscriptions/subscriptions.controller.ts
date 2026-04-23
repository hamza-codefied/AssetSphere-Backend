import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @Permissions('subscriptions.view')
  async findAll() {
    return { data: await this.subscriptionsService.findAll() };
  }

  @Post()
  @Permissions('subscriptions.create')
  async create(@Body() body: CreateSubscriptionDto) {
    return { data: await this.subscriptionsService.create(body) };
  }

  @Patch(':id')
  @Permissions('subscriptions.edit')
  async update(@Param('id') id: string, @Body() body: UpdateSubscriptionDto) {
    return { data: await this.subscriptionsService.update(id, body) };
  }

  @Get(':id/reveal')
  @Permissions('vault.reveal_passwords')
  async reveal(@Param('id') id: string) {
    return { data: await this.subscriptionsService.reveal(id) };
  }

  @Delete(':id')
  @Permissions('subscriptions.delete')
  async remove(@Param('id') id: string) {
    return { data: await this.subscriptionsService.remove(id) };
  }
}
