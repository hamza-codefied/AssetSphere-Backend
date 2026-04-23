import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  getStatus() {
    return {
      status: 'ok',
      service: this.configService.get<string>('app.name', 'AssetSphere API'),
      environment: this.configService.get<string>('app.env', 'development'),
      timestamp: new Date().toISOString(),
    };
  }
}
