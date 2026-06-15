export interface SlotIpConnection {
  ip: string;
  port: string;
  username: string;
  password: string;
}

export function isSlotIpOrder(order: { provider?: string; slotIpPackageId?: string } | null | undefined): boolean {
  if (!order) return false;
  return order.provider === 'slotip' || !!order.slotIpPackageId;
}

/** Parse slot IP credentials — DB stores ipAddress as "ip:port" with username/password on the order. */
export function parseSlotIpConnection(order: {
  ipAddress?: string;
  username?: string;
  password?: string;
}): SlotIpConnection | null {
  const raw = (order.ipAddress || '').trim();
  if (!raw) return null;

  const storedMatch = raw.match(/^([^:]+):(\d+)$/);
  if (storedMatch) {
    return {
      ip: storedMatch[1],
      port: storedMatch[2],
      username: order.username || '',
      password: order.password || '',
    };
  }

  const parts = raw.split(':');
  if (parts.length >= 4) {
    return {
      ip: parts[0],
      port: parts[1],
      username: parts[2],
      password: parts.slice(3).join(':'),
    };
  }

  return {
    ip: raw,
    port: '',
    username: order.username || '',
    password: order.password || '',
  };
}

export const SLOT_IP_NO_RENEWAL_MESSAGE =
  'Slot IP orders cannot be renewed. Please purchase a new package when yours expires.';
