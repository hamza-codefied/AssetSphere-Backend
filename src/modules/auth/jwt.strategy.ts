import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { EmployeesService } from '../employees/employees.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly employeesService: EmployeesService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret', 'dev-access-secret-change-me'),
    });
  }

  async validate(payload: { sub: string }) {
    const employee = await this.employeesService.findById(payload.sub);
    if (!employee.isActive || employee.status === 'Inactive') {
      throw new UnauthorizedException('Account is inactive');
    }
    return this.employeesService.sanitize(employee);
  }
}
