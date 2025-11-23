import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { Event } from './event.model';

/**
 * Core attributes required to create or represent a Booking.
 */
export interface BookingAttributes {
  eventId: Types.ObjectId;
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Booking document type, including Mongoose's Document fields.
 */
export interface BookingDocument extends BookingAttributes, Document {}

export type BookingModel = Model<BookingDocument>;

/**
 * Simple email validation pattern to catch common invalid email formats.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const bookingSchema = new Schema<BookingDocument, BookingModel>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true, // Index for faster lookups by event.
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value: string): boolean => EMAIL_REGEX.test(value),
        message: 'Invalid email address.',
      },
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt.
    strict: true,
  },
);

// Explicit index on eventId to optimize queries filtering by event.
bookingSchema.index({ eventId: 1 });

/**
 * Pre-save hook to ensure referential integrity:
 * - Verifies that the referenced Event exists before creating the booking.
 */
bookingSchema.pre<BookingDocument>('save', async function preSave(next) {
  try {
    if (!this.isModified('eventId')) {
      return next();
    }

    const eventExists = await Event.exists({ _id: this.eventId }).lean();

    if (!eventExists) {
      throw new Error('Cannot create booking: referenced event does not exist.');
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

export const Booking: BookingModel =
  (mongoose.models.Booking as BookingModel) ||
  mongoose.model<BookingDocument, BookingModel>('Booking', bookingSchema);
