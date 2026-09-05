import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsCpf } from '@/common/validators/is-cpf';

export class CompanyLegalDto {
  @IsOptional() @IsString() cnpj?: string;
  @IsOptional() @IsString() tradeName?: string;
  @IsOptional() @IsString() registeredName?: string;
  @IsOptional() @IsString() cnaeDescription?: string;
  @IsOptional() @IsString() registrationStatus?: string;
}

export class CompanyLocationDto {
  @IsOptional() @IsString() zipCode?: string;
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() number?: string;
  @IsOptional() @IsString() complement?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
}

export class CreateCompanyDto {
  @IsNotEmpty({ message: 'O nome do estabelecimento é obrigatório.' })
  @IsString()
  companyName!: string;

  @IsNotEmpty({ message: 'O e-mail comercial é obrigatório.' })
  @IsEmail({}, { message: 'E-mail inválido.' })
  companyEmail!: string;

  @IsOptional()
  @IsObject()
  companyLegal?: CompanyLegalDto;

  @IsOptional()
  @IsObject()
  companyLocation?: CompanyLocationDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  planId?: number;

  @IsNotEmpty({ message: 'O nome do responsável é obrigatório.' })
  @IsString()
  ownerName!: string;

  @IsNotEmpty({ message: 'O CPF do responsável é obrigatório.' })
  @IsString()
  @IsCpf({ message: 'CPF do responsável inválido.' })
  ownerCpf!: string;

  @IsNotEmpty({ message: 'A senha provisória é obrigatória.' })
  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  ownerPassword!: string;
}

export class UpdateCompanyDto {
  @IsOptional() @IsString() companyName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido.' })
  companyEmail?: string;

  @IsOptional() @IsObject() companyLegal?: CompanyLegalDto;
  @IsOptional() @IsObject() companyLocation?: CompanyLocationDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  planId?: number;
}

export class UpdateCompanyStatusDto {
  @IsBoolean({ message: 'O campo blocked deve ser um booleano.' })
  blocked!: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ListCompaniesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export interface Company {
  company_id: number;
  company_code: string;
  company_name: string;
  company_email: string | null;
  company_legal: Record<string, unknown> | null;
  company_location: Record<string, unknown> | null;
  plan_id: number;
  blocked: boolean;
  block_reason: string | null;
  created_at: string;
  updated_at: string;
}
