import { Test, TestingModule } from '@nestjs/testing';
import { IntegracoesController } from './integracoes.controller';

describe('IntegracoesController', () => {
  let controller: IntegracoesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegracoesController],
    }).compile();

    controller = module.get<IntegracoesController>(IntegracoesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
