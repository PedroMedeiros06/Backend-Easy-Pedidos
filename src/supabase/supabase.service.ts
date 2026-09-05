import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  /**
   * Cliente público usado para operações que não precisam
   * de autenticação privilegiada.
   */
  public readonly authClient: SupabaseClient;

  /**
   * Cliente administrativo.
   *
   * ATENÇÃO:
   * Usa SERVICE_ROLE_KEY e ignora RLS.
   *
   * Deve ser utilizado SOMENTE em operações de Super Admin
   * ou operações internas extremamente específicas.
   */
  public readonly adminClient: SupabaseClient;

  private readonly supabaseUrl: string;
  private readonly supabaseAnonKey: string;
  private readonly supabaseServiceRoleKey: string;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');

    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    const supabaseServiceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL não foi configurada.');
    }

    if (!supabaseAnonKey) {
      throw new Error('SUPABASE_ANON_KEY não foi configurada.');
    }

    if (!supabaseServiceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY não foi configurada.');
    }

    this.supabaseUrl = supabaseUrl;
    this.supabaseAnonKey = supabaseAnonKey;
    this.supabaseServiceRoleKey = supabaseServiceRoleKey;

    /**
     * Cliente usando ANON KEY.
     *
     * Será usado principalmente para autenticação.
     */
    this.authClient = createClient(this.supabaseUrl, this.supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    /**
     * Cliente usando SERVICE ROLE.
     *
     * NÃO usar nas operações normais dos usuários.
     */
    this.adminClient = createClient(
      this.supabaseUrl,
      this.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    );
  }

  /**
   * Cria um cliente Supabase autenticado com o JWT
   * do usuário atual.
   *
   * As operações realizadas por esse cliente deverão
   * respeitar as RLS policies do Supabase.
   */
  createUserClient(accessToken: string): SupabaseClient {
    return createClient(this.supabaseUrl, this.supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
}
