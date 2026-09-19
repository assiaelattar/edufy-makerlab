import React, { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, CalendarDays, CheckCircle2, ChevronDown, ExternalLink, GraduationCap, Image as ImageIcon, Loader2, LogOut, RefreshCw, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useParentPortalData } from '../hooks/useParentPortalData';
import type { StudentProject } from '../types';
import { currentAcademicYear, normalizeAcademicYear, previousAcademicYear, projectAcademicYear, projectDate } from '../utils/academicYear';
import { formatCurrency } from '../utils/helpers';
import { ParentProjectModal } from './parent/ParentProjectModal';

type ParentTab = 'portfolio' | 'enrollments' | 'gallery';

const FAMILY_VISIBLE_STATUSES = new Set(['published', 'delivered', 'submitted', 'completed', 'approved', 'done']);

const statusLabel = (status: string) => ({
  published: 'Published',
  delivered: 'Completed',
  submitted: 'Submitted',
  completed: 'Completed',
  approved: 'Approved',
  done: 'Completed'
}[status.toLowerCase()] || status);

const dateLabel = (date: Date | null) => date
  ? new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
  : 'Date not recorded';

export const ParentDashboardView = () => {
  const { user, userProfile, currentOrganization, signOut } = useAuth();
  const { children, enrollments, payments, projects, galleryItems, loading, error, refresh } = useParentPortalData(
    user?.uid,
    currentOrganization?.id || userProfile?.organizationId
  );
  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedYear, setSelectedYear] = useState(previousAcademicYear());
  const [activeTab, setActiveTab] = useState<ParentTab>('portfolio');
  const [selectedProject, setSelectedProject] = useState<StudentProject | null>(null);

  useEffect(() => {
    if (!children.length) {
      setSelectedChildId('');
      return;
    }
    if (!children.some(child => child.id === selectedChildId)) setSelectedChildId(children[0].id);
  }, [children, selectedChildId]);

  const activeChild = children.find(child => child.id === selectedChildId) || children[0];
  const childSubjectIds = useMemo(() => new Set([
    activeChild?.id,
    activeChild?.loginInfo?.uid
  ].filter(Boolean) as string[]), [activeChild]);

  const childProjects = useMemo(() => projects
    .filter(project => childSubjectIds.has(project.studentId))
    .sort((a, b) => (projectDate(b)?.getTime() || 0) - (projectDate(a)?.getTime() || 0)), [projects, childSubjectIds]);

  const availableYears = useMemo(() => Array.from(new Set([
    previousAcademicYear(),
    currentAcademicYear(),
    ...childProjects.map(projectAcademicYear),
    ...enrollments
      .filter(item => item.studentId === activeChild?.id)
      .map(item => normalizeAcademicYear(item.session))
      .filter(Boolean) as string[]
  ])).filter(year => year !== 'Unknown year').sort().reverse(), [activeChild?.id, childProjects, enrollments]);

  const portfolioProjects = childProjects.filter(project =>
    projectAcademicYear(project) === selectedYear && FAMILY_VISIBLE_STATUSES.has(String(project.status).toLowerCase())
  );
  const inProgressProjects = childProjects.filter(project =>
    projectAcademicYear(project) === selectedYear && !FAMILY_VISIBLE_STATUSES.has(String(project.status).toLowerCase())
  );
  const childEnrollments = enrollments.filter(item =>
    item.studentId === activeChild?.id && (!item.session || normalizeAcademicYear(item.session) === selectedYear)
  );
  const enrollmentIds = new Set(childEnrollments.map(item => item.id));
  const childPayments = payments
    .filter(item => enrollmentIds.has(item.enrollmentId) && (!item.session || item.session === selectedYear))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const childGallery = galleryItems.filter(item => item.studentId && childSubjectIds.has(item.studentId));
  const totalBalance = childEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.balance || 0), 0);

  const handleSignOut = async () => {
    await signOut();
    window.location.assign('/parent-portal');
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#F7F1E4] px-6 text-[#08111F]">
        <div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-600" /><p className="mt-4 text-sm font-bold">Opening your family workspace…</p></div>
      </div>
    );
  }

  return (
    <div className={`min-h-[100dvh] bg-[#F7F1E4] text-[#08111F] ${import.meta.env.DEV && new URLSearchParams(window.location.search).get('ui') === 'education-v1' ? 'edu-parent-dashboard-v1' : ''}`}>
      <header className="border-b border-slate-950/10 bg-[#08111F] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-400/15 text-teal-200"><Sparkles size={21} /></div>
            <div className="min-w-0"><p className="truncate text-sm font-black">{currentOrganization?.name || 'Family workspace'}</p><p className="truncate text-xs text-slate-400">Welcome, {userProfile?.name || user?.email}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={refresh} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white" aria-label="Refresh family data"><RefreshCw size={17} /></button>
            <button type="button" onClick={handleSignOut} className="flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white"><LogOut size={16} /> <span className="hidden sm:inline">Sign out</span></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {error && (
          <div role="alert" className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <span>{error}</span><button type="button" onClick={refresh} className="shrink-0 font-black underline">Try again</button>
          </div>
        )}

        {!activeChild ? (
          <section className="mx-auto max-w-xl rounded-[28px] border border-slate-950/10 bg-white p-8 text-center shadow-sm">
            <ShieldCheck className="mx-auto h-10 w-10 text-teal-600" />
            <h1 className="mt-5 text-2xl font-black">Your account is ready, but no child is linked yet.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">Ask the academy to open the learner record and choose “Parent access”. Your projects will appear here as soon as the secure link is created.</p>
          </section>
        ) : (
          <>
            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="relative overflow-hidden rounded-[30px] bg-[#08111F] p-6 text-white shadow-[0_24px_70px_rgba(8,17,31,0.18)] sm:p-8">
                <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border-[34px] border-teal-300/10" />
                <div className="relative">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-300">Learning archive</p>
                  <h1 className="mt-3 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">See what {activeChild.name} built.</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Published projects, completed missions, evidence, and mentor feedback—organized by school year.</p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <label className="relative">
                      <span className="sr-only">Choose child</span>
                      <select value={activeChild.id} onChange={event => setSelectedChildId(event.target.value)} className="min-h-11 appearance-none rounded-xl border border-white/10 bg-white/[0.06] py-2 pl-4 pr-10 text-sm font-bold text-white outline-none focus:border-teal-300">
                        {children.map(child => <option key={child.id} value={child.id} className="text-slate-950">{child.name}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </label>
                    <label className="relative">
                      <span className="sr-only">Choose academic year</span>
                      <select value={selectedYear} onChange={event => setSelectedYear(event.target.value)} className="min-h-11 appearance-none rounded-xl border border-amber-200/20 bg-amber-200/[0.08] py-2 pl-4 pr-10 text-sm font-bold text-amber-100 outline-none focus:border-amber-200">
                        {availableYears.map(year => <option key={year} value={year} className="text-slate-950">{year}{year === previousAcademicYear() ? ' · Last year' : ''}</option>)}
                      </select>
                      <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                <div className="rounded-3xl border border-slate-950/10 bg-teal-100 p-5"><BookOpenCheck className="text-teal-800" size={20} /><p className="mt-5 text-3xl font-black">{portfolioProjects.length}</p><p className="text-xs font-bold text-teal-900/70">Projects to revisit</p></div>
                <div className="rounded-3xl border border-slate-950/10 bg-amber-100 p-5"><Wallet className="text-amber-800" size={20} /><p className="mt-5 text-2xl font-black">{formatCurrency(totalBalance)}</p><p className="text-xs font-bold text-amber-900/70">Recorded balance</p></div>
              </div>
            </section>

            <nav className="mt-7 flex gap-2 overflow-x-auto pb-2" aria-label="Family workspace sections">
              {([
                ['portfolio', 'Projects', BookOpenCheck],
                ['enrollments', 'Enrollments & payments', GraduationCap],
                ['gallery', 'Gallery', ImageIcon]
              ] as const).map(([id, label, Icon]) => (
                <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-black transition-colors ${activeTab === id ? 'bg-[#08111F] text-white' : 'border border-slate-950/10 bg-white text-slate-600 hover:text-slate-950'}`}><Icon size={17} /> {label}</button>
              ))}
            </nav>

            {activeTab === 'portfolio' && (
              <section className="mt-5">
                {portfolioProjects.length ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {portfolioProjects.map(project => {
                      const image = (project as StudentProject & { thumbnailUrl?: string }).thumbnailUrl || project.mediaUrls?.[0];
                      return (
                        <button key={project.id} type="button" onClick={() => setSelectedProject(project)} className="group overflow-hidden rounded-[26px] border border-slate-950/10 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
                          <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                            {image ? <img src={image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center"><Sparkles className="h-10 w-10 text-slate-300" /></div>}
                            <span className="absolute left-3 top-3 rounded-full bg-[#08111F]/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">{statusLabel(String(project.status))}</span>
                          </div>
                          <div className="p-5"><p className="text-xs font-bold text-teal-700">{dateLabel(projectDate(project))}</p><h2 className="mt-2 text-lg font-black leading-snug">{project.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{project.description || 'Open the project to see the work and evidence.'}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-slate-800">Open project <ExternalLink size={13} /></span></div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center"><BookOpenCheck className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-4 text-lg font-black">No shared projects for {selectedYear}</h2><p className="mt-2 text-sm text-slate-500">Projects appear after they are submitted, delivered, or published by the academy.</p></div>
                )}

                {inProgressProjects.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"><strong>{inProgressProjects.length} project{inProgressProjects.length === 1 ? '' : 's'} in progress.</strong> Draft work stays private until it is ready to share.</div>
                )}
              </section>
            )}

            {activeTab === 'enrollments' && (
              <section className="mt-5 grid gap-5 lg:grid-cols-2">
                <div className="rounded-[26px] border border-slate-950/10 bg-white p-5"><h2 className="text-lg font-black">Enrollments · {selectedYear}</h2><div className="mt-4 space-y-3">{childEnrollments.length ? childEnrollments.map(item => <div key={item.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{item.programName}</p><p className="mt-1 text-xs text-slate-500">{item.groupName || item.gradeName || item.packName}</p></div><span className="rounded-full bg-teal-100 px-2 py-1 text-[10px] font-black uppercase text-teal-800">{item.status}</span></div><div className="mt-4 flex justify-between border-t border-slate-200 pt-3 text-xs"><span className="text-slate-500">Balance</span><strong>{formatCurrency(item.balance || 0)}</strong></div></div>) : <p className="py-8 text-center text-sm text-slate-500">No enrollment recorded for this year.</p>}</div></div>
                <div className="rounded-[26px] border border-slate-950/10 bg-white p-5"><h2 className="text-lg font-black">Payments</h2><div className="mt-4 space-y-3">{childPayments.length ? childPayments.map(item => <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"><div><p className="text-sm font-black">{formatCurrency(item.amount)}</p><p className="mt-1 text-xs text-slate-500">{item.date || 'Date not recorded'} · {item.method}</p></div><span className="flex items-center gap-1 text-xs font-bold text-teal-700"><CheckCircle2 size={14} /> {item.status.replace(/_/g, ' ')}</span></div>) : <p className="py-8 text-center text-sm text-slate-500">No payment recorded for this year.</p>}</div></div>
              </section>
            )}

            {activeTab === 'gallery' && (
              <section className="mt-5">
                {childGallery.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{childGallery.map(item => <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="group overflow-hidden rounded-2xl border border-slate-950/10 bg-white"><div className="aspect-square overflow-hidden bg-slate-100">{item.type === 'video' ? <div className="flex h-full items-center justify-center"><ExternalLink className="text-slate-400" /></div> : <img src={item.url} alt={item.caption || `${activeChild.name}'s work`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}</div>{item.caption && <p className="p-3 text-xs font-bold">{item.caption}</p>}</a>)}</div> : <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center"><ImageIcon className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-4 text-lg font-black">No gallery items yet</h2></div>}
              </section>
            )}
          </>
        )}
      </main>

      <ParentProjectModal isOpen={Boolean(selectedProject)} onClose={() => setSelectedProject(null)} project={selectedProject} studentName={activeChild?.name || ''} />
    </div>
  );
};
