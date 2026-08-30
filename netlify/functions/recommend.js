exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;

  // Même garde-fou bruyant que chat.js/notify.js : pas de clé, pas d'appel silencieusement cassé.
  if (!API_KEY) {
    console.error('ANTHROPIC_API_KEY manquante dans les variables d\'environnement Netlify.');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Configuration Anthropic manquante sur Netlify (ANTHROPIC_API_KEY).' })
    };
  }

  try {
    const { questionnaire, images, trends } = JSON.parse(event.body);

    if (!questionnaire || !images || images.length !== 3) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Paramètres manquants (questionnaire, 3 images attendues).' }) };
    }

    // Les 3 photos (face, profil gauche, profil droit) ne sont jamais écrites en base ni loggées :
    // elles ne transitent que dans ce body sortant vers Anthropic, puis sont jetées avec la requête.
    const imageBlocks = images.map(img => ({
      type: 'image',
      source: { type: 'base64', media_type: img.media_type, data: img.data }
    }));

    const questionnaireText = Object.entries(questionnaire).map(([k, v]) => `${k}: ${v}`).join('\n');
    const trendsText = trends ? `\n\nTendances actuelles à prendre en compte :\n${trends}` : '';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1536,
        output_config: {
          effort: 'medium',
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: {
                morphologie: { type: 'string', description: 'Description courte de la morphologie du visage observée' },
                styles_recommandes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      nom: { type: 'string' },
                      description: { type: 'string' },
                      pourquoi: { type: 'string' }
                    },
                    required: ['nom', 'description', 'pourquoi'],
                    additionalProperties: false
                  }
                },
                conseils: { type: 'string', description: 'Conseils généraux complémentaires' }
              },
              required: ['morphologie', 'styles_recommandes', 'conseils'],
              additionalProperties: false
            }
          }
        },
        messages: [{
          role: 'user',
          content: [
            ...imageBlocks,
            {
              type: 'text',
              text: `Voici trois photos d'un client (face, profil gauche, profil droit) et ses réponses à un questionnaire sur son type de cheveux. Analyse sa morphologie de visage et propose 2-3 styles de coupe adaptés, en tenant compte du type de cheveux déclaré.\n\nRéponses au questionnaire :\n${questionnaireText}${trendsText}`
            }
          ]
        }]
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
