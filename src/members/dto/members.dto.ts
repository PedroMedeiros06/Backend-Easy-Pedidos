import {
  IsBoolean,
  IsEmail,
  IsIn,
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
import { PartialType } from '@nestjs/mapped-types';
import { IsCpf } from '@/common/validators/is-cpf';

export class MemberPermissionsDto {
  @IsOptional() @IsBoolean() ordersCreate?: boolean;
  @IsOptional() @IsBoolean() ordersView?: boolean;
  @IsOptional() @IsBoolean() stockView?: boolean;
  @IsOptional() @IsBoolean() stockUpdate?: boolean;
  @IsOptional() @IsBoolean() financialView?: boolean;
  @IsOptional() @IsBoolean() membersManage?: boolean;
}

export class CreateMemberDto {
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @IsString()
  memberName!: string;

  @IsNotEmpty({ message: 'O CPF é obrigatório.' })
  @IsString()
  @IsCpf({ message: 'CPF inválido.' })
  memberCpf!: string;

  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  @IsEmail({}, { message: 'Formato de e-mail inválido.' })
  memberEmail!: string;

  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  memberPassword!: string;

  @IsOptional()
  @IsIn(['owner', 'employee'])
  memberAccess?: 'owner' | 'employee';

  @IsOptional()
  @IsObject()
  memberPermissions?: MemberPermissionsDto;
}

export class UpdateMemberDto extends PartialType(CreateMemberDto) {}

export class UpdateMemberStatusDto {
  @IsBoolean({ message: 'O campo active deve ser um booleano.' })
  active!: boolean;
}

export class ListMembersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export interface Member {
  member_id: string;
  auth_id: string;
  company_id: number;
  member_name: string;
  member_cpf: string;
  member_email: string;
  member_access: string;
  member_active: boolean;
  member_permissions: Record<string, boolean>;
}
