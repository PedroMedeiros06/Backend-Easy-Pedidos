import { IsBoolean, IsOptional, IsString, IsEmail } from 'class-validator';

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

export class AlternarStatusRestauranteDto {
  @IsBoolean()
  ativo!: boolean;

  @IsOptional()
  @IsString()
  motivo?: string;
}