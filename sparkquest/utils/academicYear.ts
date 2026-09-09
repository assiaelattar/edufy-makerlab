export const currentAcademicYear = (date = new Date()) => {
    const year = date.getFullYear();
    const startsThisYear = date.getMonth() >= 7;
    const startYear = startsThisYear ? year : year - 1;
    return `${startYear}-${startYear + 1}`;
};

export const previousAcademicYear = (date = new Date()) => {
    const [startYear] = currentAcademicYear(date).split('-').map(Number);
    return `${startYear - 1}-${startYear}`;
};

export const normalizeAcademicYear = (value?: string) => {
    if (!value) return null;
    const years = value.match(/\d{4}/g);
    if (years && years.length >= 2) return `${years[0]}-${years[1]}`;
    if (years?.length === 1) {
        const startYear = Number(years[0]);
        return `${startYear}-${startYear + 1}`;
    }
    return value.trim();
};

export const matchesAcademicYear = (value: string | undefined, academicYear: string) =>
    normalizeAcademicYear(value) === normalizeAcademicYear(academicYear);

export const isCurrentAcademicYear = (value?: string, date = new Date()) =>
    matchesAcademicYear(value, currentAcademicYear(date));

const projectDate = (value: any) => {
    if (!value) return null;
    const date = value?.toDate?.() || new Date(value);
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
};

export const projectAcademicYear = (project: {
    academicYearId?: string;
    academicYear?: string;
    schoolYear?: string;
    session?: string;
    publishedAt?: any;
    updatedAt?: any;
    createdAt?: any;
}) => {
    const explicitYear = project.academicYearId || project.academicYear || project.schoolYear || project.session;
    if (explicitYear) return normalizeAcademicYear(explicitYear) || explicitYear;
    const date = projectDate(project.publishedAt) || projectDate(project.updatedAt) || projectDate(project.createdAt);
    return date ? currentAcademicYear(date) : 'Unknown year';
};
