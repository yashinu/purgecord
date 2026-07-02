export const API_BASE = 'https://discord.com/api/v9';

// Silinebilir mesaj tipleri (undiscord ile birebir).
export const isDeletableType = (type) => type === 0 || (type >= 6 && type <= 21);

export const CHANNEL_TYPE = { DM: 1, GROUP_DM: 3 };
