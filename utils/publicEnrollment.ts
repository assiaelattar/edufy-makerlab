const PUBLIC_ENROLLMENT_MODE = 'enroll';

export const buildPublicEnrollmentUrl = (programId: string, origin = window.location.origin) => {
    const url = new URL('/', origin);
    url.searchParams.set('mode', PUBLIC_ENROLLMENT_MODE);
    url.searchParams.set('program', programId);
    return url.toString();
};

export const isPublicEnrollmentRequest = (location: Pick<Location, 'pathname' | 'search'> = window.location) => {
    return location.pathname === '/enroll'
        || new URLSearchParams(location.search).get('mode') === PUBLIC_ENROLLMENT_MODE;
};
