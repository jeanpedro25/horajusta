import React from 'react';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { Shield, Lock, Eye, Trash2, Database } from 'lucide-react';

const PrivacidadePage: React.FC = () => {
  return (
    <div className="app-with-bottom-nav min-h-screen bg-background">
      <AppHeader title="Privacidade" subtitle="Seus dados, suas regras" />
      <div className="px-4 -mt-3 max-w-lg mx-auto space-y-4">
        <div className="bg-card rounded-xl border border-border p-5 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={18} className="text-accent" />
            <span className="font-semibold">Política de Privacidade — LGPD</span>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Esta política descreve o tratamento de dados pessoais no Hora Justa à luz da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD).
          </p>

          <div className="space-y-4">
            <div className="flex gap-3">
              <Lock size={16} className="text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Criptografia</p>
                <p className="text-xs text-muted-foreground">
                  O acesso e o armazenamento dependem dos controles técnicos dos serviços usados pelo Hora Justa. Os detalhes de criptografia e fornecedores precisam ser confirmados na política pública antes do lançamento.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Database size={16} className="text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Seus dados pertencem a você</p>
                <p className="text-xs text-muted-foreground">
                  Seus registros são usados para fornecer as funções do app. O Hora Justa não vende dados pessoais; prestadores de hospedagem, autenticação e pagamento podem tratar os dados necessários para operar seus serviços.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Eye size={16} className="text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Transparência total</p>
                <p className="text-xs text-muted-foreground">
                  O serviço trata dados de conta e os dados de jornada, arquivos e pagamentos que você utiliza. A lista completa, finalidades, prazos e locais de tratamento deve constar na política pública validada antes do lançamento.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Trash2 size={16} className="text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Solicitações sobre seus dados</p>
                <p className="text-xs text-muted-foreground">
                  Você pode solicitar acesso, correção ou exclusão em Configurações ou pelo contato de suporte. Ao excluir a conta, o campo user_id do ledger de pagamentos é desvinculado, mas a referência externa e o payload recebido do Mercado Pago não são apagados automaticamente pelo código atual e podem conter identificadores relacionados à compra. Ainda não há prazo automático de expurgo definido para esses eventos; outros dados mantidos por prestadores podem seguir prazos próprios.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-accent/5 rounded-lg p-3 border border-accent/20">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              As bases legais e os prazos variam conforme a finalidade e devem ser descritos na política pública após validação. Contato: contato@horajusta.app
            </p>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default PrivacidadePage;
