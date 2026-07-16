# Hora Justa

Aplicação de controle pessoal de jornada construída com React, Vite, Supabase e Vercel.

## Desenvolvimento

```bash
npm ci
npm run dev
```

Use `.env.example` como referência para as variáveis públicas do frontend. Nunca use a chave `service_role` no Vite ou no navegador.

## Validação

```bash
npm test
npm run build
npm run lint
```

O lint global ainda possui débitos técnicos anteriores. Mudanças novas devem ser validadas também com ESLint focado nos arquivos alterados.

## Painel do Chefe

O dashboard está disponível em `/chefe`, com login dedicado em `/chefe/entrar`. A rota do frontend é apenas uma proteção de experiência; a autorização real ocorre nas funções SQL por meio de `public.is_admin()`.

Após aplicar `20260716000000_admin_dashboard_security.sql`, conceda o primeiro acesso pelo UUID verificado do usuário no SQL Editor do Supabase:

```sql
INSERT INTO private.user_roles (user_id, role, granted_by)
VALUES ('UUID_DO_USUARIO', 'admin', 'UUID_DO_USUARIO');
```

Não grave e-mail ou UUID administrativo em migrations versionadas. O painel inicial é somente leitura e não expõe salário, anexos ou marcações detalhadas.

## Produção

O banco já está em produção. Não execute `migrations_all.sql`: ele é um arquivo de bootstrap e não uma migração incremental segura.

Ordem obrigatória para esta versão:

1. Rotacionar a senha do banco Supabase que esteve versionada em `push_db.cjs` e revisar logs/roles.
2. Comparar o schema real com as migrations locais e criar backup ou branch de banco.
3. Aplicar `20260716000000_admin_dashboard_security.sql`.
4. Aplicar `20260716000001_payment_event_ledger.sql`.
5. Aplicar `20260716000002_account_and_storage_hardening.sql`.
6. Configurar os segredos das Edge Functions: `APP_URL`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_COLLECTOR_ID` e `MP_WEBHOOK_URL` quando necessário.
7. Implantar `create-payment`, `mp-webhook`, `gerar-excel` e `gerar-relatorio`.
8. Testar compra aprovada, evento repetido, pagamento inválido, reembolso e exportação Free/PRO.
9. Implantar o frontend na Vercel.
10. Conceder o papel do primeiro administrador por UUID.

Consulte `SECURITY.md` antes de cada implantação.
