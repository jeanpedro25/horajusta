import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="text-xl font-semibold">Página não encontrada</p>
        <p className="mb-6 mt-2 text-sm text-muted-foreground">O endereço acessado não existe ou foi alterado.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <a href="/auth" className="flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-secondary">
            Entrar no aplicativo
          </a>
          <a href="/chefe/entrar" className="flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Entrar como chefe
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
