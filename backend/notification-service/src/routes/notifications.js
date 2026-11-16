const router = require('express').Router();
const { z } = require('zod');
const { EMAIL_TYPES, BROADCAST_TYPES } = require('../constants');
const { processNotification } = require('../emailService');
const { broadcast } = require('../broadcastService');

const variablesSchema = z
  .record(z.string(), z.string().max(500))
  .refine((v) => Object.keys(v).length <= 10, 'Trop de variables')
  .default({});

// .strict() refuse tout champ en plus, notamment "email"
const emailSchema = z
  .object({
    accountId: z.number().int().positive(),
    type: z.enum(EMAIL_TYPES),
    variables: variablesSchema,
  })
  .strict();

const broadcastSchema = z
  .object({
    type: z.enum(BROADCAST_TYPES),
    variables: variablesSchema,
  })
  .strict();

function invalid(res, parsed) {
  return res.status(400).json({
    error: 'Données invalides',
    details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  });
}

// Un email pour un compte
router.post('/email', (req, res) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed);

  // on répond tout de suite : l'envoi se fait en arrière-plan
  res.status(202).json({ status: 'accepted' });

  processNotification(parsed.data).catch((err) =>
    console.error(`[${parsed.data.type}] échec :`, err.message)
  );
});

// Le même email pour tous les utilisateurs actifs
router.post('/broadcast', (req, res) => {
  const parsed = broadcastSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed);

  res.status(202).json({ status: 'accepted' });

  broadcast(parsed.data).catch((err) =>
    console.error(`[${parsed.data.type}] envoi à tous : échec (${err.message})`)
  );
});

module.exports = router;