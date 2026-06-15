import { getCompanyVirtualizorAccounts } from '@/lib/companyVirtualizor';

const { getCompanyResellerApiConfig } = require('@/lib/companyResellerApi');

export type CompanyAutomationInfo = {
  provider: 'virtualizor' | 'reseller-api';
  enabled: boolean;
  companyName?: string;
  panelCount?: number;
} | null;

/**
 * Resolve which company automation backs an order's IP stock (if any).
 * Used by the dashboard to show the right manage controls (e.g. Reset MAC for reseller-api).
 */
export async function resolveCompanyAutomationForIpStock(
  ipStockId: string | undefined | null
): Promise<CompanyAutomationInfo> {
  if (!ipStockId) return null;

  const connectDB = (await import('@/lib/db')).default;
  const IPStock = (await import('@/models/ipStockModel')).default;
  const Company = (await import('@/models/companyModel')).default;

  await connectDB();

  const ipStock = await IPStock.findById(ipStockId).select('company').lean();
  if (!(ipStock as any)?.company) return null;

  const company = await Company.findById((ipStock as any).company)
    .select('virtualizors virtualizor resellerApi name')
    .lean();
  if (!company) return null;

  const accounts = getCompanyVirtualizorAccounts(company);
  if (accounts.length > 0) {
    return {
      provider: 'virtualizor',
      enabled: true,
      panelCount: accounts.length,
      companyName: (company as any).name,
    };
  }

  if (getCompanyResellerApiConfig(company)) {
    return {
      provider: 'reseller-api',
      enabled: true,
      companyName: (company as any).name,
    };
  }

  return null;
}
