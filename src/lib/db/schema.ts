import { sql } from "drizzle-orm";
import {
  blob,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
  integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now());

export const users = sqliteTable(
  "users",
  {
    id: id(),
    name: text("name").notNull(),
    animal: text("animal").notNull(),
    passcodeHash: text("passcode_hash").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("users_name_unique").on(sql`lower(${t.name})`),
    uniqueIndex("users_animal_unique").on(t.animal),
  ],
);

export const PHASES = [
  "ideas",
  "idea_voting",
  "dates",
  "date_voting",
  "done",
] as const;
export type Phase = (typeof PHASES)[number];

export const parties = sqliteTable("parties", {
  id: id(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  organizerId: text("organizer_id")
    .notNull()
    .references(() => users.id),
  phase: text("phase", { enum: PHASES }).notNull().default("ideas"),
  // Optional deadline (epoch ms) for the *current* phase. Cleared on every phase change.
  phaseDeadline: integer("phase_deadline"),
  ideaRound: integer("idea_round").notNull().default(1),
  dateRound: integer("date_round").notNull().default(1),
  winningIdeaId: text("winning_idea_id"),
  winningDateId: text("winning_date_id"),
  createdAt: createdAt(),
});

export const ideas = sqliteTable(
  "ideas",
  {
    id: id(),
    partyId: text("party_id")
      .notNull()
      .references(() => parties.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    link: text("link"),
    // JSON array of image URLs (external URLs or /uploads/<id>)
    images: text("images", { mode: "json" }).$type<string[]>().notNull().default([]),
    priceLevel: integer("price_level"), // 1..4 ($ .. $$$$)
    costPerPerson: real("cost_per_person"),
    costNotes: text("cost_notes").notNull().default(""),
    notes: text("notes").notNull().default(""),
    // Set when knocked out by a runoff; eliminated ideas stay visible but can't be voted on.
    eliminatedInRound: integer("eliminated_in_round"),
    createdAt: createdAt(),
  },
  (t) => [index("ideas_party_idx").on(t.partyId)],
);

export const dateOptions = sqliteTable(
  "date_options",
  {
    id: id(),
    partyId: text("party_id")
      .notNull()
      .references(() => parties.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    date: text("date").notNull(), // YYYY-MM-DD
    time: text("time").notNull().default(""), // HH:MM or "" for "any time"
    note: text("note").notNull().default(""),
    eliminatedInRound: integer("eliminated_in_round"),
    createdAt: createdAt(),
  },
  (t) => [
    index("date_options_party_idx").on(t.partyId),
    uniqueIndex("date_options_unique").on(t.partyId, t.date, t.time),
  ],
);

export const VOTE_KINDS = ["idea", "date"] as const;
export type VoteKind = (typeof VOTE_KINDS)[number];

export const votes = sqliteTable(
  "votes",
  {
    id: id(),
    partyId: text("party_id")
      .notNull()
      .references(() => parties.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind", { enum: VOTE_KINDS }).notNull(),
    optionId: text("option_id").notNull(),
    round: integer("round").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("votes_unique").on(t.userId, t.kind, t.optionId, t.round),
    index("votes_party_idx").on(t.partyId, t.kind, t.round),
  ],
);

export const uploads = sqliteTable("uploads", {
  id: id(),
  uploaderId: text("uploader_id")
    .notNull()
    .references(() => users.id),
  mime: text("mime").notNull(),
  data: blob("data", { mode: "buffer" }).notNull(),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type Party = typeof parties.$inferSelect;
export type Idea = typeof ideas.$inferSelect;
export type DateOption = typeof dateOptions.$inferSelect;
export type Vote = typeof votes.$inferSelect;
