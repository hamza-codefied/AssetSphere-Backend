import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { EmployeesService } from '../employees/employees.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly employeesService: EmployeesService,
  ) {}

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto) {
    const data = await this.authService.login(body.email, body.password);
    return { data };
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() body: RefreshTokenDto) {
    const data = await this.authService.refresh(body.refreshToken);
    return { data };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: { id: string }) {
    await this.authService.logout(user.id);
    return { data: { success: true } };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: { id?: string; email?: string }) {
    if (!user.id && !user.email) throw new UnauthorizedException();
    const employee = user.id
      ? await this.employeesService.findById(user.id)
      : await this.employeesService.findByEmail(String(user.email));
    if (!employee) throw new UnauthorizedException();
    return { data: this.employeesService.sanitize(employee) };
  }
}
