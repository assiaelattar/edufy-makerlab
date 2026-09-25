import {
    collection,
    doc,
    Firestore,
    getDoc,
    getDocs,
    query,
    where,
} from 'firebase/firestore';

import { StudentIdentityRecord, verifyStudentRecord } from '../domain/studentIdentity';

export type LinkedStudentRecord = StudentIdentityRecord & Record<string, any>;

const isPermissionDenied = (error: unknown) => (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    String((error as { code?: unknown }).code).includes('permission-denied')
);

/**
 * Resolve the canonical Edufy learner linked to a Firebase account.
 *
 * The user-profile pointer is both faster and compatible with direct-document
 * security rules. The constrained query remains as a repair path for older
 * accounts that predate users/{uid}.studentId.
 */
export const resolveLinkedStudentRecord = async ({
    db,
    authUid,
    organizationId,
    pointedStudentId,
}: {
    db: Firestore;
    authUid: string;
    organizationId: string;
    pointedStudentId?: string | null;
}): Promise<LinkedStudentRecord | null> => {
    if (pointedStudentId) {
        try {
            const pointedSnapshot = await getDoc(doc(db, 'students', pointedStudentId));
            if (pointedSnapshot.exists()) {
                const pointedRecord = {
                    id: pointedSnapshot.id,
                    ...pointedSnapshot.data(),
                } as LinkedStudentRecord;
                if (verifyStudentRecord(pointedRecord, authUid, organizationId)) {
                    return pointedRecord;
                }
            }
        } catch (error) {
            // A stale or cross-tenant pointer can be denied by design. Continue
            // to the constrained self-link query so a valid legacy link can heal.
            if (!isPermissionDenied(error)) throw error;
        }
    }

    const linkedQuery = query(
        collection(db, 'students'),
        where('loginInfo.uid', '==', authUid),
        where('organizationId', '==', organizationId)
    );
    const linkedSnapshot = await getDocs(linkedQuery);

    if (linkedSnapshot.size > 1) {
        throw new Error('More than one learner profile is linked to this login.');
    }
    if (linkedSnapshot.empty) return null;

    const linkedDocument = linkedSnapshot.docs[0];
    const linkedRecord = {
        id: linkedDocument.id,
        ...linkedDocument.data(),
    } as LinkedStudentRecord;

    return verifyStudentRecord(linkedRecord, authUid, organizationId)
        ? linkedRecord
        : null;
};
