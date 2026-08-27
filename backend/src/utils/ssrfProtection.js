const dns = require('dns').promises;
const net = require('net');
const { AppError } = require('../middleware/errorHandler');

// Private / reserved / link-local / loopback / metadata ranges that must never be reachable.
const BLOCKED_IPV4_RANGES = [
  ['0.0.0.0', '0.255.255.255'],
  ['10.0.0.0', '10.255.255.255'],
  ['100.64.0.0', '100.127.255.255'], // CGNAT
  ['127.0.0.0', '127.255.255.255'], // loopback
  ['169.254.0.0', '169.254.255.255'], // link-local incl. cloud metadata (169.254.169.254)
  ['172.16.0.0', '172.31.255.255'],
  ['192.0.0.0', '192.0.0.255'],
  ['192.168.0.0', '192.168.255.255'],
  ['198.18.0.0', '198.19.255.255'],
  ['224.0.0.0', '239.255.255.255'], // multicast
  ['240.0.0.0', '255.255.255.255'],
];

function ipToLong(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isBlockedIPv4(ip) {
  const target = ipToLong(ip);
  return BLOCKED_IPV4_RANGES.some(([start, end]) => {
    const s = ipToLong(start);
    const e = ipToLong(end);
    return target >= s && target <= e;
  });
}

function isBlockedIPv6(ip) {
  const lower = ip.toLowerCase();
  return (
    lower === '::1' || // loopback
    lower.startsWith('fe80:') || // link-local
    lower.startsWith('fc') || // unique local
    lower.startsWith('fd') || // unique local
    lower === '::' ||
    lower.startsWith('::ffff:') // IPv4-mapped, re-validate the embedded IPv4 separately
  );
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
]);

/**
 * Resolves a hostname and throws if it (or any resolved address) points at a
 * private, loopback, link-local, or metadata address. Must be called for the
 * initial URL AND for every redirect target before following it.
 */
async function assertUrlIsSafe(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new AppError('Invalid URL', 400);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AppError('Only http and https URLs are allowed', 400);
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new AppError('This URL is not allowed', 400);
  }

  if (net.isIP(hostname)) {
    if (net.isIPv4(hostname) && isBlockedIPv4(hostname)) {
      throw new AppError('This URL is not allowed', 400);
    }
    if (net.isIPv6(hostname) && isBlockedIPv6(hostname)) {
      throw new AppError('This URL is not allowed', 400);
    }
    return parsed;
  }

  let addresses;
  try {
    addresses = await dns.resolve(hostname).catch(() => dns.resolve6(hostname));
  } catch {
    throw new AppError('Could not resolve hostname', 400);
  }

  for (const addr of addresses) {
    if (net.isIPv4(addr) && isBlockedIPv4(addr)) {
      throw new AppError('This URL resolves to a disallowed network', 400);
    }
    if (net.isIPv6(addr) && isBlockedIPv6(addr)) {
      throw new AppError('This URL resolves to a disallowed network', 400);
    }
  }

  return parsed;
}

module.exports = { assertUrlIsSafe, isBlockedIPv4, isBlockedIPv6 };
