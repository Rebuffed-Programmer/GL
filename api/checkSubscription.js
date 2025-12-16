// pages/api/checkSubscription.js (CORRIGIDO PARA USAR GOOGLE ID)

import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.ARMAZENAMENTOPLUS_KV_REST_API_URL,
  token: process.env.ARMAZENAMENTOPLUS_KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  // 🛑 MUDANÇA CRUCIAL: Agora lemos o 'googleId' da query string
  const googleId = req.query.googleId; 

  if (!googleId) {
    // Retorna 400 se o Frontend não enviar a chave correta
    return res.status(400).json({ active: false, error: "googleId_required" }); 
  }

  try {
    // ✅ BUSCA NO KV PELA CHAVE GOOGLE ID
    const record = await kv.get(googleId);

    if (!record || record.status !== "active") {
      return res.json({ active: false });
    }

    // Verifica a expiração
    if (Date.now() > record.expiry) {
      await kv.set(googleId, { ...record, status: "expired" }); // Atualiza o KV
      return res.json({ active: false });
    }

    return res.json({
      active: true,
      expiry: record.expiry,
      plan: record.plan || "MENSAL"
    });

  } catch (err) {
    console.error("checkSubscription error:", err);
    return res.status(500).json({ active: false, error: "server_error" });
  }
}
