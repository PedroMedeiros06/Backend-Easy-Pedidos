import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
  public authClient: SupabaseClient;

  constructor() {
    require('dotenv').config();

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error(
        'As variáveis SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY precisam estar no .env',
      );
    }

    // Cliente para acessar o banco pelo backend.
    // Usa SERVICE ROLE para não ficar limitado pelas RLS.
    this.client = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    );

    // Cliente exclusivo para autenticação dos usuários.
    // Usa ANON KEY.
    this.authClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    );
  }
}