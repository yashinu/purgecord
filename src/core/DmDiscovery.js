import { API_BASE, CHANNEL_TYPE } from '../discord/constants.js';
import { snowflakeToDate } from './snowflake.js';

export function dmName(channel) {
  if (channel.type === CHANNEL_TYPE.GROUP_DM) {
    if (channel.name) return channel.name;
    const names = (channel.recipients || []).map(r => r.global_name || r.username).filter(Boolean);
    return names.length ? names.join(', ') : 'Grup DM';
  }
  const r = (channel.recipients || [])[0];
  return r ? (r.global_name || r.username || 'Bilinmeyen') : 'Bilinmeyen';
}

export function dmIcon(channel) {
  if (channel.type === CHANNEL_TYPE.GROUP_DM) {
    return channel.icon
      ? `https://cdn.discordapp.com/channel-icons/${channel.id}/${channel.icon}.png?size=64`
      : null;
  }
  const r = (channel.recipients || [])[0];
  return r?.avatar ? `https://cdn.discordapp.com/avatars/${r.id}/${r.avatar}.png?size=64` : null;
}

export function mapDmChannel(c) {
  return {
    id: c.id,
    type: c.type,
    name: dmName(c),
    icon: dmIcon(c),
    lastMessageId: c.last_message_id || null,
    lastTime: c.last_message_id ? snowflakeToDate(c.last_message_id) : null,
  };
}

function cmpSnowDesc(a, b) {
  const av = a ? BigInt(a) : 0n;
  const bv = b ? BigInt(b) : 0n;
  return av < bv ? 1 : av > bv ? -1 : 0;
}

export async function listDms(api) {
  const resp = await api.request(`${API_BASE}/users/@me/channels`);
  if (!resp.ok) throw new Error(`DM listesi alınamadı: ${resp.status}`);
  const channels = await resp.json();
  return channels
    .filter(c => c.type === CHANNEL_TYPE.DM || c.type === CHANNEL_TYPE.GROUP_DM)
    .map(mapDmChannel)
    .sort((a, b) => cmpSnowDesc(a.lastMessageId, b.lastMessageId));
}
