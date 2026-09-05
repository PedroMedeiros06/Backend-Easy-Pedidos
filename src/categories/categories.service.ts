import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@/supabase/supabase.service';
import {
  CreateCategoryDto,
  ListCategoriesQueryDto,
  UpdateCategoryDto,
} from './dto/categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly supabase: SupabaseService) {}

  private toCategoryResponse(category: any) {
    return {
      categoryId: category.category_id,
      companyId: category.company_id,
      categoryName: category.category_name,
      sortOrder: category.sort_order,
      active: category.active,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    };
  }

  async list(companyId: number, query: ListCategoriesQueryDto) {
    const { data, error } = await this.supabase.adminClient
      .from('categories')
      .select('*')
      .eq('company_id', companyId)
      .order('sort_order', { ascending: true })
      .limit(query.limit ?? 50);

    if (error) {
      throw new BadRequestException(
        `Erro ao listar categorias: ${error.message}`,
      );
    }

    return (data ?? []).map((category: any) => this.toCategoryResponse(category));
  }

  async create(companyId: number, payload: CreateCategoryDto) {
    const { data: company, error: planError } = await this.supabase.adminClient
      .from('companies')
      .select('plans(max_categories)')
      .eq('company_id', companyId)
      .single();

    if (planError || !company) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    const maxCategories = (company as any).plans?.max_categories ?? 0;

    const { count, error: countError } = await this.supabase.adminClient
      .from('categories')
      .select('category_id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (countError) {
      throw new BadRequestException(
        `Erro ao validar limite do plano: ${countError.message}`,
      );
    }

    if (maxCategories && (count ?? 0) >= maxCategories) {
      throw new BadRequestException(
        `O plano atual permite no máximo ${maxCategories} categoria(s). Faça upgrade para adicionar mais.`,
      );
    }

    const { data, error } = await this.supabase.adminClient
      .from('categories')
      .insert({
        company_id: companyId,
        category_name: payload.categoryName,
        sort_order: payload.sortOrder ?? 0,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        `Erro ao criar categoria: ${error.message}`,
      );
    }

    return this.toCategoryResponse(data);
  }

  async update(
    companyId: number,
    categoryId: string,
    payload: UpdateCategoryDto,
  ) {
    const { data, error } = await this.supabase.adminClient
      .from('categories')
      .update({
        category_name: payload.categoryName,
        sort_order: payload.sortOrder,
        active: payload.active,
        updated_at: new Date().toISOString(),
      })
      .eq('category_id', categoryId)
      .eq('company_id', companyId)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Erro ao atualizar categoria: ${error.message}`,
      );
    }
    if (!data) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    return this.toCategoryResponse(data);
  }

  async remove(companyId: number, categoryId: string) {
    const { data, error } = await this.supabase.adminClient
      .from('categories')
      .delete()
      .eq('category_id', categoryId)
      .eq('company_id', companyId)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Erro ao remover categoria: ${error.message}`,
      );
    }
    if (!data) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    return { message: 'Categoria removida com sucesso.' };
  }
}
