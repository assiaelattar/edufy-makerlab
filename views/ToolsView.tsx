import React, { useMemo, useState } from 'react';
import {
    AlertTriangle,
    Ban,
    CheckCircle2,
    Columns3,
    Database,
    Download,
    Eye,
    FileCheck2,
    FileSpreadsheet,
    HardDriveDownload,
    Info,
    Loader2,
    Lock,
    Rows3,
    ShieldCheck,
    Table,
    Upload,
    Wrench
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import {
    AtlasActionButton,
    AtlasCommandHeader,
    AtlasEmptyState,
    AtlasSectionHeader,
    AtlasSignalCard
} from '../components/atlas/AtlasSurface';

type ImportField = 'Name' | 'ParentPhone' | 'Email' | 'ParentName' | 'Address' | 'School' | 'BirthDate' | 'MedicalInfo';
type ReviewPhase = 'idle' | 'reviewing' | 'ready' | 'blocked' | 'exporting' | 'complete' | 'failed';

interface ColumnHeader {
    id: string;
    index: number;
    label: string;
}

interface ReviewedRow {
    sourceRow: number;
    values: Record<ImportField, string>;
    errors: string[];
    warnings: string[];
}

interface OperationResult {
    tone: 'info' | 'success' | 'warning' | 'danger';
    title: string;
    message: string;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_SOURCE_ROWS = 5000;

const importFields: Array<{ key: ImportField; label: string; required?: boolean }> = [
    { key: 'Name', label: 'Student name', required: true },
    { key: 'ParentPhone', label: 'Parent phone', required: true },
    { key: 'Email', label: 'Email' },
    { key: 'ParentName', label: 'Parent name' },
    { key: 'Address', label: 'Address' },
    { key: 'School', label: 'School' },
    { key: 'BirthDate', label: 'Birth date' },
    { key: 'MedicalInfo', label: 'Medical information' }
];

const createEmptyMapping = () => Object.fromEntries(importFields.map(field => [field.key, ''])) as Record<ImportField, string>;

const waitForPaint = () => new Promise(resolve => window.setTimeout(resolve, 180));

const cleanText = (value: unknown) => String(value ?? '').replace(/\u0000/g, '').trim();

const excelDateToIso = (value: number) => {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return '';
    return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
};

const normalizeDate = (value: unknown) => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    if (typeof value === 'number') return excelDateToIso(value);
    return cleanText(value);
};

const isValidIsoDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const isUnsafeSpreadsheetValue = (value: string, field: ImportField) => {
    if (!value) return false;
    if (/^[=@\t\r]/.test(value)) return true;
    if (field !== 'ParentPhone' && /^[+-]/.test(value)) return true;
    return false;
};

const escapeCsvCell = (value: string) => {
    const safeValue = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    return /[,"\n]/.test(safeValue) ? `"${safeValue.replace(/"/g, '""')}"` : safeValue;
};

const resultStyles: Record<OperationResult['tone'], string> = {
    info: 'border-sky-400/20 bg-sky-400/[0.06] text-sky-200',
    success: 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200',
    warning: 'border-amber-300/20 bg-amber-300/[0.06] text-amber-100',
    danger: 'border-red-400/20 bg-red-400/[0.06] text-red-200'
};

const operationRegister = [
    {
        name: 'Student import preparation',
        detail: 'Local dry run and tenant-labelled CSV export. No database writes.',
        status: 'Available'
    },
    {
        name: 'Direct database import',
        detail: 'Requires a bounded server job, duplicate checks, and an audit record.',
        status: 'Server required'
    },
    {
        name: 'Repairs and migrations',
        detail: 'No broad client-side writes are exposed from this workspace.',
        status: 'Server required'
    },
    {
        name: 'Bulk deletion',
        detail: 'Destructive maintenance requires a restorable server-side workflow.',
        status: 'Not available'
    }
];

export const ToolsView = () => {
    const { can, currentOrganization } = useAuth();
    const { alert: showAlert, confirm } = useConfirm();
    const [sourceRows, setSourceRows] = useState<unknown[][]>([]);
    const [headers, setHeaders] = useState<ColumnHeader[]>([]);
    const [fileName, setFileName] = useState('');
    const [sheetName, setSheetName] = useState('');
    const [mapping, setMapping] = useState<Record<ImportField, string>>(createEmptyMapping);
    const [phase, setPhase] = useState<ReviewPhase>('idle');
    const [hasReviewed, setHasReviewed] = useState(false);
    const [result, setResult] = useState<OperationResult | null>(null);

    const hasSettingsAccess = can('settings.manage');
    const hasActiveTenant = Boolean(currentOrganization?.id && currentOrganization.status === 'active');
    const workspaceReady = hasSettingsAccess && hasActiveTenant;

    const mappedFieldCount = useMemo(() => Object.values(mapping).filter(Boolean).length, [mapping]);
    const requiredFieldsMapped = Boolean(mapping.Name && mapping.ParentPhone);

    const reviewedRows = useMemo<ReviewedRow[]>(() => {
        const usedKeys = new Set<string>();

        return sourceRows.map((row, rowIndex) => {
            const values = Object.fromEntries(importFields.map(field => {
                const sourceId = mapping[field.key];
                const sourceIndex = headers.find(header => header.id === sourceId)?.index;
                const rawValue = sourceIndex === undefined ? '' : row[sourceIndex];
                return [field.key, field.key === 'BirthDate' ? normalizeDate(rawValue) : cleanText(rawValue)];
            })) as Record<ImportField, string>;
            const errors: string[] = [];
            const warnings: string[] = [];

            if (!values.Name) errors.push('Student name is missing.');
            if (!values.ParentPhone) errors.push('Parent phone is missing.');

            const phoneDigits = values.ParentPhone.replace(/\D/g, '');
            if (values.ParentPhone && phoneDigits.length < 7) errors.push('Parent phone is too short.');

            if (values.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.Email)) {
                warnings.push('Email format needs review.');
            }

            if (values.BirthDate) {
                if (!isValidIsoDate(values.BirthDate)) {
                    errors.push('Birth date must use YYYY-MM-DD.');
                } else {
                    const birthDate = new Date(`${values.BirthDate}T00:00:00Z`);
                    const earliestDate = new Date('1900-01-01T00:00:00Z');
                    if (birthDate > new Date() || birthDate < earliestDate) errors.push('Birth date is outside the supported range.');
                }
            }

            importFields.forEach(field => {
                if (isUnsafeSpreadsheetValue(values[field.key], field.key)) {
                    errors.push(`${field.label} starts with an unsafe spreadsheet formula character.`);
                }
            });

            if (values.Name && values.ParentPhone) {
                const duplicateKey = `${values.Name.toLocaleLowerCase()}::${phoneDigits}`;
                if (usedKeys.has(duplicateKey)) errors.push('Duplicate student and phone in this file.');
                usedKeys.add(duplicateKey);
            }

            if (!values.Email) warnings.push('No email supplied.');
            if (!values.ParentName) warnings.push('No parent name supplied.');

            return { sourceRow: rowIndex + 2, values, errors, warnings };
        });
    }, [headers, mapping, sourceRows]);

    const blockingRows = reviewedRows.filter(row => row.errors.length > 0);
    const warningRows = reviewedRows.filter(row => row.warnings.length > 0 && row.errors.length === 0);
    const cleanRows = reviewedRows.filter(row => row.errors.length === 0);
    const canExport = workspaceReady && hasReviewed && requiredFieldsMapped && reviewedRows.length > 0 && blockingRows.length === 0;

    const resetReview = () => {
        setHasReviewed(false);
        setPhase('idle');
        setResult(null);
    };

    const handleMappingChange = (field: ImportField, sourceId: string) => {
        setMapping(current => ({ ...current, [field]: sourceId }));
        resetReview();
    };

    const clearSource = () => {
        setSourceRows([]);
        setHeaders([]);
        setFileName('');
        setSheetName('');
        setMapping(createEmptyMapping());
        resetReview();
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        if (!workspaceReady) {
            await showAlert('Active workspace required', 'Select an active organization with Settings management access before preparing tenant data.', 'warning');
            return;
        }

        if (file.size > MAX_FILE_BYTES) {
            await showAlert('File is too large', 'Choose a CSV or Excel file smaller than 10 MB. Larger imports require a bounded server job.', 'warning');
            return;
        }

        setPhase('reviewing');
        setResult({ tone: 'info', title: 'Reading source file', message: 'The file remains in this browser while Atlas inspects its first worksheet.' });

        try {
            const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
            if (!worksheet) throw new Error('Workbook has no readable worksheet.');

            const data = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, raw: true, defval: '' });
            const rawHeaders = data[0] ?? [];
            const nextHeaders = rawHeaders
                .map((value, index) => ({ id: `column-${index}`, index, label: cleanText(value) }))
                .filter(header => header.label);
            const nextRows = data
                .slice(1)
                .filter(row => Array.isArray(row) && row.some(value => cleanText(value) !== ''));

            if (nextHeaders.length < 2 || nextRows.length === 0) {
                throw new Error('Use a header row and include at least one populated student row.');
            }
            if (nextRows.length > MAX_SOURCE_ROWS) {
                throw new Error(`This file contains ${nextRows.length.toLocaleString()} rows. The browser workflow is limited to ${MAX_SOURCE_ROWS.toLocaleString()} rows.`);
            }

            const nextMapping = createEmptyMapping();
            nextHeaders.forEach(header => {
                const normalized = header.label.toLowerCase().replace(/[^a-z]/g, '');
                if (!nextMapping.Name && normalized.includes('name') && !normalized.includes('parent')) nextMapping.Name = header.id;
                else if (!nextMapping.ParentPhone && (normalized.includes('phone') || normalized.includes('mobile'))) nextMapping.ParentPhone = header.id;
                else if (!nextMapping.Email && normalized.includes('email')) nextMapping.Email = header.id;
                else if (!nextMapping.ParentName && (normalized.includes('parent') || normalized.includes('father') || normalized.includes('mother'))) nextMapping.ParentName = header.id;
                else if (!nextMapping.Address && (normalized.includes('address') || normalized.includes('city'))) nextMapping.Address = header.id;
                else if (!nextMapping.School && normalized.includes('school')) nextMapping.School = header.id;
                else if (!nextMapping.BirthDate && (normalized.includes('birth') || normalized.includes('dob'))) nextMapping.BirthDate = header.id;
                else if (!nextMapping.MedicalInfo && (normalized.includes('medical') || normalized.includes('note'))) nextMapping.MedicalInfo = header.id;
            });

            setFileName(file.name);
            setSheetName(firstSheetName);
            setHeaders(nextHeaders);
            setSourceRows(nextRows);
            setMapping(nextMapping);
            setHasReviewed(false);
            setPhase('idle');
            setResult({
                tone: workbook.SheetNames.length > 1 ? 'warning' : 'info',
                title: `${nextRows.length.toLocaleString()} rows loaded`,
                message: workbook.SheetNames.length > 1
                    ? `Only the first worksheet, ${firstSheetName}, is in scope. Review the mapping before the dry run.`
                    : `Worksheet ${firstSheetName} is ready for mapping. No workspace data has changed.`
            });
        } catch (error) {
            clearSource();
            const message = error instanceof Error ? error.message : 'Choose a valid CSV or Excel workbook and try again.';
            setPhase('failed');
            setResult({ tone: 'danger', title: 'Source file was not accepted', message });
        }
    };

    const handleDryRun = async () => {
        if (!workspaceReady || !requiredFieldsMapped || sourceRows.length === 0) return;

        setPhase('reviewing');
        setResult({ tone: 'info', title: 'Dry run in progress', message: `Checking ${sourceRows.length.toLocaleString()} rows without writing to the database.` });
        await waitForPaint();
        setHasReviewed(true);

        if (blockingRows.length > 0) {
            setPhase('blocked');
            setResult({
                tone: 'danger',
                title: `${blockingRows.length.toLocaleString()} rows need correction`,
                message: 'Fix the source file or mapping, then run the dry check again. No database writes were attempted.'
            });
            return;
        }

        setPhase('ready');
        setResult({
            tone: warningRows.length > 0 ? 'warning' : 'success',
            title: 'Dry run passed',
            message: warningRows.length > 0
                ? `${warningRows.length.toLocaleString()} rows have non-blocking warnings. Review the preview before download.`
                : `All ${cleanRows.length.toLocaleString()} rows are ready for a local CSV export.`
        });
    };

    const handleConvertAndDownload = async () => {
        if (!canExport || !currentOrganization) return;

        const approved = await confirm({
            title: 'Download reviewed student file?',
            message: `Create a CSV for ${currentOrganization.name} with ${cleanRows.length.toLocaleString()} reviewed rows? This downloads a local file only and does not import or change database records.`,
            confirmText: 'Download CSV',
            cancelText: 'Keep reviewing',
            variant: 'info'
        });
        if (!approved) return;

        setPhase('exporting');
        setResult({ tone: 'info', title: 'Preparing download', message: 'Building the reviewed CSV in this browser.' });
        await waitForPaint();

        try {
            const outputHeaders = ['Name', 'ParentPhone', 'Email', 'ParentName', 'Address', 'School', 'BirthDate(YYYY-MM-DD)', 'MedicalInfo'];
            const csvLines = [
                outputHeaders.join(','),
                ...cleanRows.map(row => importFields.map(field => escapeCsvCell(row.values[field.key])).join(','))
            ];
            const blob = new Blob([`\uFEFF${csvLines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const tenantLabel = (currentOrganization.slug || currentOrganization.id).replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
            link.href = objectUrl;
            link.download = `${tenantLabel}-students-reviewed-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);

            setPhase('complete');
            setResult({
                tone: 'success',
                title: 'Reviewed file downloaded',
                message: `${cleanRows.length.toLocaleString()} rows were exported locally for ${currentOrganization.name}. No database records were created or changed.`
            });
        } catch (error) {
            console.error('Reviewed student export failed:', error);
            setPhase('failed');
            setResult({ tone: 'danger', title: 'Download failed', message: 'The browser could not create the reviewed CSV. No database records were changed.' });
        }
    };

    if (!hasSettingsAccess) {
        return (
            <div className="flex h-full items-center justify-center pb-24 md:pb-8">
                <AtlasEmptyState
                    title="Tools access is restricted"
                    description="An administrator can grant Settings management access for this workspace."
                    icon={Lock}
                />
            </div>
        );
    }

    if (!hasActiveTenant) {
        return (
            <div className="flex h-full items-center justify-center pb-24 md:pb-8">
                <AtlasEmptyState
                    title="Active workspace required"
                    description="Maintenance tools stay locked until an active organization is selected. Suspended and trial workspaces cannot run tenant data operations here."
                    icon={ShieldCheck}
                />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col gap-4 pb-24 md:pb-8">
            <AtlasCommandHeader
                eyebrow="Maintenance console"
                title="Admin Tools"
                description="Inspect and prepare tenant data through bounded, reviewable operations."
                icon={Wrench}
                badges={
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-2 py-1 text-[10px] font-bold text-emerald-200">
                        {currentOrganization?.name} / active
                    </span>
                }
            />

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <AtlasSignalCard label="Source rows" value={sourceRows.length} detail={fileName || 'No source selected'} icon={Rows3} tone={sourceRows.length ? 'teal' : 'slate'} />
                <AtlasSignalCard label="Mapped fields" value={`${mappedFieldCount}/${importFields.length}`} detail="Name and phone required" icon={Columns3} tone={requiredFieldsMapped ? 'blue' : 'amber'} />
                <AtlasSignalCard label="Blocking rows" value={hasReviewed ? blockingRows.length : '-'} detail={hasReviewed ? 'Dry-run result' : 'Run a dry check'} icon={blockingRows.length ? AlertTriangle : FileCheck2} tone={blockingRows.length ? 'red' : hasReviewed ? 'emerald' : 'slate'} />
                <AtlasSignalCard label="Operation" value={phase === 'complete' ? 'Complete' : phase === 'ready' ? 'Ready' : phase === 'blocked' || phase === 'failed' ? 'Blocked' : phase === 'reviewing' || phase === 'exporting' ? 'Running' : 'Idle'} detail="Browser-only preparation" icon={phase === 'reviewing' || phase === 'exporting' ? Loader2 : ShieldCheck} tone={phase === 'complete' || phase === 'ready' ? 'emerald' : phase === 'blocked' || phase === 'failed' ? 'red' : 'slate'} />
            </div>

            {result && (
                <div className={`rounded-lg border px-4 py-3 ${resultStyles[result.tone]}`} role={result.tone === 'danger' ? 'alert' : 'status'} aria-live="polite">
                    <div className="flex items-start gap-3">
                        {result.tone === 'danger' || result.tone === 'warning' ? <AlertTriangle size={17} className="mt-0.5 shrink-0" /> : result.tone === 'success' ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <Info size={17} className="mt-0.5 shrink-0" />}
                        <div className="min-w-0">
                            <p className="text-sm font-bold">{result.title}</p>
                            <p className="mt-0.5 text-xs leading-5 opacity-80">{result.message}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(250px,0.62fr)_minmax(0,1.5fr)]">
                <div className="flex min-h-0 flex-col gap-4">
                    <section className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
                        <AtlasSectionHeader
                            title="Source file"
                            description="CSV or Excel, first worksheet only, up to 5,000 rows."
                            icon={Database}
                        />

                        <label className="group relative mt-4 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-slate-950/65 p-5 text-center transition-colors hover:border-teal-300/45 hover:bg-teal-400/[0.04] focus-within:ring-2 focus-within:ring-teal-400/60">
                            <input
                                type="file"
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                onChange={event => void handleFileUpload(event)}
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                aria-label="Choose a CSV or Excel file"
                                disabled={phase === 'reviewing' || phase === 'exporting'}
                            />
                            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/10 text-teal-300">
                                {fileName ? <FileSpreadsheet size={21} /> : <Upload size={21} />}
                            </span>
                            <span className="max-w-full truncate text-sm font-bold text-white">{fileName || 'Choose a spreadsheet'}</span>
                            <span className="mt-1 text-xs leading-5 text-slate-500">{fileName ? `${sheetName} / choose again to replace` : 'File contents stay in this browser'}</span>
                        </label>

                        {fileName && (
                            <AtlasActionButton variant="quiet" onClick={clearSource} disabled={phase === 'reviewing' || phase === 'exporting'} className="mt-2 w-full">
                                Clear source
                            </AtlasActionButton>
                        )}
                    </section>

                    <section className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
                        <AtlasSectionHeader title="Operation register" description="Available actions and enforced boundaries." icon={ShieldCheck} />
                        <div className="mt-3 divide-y divide-white/10">
                            {operationRegister.map((operation, index) => (
                                <div key={operation.name} className="py-3 first:pt-0 last:pb-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-200">{operation.name}</p>
                                            <p className="mt-1 text-[11px] leading-4 text-slate-500">{operation.detail}</p>
                                        </div>
                                        {index === 0 ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" aria-label="Available" /> : <Ban size={16} className="mt-0.5 shrink-0 text-slate-600" aria-label={operation.status} />}
                                    </div>
                                    {index > 0 && (
                                        <button type="button" disabled title={operation.detail} className="mt-2 h-8 w-full rounded-lg border border-white/10 bg-white/[0.02] px-2 text-[11px] font-bold text-slate-600 disabled:cursor-not-allowed">
                                            {operation.status}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <section className="flex min-h-[560px] min-w-0 flex-col rounded-lg border border-white/10 bg-slate-900/70 p-4">
                    <AtlasSectionHeader
                        title="Map and dry check"
                        description="Every mapped row is validated before a download can be created."
                        icon={Table}
                        meta={headers.length > 0 ? <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-slate-400">{sourceRows.length} rows</span> : undefined}
                    />

                    {headers.length > 0 ? (
                        <>
                            <div className="mt-4 overflow-x-auto rounded-lg border border-white/10 bg-slate-950/55">
                                <table className="w-full min-w-[560px] text-left text-sm">
                                    <thead className="bg-slate-950 text-[10px] font-bold uppercase text-slate-500">
                                        <tr>
                                            <th className="w-2/5 px-4 py-3">Atlas field</th>
                                            <th className="px-4 py-3">Source column</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {importFields.map(field => (
                                            <tr key={field.key} className="transition-colors hover:bg-white/[0.025]">
                                                <td className="px-4 py-2.5">
                                                    <span className="font-bold text-slate-200">{field.label}</span>
                                                    {field.required && <span className="ml-2 text-[10px] font-bold text-amber-200">Required</span>}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <select
                                                        className="h-9 w-full rounded-lg border border-white/10 bg-slate-900 px-3 text-sm text-slate-200 outline-none transition-colors focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10"
                                                        value={mapping[field.key]}
                                                        onChange={event => handleMappingChange(field.key, event.target.value)}
                                                        aria-label={`Source column for ${field.label}`}
                                                        disabled={phase === 'reviewing' || phase === 'exporting'}
                                                    >
                                                        <option value="">Not mapped</option>
                                                        {headers.map(header => <option key={header.id} value={header.id}>{header.label} (column {header.index + 1})</option>)}
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {hasReviewed && (
                                <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-lg border border-white/10 bg-slate-950/55">
                                    <table className="w-full min-w-[720px] text-left text-xs">
                                        <thead className="sticky top-0 z-10 bg-slate-950 text-[10px] font-bold uppercase text-slate-500">
                                            <tr>
                                                <th className="px-3 py-2.5">Row</th>
                                                <th className="px-3 py-2.5">Student</th>
                                                <th className="px-3 py-2.5">Parent phone</th>
                                                <th className="px-3 py-2.5">Review</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/10">
                                            {reviewedRows.slice(0, 25).map(row => (
                                                <tr key={row.sourceRow}>
                                                    <td className="px-3 py-2 font-mono text-slate-500">{row.sourceRow}</td>
                                                    <td className="max-w-56 truncate px-3 py-2 font-bold text-slate-200">{row.values.Name || 'Missing'}</td>
                                                    <td className="px-3 py-2 text-slate-400">{row.values.ParentPhone || 'Missing'}</td>
                                                    <td className="px-3 py-2">
                                                        {row.errors.length > 0 ? (
                                                            <span className="text-red-200">{row.errors.join(' ')}</span>
                                                        ) : row.warnings.length > 0 ? (
                                                            <span className="text-amber-100">{row.warnings.join(' ')}</span>
                                                        ) : (
                                                            <span className="text-emerald-300">Ready</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {reviewedRows.length > 25 && <p className="border-t border-white/10 px-3 py-2 text-[11px] text-slate-500">Showing the first 25 of {reviewedRows.length.toLocaleString()} reviewed rows.</p>}
                                </div>
                            )}

                            <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Eye size={14} className="text-teal-300" />
                                    {hasReviewed ? `${cleanRows.length} ready / ${blockingRows.length} blocked / ${warningRows.length} warnings` : 'No database writes are performed.'}
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <AtlasActionButton
                                        icon={phase === 'reviewing' ? Loader2 : Eye}
                                        onClick={() => void handleDryRun()}
                                        disabled={!requiredFieldsMapped || phase === 'reviewing' || phase === 'exporting'}
                                    >
                                        {phase === 'reviewing' ? 'Checking rows...' : hasReviewed ? 'Run dry check again' : 'Run dry check'}
                                    </AtlasActionButton>
                                    <AtlasActionButton
                                        variant="primary"
                                        icon={phase === 'exporting' ? Loader2 : Download}
                                        onClick={() => void handleConvertAndDownload()}
                                        disabled={!canExport || phase === 'exporting'}
                                    >
                                        {phase === 'exporting' ? 'Preparing...' : 'Download reviewed CSV'}
                                    </AtlasActionButton>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-1 items-center justify-center py-8">
                            <AtlasEmptyState
                                title="Choose a spreadsheet to begin"
                                description="Atlas will map the first worksheet, run a local dry check, and keep every blocked row visible before export."
                                icon={HardDriveDownload}
                            />
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};
