// pages/api/webhook.js (CORRIGIDO PARA USAR GOOGLE ID)

import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.ARMAZENAMENTOPLUS_KV_REST_API_URL, // Variável CORRETA (camelCase)
  token: process.env.ARMAZENAMENTOPLUS_KV_REST_API_TOKEN, // Variável CORRETA (camelCase)
});

const DURATION = {
  MENSAL: 30 * 24 * 60 * 60 * 1000,
  ANUAL: 365 * 24 * 60 * 60 * 1000,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const data = req.body?.data || req.body;
  const status = data?.status;

  // 🛑 MUDANÇA CRUCIAL: PEGA O GOOGLE ID DO external_reference
  const googleId = data.external_reference || req.body.resource?.external_reference; 
  const plan = data?.metadata?.plan || "MENSAL"; // Mantém a leitura do plano

  // Usa o Google ID para validação
  if (!googleId) {
    // Retorna 200 OK para o MP não tentar reenviar, mas registra o erro
    return res.status(200).json({ received: true, error: "googleId_missing_in_external_reference" });
  }

  try {
    if (status === "approved") {
      const expiry = Date.now() + (DURATION[plan] || DURATION.MENSAL);

      // ✅ SALVA NO KV USANDO O GOOGLE ID COMO CHAVE
      await kv.set(googleId, {
        status: "active",
        expiry,
        plan,
        paymentId: data.id || req.body.id
      });

      console.log("✅ Plus+ ATIVADO no KV (Google ID):", googleId);
    }

    if (["cancelled", "refunded", "rejected"].includes(status)) {
      // REVOGA USANDO O GOOGLE ID
      await kv.set(googleId, {
        status: "expired",
        expiry: Date.now()
      });

      console.log("❌ Plus+ REVOGADO no KV (Google ID):", googleId);
    }

    return res.json({ received: true });

  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: true });
  }
}
