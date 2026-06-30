import { describe, expect, it } from 'vitest';

import { MemoryStorage } from '../src/memoryStorage.js';

describe('MemoryStorage - Nonce Validation', () => {
  it('rejects a nonce that was never stored', async () => {
    const storage = new MemoryStorage();

    await expect(storage.validateNonce('unknown-nonce')).resolves.toBe(false);
  });

  it('validates a stored nonce once', async () => {
    const storage = new MemoryStorage();
    await storage.storeNonce('nonce-id', new Date(Date.now() + 60_000));

    await expect(storage.validateNonce('nonce-id')).resolves.toBe(true);
    await expect(storage.validateNonce('nonce-id')).resolves.toBe(false);
  });

  it('rejects duplicate nonce storage', async () => {
    const storage = new MemoryStorage();
    await storage.storeNonce('dup-nonce', new Date(Date.now() + 60_000));

    await expect(
      storage.storeNonce('dup-nonce', new Date(Date.now() + 60_000)),
    ).rejects.toThrow('Nonce already exists');
  });

  it('does not allow storeNonce to reopen a consumed nonce', async () => {
    const storage = new MemoryStorage();
    await storage.storeNonce('reused-nonce', new Date(Date.now() + 60_000));
    await expect(storage.validateNonce('reused-nonce')).resolves.toBe(true);

    await expect(
      storage.storeNonce('reused-nonce', new Date(Date.now() + 60_000)),
    ).rejects.toThrow('Nonce already exists');
    await expect(storage.validateNonce('reused-nonce')).resolves.toBe(false);
  });

  it('allows only one concurrent validation to consume the nonce', async () => {
    const storage = new MemoryStorage();
    await storage.storeNonce('race-nonce', new Date(Date.now() + 60_000));

    const results = await Promise.all([
      storage.validateNonce('race-nonce'),
      storage.validateNonce('race-nonce'),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });
});
