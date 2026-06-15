/**
 * Resolve company reseller-panel API config (Hostheaven / SomaniOne).
 * Mirrors oceanlinux/src/lib/companyResellerApi.js
 */

const RESELLER_API_DEFAULTS = Object.freeze({
  baseUrl: 'https://vps.hostheaven.in',
  resellerDomain: 'vps.hostheaven.in',
  email: 'raftare3t5@gmail.com',
  password: 'Umesh@2113',
});

function getCompanyResellerApiConfig(company) {
  if (!company) return null;
  const cfg = company.resellerApi;
  if (!cfg || !cfg.enabled) return null;

  const baseUrl = (cfg.baseUrl || '').trim() || RESELLER_API_DEFAULTS.baseUrl;
  const email = (cfg.email || '').trim() || RESELLER_API_DEFAULTS.email;
  const password = cfg.password || RESELLER_API_DEFAULTS.password;
  let resellerDomain = (cfg.resellerDomain || '').trim();
  if (!resellerDomain && baseUrl === RESELLER_API_DEFAULTS.baseUrl) {
    resellerDomain = RESELLER_API_DEFAULTS.resellerDomain;
  }

  if (!baseUrl || !email || !password) return null;

  return {
    enabled: true,
    label: cfg.label || '',
    baseUrl,
    resellerDomain,
    email,
    password,
  };
}

function hasCompanyResellerApi(company) {
  return !!getCompanyResellerApiConfig(company);
}

module.exports = {
  RESELLER_API_DEFAULTS,
  getCompanyResellerApiConfig,
  hasCompanyResellerApi,
};
