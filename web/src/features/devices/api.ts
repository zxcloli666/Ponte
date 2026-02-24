import { api } from "@/shared/api/client";
import type { Device } from "./store";

/**
 * Fetch all paired devices for the current user.
 */
export async function getDevices(): Promise<Device[]> {
  return api.get("devices").json<Device[]>();
}
