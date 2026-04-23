import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { VaultService } from './vault.service';

@ApiTags('Vault')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vault')
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Get()
  @Permissions('vault.view')
  async getVault() {
    return { data: await this.vaultService.getVault() };
  }

  @Post('reveal')
  @Permissions('vault.reveal_passwords')
  reveal(@Body() body: { encrypted: { iv: string; tag: string; ciphertext: string } }) {
    return { data: this.vaultService.reveal(body) };
  }
}
