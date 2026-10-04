CREATE TABLE "blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"start" text NOT NULL,
	"end" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"notify" integer DEFAULT 0 NOT NULL,
	"active" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"created" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"start" text NOT NULL,
	"end" text NOT NULL,
	"days" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"answer" text DEFAULT '' NOT NULL,
	"proposed_start" text,
	"proposed_end" text,
	"override" integer DEFAULT 0 NOT NULL,
	"cancel_requested" integer DEFAULT 0 NOT NULL,
	"created" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_requests_status" ON "requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_requests_employee" ON "requests" USING btree ("employee_id");--> statement-breakpoint
CREATE FUNCTION congeo_enforce_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status='approved' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.days IS DISTINCT FROM NEW.days OR OLD.override IS DISTINCT FROM NEW.override) THEN
  PERFORM pg_advisory_xact_lock(19451004);
  IF EXISTS (
   SELECT 1 FROM jsonb_array_elements_text(NEW.days::jsonb) AS d(value)
   WHERE (SELECT COUNT(*) FROM requests r, jsonb_array_elements_text(r.days::jsonb) AS x(value) WHERE r.status='approved' AND r.id<>NEW.id AND x.value=d.value) >= CASE WHEN NEW.override=1 THEN 2 ELSE 1 END
   OR EXISTS (SELECT 1 FROM requests r,jsonb_array_elements_text(r.days::jsonb) AS x(value) WHERE r.status='approved' AND r.id<>NEW.id AND r.employee_id=NEW.employee_id AND x.value=d.value)
  ) THEN
   RAISE EXCEPTION 'capacity' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER congeo_capacity BEFORE INSERT OR UPDATE OF status,days,override ON requests FOR EACH ROW EXECUTE FUNCTION congeo_enforce_capacity();
