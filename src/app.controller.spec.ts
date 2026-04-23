import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HealthService } from './health/health.service';

describe('HealthService', () => {
  let healthService: HealthService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [HealthService],
    }).compile();

    healthService = app.get<HealthService>(HealthService);
  });

  describe('getStatus', () => {
    it('should return service status payload', () => {
      const status = healthService.getStatus();
      expect(status.status).toBe('ok');
      expect(status.timestamp).toBeDefined();
    });
  });
});
