-- Remove duplicate contacts: keep the most recently updated one per (device_id, android_id)
DELETE FROM contacts
WHERE id NOT IN (
  SELECT DISTINCT ON (device_id, android_id) id
  FROM contacts
  ORDER BY device_id, android_id, updated_at DESC
);

-- Add unique constraint on (device_id, android_id)
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_device_android_unique" UNIQUE("device_id","android_id");

-- Create passkeys table
CREATE TABLE IF NOT EXISTS "passkeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"transports" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "passkeys_credential_id_unique" UNIQUE("credential_id")
);
