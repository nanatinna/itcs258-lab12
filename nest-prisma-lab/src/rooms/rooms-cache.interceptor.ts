import { ExecutionContext, Injectable } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';

// Same as Nest's CacheInterceptor (key = request URL, e.g. "/rooms" or "/rooms/3"),
// but CACHE_DISABLED=true skips the cache so we can benchmark without it.
@Injectable()
export class RoomsCacheInterceptor extends CacheInterceptor {
  protected trackBy(context: ExecutionContext) {
    if (process.env.CACHE_DISABLED === 'true') {
      return undefined;
    }
    return super.trackBy(context);
  }
}
