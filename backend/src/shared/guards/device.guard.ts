import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import type { JwtPayload } from "./jwt.guard.ts";

@Injectable()
export class DeviceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    if (user.deviceType !== "android" || !user.deviceId) {
      throw new ForbiddenException("This endpoint requires an authenticated Android device");
    }

    return true;
  }
}
