# Convite — Iasmin & Gutenberg

Hotsite de convite para a recepção do casamento, com confirmação de
presença e lista de presentes com pagamento real (Pix Instantâneo dos Noivos
e Cartão de Crédito parcelado via Stripe).

## O que tem aqui

```
index.html                              → o site com formulário, presentes e modal de checkout
server.js                               → servidor Node.js com endpoints de pagamento e painel
supabase/schema.sql                     → banco de dados (rodar no Supabase se desejar)
supabase/functions/create-payment/      → cria a cobrança Pix ou Checkout Stripe
supabase/functions/admin-gifts/         → área de administração dos presentes
```

---

## Formas de Pagamento

1. **Pix Direto dos Noivos (Instantâneo e sem taxas)**:
   - Gera QR Code e código Copia e Cola conforme padrão do Banco Central.
   - Chave Pix padrão: `gutenberg23@gmail.com` (personalizável pela variável `PIX_KEY`).

2. **Cartão de Crédito (via Stripe)**:
   - Permite pagamento parcelado ou à vista com cartões nacionais e internacionais.
   - Necessário configurar `STRIPE_SECRET_KEY` no ambiente.

---

## Onde conseguir as chaves do Stripe

1. Crie uma conta ou faça login no painel da **Stripe**: [https://dashboard.stripe.com](https://dashboard.stripe.com).
2. No canto superior direito, você pode alternar entre o **Modo de Teste (Test mode)** e o **Modo Ativado / Produção (Live mode)**.
3. Acesse **Desenvolvedores (Developers)** > **Chaves de API (API Keys)** ou direto pelo link:
   👉 **https://dashboard.stripe.com/apikeys**
4. Você encontrará duas chaves:
   - **Chave publicável (Publishable Key)**: Começa com `pk_test_...` ou `pk_live_...`.
   - **Chave secreta (Secret Key)**: Começa com `sk_test_...` ou `sk_live_...`. Clique em **"Revelar chave secreta"** e copie esse valor.
5. Cole a chave secreta na variável de ambiente `STRIPE_SECRET_KEY` no painel de configurações.

### Configurar Webhook do Stripe (Opcional para confirmação automática):
1. No dashboard da Stripe, vá em **Desenvolvedores > Webhooks** (`https://dashboard.stripe.com/webhooks`).
2. Clique em **Adicionar endpoint**.
3. Em **URL do endpoint**, coloque: `https://SEU-DOMINIO/api/stripe-webhook`.
4. Em **Eventos para ouvir**, selecione `checkout.session.completed`.
5. Salve e copie o **Segredo de assinatura do webhook** (`whsec_...`) para a variável `STRIPE_WEBHOOK_SECRET`.

---

## Painel dos Noivos

No rodapé do site, o botão **Painel dos noivos** permite:
- Gerenciar itens da lista de presentes (adicionar, editar valores, pausar ou remover).
- Visualizar convidados confirmados (RSVP).
- Acompanhar pedidos e presentes recebidos com as mensagens dos convidados.
- Código de acesso padrão: `casamento2026` (alterável via `ADMIN_CODE`).
