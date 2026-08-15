import { Injectable, BadRequestException, NotFoundException, Query} from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { CriarRestauranteDto, AtualizarRestauranteDto, AlternarStatusRestauranteDto, ListarRestaurantesDto, Company  } from './dto/company.dto';
import { Member } from 'src/funcionarios/dto/funcionarios.dto';

@Injectable()
export class CompanyService {
  constructor(private readonly supabase: SupabaseService) {}

  // 1️⃣ LISTAR RESTAURANTES (Trazendo os dados mapeados idênticos ao que a tabela espera)
  async list(filtros: ListarRestaurantesDto) {
    const { data: companies, error: companiesError } = await this.supabase.client
      .from('companies')
      .select('*, members(member_id, member_name, member_access)')
      // .neq('id', 0)
      .order('company_name', { ascending: true })
      .limit(filtros.limite || 10);

    if (companiesError) throw new BadRequestException(`Erro ao listar estabelecimentos: ${companiesError.message}`);
    if (!companies) return [];

    return companies.map((company: Company) => {
      const owner = company.members?.find(
        (member: Member) => member.member_access === "owner"
      );

      return {
        company_id: company.company_id,
        company_code: company.company_code,
        company_name: company.company_name,
        company_cnpj: company.company_cnpj,
        company_email: company.company_email,
        created_at: company.created_at,
        blocked: company.blocked,
        reason: company.reason,
        ownerName: owner ? owner.member_name : 'Não informado',
      };
    });
  }

  // 2️⃣ CADASTRAR RESTAURANTE + DONO MASTER (Sua regra de negócio original recuperada!)
  async create(payload: CriarRestauranteDto) {

    // A. Verifica se o CPF do dono já existe
    const { data: owner_object } = await this.supabase.client
      .from('members')
      .select('member_id')
      .eq('member_cpf', payload.cpf)
      .maybeSingle();

    if (owner_object) {
      throw new BadRequestException('Já existe um funcionário cadastrado com este CPF.');
    }

    // B. Insere o restaurante com código provisório para capturar o ID sequencial
    const { data: company, error: errorCompany } = await this.supabase.client
      .from('company')
      .insert({
        company_code: 'TEMP',
        company_email: payload.email,
        blocked: false
      })
      .select()
      .single();

    if (errorCompany) {
      console.log(errorCompany)
      throw new BadRequestException('Erro ao criar compania: ', errorCompany.message);
    }

    // D. Cria o funcionário Dono vinculado a esse restaurante
    const { error: errorMember } = await this.supabase.client
      .from('members')
      .insert({
        member_name: payload.nomeDono,
        member_cpf: payload.cpf,
        company_id: company.company_id,
        member_access: "owner"
      });

    if (errorMember) {
      console.log(errorMember)
      throw new BadRequestException('Erro ao criar dono: ', errorMember.message);
    } 

    const companySerialCode = `E-${1000 + company.company_id}`;
    
    const { data: updatedCompany, error: errorUpdate } = await this.supabase.client
      .from('companies')
      .update({ company_id: companySerialCode })
      .eq('company_id', company.company_id)
      .select()
      .single();

    if (errorUpdate) {
      console.log(errorUpdate)
      throw new BadRequestException('Erro ao atualizar o codigo da compania: ', errorUpdate.message)
    }

    return {
      message: 'Estabelecimento e Dono Mestre cadastrados com sucesso!',
      company_code: companySerialCode,
      company: updatedCompany,
    };
  }

  // // 3️⃣ ATUALIZAR DADOS DO RESTAURANTE
  // async atualizar(id: number, dados: AtualizarRestauranteDto) {
  //   const { data, error } = await this.supabase.client
  //     .from('Restaurante')
  //     .update(dados)
  //     .eq('id', id)
  //     .select();

  //   if (error) throw new BadRequestException(`Erro ao atualizar estabelecimento: ${error.message}`);
  //   if (!data || data.length === 0) throw new NotFoundException('Restaurante não encontrado.');

  //   return data[0];
  // }

  // // 4️⃣ ALTERAR STATUS (Invertendo para salvar na coluna 'bloqueado' usada pelo painel)
  // async alternarStatus(id: number, dados: AlternarStatusRestauranteDto) {
  //   const isBloqueado = !dados.ativo;

  //   const { data, error } = await this.supabase.client
  //     .from('Restaurante')
  //     .update({ 
  //       bloqueado: isBloqueado,
  //       motivo_bloqueio: isBloqueado ? (dados.motivo || null) : null 
  //     })
  //     .eq('id', id)
  //     .select();

  //   if (error) throw new BadRequestException(`Erro ao alterar status da loja: ${error.message}`);
  //   if (!data || data.length === 0) throw new NotFoundException('Restaurante não encontrado.');

  //   return {
  //     mensagem: 'Status alterado com sucesso!',
  //     bloqueado: data[0].bloqueado,
  //     motivoBloqueio: data[0].motivoBloqueio, // Retorna para o front confirmar
  //   };
  // }

  // async deletar(id: number) {
  //   // A. Opcional: Remove primeiro os funcionários vinculados para evitar travas de chave estrangeira
  //   const { error: errorFuncionarios } = await this.supabase.client
  //     .from('Funcionario')
  //     .delete()
  //     .eq('restauranteId', id);

  //   if (errorFuncionarios) {
  //     throw new BadRequestException(`Erro ao remover funcionários vinculados: ${errorFuncionarios.message}`);
  //   }

  //   // B. Remove o restaurante
  //   const { data, error } = await this.supabase.client
  //     .from('Restaurante')
  //     .delete()
  //     .eq('id', id)
  //     .select();

  //   if (error) throw new BadRequestException(`Erro ao excluir restaurante: ${error.message}`);
  //   if (!data || data.length === 0) throw new NotFoundException('Restaurante não encontrado.');

  //   return {
  //     mensagem: 'Restaurante e funcionários removidos com sucesso!',
  //   };
  // }
}