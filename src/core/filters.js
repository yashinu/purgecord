import { isDeletableType } from '../discord/constants.js';
import { dateToSnowflake } from './snowflake.js';

const LINK_RE = /https?:\/\//i;

function isDeletable(msg, o, regex, minSnow, maxSnow) {
  if (!isDeletableType(msg.type)) return false;
  if (msg.pinned && !o.includePinned) return false;
  if (o.authorId && msg.author?.id !== o.authorId) return false;
  if (o.content && !String(msg.content || '').toLowerCase().includes(o.content.toLowerCase())) return false;
  if (o.hasLink && !(LINK_RE.test(msg.content || '') || (msg.embeds && msg.embeds.length))) return false;
  if (o.hasFile && !(msg.attachments && msg.attachments.length)) return false;
  if (regex && !regex.test(msg.content || '')) return false;
  if (minSnow && BigInt(msg.id) < BigInt(minSnow)) return false;
  if (maxSnow && BigInt(msg.id) > BigInt(maxSnow)) return false;
  return true;
}

/**
 * Bir sayfa mesajı silinecek/atlanacak olarak ayırır (saf).
 * @param {object[]} messages
 * @param {object} options
 * @returns {{toDelete: object[], skipped: object[]}}
 */
export function filterMessages(messages, options = {}) {
  let regex = null;
  if (options.pattern) {
    try { regex = new RegExp(options.pattern, 'i'); } catch { regex = null; }
  }
  const minSnow = options.minId || (options.minDate ? dateToSnowflake(options.minDate) : null);
  const maxSnow = options.maxId || (options.maxDate ? dateToSnowflake(options.maxDate) : null);

  const toDelete = [];
  const skipped = [];
  for (const msg of messages) {
    if (isDeletable(msg, options, regex, minSnow, maxSnow)) toDelete.push(msg);
    else skipped.push(msg);
  }
  return { toDelete, skipped };
}
