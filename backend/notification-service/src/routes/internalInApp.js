const router = require('express').Router();
const { z } = require('zod');
const { notifyAdminsPendingReview, resolvePendingReview } = require('../inAppService');

// .strict() refuse tout champ en plus : le texte du message n'est jamais fourni par l'appelant
const createSchema = z
  .object({
    type: z.enum(['EVENT_PENDING_REVIEW']),
    eventId: z.number().int().positive(),
    eventTitle: z.string().min(1).max(300),
    update: z.boolean().default(false),
  })
  .strict();

const resolveSchema = z
  .object({
    type: z.enum(['EVENT_PENDING_REVIEW']),
    eventId: z.number().int().positive(),
  })
  .strict();

function invalid(res, parsed) {
  return res.status(400).json({
    error: 'Données invalides',
    details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  });
}

function unavailable(res, err) {
  console.error('Notifications dans l\'application : erreur :', err.message);
  return res.status(503).json({ error: 'In-app notifications are temporarily unavailable' });
}

// POST /internal/notifications/in-app
// Crée la notification « événement à valider » pour tous les admins actifs.
router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed);

  try {
    const created = await notifyAdminsPendingReview(parsed.data);
    console.log(`[EVENT_PENDING_REVIEW] événement ${parsed.data.eventId} : ${created} notification(s) créée(s)`);
    res.status(201).json({ created });
  } catch (err) {
    unavailable(res, err);
  }
});

// POST /internal/notifications/in-app/resolve
// L'événement est validé, rejeté ou supprimé : on marque ses notifications comme lues.
router.post('/resolve', async (req, res) => {
  const parsed = resolveSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed);

  try {
    const resolved = await resolvePendingReview(parsed.data.eventId);
    console.log(`[EVENT_PENDING_REVIEW] événement ${parsed.data.eventId} : ${resolved} notification(s) marquée(s) comme lue(s)`);
    res.json({ resolved });
  } catch (err) {
    unavailable(res, err);
  }
});

module.exports = router;