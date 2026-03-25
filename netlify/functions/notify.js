exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const OS_APP_ID = 'b68eced9-8ced-4193-bc25-7ccda7670e21';
  const OS_API_KEY = 'os_v2_app_w2hm5wmm5vazhpbfptg2ozyoegcm5z4v2l4uhufksxl6zeye4urugys3smlmslu7ohcclqzgkkhwcqpz4y5j6ryp4fvrwobcubw77yi';
  try {
    const { player_ids, title, message } = JSON.parse(event.body);
    if (!player_ids || !player_ids.length || !title || !message) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Paramètres manquants' }) };
    }
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + OS_API_KEY },
      body: JSON.stringify({ app_id: OS_APP_ID, include_player_ids: player_ids, headings: { fr: title, en: title }, contents: { fr: message, en: message } })
    });
    const data = await response.json();
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data) };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
