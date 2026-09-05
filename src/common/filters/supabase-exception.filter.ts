import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class SupabaseExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // 1. Se já for um erro padrão do NestJS (ex: validação do DTO), deixa passar normal
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resContent: any = exception.getResponse();
      return response.status(status).json(resContent);
    }

    // 2. Intercepta erros específicos do banco de dados (PostgreSQL / Supabase)
    const code = exception?.code || exception?.error?.code;
    const message = exception?.message || '';

    // Erro 23505: Registro Duplicado (Unique Violation)
    if (code === '23505') {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: [
          'Este registro (E-mail, CPF ou Código) já está cadastrado no sistema!',
        ],
        error: 'Bad Request',
      });
    }

    // Erro 23503: Violação de Chave Estrangeira (ex: restauranteId não existe)
    if (code === '23503') {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: [
          'O estabelecimento informado não foi encontrado ou é inválido.',
        ],
        error: 'Bad Request',
      });
    }

    // 3. Erro genérico não mapeado
    console.error('💥 Erro não tratado capturado pelo Filtro:', exception);
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ocorreu um erro interno no servidor.',
      error: 'Internal Server Error',
    });
  }
}
