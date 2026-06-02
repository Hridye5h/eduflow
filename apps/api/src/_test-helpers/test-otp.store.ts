/**
 * In-memory stash of the most recent plaintext OTP for each identifier.
 * Only writes when ENABLE_TEST_HELPERS=true. Restarts wipe the map.
 * Never enable this in production.
 */
type Entry = { code: string; createdAt: Date };

const store = new Map<string, Entry>();

export class TestOtpStore {
  static enabled(): boolean {
    return process.env.ENABLE_TEST_HELPERS === 'true';
  }

  static record(identifier: string, code: string) {
    if (!this.enabled()) return;
    store.set(identifier, { code, createdAt: new Date() });
  }

  static last(identifier: string): Entry | undefined {
    return store.get(identifier);
  }

  static clear() {
    store.clear();
  }
}
