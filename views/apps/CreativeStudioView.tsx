import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  Download,
  Globe2,
  Image as ImageIcon,
  Instagram,
  LayoutTemplate,
  Loader2,
  Megaphone,
  MonitorUp,
  Palette,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Type,
  UsersRound
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { AtlasActionButton, AtlasCommandHeader, AtlasEmptyState, AtlasSectionHeader, AtlasSignalCard } from '../../components/atlas/AtlasSurface';
import { ChatGPTModuleGate } from '../../modules/chatgpt-auth/ChatGPTModuleGate';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { db } from '../../services/firebase';
import { generateCreativeAsset } from '../../services/creativeGeneration';
import type {
  CreativeDestinationId,
  CreativeGenerationResult,
  CreativeStudioDraft,
  TenantBrandDna
} from '../../types/creativeStudio';
import {
  CREATIVE_DESTINATIONS,
  compileCreativePrompt,
  createTenantStarterBrandDna,
  getBrandReadiness,
  getDestination,
  joinListInput,
  normalizeBrandDna,
  splitListInput
} from '../../utils/creativeStudio';

type StudioMode = 'create' | 'brand';
type CreateStep = 'destination' | 'message' | 'visual' | 'review';

const steps: Array<{ id: CreateStep; label: string; icon: LucideIcon }> = [
  { id: 'destination', label: 'Destination', icon: LayoutTemplate },
  { id: 'message', label: 'Message', icon: Type },
  { id: 'visual', label: 'Visual', icon: Camera },
  { id: 'review', label: 'Review', icon: CheckCircle2 }
];

const destinationIcons: Record<CreativeDestinationId, LucideIcon> = {
  'instagram-post': Instagram,
  'instagram-story': MonitorUp,
  'website-hero': Globe2,
  'website-card': LayoutTemplate,
  'google-business': Building2,
  'paid-ad': Megaphone
};

const inputClass = 'h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-teal-300/60 focus:ring-2 focus:ring-teal-400/10';
const textareaClass = `${inputClass} h-auto min-h-28 resize-y py-3 leading-6`;

const createInitialDraft = (): CreativeStudioDraft => ({
  destinationId: 'instagram-post',
  objective: '',
  audience: 'Parents and families',
  callToAction: 'Learn more',
  language: 'French',
  visualSource: 'gallery'
});

const loadImage = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('The selected image cannot be exported from its current host.'));
  image.src = source;
});

const drawCoverImage = (context: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) => {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const renderedWidth = image.naturalWidth * scale;
  const renderedHeight = image.naturalHeight * scale;
  context.drawImage(image, (width - renderedWidth) / 2, (height - renderedHeight) / 2, renderedWidth, renderedHeight);
};

