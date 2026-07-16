import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { checkIsAdmin } from '@/lib/admin';

const ChefEntrarPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();

  // If already logged in, check if admin
  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setChecking(false);
      return;
    }
    checkIsAdmin()
      .then((isAdmin) => {
        if (isAdmin) navigate('/chefe', { replace: true });
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [session, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const isAdmin = await checkIsAdmin();
      if (!isAdmin) {
        await supabase.auth.signOut();
        toast({
          title: 'Acesso negado',
          description: 'Esta área é restrita a administradores.',
          variant: 'destructive',
        });
        return;
      }
      navigate('/chefe', { replace: true });
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Credenciais inválidas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
      {/* Header */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 border border-cyan-400/20">
          <ShieldCheck className="h-8 w-8 text-cyan-400" />
        </div>
        <div className="text-center">
          <h1 className="text-white text-2xl font-bold tracking-tight">Painel do Chefe</h1>
          <p className="text-slate-500 text-sm mt-1">Hora Justa · Acesso Administrativo</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-[380px] rounded-2xl border border-white/10 bg-slate-900 p-8 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">E-mail</label>
            <Input
              type="email"
              placeholder="admin@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 rounded-xl border-white/10 bg-slate-950 text-slate-100 placeholder:text-slate-600 focus:border-cyan-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Senha</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 rounded-xl border-white/10 bg-slate-950 text-slate-100 placeholder:text-slate-600 focus:border-cyan-500"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 h-11 font-bold text-slate-950 hover:bg-cyan-400 transition-colors"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                Verificando...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Acessar Painel
              </>
            )}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-slate-700">
        Área restrita · Somente administradores autorizados
      </p>
    </div>
  );
};

export default ChefEntrarPage;
