exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!API_KEY) {
    console.error('ANTHROPIC_API_KEY manquante dans les variables d\'environnement Netlify.');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Configuration Anthropic manquante sur Netlify (ANTHROPIC_API_KEY).' })
    };
  }

  try {
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
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }],
        messages: [{
          role: 'user',
          content: "Recherche les tendances actuelles de coupes de cheveux et coiffures (saison en cours). Cherche sur des sites professionnels de coiffure reconnus. Résume en 3-4 paragraphes courts, en français, les styles/coupes/couleurs qui reviennent le plus souvent. Pas de liens, pas de sources citées dans le texte, juste un résumé synthétique directement exploitable pour conseiller des clients en salon."
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Erreur API Anthropic:', JSON.stringify(data));
      return {
        statusCode: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(data)
      };
    }

    const textBlocks = (data.content || []).filter(b => b.type === 'text').map(b => b.text);
    const summary = textBlocks.join('\n\n').trim();

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ summary })
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
