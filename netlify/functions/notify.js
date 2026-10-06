const crypto = require('crypto');
const { getMember, rpc, unauthorized, forbidden } = require('./_shared/auth');

// Trois appelants possibles :
// - la base Supabase (triggers et rappels cron), avec l'en-tête x-notify-secret ;
// - l'admin connecté, qui peut écrire à n'importe quel membre ;
// - un client connecté, qui peut seulement prévenir les admins d'une demande de
//   créneau (destinataires et texte construits ici, pas par le client).
function isServerCall(event) {
  const expected = process.env.NOTIFY_SECRET;
  const got = event.headers && event.headers['x-notify-secret'];
  if (!expected || !got) return false;
  const a = Buffer.from(String(got));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

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
  if (!process.env.NOTIFY_SECRET) {
    console.error('NOTIFY_SECRET manquant dans les variables d\'environnement Netlify : les rappels automatiques sont refusés.');
  }

  try {
    const body = JSON.parse(event.body || '{}');
    let player_ids, title, message;

    if (isServerCall(event)) {
      ({ player_ids, title, message } = body);
    } else {
      const member = await getMember(event);
      if (!member) return unauthorized();

      if (member.is_admin) {
        ({ player_ids, title, message } = body);
      } else if (body.kind === 'slot_request') {
        const date = String(body.date || '');
        const time = String(body.time || '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Date ou heure invalide.' }) };
        }
        player_ids = await rpc(member.token, 'admin_push_ids');
        title = 'Nouvelle demande de créneau';
        message = (member.first || member.username) + ' souhaite un créneau le ' + date + ' à ' + time + '.';
        if (!Array.isArray(player_ids) || !player_ids.length) {
          return { statusCode: 200, body: JSON.stringify({ skipped: 'Aucun admin abonné aux notifications.' }) };
        }
      } else {
        return forbidden();
      }
    }

    if (!Array.isArray(player_ids) || !player_ids.length || !title || !message) {
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
      body: JSON.stringify(data)
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
