import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ──────────────────────────────────────────────────────────────────

export const messageDirectionEnum = pgEnum("message_direction", [
  "incoming",
  "outgoing",
]);

export const messageStatusEnum = pgEnum("message_status", [
  "pending",
  "delivered",
  "failed",
]);

export const callDirectionEnum = pgEnum("call_direction", [
  "incoming",
  "outgoing",
  "missed",
]);

export const recipientTypeEnum = pgEnum("recipient_type", [
  "ios",
  "android",
]);

// ─── Devices ────────────────────────────────────────────────────────────────

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  androidVersion: text("android_version").notNull(),
  secretHash: text("secret_hash").notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const devicesRelations = relations(devices, ({ many }) => ({
  sims: many(sims),
  messages: many(messages),
  calls: many(calls),
  notifications: many(notifications),
  notificationFilters: many(notificationFilters),
  contacts: many(contacts),
  sessions: many(sessions),
}));

// ─── SIMs ───────────────────────────────────────────────────────────────────

export const sims = pgTable("sims", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
  slotIndex: integer("slot_index").notNull(),
  iccId: text("icc_id").notNull(),
  carrierName: text("carrier_name").notNull(),
  rawNumber: text("raw_number"),
  displayName: text("display_name").notNull(),
  displayNumber: text("display_number"),
  color: text("color").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const simsRelations = relations(sims, ({ one, many }) => ({
  device: one(devices, { fields: [sims.deviceId], references: [devices.id] }),
  extraNumbers: many(extraNumbers),
  messages: many(messages),
  calls: many(calls),
}));

// ─── Extra Numbers ──────────────────────────────────────────────────────────

export const extraNumbers = pgTable("extra_numbers", {
  id: uuid("id").primaryKey().defaultRandom(),
  simId: uuid("sim_id").notNull().references(() => sims.id, { onDelete: "cascade" }),
  prefix: text("prefix").notNull(),
  phoneNumber: text("phone_number").notNull(),
  displayName: text("display_name").notNull(),
  displayNumber: text("display_number").notNull(),
  color: text("color").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const extraNumbersRelations = relations(extraNumbers, ({ one, many }) => ({
  sim: one(sims, { fields: [extraNumbers.simId], references: [sims.id] }),
  messages: many(messages),
  calls: many(calls),
}));

// ─── Messages ───────────────────────────────────────────────────────────────

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
  simId: uuid("sim_id").notNull().references(() => sims.id),
  extraNumberId: uuid("extra_number_id").references(() => extraNumbers.id),
  direction: messageDirectionEnum("direction").notNull(),
  address: text("address").notNull(),
  contactId: uuid("contact_id").references(() => contacts.id),
  body: text("body").notNull(),
  extractedCode: text("extracted_code"),
  androidMsgId: text("android_msg_id").notNull().unique(),
  status: messageStatusEnum("status").notNull().default("pending"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  device: one(devices, { fields: [messages.deviceId], references: [devices.id] }),
  sim: one(sims, { fields: [messages.simId], references: [sims.id] }),
  extraNumber: one(extraNumbers, { fields: [messages.extraNumberId], references: [extraNumbers.id] }),
  contact: one(contacts, { fields: [messages.contactId], references: [contacts.id] }),
}));

// ─── Calls ──────────────────────────────────────────────────────────────────

export const calls = pgTable("calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
  simId: uuid("sim_id").notNull().references(() => sims.id),
  extraNumberId: uuid("extra_number_id").references(() => extraNumbers.id),
  direction: callDirectionEnum("direction").notNull(),
  address: text("address").notNull(),
  contactId: uuid("contact_id").references(() => contacts.id),
  duration: integer("duration").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  androidCallId: text("android_call_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const callsRelations = relations(calls, ({ one }) => ({
  device: one(devices, { fields: [calls.deviceId], references: [devices.id] }),
  sim: one(sims, { fields: [calls.simId], references: [sims.id] }),
  extraNumber: one(extraNumbers, { fields: [calls.extraNumberId], references: [extraNumbers.id] }),
  contact: one(contacts, { fields: [calls.contactId], references: [contacts.id] }),
}));

// ─── Notifications ──────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
  packageName: text("package_name").notNull(),
  appName: text("app_name").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  androidNotifId: text("android_notif_id").notNull().unique(),
  postedAt: timestamp("posted_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  device: one(devices, { fields: [notifications.deviceId], references: [devices.id] }),
}));

// ─── Notification Filters ───────────────────────────────────────────────────

export const notificationFilters = pgTable("notification_filters", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
  packageName: text("package_name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
});

export const notificationFiltersRelations = relations(notificationFilters, ({ one }) => ({
  device: one(devices, { fields: [notificationFilters.deviceId], references: [devices.id] }),
}));

// ─── Contacts ───────────────────────────────────────────────────────────────

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phones: jsonb("phones").notNull().$type<{ number: string; type: string; label: string }[]>(),
  photoUrl: text("photo_url"),
  androidId: text("android_id").notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  device: one(devices, { fields: [contacts.deviceId], references: [devices.id] }),
  messages: many(messages),
  calls: many(calls),
}));

// ─── Sessions ───────────────────────────────────────────────────────────────

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  deviceId: uuid("device_id").references(() => devices.id, { onDelete: "cascade" }),
  deviceType: text("device_type").notNull(),
  refreshTokenHash: text("refresh_token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  device: one(devices, { fields: [sessions.deviceId], references: [devices.id] }),
}));

// ─── Delivery Receipts ──────────────────────────────────────────────────────

export const deliveryReceipts = pgTable("delivery_receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: text("event_type").notNull(),
  eventId: uuid("event_id").notNull(),
  recipientType: recipientTypeEnum("recipient_type").notNull(),
  acked: boolean("acked").notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
