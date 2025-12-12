// api/webhook.js
import { createClient } from '@vercel/kv';

// ESTA CONEXÃO USA AS CHAVES COM O PREFIXO 'armazenamentoplus_' QUE O UPSTASH GEROU:
const kv = createClient({
  url: process.env.armazenamentoplus_KV_REST_API_URL,
  token: process.env.armazenamentoplus_KV_REST_API_TOKEN,
});

// Constantes de duração (em milissegundos)
const DURATION = {
    MENSAL: 30 * 24 * 60 * 60 * 1000,
    ANUAL: 365 * 24 * 60 * 60 * 1000,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // >> NOTA: Aqui deveria haver validação de segurança do Webhook do Mercado Pago <<
  // (Para um sistema simples, vamos confiar nos dados do Webhook, mas é inseguro para produção)

  const notification = req.body;
  
  // Extração de dados da notificação
  const status = notification.data?.status || 'pending'; 
  const customerEmail = notification.data?.payer?.email || notification.resource?.payer?.email;
  const planType = notification.data?.metadata?.plan || 'MENSAL'; // Se você enviar essa info

  if (!customerEmail) {
    return res.status(400).json({ received: true, message: 'No email found' });
  }

  try {
    if (status === 'approved') {
      const duration = DURATION[planType.toUpperCase()] || DURATION.MENSAL;
      const expiry = Date.now() + duration; 

      // Salva o e-mail e a data de expiração no Upstash/Redis
      await kv.set(customerEmail, {
        status: 'active',
        expiry: expiry, 
        paymentId: notification.data.id 
      });

      console.log(`[MP] Assinatura APROVADA: ${customerEmail}.`);
      
    } else if (status === 'refunded' || status === 'cancelled' || status === 'rejected') {
      // Remove o acesso em caso de cancelamento ou fraude
      await kv.set(customerEmail, { status: 'expired', expiry: Date.now() });
      console.log(`[MP] Assinatura REVOGADA: ${customerEmail}.`);
    }

    // Retorna 200 OK para o Mercado Pago
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: 'Failed to process webhook' });
  }
}
