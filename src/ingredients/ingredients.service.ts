import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@/supabase/supabase.service';
import {
  AdjustIngredientDto,
  CreateIngredientDto,
  UpdateIngredientDto,
} from './dto/ingredients.dto';

@Injectable()
export class IngredientsService {
  constructor(private readonly supabase: SupabaseService) {}

  private toIngredientResponse(ingredient: any) {
    return {
      ingredientId: ingredient.ingredient_id,
      companyId: ingredient.company_id,
      ingredientName: ingredient.ingredient_name,
      unit: ingredient.unit,
      quantity: ingredient.quantity,
      lowStockAt: ingredient.low_stock_at,
      createdAt: ingredient.created_at,
      updatedAt: ingredient.updated_at,
    };
  }

  async list(companyId: number) {
    const { data, error } = await this.supabase.adminClient
      .from('ingredients')
      .select('*')
      .eq('company_id', companyId)
      .order('ingredient_name', { ascending: true });

    if (error) {
      throw new BadRequestException(
        `Erro ao listar ingredientes: ${error.message}`,
      );
    }

    return (data ?? []).map((ingredient: any) =>
      this.toIngredientResponse(ingredient),
    );
  }

  async create(companyId: number, payload: CreateIngredientDto) {
    const { data, error } = await this.supabase.adminClient
      .from('ingredients')
      .insert({
        company_id: companyId,
        ingredient_name: payload.ingredientName,
        unit: payload.unit,
        quantity: payload.quantity,
        low_stock_at: payload.lowStockAt,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        `Erro ao criar ingrediente: ${error.message}`,
      );
    }

    return this.toIngredientResponse(data);
  }

  async update(
    companyId: number,
    ingredientId: string,
    payload: UpdateIngredientDto,
  ) {
    const updatePayload: Record<string, unknown> = {
      ingredient_name: payload.ingredientName,
      unit: payload.unit,
      quantity: payload.quantity,
      low_stock_at: payload.lowStockAt,
      updated_at: new Date().toISOString(),
    };

    Object.keys(updatePayload).forEach((key) => {
      if (updatePayload[key] === undefined) {
        delete updatePayload[key];
      }
    });

    const { data, error } = await this.supabase.adminClient
      .from('ingredients')
      .update(updatePayload)
      .eq('ingredient_id', ingredientId)
      .eq('company_id', companyId)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Erro ao atualizar ingrediente: ${error.message}`,
      );
    }
    if (!data) {
      throw new NotFoundException('Ingrediente não encontrado.');
    }

    return this.toIngredientResponse(data);
  }

  async adjust(
    companyId: number,
    ingredientId: string,
    payload: AdjustIngredientDto,
  ) {
    const { data: current, error: currentError } =
      await this.supabase.adminClient
        .from('ingredients')
        .select('quantity')
        .eq('ingredient_id', ingredientId)
        .eq('company_id', companyId)
        .single();

    if (currentError || !current) {
      throw new NotFoundException('Ingrediente não encontrado.');
    }

    const newQuantity = current.quantity + payload.delta;

    if (newQuantity < 0) {
      throw new BadRequestException(
        'Estoque insuficiente para essa operação.',
      );
    }

    const { data, error } = await this.supabase.adminClient
      .from('ingredients')
      .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
      .eq('ingredient_id', ingredientId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        `Erro ao ajustar ingrediente: ${error.message}`,
      );
    }

    return this.toIngredientResponse(data);
  }

  async remove(companyId: number, ingredientId: string) {
    const { data, error } = await this.supabase.adminClient
      .from('ingredients')
      .delete()
      .eq('ingredient_id', ingredientId)
      .eq('company_id', companyId)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Erro ao remover ingrediente: ${error.message}`,
      );
    }
    if (!data) {
      throw new NotFoundException('Ingrediente não encontrado.');
    }

    return { message: 'Ingrediente removido com sucesso.' };
  }
}
