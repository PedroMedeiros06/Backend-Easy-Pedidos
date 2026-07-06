// src/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth') // Rota base: http://localhost:3000/auth
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login') // Rota: POST /auth/login
  @HttpCode(HttpStatus.OK) // Força o retorno HTTP 200 ao invés do 211 padrão de POST
  async login(
    @Body() dados: { codigoRestaurante: string; cpf: string; senha: string }
  ) {
    return await this.authService.validarLogin(dados);
  }
}