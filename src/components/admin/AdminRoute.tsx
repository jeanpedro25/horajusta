import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';

const LoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
    <div className="text-center">
      <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      <p className="text-sm text-slate-400">Validando acesso administrativo...</p>
    </div>
  </div>
);

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const admin = useAdmin();

  if (loading || (session && admin.isPending)) return <LoadingScreen />;
  if (!session) return <Navigate to="/chefe/entrar" replace />;

  if (admin.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
        <div className="max-w-md rounded-3xl border border-red-500/20 bg-slate-900 p-8 text-center shadow-2xl">
          <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-red-400" />
          <h1 className="text-xl font-bold">Não foi possível validar o acesso</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Verifique se a migração administrativa foi aplicada no Supabase.
          </p>
        </div>
      </div>
    );
  }

  if (!admin.data) return <Navigate to="/app" replace />;
  return children;
}
