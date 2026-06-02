/**
 * Detect whether an order's server actions should run through OceanLinux's
 * full automation stack (company Virtualizor, Reseller API, Netbay, etc.)
 * rather than Hosthell's local Hostycare/SmartVPS handlers or the manual
 * request queue.
 */

export interface OrderAutomationFields {
  provider?: string;
  productName?: string;
  ipAddress?: string;
  ipStockId?: string;
  hostycareServiceId?: string;
  smartvpsServiceId?: string;
  advpsServiceId?: string;
  netbayServiceId?: string;
  autoProvisioned?: boolean;
}

/** SmartVPS orders are handled locally on Hosthell. */
export function isSmartVpsOrder(order: OrderAutomationFields | null | undefined): boolean {
  if (!order) return false;
  return order.provider === 'smartvps' || !!(order.productName && order.productName.includes('🌊'));
}

/** Hostycare orders with a live service id are handled locally on Hosthell. */
export function isLocalHostycareOrder(order: OrderAutomationFields | null | undefined): boolean {
  if (!order) return false;
  return !!order.hostycareServiceId;
}

/** ADVPS actions go through OceanLinux's dedicated internal advps-action route. */
export function isAdvpsOrder(order: OrderAutomationFields | null | undefined): boolean {
  if (!order) return false;
  return !!(order.advpsServiceId || order.provider === 'advps');
}

/**
 * Route power/reinstall actions through OceanLinux's internal service-action
 * endpoint so company Virtualizor / Reseller / Netbay automation matches
 * /dashboard/order/[id] on oceanlinux.com.
 */
export function shouldProxyServiceActionToOceanlinux(
  order: OrderAutomationFields | null | undefined
): boolean {
  if (!order?.ipAddress) return false;
  if (isAdvpsOrder(order)) return false; // handled by advps-action proxy
  if (isSmartVpsOrder(order)) return false;
  if (isLocalHostycareOrder(order)) return false;

  if (order.netbayServiceId || order.provider === 'netbay') return true;
  if (order.autoProvisioned) return true;
  if (order.ipStockId) return true;

  return false;
}

/**
 * Whether the Hosthell dashboard should show direct Start/Stop/Rebuild
 * controls instead of the manual "request action" queue.
 */
export function isDirectServerControlOrder(
  order: OrderAutomationFields | null | undefined
): boolean {
  if (!order) return false;

  if (isSmartVpsOrder(order) && (order.smartvpsServiceId || order.ipAddress)) return true;
  if (isLocalHostycareOrder(order)) return true;
  if (isAdvpsOrder(order) && order.advpsServiceId) return true;
  if (shouldProxyServiceActionToOceanlinux(order)) return true;

  return false;
}
