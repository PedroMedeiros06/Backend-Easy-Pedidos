import { PartialType } from '@nestjs/mapped-types';
import { CriarFuncionarioDto } from './criar-funcionario.dto';
import { IsBoolean, IsString, IsOptional } from 'class-validator';

export class AtualizarFuncionarioDto extends PartialType(CriarFuncionarioDto) {}

export class AlternarStatusDto {
  @IsBoolean({ message: 'O status atual deve ser um booleano.' })
  statusAtual!: boolean;

  @IsString()
  @IsOptional()
  motivo?: string;
}