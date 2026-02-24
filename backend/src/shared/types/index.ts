import { z } from "zod";

// ─── Common ─────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type PaginationDto = z.infer<typeof paginationSchema>;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export const pairRequestSchema = z.object({
  pairingToken: z.string().uuid(),
  deviceInfo: z.object({
    name: z.string().min(1),
    androidVersion: z.string().min(1),
  }),
});

export type PairRequestDto = z.infer<typeof pairRequestSchema>;

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshRequestDto = z.infer<typeof refreshRequestSchema>;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JwtClaims {
  sub: string;
  deviceType: "android" | "ios";
  deviceId?: string;
}

// ─── SIM ────────────────────────────────────────────────────────────────────

export const simSyncSchema = z.object({
  sims: z.array(
    z.object({
      slotIndex: z.number().int().min(0),
      iccId: z.string(),
      carrierName: z.string().min(1),
      rawNumber: z.string().nullable().optional(),
      displayName: z.string().min(1),
      displayNumber: z.string().nullable().optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      isDefault: z.boolean(),
    }),
  ),
});

export type SimSyncDto = z.infer<typeof simSyncSchema>;

export const simUpdateSchema = z.object({
  displayName: z.string().min(1).optional(),
  displayNumber: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isDefault: z.boolean().optional(),
});

export type SimUpdateDto = z.infer<typeof simUpdateSchema>;

export const extraNumberCreateSchema = z.object({
  prefix: z.string().min(1),
  phoneNumber: z.string().min(1),
  displayName: z.string().min(1),
  displayNumber: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  sortOrder: z.number().int().default(0),
});

export type ExtraNumberCreateDto = z.infer<typeof extraNumberCreateSchema>;

export const extraNumberUpdateSchema = extraNumberCreateSchema.partial();

export type ExtraNumberUpdateDto = z.infer<typeof extraNumberUpdateSchema>;

// ─── SMS ────────────────────────────────────────────────────────────────────

export const smsPushSchema = z.object({
  messages: z.array(
    z.object({
      simId: z.string().uuid(),
      extraNumberId: z.string().uuid().nullable().optional(),
      direction: z.enum(["incoming", "outgoing"]),
      address: z.string().min(1),
      contactId: z.string().uuid().nullable().optional(),
      body: z.string(),
      androidMsgId: z.string().min(1),
      createdAt: z.string().datetime().optional(),
    }),
  ),
});

export type SmsPushDto = z.infer<typeof smsPushSchema>;

export const smsSendSchema = z.object({
  to: z.string().min(1),
  body: z.string().min(1),
  simId: z.string().uuid(),
  extraNumberId: z.string().uuid().nullable().optional(),
  tempId: z.string().optional(),
});

export type SmsSendDto = z.infer<typeof smsSendSchema>;

// ─── Calls ──────────────────────────────────────────────────────────────────

export const callLogPushSchema = z.object({
  calls: z.array(
    z.object({
      simId: z.string().uuid(),
      extraNumberId: z.string().uuid().nullable().optional(),
      direction: z.enum(["incoming", "outgoing", "missed"]),
      address: z.string().min(1),
      contactId: z.string().uuid().nullable().optional(),
      duration: z.number().int().min(0),
      startedAt: z.string().datetime(),
      endedAt: z.string().datetime().nullable().optional(),
      androidCallId: z.string().min(1),
    }),
  ),
});

export type CallLogPushDto = z.infer<typeof callLogPushSchema>;

export const callInitiateSchema = z.object({
  to: z.string().min(1),
  simId: z.string().uuid(),
  extraNumberId: z.string().uuid().nullable().optional(),
});

export type CallInitiateDto = z.infer<typeof callInitiateSchema>;

// ─── Notifications ──────────────────────────────────────────────────────────

export const notificationPushSchema = z.object({
  notifications: z.array(
    z.object({
      packageName: z.string().min(1),
      appName: z.string().min(1),
      title: z.string(),
      body: z.string(),
      androidNotifId: z.string().min(1),
      postedAt: z.string().datetime(),
    }),
  ),
});

export type NotificationPushDto = z.infer<typeof notificationPushSchema>;

export const notificationFilterUpdateSchema = z.object({
  enabled: z.boolean(),
});

export type NotificationFilterUpdateDto = z.infer<typeof notificationFilterUpdateSchema>;

// ─── Contacts ───────────────────────────────────────────────────────────────

export const contactPhoneSchema = z.object({
  number: z.string().min(1),
  type: z.string(),
  label: z.string(),
});

export const contactSyncSchema = z.object({
  contacts: z.array(
    z.object({
      androidId: z.string().min(1),
      name: z.string().min(1),
      phones: z.array(contactPhoneSchema),
      photoUrl: z.string().nullable().optional(),
    }),
  ),
  deletedIds: z.array(z.string()).optional(),
});

export type ContactSyncDto = z.infer<typeof contactSyncSchema>;
