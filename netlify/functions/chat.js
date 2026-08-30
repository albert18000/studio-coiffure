exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;

  // Si cette variable d'environnement n'est pas configurée sur Netlify
  // (Site settings -> Environment variables), l'API Anthropic refuse la
  // requête et le chatbot est silencieusement cassé côté client. On échoue
  // bruyamment ici plutôt que de laisser passer un appel cassé (même
  // convention que notify.js).
  if (!API_KEY) {
    console.error('ANTHROPIC_API_KEY manquante dans les variables d\'environnement Netlify.');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Configuration Anthropic manquante sur Netlify (ANTHROPIC_API_KEY).' })
    };
  }

  try {
    const { system, messages, tools } = JSON.parse(event.body);

    if (!messages || !messages.length) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Paramètres manquants (messages).' }) };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        output_config: { effort: 'medium' },
        system,
        messages,
        tools
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Erreur API Anthropic:', JSON.stringify(data));
    }
    return {
      statusCode: response.ok ? 200 : response.status,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
