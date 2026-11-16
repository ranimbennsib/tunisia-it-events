const EMAIL_TYPES = [
  'ACCOUNT_CREATED',
  'ACCOUNT_ACTIVATED',
  'ACCOUNT_DEACTIVATED',
  'PASSWORD_CHANGED',
  'EVENT_VALIDATED',
  'EVENT_REJECTED',
  'EVENT_CANCELLED',
    'REGISTRATION_CONFIRMED',
  'REGISTRATION_CANCELLED',
     'EVENT_CANCELLED',
  'EVENT_UPDATED',
];


// Types envoyés à tous les utilisateurs (aucune adresse n'est jamais donnée dans la demande)
const BROADCAST_TYPES = ['EVENT_PUBLISHED'];

module.exports = { EMAIL_TYPES, BROADCAST_TYPES };