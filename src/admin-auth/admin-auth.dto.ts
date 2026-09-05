import { IsNotEmpty, IsString } from 'class-validator';

export class AdminAuthParms {
  @IsNotEmpty({ message: 'O CPF do administrador é obrigatório' })
  @IsString()
  admin_cpf!: string;
  @IsNotEmpty({ message: 'A senha do administrador é obrigatória' })
  @IsString()
  admin_password!: string;
}
