exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const OS_APP_ID = process.env.ONESIGNAL_APP_ID;
  const OS_API_KEY = process.env.ONESIGNAL_API_KEY;

  // Si ces variables d'environnement ne sont pas configurées sur Netlify
  // (Site settings -> Environment variables), OneSignal refuse la requête
  // et AUCUNE notification n'est jamais envoyée. On échoue bruyamment ici
  // plutôt que de laisser passer un envoi silencieusement cassé.
  if (!OS_APP_ID || !OS_API_KEY) {
    console.error('ONESIGNAL_APP_ID ou ONESIGNAL_API_KEY manquant(e) dans les variables d\'environnement Netlify.');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Configuration OneSignal manquante sur Netlify (ONESIGNAL_APP_ID / ONESIGNAL_API_KEY).' })
    };
  }

  try {
    const { player_ids, title, message } = JSON.parse(event.body);

    if (!player_ids || !player_ids.length || !title || !message) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Paramètres manquants' }) };
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + OS_API_KEY
      },
      body: JSON.stringify({
        app_id: OS_APP_ID,
        include_player_ids: player_ids,
        headings: { fr: title, en: title },
        contents: { fr: message, en: message }
      })
    });

    const data = await response.json();
    if (!response.ok || (data.errors && data.errors.length)) {
      console.error('Erreur OneSignal:', JSON.stringify(data));
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
