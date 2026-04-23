import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { databaseConfig } from './config/database.config';
import { appConfig } from './config/app.config';
import { jwtConfig } from './config/jwt.config';
import { cryptoConfig } from './config/crypto.config';
import { HealthModule } from './health/health.module';
import { CommonModule } from './common/common.module';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { HardwareModule } from './modules/hardware/hardware.module';
import { ToolsModule } from './modules/tools/tools.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { VaultModule } from './modules/vault/vault.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, cryptoConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>(
          'database.mongoUri',
          'mongodb://127.0.0.1:27017/assetsphere',
        ),
      }),
    }),
    CommonModule,
    HealthModule,
    ActivityLogModule,
    EmployeesModule,
    AuthModule,
    AccountsModule,
    HardwareModule,
    ToolsModule,
    SubscriptionsModule,
    ProjectsModule,
    VaultModule,
    DashboardModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // Order matters: JwtAuthGuard runs first to populate request.user,
    // then PermissionsGuard inspects the role.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
