import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';
import { LEGAL_COPY } from '@/lib/legal-copy';
import { LEGAL_DOCUMENT_VERSION } from '@/lib/legal-versions';

const PrivacidadePublicaPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="bg-primary px-4 py-5">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button type="button" aria-label="Voltar" onClick={() => navigate(-1)} className="text-primary-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-primary-foreground font-bold text-lg">Política de Privacidade</h1>
        </div>
      </div>

      <div className="px-4 mt-4 max-w-lg mx-auto">
        <div className="bg-card rounded-xl border border-border p-5 space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p className="text-xs">Versão {LEGAL_DOCUMENT_VERSION}</p>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={18} className="text-accent" />
            <span className="font-semibold text-foreground">Política de Privacidade — LGPD</span>
          </div>

          <p>
            Esta política descreve o tratamento de dados pessoais no Hora Justa à luz da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD).
          </p>

          <div>
            <p className="font-semibold text-foreground mb-1">Coleta de dados:</p>
            <p>O serviço pode tratar informações fornecidas pelo usuário e dados necessários para operar a conta, incluindo:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>E-mail da conta e nome informado</li>
              <li>Horários, escalas, marcações e observações da jornada</li>
              <li>Salário, empresa e outras configurações informadas para estimativas</li>
              <li>Atestados e outros arquivos anexados pelo usuário</li>
              <li>Plano, valor, status e identificadores necessários à conciliação de pagamentos</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-1">Uso dos dados:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Funcionamento do aplicativo</li>
              <li>Cálculo de estimativas</li>
              <li>Geração de relatórios</li>
              <li>Autenticação, proteção do serviço e atendimento a solicitações do usuário</li>
              <li>Iniciação, confirmação e conciliação de pagamentos quando contratados</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-1">Compartilhamento:</p>
            <p>O Hora Justa não vende dados pessoais. O serviço usa Supabase para autenticação, banco, armazenamento e funções de servidor, Vercel para hospedagem e Mercado Pago para checkout. As regiões de tratamento e eventuais suboperadores precisam ser confirmados e descritos na versão final desta política.</p>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-1">Armazenamento e retenção:</p>
            <p>{LEGAL_COPY.privacy}</p>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-1">Dados sensíveis:</p>
            <p>{LEGAL_COPY.sensitiveData}</p>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-1">Direitos do usuário:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Solicitar exclusão dos dados</li>
              <li>Solicitar acesso aos dados</li>
              <li>Corrigir informações</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-1">Base legal:</p>
            <p>A base legal depende da finalidade e da categoria dos dados e ainda precisa ser validada com o inventário do serviço antes da publicação final. O envio de um atestado não é registrado pelo aplicativo como consentimento específico para o tratamento de dados de saúde.</p>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-1">Contato:</p>
            <p>contato@horajusta.app</p>
          </div>

          <p className="text-xs text-muted-foreground/60">
            Para exercer direitos de acesso, correção ou exclusão, use as opções disponíveis em Configurações ou contate contato@horajusta.app. Alguns dados podem permanecer com prestadores ou ser retidos quando exigido por lei.
          </p>
        </div>

        <Button
          onClick={() => navigate(-1)}
          className="w-full mt-4 rounded-xl h-12 font-semibold"
        >
          Voltar
        </Button>
      </div>
    </div>
  );
};

export default PrivacidadePublicaPage;
