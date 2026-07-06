import { IsString, IsEmail, IsNotEmpty, IsOptional, IsNumber, IsObject } from 'class-validator';

export class PermissoesDto {
  @IsOptional() isOwner?: boolean;
  @IsOptional() verFinanceiro?: boolean;
  @IsOptional() gerenciarProdutos?: boolean;
  @IsOptional() caixaPedidos?: boolean;
}

export class CriarFuncionarioDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  nome!: string;

  @IsString()
  @IsNotEmpty({ message: 'O CPF é obrigatório.' })
  cpf!: string;

  @IsEmail({}, { message: 'Formato de e-mail inválido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  senha!: string;

  @IsString()
  @IsOptional()
  telefone?: string;

  @IsNumber({}, { message: 'O ID do restaurante deve ser um número válido.' })
  @IsNotEmpty({ message: 'O vínculo com um restaurante é obrigatório.' })
  restauranteId!: number;

  @IsObject()
  @IsOptional()
  permissoes?: PermissoesDto;
}