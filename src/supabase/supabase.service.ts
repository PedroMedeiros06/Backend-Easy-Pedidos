// src/prisma/prisma.service.ts
import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Exportamos a interface aqui para o RestauranteService conseguir importar!
export interface Permissoes {
  canCheckStocks: boolean;
  canSeeFinancialReports: boolean;
  canDoOrders: boolean;
  canSeeOrders: boolean;
  canChangeOrderState: boolean;
  canCancelOrder: boolean;
  isOwner: boolean;
}

@Injectable()
export class SupabaseService {
  public client: SupabaseClient;

  constructor() {
    require('dotenv').config();

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('As variáveis SUPABASE_URL e SUPABASE_ANON_KEY precisam estar no seu .env');
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }
}