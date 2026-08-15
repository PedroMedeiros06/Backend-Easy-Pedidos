import { IsString, IsNotEmpty} from 'class-validator';
import { Type } from 'class-transformer';

export class AuthParms {
  @IsNotEmpty({ message: 'O código do restaurante é obrigatório'}) @IsString() company_code!: string;
  @IsNotEmpty({ message: 'O cpf do usuário é obrigatório'}) @IsString() member_cpf!: string;
  @IsNotEmpty({ message: 'A senha do usuário é obrigatória'}) @IsString() member_password!: string;
}