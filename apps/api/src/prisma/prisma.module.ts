import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { TenantContextInterceptor } from '../common/tenant-context.interceptor';

@Global()
@Module({
  providers: [
    PrismaService,
    // Tops up the per-request tenant store from the JWT after auth runs.
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
