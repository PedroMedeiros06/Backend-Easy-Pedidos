import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@/supabase/supabase.service';
import { AdjustStockDto, UpsertStockDto } from './dto/stock.dto';

@Injectable()
export class StockService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(companyId: number) {
    const { data, error } = await this.supabase.adminClient
      .from('stock')
      .select('*, catalog_items(item_name)')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Erro ao listar estoque: ${error.message}`);
    }

    return data ?? [];
  }

  async upsert(companyId: number, payload: UpsertStockDto) {
    const { data, error } = await this.supabase.adminClient
      .from('stock')
      .upsert(
        {
          company_id: companyId,
          item_id: payload.itemId,
          quantity: payload.quantity,
          low_stock_at: payload.lowStockAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'item_id' },
      )
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Erro ao salvar estoque: ${error.message}`);
    }

    return data;
  }

  async adjust(companyId: number, stockId: string, payload: AdjustStockDto) {
    const { data: current, error: currentError } =
      await this.supabase.adminClient
        .from('stock')
        .select('quantity')
        .eq('stock_id', stockId)
        .eq('company_id', companyId)
        .single();

    if (currentError || !current) {
      throw new NotFoundException('Registro de estoque não encontrado.');
    }

    const newQuantity = current.quantity + payload.delta;

    if (newQuantity < 0) {
      throw new BadRequestException('Estoque insuficiente para essa operação.');
    }

    const { data, error } = await this.supabase.adminClient
      .from('stock')
      .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
      .eq('stock_id', stockId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        `Erro ao ajustar estoque: ${error.message}`,
      );
    }

    return data;
  }
}
