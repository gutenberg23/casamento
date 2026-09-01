# Convite — Iasmin & Gutenberg

Hotsite de convite para a recepção do casamento, com confirmação de
presença e lista de presentes com pagamento real (Pix, débito e crédito
parcelado em até 12x via Mercado Pago).

## O que tem aqui

```
index.html                              → o site (sobe direto no Netlify)
netlify.toml                            → configuração de deploy do Netlify
supabase/schema.sql                     → banco de dados (rodar no Supabase)
supabase/functions/create-payment/      → cria a cobrança no Mercado Pago
supabase/functions/mp-webhook/          → confirma o pagamento e marca o presente
supabase/functions/admin-gifts/         → área de administração dos presentes
```

O site em si (`index.html`) é 100% estático — só HTML, CSS e JS. Quem faz
o trabalho pesado (banco de dados e pagamento) é o Supabase, através de
três Edge Functions.

---

## Passo 1 — Banco de dados no Supabase

Você já tem um projeto Supabase. Se for a primeira vez rodando este
schema, ou se estiver atualizando um projeto que já tinha a versão
anterior (sem o painel de presentes), o processo é o mesmo:

1. No painel do Supabase, vá em **SQL Editor > New query**.
2. Cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
   O script é seguro para rodar mais de uma vez.
3. Isso cria as tabelas `gifts`, `gift_orders`, `rsvps` e a view
   `gift_status`, já com 9 presentes de exemplo cadastrados (você vai
   poder editar tudo isso depois, sem SQL, pelo painel de administração
   do próprio site).

## Passo 2 — Conta no Mercado Pago

1. Crie/acesse sua conta em mercadopago.com.br.
2. Vá em **developers.mercadopago.com.br > Suas integrações > Criar
   aplicação**.
3. Em **Credenciais**, copie o **Access Token** (comece pelo de **teste**
   para validar tudo antes de usar o de produção).

## Passo 3 — Publicar as Edge Functions

Instale o [Supabase CLI](https://supabase.com/docs/guides/cli) se ainda
não tiver, depois, na raiz deste projeto:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF

supabase functions deploy create-payment
supabase functions deploy mp-webhook
supabase functions deploy admin-gifts
```

Defina os segredos usados pelas funções (ficam só no servidor, nunca no
site):

```bash
supabase secrets set MP_ACCESS_TOKEN=SEU_ACCESS_TOKEN_DO_MERCADO_PAGO
supabase secrets set SITE_URL=https://SEU-SITE.netlify.app
supabase secrets set ADMIN_CODE=escolha-uma-senha-forte-aqui
```

- `MP_ACCESS_TOKEN` → usado para criar e confirmar pagamentos.
- `SITE_URL` → para onde o Mercado Pago manda o convidado de volta depois
  de pagar. Atualize esse valor depois do passo 6, quando tiver a URL
  final do Netlify.
- `ADMIN_CODE` → a senha do painel "Painel dos noivos" no site, usada
  para gerenciar os presentes. Escolha algo só seu — ela nunca fica
  visível no código do site, só é conferida no servidor.

## Passo 4 — Configurar o webhook no Mercado Pago

No painel da aplicação (developers.mercadopago.com.br) → **Webhooks** →
**Configurar notificações**:

- URL: `https://SEU-PROJETO.supabase.co/functions/v1/mp-webhook`
- Evento: **Pagamentos**

## Passo 5 — Preencher as credenciais no site

Abra `index.html` e edite estas duas linhas (procure por `CONFIGURAÇÃO`
perto do fim do arquivo):

```js
const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
const SUPABASE_ANON_KEY = "SUA_CHAVE_ANON_AQUI";
```

Os dois valores estão em **Project Settings > API** no painel do
Supabase (`Project URL` e `anon public`). Essa chave é pública por
natureza — pode ficar no código do site sem problema.

## Passo 6 — Subir para o GitHub

```bash
git init
git add .
git commit -m "Convite Iasmin & Gutenberg"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
git push -u origin main
```

## Passo 7 — Deploy no Netlify

1. Em app.netlify.com, clique em **Add new site > Import an existing
   project** e conecte o repositório do GitHub.
2. Configurações de build: deixe **Build command** em branco e
   **Publish directory** como `.` (o `netlify.toml` já define isso
   automaticamente).
3. Clique em **Deploy site**. Em menos de um minuto o site estará no ar
   em uma URL tipo `nome-aleatorio.netlify.app`.
4. (Opcional) Em **Site settings > Domain management**, troque para um
   domínio ou subdomínio personalizado.
5. Volte ao passo 3 e atualize o secret `SITE_URL` com a URL final do
   Netlify:
   ```bash
   supabase secrets set SITE_URL=https://SEU-SITE-FINAL.netlify.app
   ```

Pronto — o site está no ar, ligado ao banco e ao pagamento.

---

## Usando o "Painel dos noivos"

No rodapé do site, o botão **Painel dos noivos** abre um painel com três
abas:

- **Presentes** — adicionar, editar, ocultar ou excluir itens da lista.
  Preencha nome, descrição, preço e se é um presente único (só pode ser
  comprado uma vez) ou aceita várias contribuições (como uma cota de lua
  de mel). As mudanças aparecem no site na hora, para todo mundo que
  estiver com a página aberta.
- **Confirmações** — quem já confirmou presença.
- **Pedidos** — todos os pagamentos, com status (aprovado/pendente/etc).

O acesso é protegido pelo `ADMIN_CODE` que você definiu no passo 3 — a
verificação acontece no servidor (Edge Function), então trocar a senha é
só rodar `supabase secrets set ADMIN_CODE=nova-senha` de novo.

## Testando antes de ir ao ar

1. Use as credenciais de **teste** do Mercado Pago em `MP_ACCESS_TOKEN`.
2. Use um [cartão de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/your-integrations/test/cards)
   para simular uma compra completa.
3. Confirme que o presente aparece marcado com o nome do "comprador".
4. Só troque para o Access Token de produção quando tudo estiver
   validado.

## Observação sobre privacidade

As tabelas `gift_orders` e `rsvps` são de leitura pública (é assim que o
site mostra, para qualquer visitante, quais presentes já foram
escolhidos e quantas pessoas confirmaram). Isso é intencional e
necessário para a lista de presentes funcionar em tempo real — não é um
problema para este uso, mas vale saber que não é um painel privado no
sentido estrito.
