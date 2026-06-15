/**
 * Format IP addresses for Windows Hostycare orders (append :49965 when needed).
 */
function formatIpAddress(ipAddress, provider, os) {
  if (!ipAddress || ipAddress === 'Pending - Server being provisioned') {
    return ipAddress;
  }

  const isHostycare = provider === 'hostycare' || !provider;
  const isWindows = os && os.toLowerCase().includes('windows');

  if (isHostycare && isWindows && !ipAddress.includes(':49965')) {
    return `${ipAddress}:49965`;
  }

  return ipAddress;
}

function extractBaseIp(ipAddress) {
  if (!ipAddress) return ipAddress;
  const colonIndex = ipAddress.indexOf(':');
  if (colonIndex > -1) return ipAddress.substring(0, colonIndex);
  return ipAddress;
}

module.exports = {
  formatIpAddress,
  extractBaseIp,
};
