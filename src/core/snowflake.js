export const DISCORD_EPOCH = 1420070400000;

export function dateToSnowflake(date) {
  const ms = date instanceof Date ? date.getTime() : new Date(date).getTime();
  return (BigInt(ms - DISCORD_EPOCH) << 22n).toString();
}

export function snowflakeToDate(id) {
  return new Date(Number(BigInt(id) >> 22n) + DISCORD_EPOCH);
}

export function oldestId(messages) {
  return messages.reduce(
    (min, m) => (BigInt(m.id) < BigInt(min) ? m.id : min),
    messages[0].id
  );
}
