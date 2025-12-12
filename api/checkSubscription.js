// api/checkSubscription.js
import { createClient } from '@vercel/kv';

// ESTA CONEXÃO USA AS CHAVES COM O PREFIXO 'armazenamentoplus_' QUE O UPSTASH GEROU:
const kv = createClient({
  url: process.env.armazenamentoplus_KV_REST_API_URL,
  token: process.env.armazenamentoplus_KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  // 1. Garante que é uma requisição GET e pega o e-mail
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ active: false, error: 'Email required' });
  }

  try {
    // 2. Busca o registro do assinante pelo e-mail no Upstash/Redis
    const record = await kv.get(email);

    if (!record || record.status !== 'active') {
      return res.status(200).json({ active: false });
    }

    // 3. Verifica se a assinatura expirou
    const now = Date.now();
    
    if (record.expiry > now) {
      // 4. Assinatura ativa! Retorna o sucesso e a data de expiração (para o frontend criar o token local)
      return res.status(200).json({
        active: true,
        expiryDate: record.expiry 
      });
    } else {
      // 5. Expirou.
      await kv.set(email, { status: 'expired', expiry: record.expiry });
      return res.status(200).json({ active: false });
    }
  } catch (error) {
    console.error('KV Read Error:', error);
    // Em caso de erro, nega o acesso por segurança
    return res.status(500).json({ active: false, error: 'Server error' });
  }
}
