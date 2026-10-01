const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    if (value === null || typeof value !== 'object') return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};

/**
 * Firestore rejects `undefined` at any depth, including inside objects stored in
 * arrays. Mission forms intentionally contain optional fields, so clean the
 * domain payload before adding Firestore sentinels such as serverTimestamp().
 * Non-plain objects (Date, Timestamp, DocumentReference, FieldValue) are kept.
 */
export const omitUndefinedDeep = <T>(value: T): T => {
    if (Array.isArray(value)) {
        return value
            .filter(item => item !== undefined)
            .map(item => omitUndefinedDeep(item)) as T;
    }

    if (!isPlainObject(value)) return value;

    return Object.fromEntries(
        Object.entries(value)
            .filter(([, entryValue]) => entryValue !== undefined)
            .map(([key, entryValue]) => [key, omitUndefinedDeep(entryValue)])
    ) as T;
};
