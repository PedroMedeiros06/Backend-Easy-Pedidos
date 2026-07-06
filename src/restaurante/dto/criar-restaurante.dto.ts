import { IsString, IsNotEmpty, IsOptional, MinLength, IsEmail } from 'class-validator';

export class criarRestauranteDto {
@IsNotEmpty({ message: 'O nome do restaurante é obrigatório.' })
  @IsString()
  nome!: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsNotEmpty({ message: 'O e-mail comercial é obrigatório.' })
  @IsEmail({}, { message: 'E-mail inválido.' })
  email!: string;

  @IsNotEmpty({ message: 'O WhatsApp de atendimento é obrigatório.' })
  @IsString()
  whatsapp!: string; // 🌟 Integrado com o novo campo

  // Dados do Dono Mestre para criação da conta
  @IsNotEmpty({ message: 'O nome do dono é obrigatório.' })
  @IsString()
  nomeDono!: string;

  @IsNotEmpty({ message: 'O CPF do dono é obrigatório.' })
  @IsString()
  cpf!: string;

  @IsNotEmpty({ message: 'A senha provisória é obrigatória.' })
  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  senha!: string;
}