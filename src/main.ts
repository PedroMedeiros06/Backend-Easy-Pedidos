// src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { writeFileSync } from 'fs';
import { SupabaseExceptionFilter } from './common/filters/supabase-exception.filter';

// Força o Node.js a ler o arquivo .env ANTES de carregar o NestJS e o Prisma
try {
  process.loadEnvFile();
} catch (e) {
  // Ignora se o ambiente já tiver as variáveis configuradas externamente
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Ativa o CORS para permitir que seu Front-end se conecte depois
  app.enableCors();

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Ignora propriedades que não estão no DTO
    transform: true, // Converte tipos automaticamente
  }));

  app.useGlobalFilters(new SupabaseExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();