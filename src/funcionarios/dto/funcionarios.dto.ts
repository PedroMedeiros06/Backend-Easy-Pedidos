import { IsString, IsEmail, IsNotEmpty, IsOptional, IsNumber, IsObject, IsBoolean, IsInt, Min, Max, ValidateNested } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { UUID } from 'crypto';

export class PermissoesDto {
  @IsOptional() @IsBoolean() isOwner?: boolean;
  @IsOptional() @IsBoolean() verFinanceiro?: boolean;
  @IsOptional() @IsBoolean() gerenciarProdutos?: boolean;
  @IsOptional() @IsBoolean() caixaPedidos?: boolean;
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
  senhaHash!: string;

  @IsString()
  @IsOptional()
  telefone?: string;

  @IsNumber({}, { message: 'O ID do restaurante deve ser um número válido.' })
  @IsNotEmpty({ message: 'O vínculo com um restaurante é obrigatório.' })
  restauranteId!: number;

  @IsOptional()
  @IsObject()
  @ValidateNested() // 🔥 Obrigatório para validar objetos aninhados
  @Type(() => PermissoesDto) // 🔥 Força a conversão para a classe correta
  permissoes?: PermissoesDto;
}

export class AtualizarFuncionarioDto extends PartialType(CriarFuncionarioDto) {}

export class AlternarStatusFuncionarioDto {
  @IsBoolean({ message: 'O campo ativo deve ser um booleano.' })
  @IsNotEmpty({ message: 'O campo ativo é obrigatório.' })
  ativo!: boolean;

  @IsString()
  @IsOptional()
  motivo?: string;
}

export class ListarFuncionarios {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number = 10;
}

export interface Member {
  member_id: UUID;
  auth_id: UUID;
  member_name: string;
  company_id: UUID;
  member_cpf: string;
  member_email: string;
  member_access: string;

}