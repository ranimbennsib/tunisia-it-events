const { getUserIds } = require('./accountClient');
const { processNotification } = require('./emailService');

const PAUSE_MS = 500;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Envoie le même email à tous les utilisateurs actifs, un par un.
async function broadcast({ type, variables }) {
  let page = 0;
  let total = 0;
  let sent = 0;
  let last = false;

  console.log(`[${type}] envoi à tous les utilisateurs : début`);

  while (!last) {
    const result = await getUserIds(page);
    if (result.ids.length === 0) break;

    for (const accountId of result.ids) {
      total++;
      try {
        const status = await processNotification({ accountId, type, variables });
        if (status === 'SENT') sent++;
      } catch (err) {
        console.error(`[${type}] compte ${accountId} : échec (${err.message})`);
      }
      await sleep(PAUSE_MS);
    }

    last = result.last;
    page++;
  }

  console.log(`[${type}] envoi à tous les utilisateurs : terminé (${sent}/${total} envoyés)`);
}

module.exports = { broadcast };