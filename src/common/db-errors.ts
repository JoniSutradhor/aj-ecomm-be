import { ConflictException } from '@nestjs/common';

const pgCode = (error: any): string | undefined =>
    error?.driverError?.code ?? error?.code;

/** Maps Postgres unique / foreign key violations to a 409, rethrows anything else. */
export const rethrowConflict = (
    error: unknown,
    messages: { unique?: string; foreignKey?: string }
): never => {
    const code = pgCode(error);
    if (code === '23505' && messages.unique) {
        throw new ConflictException(messages.unique);
    }
    if (code === '23503' && messages.foreignKey) {
        throw new ConflictException(messages.foreignKey);
    }
    throw error;
};
