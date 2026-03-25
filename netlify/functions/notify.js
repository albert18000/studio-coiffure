exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const RESEND_KEY = 're_ib4MoSxz_3KMbTN1nMmWKuBaqGdBZTEu6';
  const ADMIN_EMAIL = 'albert.bonnefille18@gmail.com';

  try {
    const { type, emails, title, message, slot_date, slot_time, user_name } = JSON.parse(event.body);

    // Destinataires : tous les emails fournis + admin si c'est une notif importante
    const to = emails && emails.length ? emails : [ADMIN_EMAIL];

    // Template HTML selon le type
    let html = '';
    let subject = title;

    if (type === 'available') {
      subject = '✂️ Nouveau créneau disponible !';
      html = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="background:#c9a227;padding:20px;border-radius:12px 12px 0 0;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">✂️ Studio Coiffure</h1>
          </div>
          <div style="background:#fff;border:1px solid #e8e6e0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
            <h2 style="color:#1c1b18;font-size:18px;margin-bottom:12px">Nouveau créneau disponible !</h2>
            <p style="color:#7a7870;font-size:15px;line-height:1.6">Un créneau est maintenant disponible :</p>
            <div style="background:#e8f5ee;border:1px solid #9ed4b2;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
              <div style="font-size:20px;font-weight:700;color:#2d7a4a">${slot_date}</div>
              <div style="font-size:16px;color:#2d7a4a">à ${slot_time}</div>
            </div>
            <p style="color:#7a7870;font-size:14px">Réservez vite avant qu'il ne soit pris !</p>
            <a href="https://starlit-starburst-fa1d1e.netlify.app" style="display:block;background:#c9a227;color:#fff;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px">Réserver maintenant →</a>
          </div>
          <p style="text-align:center;font-size:12px;color:#b0ada4;margin-top:16px">Studio Coiffure — Gestion des réservations</p>
        </div>`;
    } else if (type === 'all_available') {
      subject = '✂️ Les créneaux sont ouverts !';
      html = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="background:#c9a227;padding:20px;border-radius:12px 12px 0 0;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">✂️ Studio Coiffure</h1>
          </div>
          <div style="background:#fff;border:1px solid #e8e6e0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
            <h2 style="color:#1c1b18;font-size:18px;margin-bottom:12px">Les créneaux sont ouverts à la réservation !</h2>
            <p style="color:#7a7870;font-size:15px;line-height:1.6">De nouveaux créneaux viennent d'être mis en ligne. Connectez-vous pour réserver le vôtre avant qu'ils ne soient tous pris !</p>
            <a href="https://starlit-starburst-fa1d1e.netlify.app" style="display:block;background:#c9a227;color:#fff;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:20px">Voir les créneaux →</a>
          </div>
          <p style="text-align:center;font-size:12px;color:#b0ada4;margin-top:16px">Studio Coiffure — Gestion des réservations</p>
        </div>`;
    } else if (type === 'released') {
      subject = '🔔 Un créneau vient de se libérer !';
      html = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="background:#c9a227;padding:20px;border-radius:12px 12px 0 0;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">✂️ Studio Coiffure</h1>
          </div>
          <div style="background:#fff;border:1px solid #e8e6e0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
            <h2 style="color:#1c1b18;font-size:18px;margin-bottom:12px">Un créneau vient de se libérer !</h2>
            <p style="color:#7a7870;font-size:15px;line-height:1.6">Une réservation a été annulée, ce créneau est à nouveau disponible :</p>
            <div style="background:#fdf6e3;border:1px solid #e8cc80;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
              <div style="font-size:20px;font-weight:700;color:#b87020">${slot_date}</div>
              <div style="font-size:16px;color:#b87020">à ${slot_time}</div>
            </div>
            <a href="https://starlit-starburst-fa1d1e.netlify.app" style="display:block;background:#c9a227;color:#fff;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px">Réserver maintenant →</a>
          </div>
          <p style="text-align:center;font-size:12px;color:#b0ada4;margin-top:16px">Studio Coiffure — Gestion des réservations</p>
        </div>`;
    } else if (type === 'reminder_morning') {
      subject = '📅 Rappel — Votre rendez-vous aujourd\'hui';
      html = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="background:#c9a227;padding:20px;border-radius:12px 12px 0 0;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">✂️ Studio Coiffure</h1>
          </div>
          <div style="background:#fff;border:1px solid #e8e6e0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
            <h2 style="color:#1c1b18;font-size:18px;margin-bottom:12px">Bonjour ${user_name} 👋</h2>
            <p style="color:#7a7870;font-size:15px;line-height:1.6">N'oubliez pas votre rendez-vous aujourd'hui !</p>
            <div style="background:#e8f5ee;border:1px solid #9ed4b2;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
              <div style="font-size:24px;font-weight:700;color:#2d7a4a">${slot_time}</div>
              <div style="font-size:14px;color:#2d7a4a">Votre coupe du jour</div>
            </div>
            <p style="color:#7a7870;font-size:14px">À tout à l'heure ! ✂️</p>
          </div>
          <p style="text-align:center;font-size:12px;color:#b0ada4;margin-top:16px">Studio Coiffure — Gestion des réservations</p>
        </div>`;
    } else if (type === 'reminder_30min') {
      subject = '⏰ Votre coupe dans 30 minutes !';
      html = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="background:#c9a227;padding:20px;border-radius:12px 12px 0 0;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">✂️ Studio Coiffure</h1>
          </div>
          <div style="background:#fff;border:1px solid #e8e6e0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
            <h2 style="color:#1c1b18;font-size:18px;margin-bottom:12px">Dans 30 minutes !</h2>
            <p style="color:#7a7870;font-size:15px;line-height:1.6">Bonjour ${user_name}, votre rendez-vous est dans 30 minutes :</p>
            <div style="background:#fdf0f0;border:1px solid #e8a8a8;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
              <div style="font-size:24px;font-weight:700;color:#b83232">${slot_time}</div>
              <div style="font-size:14px;color:#b83232">C'est bientôt !</div>
            </div>
            <p style="color:#7a7870;font-size:14px">À tout de suite ! ✂️</p>
          </div>
          <p style="text-align:center;font-size:12px;color:#b0ada4;margin-top:16px">Studio Coiffure — Gestion des réservations</p>
        </div>`;
    } else if (type === 'booking_confirmed') {
      subject = '✅ Réservation confirmée !';
      html = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="background:#c9a227;padding:20px;border-radius:12px 12px 0 0;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">✂️ Studio Coiffure</h1>
          </div>
          <div style="background:#fff;border:1px solid #e8e6e0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
            <h2 style="color:#1c1b18;font-size:18px;margin-bottom:12px">Réservation confirmée ✅</h2>
            <p style="color:#7a7870;font-size:15px;line-height:1.6">Bonjour ${user_name}, votre créneau est bien réservé !</p>
            <div style="background:#e8f5ee;border:1px solid #9ed4b2;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
              <div style="font-size:20px;font-weight:700;color:#2d7a4a">${slot_date}</div>
              <div style="font-size:16px;color:#2d7a4a">à ${slot_time}</div>
            </div>
            <p style="color:#7a7870;font-size:14px">Vous recevrez un rappel le matin même. À bientôt ! ✂️</p>
          </div>
          <p style="text-align:center;font-size:12px;color:#b0ada4;margin-top:16px">Studio Coiffure — Gestion des réservations</p>
        </div>`;
    } else {
      // Notif générique
      html = `<div style="font-family:sans-serif;padding:24px"><h2>${title}</h2><p>${message}</p></div>`;
    }

    // Envoi via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + RESEND_KEY
      },
      body: JSON.stringify({
        from: 'Studio Coiffure <onboarding@resend.dev>',
        to: to,
        subject: subject,
        html: html
      })
    });

    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    };
  } catch(e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
