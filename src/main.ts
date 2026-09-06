import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SupabaseExceptionFilter } from './common/filters/supabase-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Previews e produção do frontend na Vercel: qualquer subdomínio do
  // projeto (easy-pedidos-<hash>-...vercel.app) muda a cada deploy, então
  // liberamos por padrão em vez de listar URL a URL.
  // TODO(pendência P2): trocar por um domínio Vercel fixo e remover o regex.
  const vercelPreview = /^https:\/\/easy-pedidos-[a-z0-9-]+\.vercel\.app$/;

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || vercelPreview.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin não permitida pelo CORS: ${origin}`));
    },
    credentials: true,
  });

  app.useGlobalFilters(new SupabaseExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
