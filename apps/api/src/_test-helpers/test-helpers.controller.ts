import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { TestOtpStore } from './test-otp.store';

/**
 * Test helpers — only mounted when ENABLE_TEST_HELPERS=true. Intended for
 * automated tests and local dev. Returns secrets in plaintext; DO NOT enable
 * in production.
 */
@Controller('_test')
export class TestHelpersController {
  @Get('last-otp')
  lastOtp(@Query('identifier') identifier: string) {
    if (!TestOtpStore.enabled()) throw new ForbiddenException('Disabled');
    if (!identifier) return { code: null };
    const entry = TestOtpStore.last(identifier);
    return entry ? { code: entry.code, createdAt: entry.createdAt } : { code: null };
  }
}
