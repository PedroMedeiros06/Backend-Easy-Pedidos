import { IsNotEmpty, IsOptional, IsString, IsEmail, MinLength, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// 1️⃣ CADASTRAR
export class CriarRestauranteDto {
  @IsNotEmpty({ message: 'O nome do restaurante é obrigatório.' })
  @IsString()
  nome!: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsNotEmpty({ message: 'O e-mail comercial é obrigatório.' })
  @IsEmail({}, { message: 'E-mail inválido.' })
  email!: string;

  @IsNotEmpty({ message: 'O WhatsApp é obrigatório.' })
  @IsString()
  whatsapp!: string;

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

// 2️⃣ ATUALIZAR DADOS
export class AtualizarRestauranteDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido.' })
  email?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;
}

// 3️⃣ ALTERAR STATUS
export class AlternarStatusRestauranteDto {
  @IsBoolean()
  ativo!: boolean;

  @IsOptional()
  @IsString()
  motivo?: string;
}

// 4️⃣ LISTAR / PAGINAÇÃO
export class ListarRestaurantesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number = 10;
}