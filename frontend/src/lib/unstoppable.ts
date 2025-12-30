import Resolution from '@unstoppabledomains/resolution';

// Initialize Unstoppable Domains resolution
const resolution = new Resolution();

/**
 * Resolve a domain name to an Ethereum address
 */
export async function resolveUDomain(domain: string): Promise<string | null> {
  try {
    const address = await resolution.addr(domain, 'ETH');
    return address || null;
  } catch (error) {
    console.error('UD resolution error:', error);
    return null;
  }
}

/**
 * Reverse resolve an address to a domain name
 */
export async function reverseResolveUD(address: string): Promise<string | null> {
  try {
    const domain = await resolution.reverse(address);
    return domain;
  } catch (error) {
    // No domain found for this address
    return null;
  }
}

/**
 * Get all records for a domain (avatar, social links, etc.)
 */
export async function getUDRecords(domain: string): Promise<Record<string, string> | null> {
  try {
    const records = await resolution.allRecords(domain);
    return records;
  } catch (error) {
    console.error('UD records error:', error);
    return null;
  }
}

/**
 * Get avatar/profile picture for a domain
 */
export async function getUDAvatar(domain: string): Promise<string | null> {
  try {
    const records = await resolution.allRecords(domain);
    return records['social.picture.value'] || records['ipfs.html.value'] || null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a string is a valid Unstoppable Domain
 */
export function isUDomain(name: string): boolean {
  const udTLDs = ['.crypto', '.nft', '.wallet', '.blockchain', '.bitcoin', '.dao', '.888', '.x', '.klever', '.hi', '.zil', '.polygon'];
  return udTLDs.some(tld => name.toLowerCase().endsWith(tld));
}

/**
 * Supported domain extensions
 */
export const UD_EXTENSIONS = [
  '.crypto',
  '.nft', 
  '.wallet',
  '.blockchain',
  '.bitcoin',
  '.dao',
  '.888',
  '.x',
  '.klever',
  '.hi',
  '.zil',
  '.polygon'
] as const;
