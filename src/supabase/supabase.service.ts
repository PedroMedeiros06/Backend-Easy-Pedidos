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

  // Duração de ban usada como "sessão revogada / acesso suspenso".
  // 100 anos = efetivamente permanente até ser explicitamente removido.
  private static readonly BAN_FOREVER = '876000h';

  /**
   * Suspende ou reativa o acesso dos usuários informados no Supabase Auth.
   *
   * `suspend: true` aplica um ban longo — invalida os refresh tokens ativos
   * (a sessão para de renovar) e bloqueia novo login. `suspend: false`
   * remove o ban.
   *
   * Usado quando um membro é desativado/reativado ou a empresa dele é
   * bloqueada/desbloqueada. O guard já barra a request na hora; isto
   * fecha o buraco do refresh token continuar válido.
   *
   * Best-effort: falha em um usuário não interrompe o fluxo, só loga.
   * Ignora ids nulos/repetidos.
   */
  async setAuthSuspension(
    authIds: Array<string | null | undefined>,
    suspend: boolean,
  ): Promise<void> {
    const uniqueIds = [...new Set(authIds.filter((id): id is string => !!id))];

    await Promise.all(
      uniqueIds.map(async (authId) => {
        const { error } = await this.adminClient.auth.admin.updateUserById(
          authId,
          { ban_duration: suspend ? SupabaseService.BAN_FOREVER : 'none' },
        );
        if (error) {
          console.error(
            `Falha ao ${suspend ? 'suspender' : 'reativar'} acesso do usuário ${authId}: ${error.message}`,
          );
        }
      }),
    );
  }
}
