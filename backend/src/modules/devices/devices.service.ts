import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { DevicesRepository, type Device, type DeviceInsert } from "./devices.repository.ts";

@Injectable()
export class DevicesService {
  constructor(private readonly devicesRepository: DevicesRepository) {}

  /**
   * Create a new device. Used internally by the auth module during pairing.
   */
  create(data: DeviceInsert): Promise<Device> {
    return this.devicesRepository.create(data);
  }

  /**
   * List all devices belonging to a user.
   */
  findByUserId(userId: string): Promise<Device[]> {
    return this.devicesRepository.findByUserId(userId);
  }

  /**
   * Get a single device by ID, enforcing ownership.
   */
  async findByIdForUser(deviceId: string, userId: string): Promise<Device> {
    const device = await this.devicesRepository.findById(deviceId);

    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    if (device.userId !== userId) {
      throw new ForbiddenException("You do not have access to this device");
    }

    return device;
  }

  /**
   * Find device by ID without ownership check. Used internally by other modules.
   */
  findById(deviceId: string): Promise<Device | undefined> {
    return this.devicesRepository.findById(deviceId);
  }

  /**
   * Update a device's display name. Enforces ownership.
   */
  async update(
    deviceId: string,
    userId: string,
    data: { name?: string },
  ): Promise<Device> {
    await this.findByIdForUser(deviceId, userId);

    const updated = await this.devicesRepository.update(deviceId, data);

    if (!updated) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    return updated;
  }

  /**
   * Remove a device. Cascade deletes are handled at the DB level
   * (sims, messages, calls, notifications, contacts, sessions).
   * Enforces ownership.
   */
  async delete(deviceId: string, userId: string): Promise<void> {
    await this.findByIdForUser(deviceId, userId);

    const deleted = await this.devicesRepository.delete(deviceId);

    if (!deleted) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }
  }

  /**
   * Update the lastSeenAt timestamp for a device.
   */
  async updateLastSeen(deviceId: string): Promise<void> {
    await this.devicesRepository.updateLastSeen(deviceId);
  }
}
