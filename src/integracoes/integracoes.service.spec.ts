import { Test, TestingModule } from '@nestjs/testing';
import { IntegracoesService } from './integracoes.service';

describe('IntegracoesService', () => {
  let service: IntegracoesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IntegracoesService],
    }).compile();

    service = module.get<IntegracoesService>(IntegracoesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
