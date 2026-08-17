const axios = require('axios');

async function envoyerNotification(expoToken, title, body) {
  if (!expoToken || !expoToken.startsWith('ExponentPushToken[')) return null;
  try {
    const { data } = await axios.post('https://exp.host/--/api/v2/push/send', {
      to: expoToken,
      title,
      body,
      sound: 'default',
    }, { timeout: 10000 });
    return data;
  } catch (error) {
    console.warn('⚠️ Notification push non envoyée :', error.message);
    return null;
  }
}
module.exports = { envoyerNotification };