const drawWrappedText = (context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) => {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  words.forEach(word => {
    const candidate = current ? `${current} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else current = candidate;
  });
  if (current) lines.push(current);
  lines.slice(0, maxLines).forEach((line, index) => context.fillText(index === maxLines - 1 && lines.length > maxLines ? `${line}...` : line, x, y + (index * lineHeight)));
};

export const CreativeStudioView = () => {
  const { settings, programs, galleryItems } = useAppContext();
  const { currentOrganization, user, userProfile, can } = useAuth();
  const { alert: showAlert } = useConfirm();
  const organizationId = currentOrganization?.id || '';
  const starterDna = useMemo(() => createTenantStarterBrandDna(organizationId, settings.academyName || currentOrganization?.name || 'Organization'), [currentOrganization?.name, organizationId, settings.academyName]);

  const [mode, setMode] = useState<StudioMode>('create');
  const [activeStep, setActiveStep] = useState<CreateStep>('destination');
  const [draft, setDraft] = useState<CreativeStudioDraft>(createInitialDraft);
  const [brandDna, setBrandDna] = useState<TenantBrandDna>(settings.creativeStudio || starterDna);
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<CreativeGenerationResult | null>(null);

  useEffect(() => {
    setBrandDna(settings.creativeStudio || starterDna);
    setDraft(createInitialDraft());
    setActiveStep('destination');
    setResult(null);
  }, [organizationId]);

  useEffect(() => {
    if (settings.creativeStudio) setBrandDna(settings.creativeStudio);
  }, [settings.creativeStudio]);

  const destination = getDestination(draft.destinationId);
  const readiness = getBrandReadiness(brandDna);
  const brandIsSaved = settings.creativeStudio?.status === 'ready';
  const canManageBrand = can('settings.manage') || ['owner', 'admin', 'super_admin'].includes(userProfile?.role || '');
  const tenantPrograms = useMemo(() => programs.filter(program => program.organizationId === organizationId && program.status !== 'archived'), [organizationId, programs]);
  const tenantGallery = useMemo(() => galleryItems.filter(item => item.organizationId === organizationId && item.url).slice(0, 18), [galleryItems, organizationId]);
  const selectedGalleryItem = tenantGallery.find(item => item.id === draft.galleryItemId);
  const currentStepIndex = steps.findIndex(step => step.id === activeStep);

  const updateDraft = (patch: Partial<CreativeStudioDraft>) => {
    setDraft(current => ({ ...current, ...patch }));
    setResult(null);
  };

  const stepIsComplete = (step: CreateStep): boolean => {
    if (step === 'destination') return Boolean(draft.destinationId);
    if (step === 'message') return draft.objective.trim().length >= 8 && draft.audience.trim().length >= 3;
    if (step === 'visual') return draft.visualSource === 'generate' || Boolean(draft.galleryImageUrl);
    return stepIsComplete('message') && stepIsComplete('visual') && brandIsSaved;
  };

  const goNext = () => {
    if (!stepIsComplete(activeStep)) return;
    setActiveStep(steps[Math.min(currentStepIndex + 1, steps.length - 1)].id);
  };

  const saveBrandDna = async () => {
    if (!db || !organizationId || !userProfile || !canManageBrand) return;
    const normalized = normalizeBrandDna(brandDna);
    const nextReadiness = getBrandReadiness(normalized);
    if (!nextReadiness.ready) {
      await showAlert('Brand DNA needs a little more detail', 'Complete the organization summary, visual direction, environment, and exclusions before saving it as ready.', 'warning');
      return;
    }

    setIsSavingBrand(true);
    try {
      const saved: TenantBrandDna = { ...normalized, status: 'ready', version: (settings.creativeStudio?.version || 0) + 1, updatedAt: new Date().toISOString(), updatedBy: userProfile.uid || userProfile.email };
      await setDoc(doc(db, 'organizations', organizationId, 'settings', 'global'), { creativeStudio: saved, updatedAt: serverTimestamp() }, { merge: true });
      setBrandDna(saved);
      await showAlert('Brand DNA saved', `${saved.organizationName} is ready for controlled creative production.`, 'success');
      setMode('create');
    } catch (error) {
      console.error(error);
      await showAlert('Brand DNA not saved', 'Check your workspace access and connection, then try again.', 'danger');
    } finally {
      setIsSavingBrand(false);
    }
  };

  const useGalleryAsset = () => {
    if (!selectedGalleryItem?.url) return;
    setResult({
      dataUrl: selectedGalleryItem.url,
      mediaType: 'image',
      prompt: compileCreativePrompt({ destination, draft, brandDna }),
      qaNote: 'Uses an existing organization Gallery image. Confirm consent, crop, and campaign context before publishing.'
    });
  };

  const generateAsset = async () => {
    if (!user || !organizationId || !brandIsSaved) return;
    setIsGenerating(true);
    try {
      const generated = await generateCreativeAsset({ destination, draft, brandDna: settings.creativeStudio || brandDna }, user, organizationId);
      setResult(generated);
    } catch (error: any) {
      console.error(error);
      await showAlert('Asset not generated', error.message || 'Review the creative connection and try again.', 'danger');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCleanAsset = () => {
    if (!result) return;
    const anchor = document.createElement('a');
    anchor.href = result.dataUrl;
    anchor.download = `${brandDna.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${draft.destinationId}.png`;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.click();
  };

  const downloadBrandedLayout = async () => {
    if (!result) return;
    try {
      const image = await loadImage(result.dataUrl);
      const canvas = document.createElement('canvas');
      canvas.width = destination.width;
      canvas.height = destination.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas export is not available.');
      drawCoverImage(context, image, canvas.width, canvas.height);

      const bandHeight = Math.round(canvas.height * (draft.destinationId === 'instagram-story' ? 0.34 : 0.38));
      const bandY = canvas.height - bandHeight;
      const gradient = context.createLinearGradient(0, bandY, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(4, 12, 24, 0.15)');
      gradient.addColorStop(0.2, 'rgba(4, 12, 24, 0.88)');
      gradient.addColorStop(1, 'rgba(4, 12, 24, 0.98)');
      context.fillStyle = gradient;
      context.fillRect(0, bandY, canvas.width, bandHeight);

      const inset = Math.round(canvas.width * 0.07);
      context.fillStyle = brandDna.accentColor;
      context.fillRect(inset, bandY + Math.round(bandHeight * 0.12), Math.round(canvas.width * 0.12), Math.max(5, Math.round(canvas.height * 0.004)));
      context.fillStyle = '#FFFFFF';
      context.font = `700 ${Math.round(canvas.width * 0.028)}px Arial`;
      context.fillText(brandDna.organizationName, inset, bandY + Math.round(bandHeight * 0.27));
      context.font = `800 ${Math.round(canvas.width * (draft.destinationId === 'instagram-story' ? 0.055 : 0.046))}px Arial`;
      drawWrappedText(context, draft.objective, inset, bandY + Math.round(bandHeight * 0.48), canvas.width - (inset * 2), Math.round(canvas.width * 0.06), 3);
      context.fillStyle = brandDna.primaryColor;
      context.fillRect(inset, canvas.height - Math.round(bandHeight * 0.18), Math.round(canvas.width * 0.24), Math.round(bandHeight * 0.11));
      context.fillStyle = '#FFFFFF';
      context.font = `700 ${Math.round(canvas.width * 0.02)}px Arial`;
      context.fillText(draft.callToAction || 'Learn more', inset + Math.round(canvas.width * 0.025), canvas.height - Math.round(bandHeight * 0.105));

      const anchor = document.createElement('a');
      anchor.href = canvas.toDataURL('image/png');
      anchor.download = `${brandDna.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${draft.destinationId}-branded.png`;
      anchor.click();
    } catch (error: any) {
      await showAlert('Branded export unavailable', error.message || 'Download the clean image and try the layout again.', 'warning');
    }
  };

  const renderCreateStep = () => {
    if (activeStep === 'destination') return (
      <div className="space-y-5">
        <AtlasSectionHeader title="Where will this asset live?" description="Choose the publishing destination." icon={LayoutTemplate} />
        <div className="grid gap-2 sm:grid-cols-2">
          {CREATIVE_DESTINATIONS.map(item => {
            const Icon = destinationIcons[item.id];
            const active = draft.destinationId === item.id;
            return <button key={item.id} type="button" onClick={() => updateDraft({ destinationId: item.id })} className={`group flex min-h-28 items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${active ? 'border-teal-300/50 bg-teal-400/10' : 'border-white/10 bg-slate-950/55 hover:border-white/20 hover:bg-white/[0.035]'}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${active ? 'border-teal-300/30 bg-teal-400/10 text-teal-200' : 'border-white/10 text-slate-500 group-hover:text-slate-300'}`}><Icon size={18} /></span>
              <span><span className="block text-sm font-black text-white">{item.label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span><span className="mt-2 block font-mono text-[10px] text-slate-600">{item.width} x {item.height}</span></span>
            </button>;
          })}
        </div>
      </div>
    );

    if (activeStep === 'message') return (
      <div className="space-y-5">
        <AtlasSectionHeader title="What needs to happen?" description="Give Atlas the campaign facts." icon={Type} />
        <label className="block space-y-2"><span className="text-xs font-bold text-slate-300">Campaign or program</span><select value={draft.programId || ''} onChange={event => { const program = tenantPrograms.find(item => item.id === event.target.value); updateDraft({ programId: program?.id, programName: program?.name }); }} className={inputClass}><option value="">General organization update</option>{tenantPrograms.map(program => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label>
        <label className="block space-y-2"><span className="text-xs font-bold text-slate-300">Main message</span><textarea value={draft.objective} onChange={event => updateDraft({ objective: event.target.value.slice(0, 500) })} className={textareaClass} placeholder="Open registrations for the next robotics workshop..." /><span className="block text-right font-mono text-[10px] text-slate-600">{draft.objective.length}/500</span></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-xs font-bold text-slate-300">Audience</span><input value={draft.audience} onChange={event => updateDraft({ audience: event.target.value.slice(0, 220) })} className={inputClass} /></label><label className="space-y-2"><span className="text-xs font-bold text-slate-300">Call to action</span><input value={draft.callToAction} onChange={event => updateDraft({ callToAction: event.target.value.slice(0, 80) })} className={inputClass} /></label></div>
        <label className="block space-y-2"><span className="text-xs font-bold text-slate-300">Publishing language</span><div className="grid grid-cols-3 gap-2">{(['English', 'French', 'Arabic'] as const).map(language => <button key={language} type="button" onClick={() => updateDraft({ language })} className={`min-h-10 rounded-lg border px-2 text-xs font-bold ${draft.language === language ? 'border-teal-300/50 bg-teal-400/10 text-teal-200' : 'border-white/10 bg-slate-950 text-slate-500'}`}>{language}</button>)}</div></label>
      </div>
    );

    if (activeStep === 'visual') return (
      <div className="space-y-5">
        <AtlasSectionHeader title="Choose the visual source" description="Use an approved photo or create a new scene." icon={Camera} />
        <div className="grid grid-cols-2 gap-2"><button type="button" aria-label="Use a Gallery photo" onClick={() => updateDraft({ visualSource: 'gallery' })} className={`min-h-20 rounded-lg border p-3 text-left ${draft.visualSource === 'gallery' ? 'border-teal-300/50 bg-teal-400/10' : 'border-white/10 bg-slate-950'}`}><ImageIcon size={18} className={draft.visualSource === 'gallery' ? 'text-teal-200' : 'text-slate-500'} /><span className="mt-2 block text-sm font-black text-white">Gallery photo</span></button><button type="button" aria-label="Use AI generation" onClick={() => updateDraft({ visualSource: 'generate', galleryItemId: undefined, galleryImageUrl: undefined })} className={`min-h-20 rounded-lg border p-3 text-left ${draft.visualSource === 'generate' ? 'border-teal-300/50 bg-teal-400/10' : 'border-white/10 bg-slate-950'}`}><Sparkles size={18} className={draft.visualSource === 'generate' ? 'text-teal-200' : 'text-slate-500'} /><span className="mt-2 block text-sm font-black text-white">Generate a scene</span></button></div>
        {draft.visualSource === 'gallery' && (tenantGallery.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{tenantGallery.map(item => { const active = draft.galleryItemId === item.id; return <button key={item.id} type="button" onClick={() => updateDraft({ galleryItemId: item.id, galleryImageUrl: item.url })} className={`relative aspect-[4/3] overflow-hidden rounded-lg border bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${active ? 'border-teal-300 ring-2 ring-teal-400/20' : 'border-white/10'}`}><img src={item.url} alt={item.caption || 'Gallery asset'} className="h-full w-full object-cover" />{active && <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-teal-300 text-slate-950"><Check size={15} /></span>}<span className="absolute inset-x-0 bottom-0 truncate bg-slate-950/85 px-2 py-1.5 text-left text-[10px] font-bold text-white">{item.caption || 'Untitled photo'}</span></button>; })}</div> : <AtlasEmptyState title="Gallery is empty" description="Upload approved organization photography in Gallery or generate a new scene." icon={ImageIcon} action={<AtlasActionButton icon={Sparkles} onClick={() => updateDraft({ visualSource: 'generate' })}>Generate a scene</AtlasActionButton>} />)}
        {draft.visualSource === 'generate' && <div className="rounded-lg border border-teal-300/20 bg-teal-400/[0.05] p-4"><div className="flex gap-3"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-teal-200" /><div><p className="text-sm font-black text-white">The saved Brand DNA controls generation</p><p className="mt-1 text-xs leading-5 text-slate-400">Atlas applies the organization environment, people policy, exclusions, and safety rules on the server.</p></div></div></div>}
      </div>
    );

    return (
      <div className="space-y-5">
        <AtlasSectionHeader title="Approve the production brief" description="Nothing is generated until the final action." icon={CheckCircle2} />
        {!brandIsSaved && <div className="rounded-lg border border-amber-300/25 bg-amber-400/[0.07] p-4"><div className="flex gap-3"><Palette size={19} className="mt-0.5 shrink-0 text-amber-200" /><div className="flex-1"><p className="text-sm font-black text-white">Brand DNA must be saved</p><p className="mt-1 text-xs leading-5 text-slate-400">The current starter profile is not yet an approved organization standard.</p></div></div><AtlasActionButton icon={Palette} onClick={() => setMode('brand')} className="mt-3">Open Brand DNA</AtlasActionButton></div>}
        <div className="divide-y divide-white/10 rounded-lg border border-white/10 bg-slate-950/55">
          {[['Destination', destination.label], ['Campaign', draft.programName || 'General organization update'], ['Audience', draft.audience], ['Message', draft.objective], ['Visual source', draft.visualSource === 'gallery' ? selectedGalleryItem?.caption || 'Gallery photo' : 'New generated scene'], ['Language', draft.language]].map(([label, value]) => <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[130px_1fr]"><span className="text-[10px] font-bold uppercase text-slate-600">{label}</span><span className="text-sm text-slate-200">{value}</span></div>)}
        </div>
        {draft.visualSource === 'gallery' ? <AtlasActionButton variant="primary" icon={LayoutTemplate} onClick={useGalleryAsset} disabled={!stepIsComplete('review')} className="w-full">Create branded layout</AtlasActionButton> : <ChatGPTModuleGate featureName="new image generation"><AtlasActionButton variant="primary" icon={isGenerating ? Loader2 : Sparkles} onClick={() => void generateAsset()} disabled={!stepIsComplete('review') || isGenerating} className={`w-full ${isGenerating ? '[&_svg]:animate-spin' : ''}`}>{isGenerating ? 'Generating image...' : 'Generate image'}</AtlasActionButton></ChatGPTModuleGate>}
      </div>
    );
  };

  const renderBrandStudio = () => (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="atlas-surface rounded-lg border p-4 sm:p-5">
        <AtlasSectionHeader title="Organization Brand DNA" description="The active standard used by Creative Studio." icon={Palette} />
        <div className="mt-5 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-xs font-bold text-slate-300">Organization name</span><input value={brandDna.organizationName} disabled={!canManageBrand} onChange={event => setBrandDna(current => ({ ...current, organizationName: event.target.value }))} className={inputClass} /></label><label className="space-y-2"><span className="text-xs font-bold text-slate-300">Organization category</span><input value={brandDna.industry} disabled={!canManageBrand} onChange={event => setBrandDna(current => ({ ...current, industry: event.target.value }))} className={inputClass} /></label></div>
          <label className="block space-y-2"><span className="text-xs font-bold text-slate-300">What makes this organization real?</span><textarea value={brandDna.summary} disabled={!canManageBrand} onChange={event => setBrandDna(current => ({ ...current, summary: event.target.value }))} className={textareaClass} /></label>
          <div className="grid gap-4 lg:grid-cols-2"><label className="space-y-2"><span className="text-xs font-bold text-slate-300">Brand voice</span><textarea value={brandDna.voice} disabled={!canManageBrand} onChange={event => setBrandDna(current => ({ ...current, voice: event.target.value }))} className={textareaClass} /></label><label className="space-y-2"><span className="text-xs font-bold text-slate-300">Photography and visual direction</span><textarea value={brandDna.visualStyle} disabled={!canManageBrand} onChange={event => setBrandDna(current => ({ ...current, visualStyle: event.target.value }))} className={textareaClass} /></label></div>
          <div><p className="mb-3 text-xs font-bold text-slate-300">Brand colors</p><div className="grid gap-3 sm:grid-cols-3">{([['primaryColor', 'Primary'], ['secondaryColor', 'Secondary'], ['accentColor', 'Accent']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950 p-2"><input type="color" value={brandDna[key]} disabled={!canManageBrand} onChange={event => setBrandDna(current => ({ ...current, [key]: event.target.value }))} className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent" aria-label={`${label} color`} /><span><span className="block text-[10px] font-bold text-slate-500">{label}</span><span className="font-mono text-xs text-white">{brandDna[key]}</span></span></label>)}</div></div>
          <div className="grid gap-4 lg:grid-cols-2"><label className="space-y-2"><span className="text-xs font-bold text-slate-300">Real environments</span><textarea value={joinListInput(brandDna.environments)} disabled={!canManageBrand} onChange={event => setBrandDna(current => ({ ...current, environments: splitListInput(event.target.value) }))} className={textareaClass} placeholder="One environment per line" /></label><label className="space-y-2"><span className="text-xs font-bold text-slate-300">People and representation</span><textarea value={brandDna.peopleGuidance} disabled={!canManageBrand} onChange={event => setBrandDna(current => ({ ...current, peopleGuidance: event.target.value }))} className={textareaClass} /></label></div>
          <div className="grid gap-4 lg:grid-cols-3"><label className="space-y-2"><span className="text-xs font-bold text-slate-300">Signature details</span><textarea value={joinListInput(brandDna.signatureDetails)} disabled={!canManageBrand} onChange={event => setBrandDna(current => ({ ...current, signatureDetails: splitListInput(event.target.value) }))} className={textareaClass} /></label><label className="space-y-2"><span className="text-xs font-bold text-slate-300">Never show</span><textarea value={joinListInput(brandDna.exclusions)} disabled={!canManageBrand} onChange={event => setBrandDna(current => ({ ...current, exclusions: splitListInput(event.target.value) }))} className={textareaClass} /></label><label className="space-y-2"><span className="text-xs font-bold text-slate-300">Safety rules</span><textarea value={joinListInput(brandDna.safetyRules)} disabled={!canManageBrand} onChange={event => setBrandDna(current => ({ ...current, safetyRules: splitListInput(event.target.value) }))} className={textareaClass} /></label></div>
          {canManageBrand && <div className="flex justify-end border-t border-white/10 pt-5"><AtlasActionButton variant="primary" icon={isSavingBrand ? Loader2 : Save} onClick={() => void saveBrandDna()} disabled={isSavingBrand || !readiness.ready} className={isSavingBrand ? '[&_svg]:animate-spin' : ''}>{isSavingBrand ? 'Saving...' : 'Save Brand DNA'}</AtlasActionButton></div>}
        </div>
      </section>
      <aside className="space-y-4">
        <div className="atlas-surface-muted rounded-lg border p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase text-slate-500">Readiness</span><span className="font-mono text-xs font-bold text-white">{readiness.percent}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950"><div className="h-full bg-teal-300 transition-all" style={{ width: `${readiness.percent}%` }} /></div><p className="mt-3 text-xs leading-5 text-slate-500">{readiness.completed} of {readiness.total} identity signals are complete.</p></div>
        <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950"><div className="h-3" style={{ background: `linear-gradient(90deg, ${brandDna.primaryColor} 0 42%, ${brandDna.secondaryColor} 42% 78%, ${brandDna.accentColor} 78%)` }} /><div className="p-4"><p className="text-lg font-black text-white">{brandDna.organizationName || 'Organization'}</p><p className="mt-1 text-xs text-slate-500">{brandDna.industry || 'Category not set'}</p><div className="mt-4 flex flex-wrap gap-1.5">{brandDna.approvedTerms.slice(0, 5).map(term => <span key={term} className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-bold text-slate-400">{term}</span>)}</div></div></div>
        <div className="rounded-lg border border-amber-300/20 bg-amber-400/[0.06] p-4"><div className="flex gap-3"><ShieldCheck size={18} className="shrink-0 text-amber-200" /><p className="text-xs leading-5 text-slate-400">Real identities require authorization. Recurring fictional characters need stable approved references; text alone is not identity control.</p></div></div>
      </aside>
    </div>
  );

  return (
    <div className={`flex h-full flex-col gap-5 pb-24 md:pb-8 ${new URLSearchParams(window.location.search).get('ui') !== 'atlas-legacy' ? 'edu-v1 edu-marketplace-app-v1' : ''}`}>
      <AtlasCommandHeader eyebrow="Installed app / Creative operations" title="Atlas Creative Studio" description="Tenant-controlled assets for campaigns, websites, and local discovery." icon={Sparkles} badges={<span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${brandIsSaved ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200' : 'border-amber-300/20 bg-amber-400/10 text-amber-200'}`}>{brandIsSaved ? `Brand DNA v${settings.creativeStudio?.version}` : 'Brand setup needed'}</span>} actions={<div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-slate-950 p-1"><button type="button" onClick={() => setMode('create')} className={`min-h-9 rounded-md px-3 text-xs font-bold ${mode === 'create' ? 'bg-white/[0.09] text-white' : 'text-slate-500'}`}>Create</button><button type="button" onClick={() => setMode('brand')} className={`min-h-9 rounded-md px-3 text-xs font-bold ${mode === 'brand' ? 'bg-white/[0.09] text-white' : 'text-slate-500'}`}>Brand DNA</button></div>} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><AtlasSignalCard label="Organization" value={brandDna.organizationName || 'Not set'} detail={brandDna.industry || 'Brand category'} icon={Building2} tone="teal" /><AtlasSignalCard label="Brand readiness" value={`${readiness.percent}%`} detail={brandIsSaved ? `Version ${settings.creativeStudio?.version}` : 'Draft profile'} icon={BadgeCheck} tone={brandIsSaved ? 'emerald' : 'amber'} /><AtlasSignalCard label="Destination" value={destination.shortLabel} detail={destination.aspectRatio} icon={destinationIcons[destination.id]} tone="blue" /><AtlasSignalCard label="Production" value={result ? 'Ready' : 'Draft'} detail={result ? 'Asset prepared' : 'No asset generated'} icon={result ? CheckCircle2 : Sparkles} tone={result ? 'emerald' : 'slate'} /></div>

      {mode === 'brand' ? renderBrandStudio() : (
        <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
          <aside className="atlas-surface-muted rounded-lg border p-3"><p className="px-2 py-2 text-[10px] font-bold uppercase text-slate-600">Production route</p><div className="space-y-1">{steps.map((step, index) => { const active = activeStep === step.id; const complete = stepIsComplete(step.id); return <button key={step.id} type="button" onClick={() => setActiveStep(step.id)} className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left transition-colors ${active ? 'bg-teal-400/10 text-teal-100' : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'}`}><span className={`flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-black ${active ? 'border-teal-300/30 bg-teal-400/10' : complete ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200' : 'border-white/10'}`}>{complete && !active ? <Check size={13} /> : index + 1}</span><span className="text-xs font-bold">{step.label}</span></button>; })}</div><div className="mt-5 border-t border-white/10 p-2"><p className="text-[10px] font-bold uppercase text-slate-600">Active DNA</p><p className="mt-2 truncate text-sm font-black text-white">{brandDna.organizationName}</p><p className="mt-1 text-xs text-slate-500">{brandIsSaved ? 'Approved standard' : 'Unsaved starter'}</p></div></aside>
          <section className="atlas-surface min-w-0 rounded-lg border p-4 sm:p-5"><div className="min-h-[480px]">{renderCreateStep()}</div><div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4"><AtlasActionButton icon={ArrowLeft} onClick={() => setActiveStep(steps[Math.max(0, currentStepIndex - 1)].id)} disabled={currentStepIndex === 0}>Back</AtlasActionButton>{currentStepIndex < steps.length - 1 && <AtlasActionButton variant="primary" icon={ArrowRight} onClick={goNext} disabled={!stepIsComplete(activeStep)}>Continue</AtlasActionButton>}</div></section>
          <aside className="min-w-0 space-y-4"><div className="atlas-surface-muted rounded-lg border p-4"><AtlasSectionHeader title="Live brief" icon={ShieldCheck} /><div className="mt-4 space-y-3 text-xs"><div><span className="text-[10px] font-bold uppercase text-slate-600">Output</span><p className="mt-1 text-slate-200">{destination.label} - {destination.aspectRatio}</p></div><div><span className="text-[10px] font-bold uppercase text-slate-600">Audience</span><p className="mt-1 text-slate-200">{draft.audience || 'Not set'}</p></div><div><span className="text-[10px] font-bold uppercase text-slate-600">Message</span><p className="mt-1 line-clamp-4 leading-5 text-slate-400">{draft.objective || 'Waiting for campaign message'}</p></div><div><span className="text-[10px] font-bold uppercase text-slate-600">Guardrails</span><p className="mt-1 text-slate-400">{brandDna.exclusions.length} exclusions - {brandDna.safetyRules.length} safety rules</p></div></div></div>
            <div className={`overflow-hidden rounded-lg border border-white/10 bg-slate-950 ${destination.aspectRatio === '9:16' ? 'aspect-[9/16] max-h-[520px]' : destination.aspectRatio === '16:9' ? 'aspect-video' : destination.aspectRatio === '4:3' ? 'aspect-[4/3]' : destination.aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'}`}>{result ? <div className="relative h-full w-full"><img src={result.dataUrl} alt="Creative production result" className="h-full w-full object-cover" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent p-4 pt-16"><div className="mb-3 h-1 w-12" style={{ backgroundColor: brandDna.accentColor }} /><p className="text-xs font-black uppercase text-white">{brandDna.organizationName}</p><p className="mt-1 line-clamp-3 text-sm font-black leading-tight text-white">{draft.objective}</p></div></div> : <AtlasEmptyState title="Production preview" description="The approved asset appears here." icon={ImageIcon} />}</div>
            {result && <div className="grid grid-cols-2 gap-2"><button type="button" onClick={downloadCleanAsset} title="Download clean image" className="flex min-h-10 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white"><Download size={16} /></button><button type="button" onClick={() => void downloadBrandedLayout()} title="Download branded layout" className="flex min-h-10 items-center justify-center rounded-lg border border-teal-300/20 bg-teal-400/10 text-teal-200 hover:bg-teal-400/15"><LayoutTemplate size={16} /></button><button type="button" onClick={() => setResult(null)} className="col-span-2 flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/10 text-xs font-bold text-slate-400 hover:text-white"><RefreshCw size={14} />Create another version</button></div>}
          </aside>
        </div>
      )}
    </div>
  );
};
