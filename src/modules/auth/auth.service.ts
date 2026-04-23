import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { EmployeesService } from '../employees/employees.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const employee = await this.employeesService.validateCredentials(email, password);
    if (!employee) throw new UnauthorizedException('Invalid email or password');
    const tokens = await this.issueTokens(
      employee.id.toString(),
      employee.email,
      employee.role,
    );
    await this.saveRefreshTokenHash(employee.id.toString(), tokens.refreshToken);

    return {
      user: this.employeesService.sanitize(employee),
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; email: string; role: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const employee = await this.employeesService.findById(payload.sub);
    if (!employee.refreshTokenHash) throw new UnauthorizedException('Missing refresh session');
    const matches = await bcrypt.compare(refreshToken, employee.refreshTokenHash);
    if (!matches) throw new UnauthorizedException('Refresh token mismatch');

    const tokens = await this.issueTokens(
      employee.id.toString(),
      employee.email,
      employee.role,
    );
    await this.saveRefreshTokenHash(employee.id.toString(), tokens.refreshToken);
    return {
      user: this.employeesService.sanitize(employee),
      ...tokens,
    };
  }

  async logout(employeeId: string): Promise<void> {
    await this.employeesService.setRefreshTokenHash(employeeId, null);
  }

  private async issueTokens(userId: string, email: string, role: string) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, role },
      {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessTtl', '15m') as any,
      },
    );
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, email, role },
      {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshTtl', '7d') as any,
      },
    );
    return { accessToken, refreshToken };
  }

  private async saveRefreshTokenHash(userId: string, refreshToken: string) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.employeesService.setRefreshTokenHash(userId, refreshTokenHash);
  }
}
