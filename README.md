# Hora Justa

Aplicação de controle pessoal de jornada construída com React, Vite, Supabase e Vercel.

## Desenvolvimento

```bash
npm ci
npm run dev
```

Use `.env.example` como referência para as variáveis públicas do frontend. Nunca use a chave `service_role` no Vite ou no navegador.

## Trial e cobrança

- O cadastro cria a conta pelo Supabase Auth; não coleta cartão nem inicia checkout.
- O trial PRO começa na criação do perfil e dura exatamente sete períodos de 24 horas. A mesma regra é usada pelo app e pelas funções de exportação; não há cobrança automática quando o trial termina.
- Para continuar depois do trial, a pessoa escolhe explicitamente um plano. O catálogo compartilhado em `supabase/functions/_shared/plan-catalog.ts` define PRO mensal (R$ 9,90 por 1 mês) e anual (R$ 89,90 por 12 meses); ambos são pagamento único, sem renovação automática.
- A tela de retorno do Mercado Pago não libera o plano por si só: o acesso PRO depende da confirmação validada e processada pelo webhook.

## Validação

```bash
npm test
npm run build
npm run lint
npm run test:e2e
npm run typecheck:e2e
```

O Playwright sobe um Vite isolado na porta 4173 com URL/chave Supabase fictícias e executa a landing em Chromium mobile; não usa contas ou checkout reais. O lint global ainda possui débitos técnicos anteriores. Mudanças novas devem ser validadas também com ESLint focado nos arquivos alterados.

## Painel do Chefe

O dashboard está disponível em `/chefe`, com login dedicado em `/chefe/entrar`. A rota do frontend é apenas uma proteção de experiência; a autorização real ocorre nas funções SQL por meio de `public.is_admin()`.

Após aplicar `20260716000000_admin_dashboard_security.sql`, conceda o primeiro acesso pelo UUID verificado do usuário no SQL Editor do Supabase:

```sql
INSERT INTO private.user_roles (user_id, role, granted_by)
VALUES ('UUID_DO_USUARIO', 'admin', 'UUID_DO_USUARIO');
```

Não grave e-mail ou UUID administrativo em migrations versionadas. O painel inicial é somente leitura e não expõe salário, anexos ou marcações detalhadas.

## Implantação e produção

O banco já está em produção. Não execute `migrations_all.sql`: ele é um arquivo de bootstrap, não uma migração incremental. A publicação permanece bloqueada até a rotação da credencial histórica e os testes descritos em `LAUNCH_READINESS.md`.

Antes de qualquer alteração remota:

1. Rotacione a senha do banco Supabase que esteve versionada em `push_db.cjs` e revise logs/roles.
2. Use um projeto Supabase Preview descartável. O `project_id` em `supabase/config.toml` aponta para o projeto de produção; ele não serve como identificação segura do Preview. Antes de qualquer operação remota, obtenha o **Project Ref do Preview** no painel Supabase, confira visualmente que é o projeto descartável e vincule-o explicitamente: `supabase link --project-ref <PREVIEW_PROJECT_REF>`.
3. Confirme que `supabase/.temp/project-ref` contém exatamente `<PREVIEW_PROJECT_REF>` e que esse ref corresponde ao Preview aberto no dashboard. Se o arquivo estiver ausente, o ref divergir ou houver dúvida sobre o projeto, pare. Só então use `supabase migration list --linked`, confira o schema e faça backup; revise `supabase db push --dry-run --linked` e aplique no Preview somente as migrações pendentes em ordem de timestamp. Confirme na lista que `20260716000000_admin_dashboard_security.sql` e `20260717000000_fix_admin_list_users.sql` estão aplicadas antes de conceder papel admin. `--linked` significa o projeto vinculado localmente, não “Preview”. Não execute `db reset --linked` em produção nem use o ref de produção neste fluxo.
4. A migração `20260922000000_harden_definer_search_paths.sql` remove a antiga RPC de exclusão acessível a `authenticated` e altera sua assinatura para `delete_my_account(target_user_id uuid)`, executável somente por `service_role`. Implante a Edge Function `delete-account` compatível com essa assinatura no mesmo ciclo do Preview e confirme que chamada direta autenticada é negada. A alteração também foi espelhada no bootstrap `migrations_all.sql`, mas esse arquivo continua proibido como migração incremental de produção.
5. A migração `20260922020000_versioned_legal_acceptance.sql` adiciona aceite explícito/versionado para Termos e Privacidade. Aplicá-la antes do frontend; contas com somente o booleano legado precisarão aceitar a versão atual novamente. Testar `record_legal_acceptance()` e a negação de UPDATE direto em colunas de aceite no Preview. Não usar `migrations_all.sql` para aplicar incrementalmente.
6. As migrações `20260922030000_atomic_payment_event_apply.sql` e `20260922040000_atomic_checkout_reservations.sql` serializam eventos e limitam cada conta a uma preferência Checkout Pro ativa; aplique-as em ordem no Preview antes das Edge Functions. Valide retomada do mesmo link, duas requisições simultâneas, retorno de estado ativo, aprovado/reembolso, eventos fora de ordem e recuperação por `external_reference` após timeout. Se a busca do Mercado Pago não retornar exatamente uma preferência, o sistema falha fechado; investigue antes de liberar a tentativa.
7. Configure segredos isolados por ambiente. No Preview use token/segredo de teste do Mercado Pago e `MP_CHECKOUT_MODE=sandbox`; nunca copie segredos de produção para Preview nem os coloque em `VITE_*`.
8. No Preview, exercite exclusão, checkout/webhook, idempotência, reembolso/chargeback e exportações Free/PRO.
9. Só depois da revisão de segurança, privacidade e jurídico e de autorização explícita, planeje a implantação coordenada de migrações, Edge Functions e frontend em produção.

Consulte `SECURITY.md` e `LAUNCH_READINESS.md` antes de qualquer implantação. Não rode comandos remotos como parte de validação local.
