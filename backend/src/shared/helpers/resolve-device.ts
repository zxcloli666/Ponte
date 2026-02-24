import { BadRequestException } from "@nestjs/common";
import type { JwtPayload } from "../guards/jwt.guard.ts";
import { DevicesService } from "../../modules/devices/devices.service.ts";

/**
 * Resolves device IDs for the current user.
 *
 * - Android JWT has deviceId → returns [deviceId]
 * - iOS JWT has no deviceId → returns all user's device IDs (multi-device)
 * - Optional deviceId query param narrows to specific device
 */
export async function resolveDeviceIds(
  devicesService: DevicesService,
  user: JwtPayload,
  queryDeviceId?: string,
): Promise<string[]> {
  // Explicit query param filter
  if (queryDeviceId) return [queryDeviceId];

  // Android: scoped to own device
  if (user.deviceId) return [user.deviceId];

  // iOS: all user's devices
  const userDevices = await devicesService.findByUserId(user.sub);
  if (userDevices.length === 0) {
    throw new BadRequestException("No paired devices found");
  }
  return userDevices.map((d) => d.id);
}