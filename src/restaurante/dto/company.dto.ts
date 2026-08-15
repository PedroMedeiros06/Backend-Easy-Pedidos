import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UUID } from 'crypto';
import { Timestamp } from 'rxjs';
import { Member } from 'src/funcionarios/dto/funcionarios.dto';

// ==========================================
// 1️⃣ CADASTRAR RESTAURANTE
// ==========================================
export class CriarRestauranteDto {
  // --- Dados Básicos ---
  @IsNotEmpty({ message: 'O nome do restaurante é obrigatório.' })
  @IsString()
  nome_fantasia!: string;

  @IsOptional()
  @IsString()
  razao_social?: string;

  // --- Dados Cadastrais / CNPJ (BrasilAPI) ---
  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  cnae_fiscal_descricao?: string;

  @IsOptional()
  @IsString()
  situacao_cadastral?: string;

  // --- Endereço / Localização (BrasilAPI) ---
  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsString()
  logradouro?: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @IsOptional()
  @IsString()
  bairro?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  // --- Contato & Responsável ---
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

  // --- Plano & Assinatura (Mercado Pago) ---
  @IsOptional()
  @IsNumber()
  plano_id?: number;

  @IsOptional()
  @IsString()
  status_assinatura?: string;
}

// ==========================================
// 2️⃣ ATUALIZAR RESTAURANTE
// ==========================================
export class AtualizarRestauranteDto {
  // --- Dados Básicos & Cadastrais ---
  @IsOptional()
  @IsString()
  nome_fantasia?: string;

  @IsOptional()
  @IsString()
  razao_social?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  cnae_fiscal_descricao?: string;

  @IsOptional()
  @IsString()
  situacao_cadastral?: string;

  // --- Endereço / CEP ---
  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsString()
  logradouro?: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @IsOptional()
  @IsString()
  bairro?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  // --- Contato ---
  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido.' })
  email?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  // --- Plano ---
  @IsOptional()
  @IsNumber()
  plano_id?: number;

  @IsOptional()
  @IsString()
  status_assinatura?: string;
}

// ==========================================
// 3️⃣ ALTERAR STATUS (ATIVO / INATIVO)
// ==========================================
export class AlternarStatusRestauranteDto {
  @IsBoolean()
  ativo!: boolean;

  @IsOptional()
  @IsString()
  motivo?: string;
}

// ==========================================
// 4️⃣ LISTAR / PAGINAÇÃO
// ==========================================
export class ListarRestaurantesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number = 10;
}

export class company_legal {
  @IsString() trade_name?: string;
  @IsString() registred_name?: string;
  @IsString() cnae_code?: string;
  @IsString() registration_status?: string;
}

export interface Company {
  company_id: UUID;
  members: [Member];
  company_code: string;
  company_name: string;
  company_cnpj?: string;
  company_email?: string;
  company_legal?: company_legal;
  blocked: boolean;
  reason?: string;
  created_at: string;

}