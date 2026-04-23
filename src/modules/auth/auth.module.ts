import { Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmployeesModule } from '../employees/employees.module';
import { JwtStrategy } from './jwt.strategy';
import { EmployeesService } from '../employees/employees.service';

@Module({
  imports: [
    EmployeesModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.accessSecret'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly employeesService: EmployeesService) {}

  async onModuleInit(): Promise<void> {
    await this.employeesService.seedDefaults();
  }
}
