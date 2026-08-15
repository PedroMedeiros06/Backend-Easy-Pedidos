// src/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthParms } from './auth.dto';

@Controller('auth') // Rota base: http://localhost:3000/auth
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login') // Rota: POST /auth/login
  @HttpCode(HttpStatus.OK) // Força o retorno HTTP 200 ao invés do 211 padrão de POST
  async login(
    @Body() payload: AuthParms
  ) {
    return await this.authService.login(payload);
  }
}