async function getContact(accountId) {
  const res = await fetch(
    `${process.env.ACCOUNT_SERVICE_URL}/internal/accounts/${accountId}/contact`,
    {
      headers: { 'X-Internal-Key': process.env.INTERNAL_API_KEY },
      signal: AbortSignal.timeout(5000),
    }
  );

  if (res.status === 404) return null; // compte inexistant
  if (!res.ok) throw new Error(`account-service a répondu ${res.status}`);
  return res.json(); // { id, firstName, email }
}

// Une page d'identifiants de comptes USER actifs : { ids: [...], last: true|false }
async function getUserIds(page, size = 100) {
  const res = await fetch(
    `${process.env.ACCOUNT_SERVICE_URL}/internal/accounts/user-ids?page=${page}&size=${size}`,
    {
      headers: { 'X-Internal-Key': process.env.INTERNAL_API_KEY },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!res.ok) throw new Error(`account-service a répondu ${res.status}`);
  return res.json();
}

module.exports = { getContact, getUserIds };