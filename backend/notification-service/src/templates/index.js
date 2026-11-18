const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const layout = (content) => `
<div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px; color: #222;">
  <h2 style="color: #1a56db;">Tunisia IT Events</h2>
  ${content}
</div>`;

function buildEmail(type, variables = {}) {
  const name = escapeHtml(variables.firstName || '');
  const title = escapeHtml(variables.eventTitle || '');
  const hello = `<p>Hello ${name},</p>`;

  switch (type) {
        case 'ACCOUNT_CREATED':
      return {
        subject: 'Welcome to Tunisia IT Events',
        html: layout(
          `${hello}<p>Welcome to Tunisia IT Events! Discover upcoming events and register for the ones you like.</p>`
        ),
      };

    case 'ACCOUNT_ACTIVATED':
      return {
        subject: 'Your account has been activated',
        html: layout(
          `${hello}<p>Your Tunisia IT Events account is now active. You can log in again.</p>`
        ),
      };

    case 'ACCOUNT_DEACTIVATED':
      return {
        subject: 'Your account has been deactivated',
        html: layout(
          `${hello}<p>Your Tunisia IT Events account has been deactivated by an administrator. You can no longer log in for the moment.</p>`
        ),
      };

    case 'PASSWORD_CHANGED':
      return {
        subject: 'Your password has been changed',
        html: layout(
          `${hello}<p>Your password has just been changed. If this was not you, please contact the platform administrator immediately.</p>`
        ),
      };

    case 'EVENT_VALIDATED':
      return {
        subject: `Your event "${variables.eventTitle || ''}" has been approved`,
        html: layout(
          `${hello}<p>Good news! Your event <b>${title}</b> has been approved and is now visible to participants.</p>`
        ),
      };

    case 'EVENT_REJECTED':
      return {
        subject: `Your event "${variables.eventTitle || ''}" has been rejected`,
        html: layout(
          `${hello}<p>Your event <b>${title}</b> has been rejected by the administrator.</p>` +
            `<p><b>Reason:</b> ${escapeHtml(variables.rejectReason || 'not specified')}</p>`
        ),
      };

        case 'EVENT_CANCELLED':
      return {
        subject: `Event cancelled: "${variables.eventTitle || 'your event'}"`,
        html: layout(
          `${hello}<p>We are sorry to inform you that the event <b>${title || 'you registered for'}</b> has been cancelled by its organizer.</p>` +
            (variables.refund === 'true'
              ? `<p>If you have already paid for this event, you will be fully refunded.</p>`
              : '')
        ),
      };
      case 'REGISTRATION_CONFIRMED': {
      const when = variables.eventDate
        ? `<p><b>When:</b> ${escapeHtml(String(variables.eventDate).replace('T', ' ').slice(0, 16))}</p>`
        : '';
      const where = [variables.eventCity, variables.eventAddress]
        .filter(Boolean)
        .map((part) => escapeHtml(part))
        .join(', ');
      return {
        subject: `Registration confirmed: "${variables.eventTitle || 'your event'}"`,
        html: layout(
          `${hello}<p>Your registration for <b>${title || 'the event'}</b> is confirmed. See you there!</p>` +
            when +
            (where ? `<p><b>Where:</b> ${where}</p>` : '')
        ),
      };
    }

    case 'REGISTRATION_CANCELLED':
      return {
        subject: `Registration cancelled: "${variables.eventTitle || 'your event'}"`,
        html: layout(
          `${hello}<p>Your registration for <b>${title || 'the event'}</b> has been cancelled and your place has been released.</p>`
        ),
      };
      case 'EVENT_UPDATED':
      return {
        subject: `Event updated: "${variables.eventTitle || 'your event'}"`,
        html: layout(
          `${hello}<p>The event <b>${title || 'you registered for'}</b> has been updated by its organizer. Please check the event page for the new details (date, place, time).</p>`
        ),
      };
          case 'EVENT_PUBLISHED': {
      const when = variables.eventDate
        ? `<p><b>When:</b> ${escapeHtml(String(variables.eventDate).replace('T', ' ').slice(0, 16))}</p>`
        : '';
      const where = [variables.eventCity, variables.eventAddress]
        .filter(Boolean)
        .map((part) => escapeHtml(part))
        .join(', ');
      const price = variables.eventPrice
        ? `<p><b>Price:</b> ${escapeHtml(variables.eventPrice)}</p>`
        : '';
      return {
        subject: `New event: "${variables.eventTitle || 'a new event'}"`,
        html: layout(
          `${hello}<p>A new event has just been published on Tunisia IT Events: <b>${title || 'a new event'}</b>.</p>` +
            when +
            (where ? `<p><b>Where:</b> ${where}</p>` : '') +
            price +
            `<p>Log in to see all the details and register.</p>`
        ),
      };
    }
    //payment 
            case 'PAYMENT_RECEIVED': {
      const paidAt = variables.paidAt
        ? `<p><b>Date:</b> ${escapeHtml(String(variables.paidAt).replace('T', ' ').slice(0, 16))} (UTC)</p>`
        : '';
      return {
        subject: `Payment received: "${variables.eventTitle || 'your event'}"`,
        html: layout(
          `${hello}<p>We have received your payment for <b>${title || 'your event'}</b>. Thank you!</p>` +
            (variables.registrationConfirmed === 'true' ? `<p>Your registration is now confirmed.</p>` : '') +
            `<p><b>Receipt</b></p>` +
            (variables.amount ? `<p><b>Amount:</b> ${escapeHtml(variables.amount)}</p>` : '') +
            (variables.method ? `<p><b>Payment method:</b> ${escapeHtml(variables.method)}</p>` : '') +
            (variables.reference ? `<p><b>Reference:</b> ${escapeHtml(variables.reference)}</p>` : '') +
            paidAt
        ),
      };
    }

    case 'PAYMENT_FAILED': {
      const reasons = {
        card_declined: 'Your card was declined by the bank.',
        insufficient_funds: 'Your card has insufficient funds.',
        processing_error: 'A processing error occurred. Please try again.',
        not_a_test_card: 'This card is not accepted.',
      };
      const reason = Object.hasOwn(reasons, variables.failureReason)
        ? reasons[variables.failureReason]
        : 'The payment was declined.';
      return {
        subject: `Payment failed: "${variables.eventTitle || 'your event'}"`,
        html: layout(
          `${hello}<p>Your payment for <b>${title || 'your event'}</b> could not be completed.</p>` +
            `<p><b>Reason:</b> ${escapeHtml(reason)}</p>` +
            (variables.amount ? `<p><b>Amount:</b> ${escapeHtml(variables.amount)}</p>` : '') +
            `<p>No money has been taken. You can try again with another card.</p>`
        ),
      };
    }

    case 'PAYMENT_REFUNDED':
      return {
        subject: `Payment refunded: "${variables.eventTitle || 'your event'}"`,
        html: layout(
          `${hello}<p>Your payment for <b>${title || 'your event'}</b> has been refunded.</p>` +
            (variables.amount ? `<p><b>Amount refunded:</b> ${escapeHtml(variables.amount)}</p>` : '') +
            (variables.reference ? `<p><b>Reference:</b> ${escapeHtml(variables.reference)}</p>` : '') +
            `<p>It may take a few days for the refund to appear on your statement.</p>`
        ),
      };

    default:
      throw new Error(`Unknown email type: ${type}`);
  }
}
    
module.exports = { buildEmail };