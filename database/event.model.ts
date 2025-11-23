import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * Core attributes required to create or represent an Event.
 */
export interface EventAttributes {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string; // Stored as normalized ISO date string (e.g. 2025-01-31)
  time: string; // Stored as normalized 24h time string (HH:MM)
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Event document type, including Mongoose's Document fields.
 */
export interface EventDocument extends EventAttributes, Document {}

export type EventModel = Model<EventDocument>;

/**
 * Simple slug generator: lowercases the title and replaces non-alphanumerics
 * with single hyphens to create a URL-safe slug.
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalizes a date-like string into an ISO date (YYYY-MM-DD).
 * Throws if the value cannot be parsed.
 */
function normalizeDate(dateInput: string): string {
  const parsed = new Date(dateInput);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid event date');
  }

  // Keep only the date part while using a consistent ISO representation.
  return parsed.toISOString().split('T')[0];
}

/**
 * Normalizes time to 24-hour HH:MM format and validates basic structure.
 * Accepts values like "9:00", "09:00", "21:30" and normalizes them.
 */
function normalizeTime(timeInput: string): string {
  const trimmed = timeInput.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    throw new Error('Invalid event time format. Expected HH:MM');
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error('Invalid event time value');
  }

  const normalizedHours = hours.toString().padStart(2, '0');
  const normalizedMinutes = minutes.toString().padStart(2, '0');

  return `${normalizedHours}:${normalizedMinutes}`;
}

const requiredStringField = {
  type: String,
  required: true,
  trim: true,
  // Ensure value is not empty or only whitespace.
  validate: {
    validator: (value: string): boolean => value.trim().length > 0,
    message: 'This field is required.',
  },
} as const;

const stringArrayField = {
  type: [String],
  required: true,
  validate: {
    validator: (value: string[]): boolean => Array.isArray(value) && value.length > 0,
    message: 'At least one value is required.',
  },
} as const;

const eventSchema = new Schema<EventDocument, EventModel>(
  {
    title: requiredStringField,
    slug: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    description: requiredStringField,
    overview: requiredStringField,
    image: requiredStringField,
    venue: requiredStringField,
    location: requiredStringField,
    date: requiredStringField,
    time: requiredStringField,
    mode: requiredStringField,
    audience: requiredStringField,
    agenda: stringArrayField,
    organizer: requiredStringField,
    tags: stringArrayField,
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt.
    strict: true,
  },
);

// Ensure a unique index on the slug for fast lookups and uniqueness enforcement.
eventSchema.index({ slug: 1 }, { unique: true });

/**
 * Pre-validate hook to:
 * - Generate or update the slug when the title changes.
 * - Normalize and validate the date and time formats.
 */
eventSchema.pre<EventDocument>('validate', function preValidate(next) {
  try {
    // Only regenerate slug if the title is new or has been modified.
    if (this.isNew || this.isModified('title')) {
      const generatedSlug = slugify(this.title);

      if (!generatedSlug) {
        throw new Error('Unable to generate slug from title');
      }

      this.slug = generatedSlug;
    }

    // Normalize date and time for consistent storage.
    if (this.isModified('date')) {
      this.date = normalizeDate(this.date);
    }

    if (this.isModified('time')) {
      this.time = normalizeTime(this.time);
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

export const Event: EventModel =
  (mongoose.models.Event as EventModel) || mongoose.model<EventDocument, EventModel>('Event', eventSchema);
