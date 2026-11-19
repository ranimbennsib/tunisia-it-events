const paymentRepository = require('../repositories/paymentRepository');
const { createBankSimulator } = require('../bank/simulator');
const { InvalidCardError } = require('../bank/errors');
const { sendNotification } = require('../notificationClient');
// Erreur métier avec un code HTTP
function createServiceError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Calcul des montants en millimes
function calculateAmounts(amount, commissionRate) {
  const commissionAmount = Math.round(
    amount * commissionRate / 100
  );

  const netAmount = amount - commissionAmount;

  return {
    commissionAmount,
    netAmount
  };
}

//*
// 45000 millimes -> "45.000 TND"
function formatAmount(millimes, currency) {
  return `${(Number(millimes) / 1000).toFixed(3)} ${currency || 'TND'}`;
}


function createPaymentService({
  repository = paymentRepository,
  simulator = createBankSimulator(),

  // Ces fonctions sont connectées aux autres microservices.
  getRegistrationById,
  getEventById,

  // Optionnelle : confirme l'inscription après un paiement réussi.
  confirmRegistration = null,
  notify = null,
  commissionRate = Number(
    process.env.PAYMENT_COMMISSION_RATE || 5
  )
}) {

  // Vérifier la configuration
  if (typeof getRegistrationById !== 'function') {
    throw new Error('getRegistrationById must be provided');
  }

  if (typeof getEventById !== 'function') {
    throw new Error('getEventById must be provided');
  }

  if (
    !Number.isFinite(commissionRate) ||
    commissionRate < 0 ||
    commissionRate > 100
  ) {
    throw new Error('Invalid commission rate');
  }

  // Confirme l'inscription sans jamais faire échouer le paiement.
  // Retourne true si l'inscription est confirmée.
  async function tryConfirmRegistration(registrationId, paymentId) {
    if (typeof confirmRegistration !== 'function') {
      return false;
    }

    try {
      await confirmRegistration(registrationId);
      return true;
    } catch (error) {
      console.error(
        `Payment ${paymentId} is paid but registration ${registrationId} was NOT confirmed:`,
        error.message
      );
      return false;
    }
  }
   //*
     // Demande un email sans jamais faire échouer le paiement.
  function safeNotify(userId, type, variables) {
    if (typeof notify !== 'function') {
      return;
    }

    try {
      notify(userId, type, variables);
    } catch (error) {
      console.error(`Notification ${type} not sent for user ${userId}:`, error.message);
    }
  }
  // Créer un paiement
  async function createPayment({ userId, registrationId, card }) {

    // 1. Vérifier les identifiants
    if (
      !Number.isSafeInteger(Number(userId)) ||
      Number(userId) <= 0
    ) {
      throw createServiceError(400, 'Invalid user ID');
    }

    if (
      !Number.isSafeInteger(Number(registrationId)) ||
      Number(registrationId) <= 0
    ) {
      throw createServiceError(400, 'Invalid registration ID');
    }

    userId = Number(userId);
    registrationId = Number(registrationId);

    // 2. Récupérer l'inscription
    const registration =
      await getRegistrationById(registrationId);

    if (!registration) {
      throw createServiceError(404, 'Registration not found');
    }

    // 3. Vérifier que l'inscription appartient au participant
    if (Number(registration.userId) !== userId) {
      throw createServiceError(
        403,
        'This registration does not belong to you'
      );
    }

    // 3 bis. L'inscription doit attendre le paiement.
    // Le Registration Service renvoie PENDING_PAYMENT, CONFIRMED ou CANCELLED.
    const registrationStatus = registration.status
      ? String(registration.status).toUpperCase()
      : null;

    // Pour un paiement déjà réussi, on laisse passer jusqu'à l'étape 8
    // (rattrapage de la confirmation), qui répond 409 « already paid ».
    const previousPayments =
      await repository.findByRegistrationId(registrationId);

    const activePayment = previousPayments.find(
      payment =>
        payment.status === 'pending' ||
        payment.status === 'paid'
    );

    if (activePayment && activePayment.status === 'paid') {
      // Rattrapage : paiement réussi, mais inscription pas encore confirmée
      // (Registration Service indisponible lors du premier essai).
      if (registrationStatus === 'PENDING_PAYMENT') {
        await tryConfirmRegistration(registrationId, activePayment.id);
      }

      throw createServiceError(
        409,
        'This registration has already been paid'
      );
    }

    if (registrationStatus && registrationStatus !== 'PENDING_PAYMENT') {
      throw createServiceError(
        409,
        `This registration cannot be paid (status: ${registrationStatus})`
      );
    }

    // 4. Récupérer l'événement associé
    const event = await getEventById(registration.eventId);

    if (!event) {
      throw createServiceError(404, 'Event not found');
    }

    // 5. Vérifier que l'événement est approuvé
    if (String(event.status).toUpperCase() !== 'APPROVED') {
      throw createServiceError(400, 'This event is not approved');
    }

    // 6. Vérifier le mode de paiement
    if (String(event.paymentMode).toUpperCase() !== 'ONLINE') {
      throw createServiceError(
        400,
        'This event does not accept online payments'
      );
    }

    // 7. Prix officiel de l'événement.
    // L'Event Service retourne le prix en TND, ici on travaille en millimes.
    let amount;

    if (event.priceMillimes !== undefined && event.priceMillimes !== null) {
      amount = Number(event.priceMillimes);
    } else {
      amount = Math.round(Number(event.price) * 1000);
    }

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw createServiceError(400, 'Invalid event price');
    }

    // 7 bis. L'organisateur doit être connu.
    // Sinon Number(undefined) = NaN et PostgreSQL refuse l'INSERT (erreur 500).
    const eventId = Number(event.id ?? registration.eventId);
    const organizerId = Number(event.organizerId);

    if (!Number.isSafeInteger(organizerId) || organizerId <= 0) {
      throw createServiceError(
        502,
        'Event Service returned an event without a valid organizerId'
      );
    }

    // 8. Un paiement déjà en attente bloque une nouvelle tentative
    if (activePayment) {
      throw createServiceError(
        409,
        'A payment is already pending for this registration'
      );
    }

    // 9. Calculer la commission
    const { commissionAmount, netAmount } =
      calculateAmounts(amount, commissionRate);

    // 10. Créer le paiement avec le statut pending
    let payment;

    try {
      payment = await repository.create({
        registrationId,
        userId,
        eventId,
        organizerId,
        amount,
        currency: event.currency || 'TND',
        method: 'card',
        status: 'pending',
        gatewayProvider: simulator.provider || 'SIMULATOR',
        commissionRate,
        commissionAmount,
        netAmount
      });
    } catch (error) {
      // L'index unique PostgreSQL protège aussi contre
      // deux demandes simultanées pour la même inscription.
      if (error.code === '23505') {
        throw createServiceError(
          409,
          'An active payment already exists for this registration'
        );
      }

      throw error;
    }

    // 11. Envoyer le paiement au simulateur bancaire
    try {
      const result = await simulator.charge({ card, amount });

      // 12. Paiement accepté
      if (result.status === 'accepted') {
        const updatedPayment = await repository.updateStatus(
          payment.id,
          'paid',
          result.transactionRef,
          null,
          result.brand,
          result.last4
        );

        // Confirmer l'inscription (PENDING_PAYMENT -> CONFIRMED).
        // Si le Registration Service est indisponible, le paiement reste valide.
        const registrationConfirmed =
          await tryConfirmRegistration(registrationId, payment.id);
          //*
        // Reçu par email (jamais le numéro de carte : seulement la marque et les 4 derniers chiffres)
        safeNotify(userId, 'PAYMENT_RECEIVED', {
          eventTitle: event.title,
          amount: formatAmount(amount, event.currency),
          method: `${result.brand} card ending in ${result.last4}`,
          reference: result.transactionRef,
          paidAt: new Date(
            (updatedPayment && updatedPayment.paid_at) || Date.now()
          ).toISOString(),
          registrationConfirmed: String(registrationConfirmed)
        });


        return {
          success: true,
          message: 'Payment successful',
          registrationConfirmed,
          payment: updatedPayment
        };
      }

      // 13. Paiement refusé par le simulateur
      if (result.status === 'declined') {
        const updatedPayment = await repository.updateStatus(
          payment.id,
          'failed',
          result.transactionRef || null,
          result.reason || 'payment_declined',
          result.brand,
          result.last4
        );
         //*
         // Email d'échec (refus de la banque). Une carte mal saisie n'envoie pas d'email.
        safeNotify(userId, 'PAYMENT_FAILED', {
          eventTitle: event.title,
          amount: formatAmount(amount, event.currency),
          failureReason: result.reason || 'payment_declined'
        });
        return {
          success: false,
          message: 'Payment declined',
          reason: result.reason || 'payment_declined',
          payment: updatedPayment
        };
      }

      throw new Error('Unknown simulator response');

    } catch (error) {

      // 14. Carte invalide : erreur de saisie,
      // différente d'un refus bancaire.
      if (error instanceof InvalidCardError) {
        const updatedPayment = await repository.updateStatus(
          payment.id,
          'failed',
          null,
          `invalid_card_${error.field}`
        );

        return {
          success: false,
          type: 'INVALID_CARD',
          field: error.field,
          message: error.message,
          payment: updatedPayment
        };
      }

      // Erreur inattendue : le paiement reste pending
      // (à réconcilier avant d'autoriser une nouvelle tentative).
      throw error;
    }
  }
  

  // Historique d'un participant
  async function getMyPayments(userId) {
    return repository.findByUserId(userId);
  }

  // Tous les paiements (administrateur)
  async function getAllPayments() {
    return repository.findAll();
  }

  // Vérifie qu'une valeur est un entier positif (identifiant)
  function toId(value, label) {
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n <= 0) {
      throw createServiceError(400, `Invalid ${label}`);
    }
    return n;
  }

  // Détail d'un paiement
  // user = { id, role } : USER voit seulement ses paiements,
  // ORGANIZER seulement ceux de ses événements, ADMIN tous.
  async function getPaymentById(paymentId, user = null) {
    const payment = await repository.findById(toId(paymentId, 'payment ID'));

    if (!payment) {
      throw createServiceError(404, 'Payment not found');
    }

    if (user) {
      const allowed =
        user.role === 'ADMIN' ||
        (user.role === 'USER' && Number(payment.user_id) === user.id) ||
        (user.role === 'ORGANIZER' && Number(payment.organizer_id) === user.id);

      // 404 (et non 403) pour ne pas révéler l'existence du paiement
      if (!allowed) {
        throw createServiceError(404, 'Payment not found');
      }
    }

    return payment;
  }

  // Liste des payeurs d'un événement.
  // Un organisateur ne voit que les paiements de ses propres événements.
  async function getEventPayments(eventId, user) {
    const id = toId(eventId, 'event ID');
    const organizerFilter = user.role === 'ORGANIZER' ? user.id : null;

    return repository.findPaidByEventId(id, organizerFilter);
  }

  // Paiements réussis pas encore versés (pour le Payout Service)
  async function getUnpaidOut(organizerId) {
    const filter =
      organizerId === undefined || organizerId === ''
        ? null
        : toId(organizerId, 'organizer ID');

    return repository.findUnpaidOut(filter);
  }

  // Résumé par événement (pour l'écran admin du Payout Service)
  async function getSummary(organizerId) {
    const filter =
      organizerId === undefined || organizerId === ''
        ? null
        : toId(organizerId, 'organizer ID');

    return repository.summaryByEvent(filter);
  }

  // Le Payout Service indique quels paiements font partie d'un virement
  async function markPaidOut({ payoutId, paymentIds }) {
    const payout = toId(payoutId, 'payout ID');

    if (
      !Array.isArray(paymentIds) ||
      paymentIds.length === 0 ||
      paymentIds.length > 500
    ) {
      throw createServiceError(
        400,
        'paymentIds must be an array of 1 to 500 identifiers'
      );
    }

    const ids = [...new Set(paymentIds.map(id => toId(id, 'payment ID')))];

    const updated = await repository.markPaidOut(ids, payout);

    if (updated.length !== ids.length) {
      throw createServiceError(
        409,
        'Some payments are unknown, not paid, or already linked to another payout'
      );
    }

    return updated;
  }

  return {
    createPayment,
    getMyPayments,
    getAllPayments,
    getPaymentById,
    getEventPayments,
    getUnpaidOut,
    getSummary,
    markPaidOut
  };
}

module.exports = {
  createPaymentService,
  calculateAmounts
};