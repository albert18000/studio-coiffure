// Vérifie qui appelle une fonction Netlify, à partir du jeton de connexion
// Supabase envoyé par le site (en-tête Authorization: Bearer <jeton>).
// La clé publishable est publique (elle est déjà dans index.html) : c'est le
// jeton de l'utilisateur, vérifié par Supabase, qui donne les droits.
const SUPA_URL = process.env.SUPABASE_URL || 'https://ddscscuratpdlfxqfclx.supabase.co';
const SUPA_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_V0gO0wwMcxsV-GIiFgFKeQ_n6Gz0JU3';

function bearer(event) {
  const h = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

async function rpc(token, name, args) {
  const res = await fetch(SUPA_URL + '/rest/v1/rpc/' + name, {
    method: 'POST',
    headers: {
      apikey: SUPA_KEY,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args || {})
  });
  if (!res.ok) return null;
  return res.json();
}

// Renvoie le profil du membre connecté ({ id, username, first, is_admin, … }),
// ou null si le jeton est absent, expiré ou pas relié à un profil.
async function getMember(event) {
  const token = bearer(event);
  if (!token) return null;
  const member = await rpc(token, 'current_member');
  if (!member || !member.id) return null;
  return { ...member, token };
}

const unauthorized = () => ({ statusCode: 401, body: JSON.stringify({ error: 'Connexion requise.' }) });
const forbidden = () => ({ statusCode: 403, body: JSON.stringify({ error: 'Accès refusé.' }) });

module.exports = { getMember, rpc, unauthorized, forbidden };
