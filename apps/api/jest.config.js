/**
 * Unit / integration test config (*.spec.ts under src/).
 * (E2E tests use test/jest-e2e.json via `pnpm test:e2e`.)
 *
 * DB-gated specs (RLS, consent, provenance, whatsapp, dunning, razorpay,
 * grading integration) self-skip unless DATABASE_URL is set; the pure ones
 * (e.g. grading/scoring) always run.
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { isolatedModules: true, diagnostics: false }],
  },
  testEnvironment: 'node',
  testTimeout: 30000,
};
