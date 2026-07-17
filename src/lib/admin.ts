import { supabase } from '@/integrations/supabase/client';

interface RpcError {
  message: string;
}

type RpcClient = (
  functionName: string,
  args?: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: RpcError | null }>;

const rpc = supabase.rpc.bind(supabase) as unknown as RpcClient;

export interface AdminActivityPoint {
  date: string;
  users: number;
}

export interface AdminSignupPoint {
  day: string;
  count: number;
}

export interface AdminDashboardSnapshot {
  totalUsers: number;
  newUsers30d: number;
  activeUsers30d: number;
  paidUsers: number;
  completedOnboarding: number;
  expiring7d: number;
  pointRecords30d: number;
  activity: AdminActivityPoint[];
  plans: {
    free: number;
    monthly: number;
    annual: number;
  };
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  created_at: string | null;
  plan: string | null;
  subscription_status: string;
  plan_expires_at: string | null;
  onboarding_complete: boolean;
  last_activity: string | null;
  total_count: number;
}

export interface AdminUserDetail {
  id: string;
  nome: string | null;
  email: string | null;
  empresa: string | null;
  plano: string | null;
  is_pro: boolean;
  subscription_status: string;
  plano_vencimento: string | null;
  onboarding_completo: boolean;
  created_at: string | null;
  data_admissao: string | null;
  total_marcacoes: number;
  last_activity: string | null;
  providers: string[] | null;
}

function assertData<T>(data: unknown, error: RpcError | null): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await rpc('is_admin');
  return assertData<boolean>(data, error);
}

export async function getAdminDashboard(): Promise<AdminDashboardSnapshot> {
  const { data, error } = await rpc('admin_dashboard_snapshot');
  return assertData<AdminDashboardSnapshot>(data, error);
}

export async function getAdminUsers(search: string, limit: number, offset: number): Promise<AdminUser[]> {
  const { data, error } = await rpc('admin_list_users', {
    search_term: search || null,
    page_limit: limit,
    page_offset: offset,
  });
  const rows = assertData<AdminUser[]>(data, error);
  return Array.isArray(rows) ? rows : [];
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail> {
  const { data, error } = await rpc('admin_get_user', { target_user_id: userId });
  return assertData<AdminUserDetail>(data, error);
}

export async function getAdminSignupTrend(daysBack = 30): Promise<AdminSignupPoint[]> {
  const { data, error } = await rpc('admin_signup_trend', { days_back: daysBack });
  const rows = assertData<AdminSignupPoint[]>(data, error);
  return Array.isArray(rows) ? rows : [];
}
