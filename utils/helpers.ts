
import { Enrollment, Payment, Student, AppSettings, WorkshopTemplate, WorkshopSlot, StudentProject } from '../types';
import { translations } from './translations';
import { STATION_THEMES } from './theme';

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-MA', { style: 'currency', currency: 'MAD' }).format(amount);
};

export const formatDate = (dateInput: any) => {
  if (!dateInput) return '-';

  let date: Date;
  // Handle Firestore Timestamp via Duck Typing (checking for .toDate() method)
  if (typeof dateInput === 'object' && dateInput !== null && typeof dateInput.toDate === 'function') {
    date = dateInput.toDate();
  } else {
    // Handle String, Number, or Date object
    date = new Date(dateInput);
  }

  if (isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const getDaysDifference = (dateInput: any) => {
  if (!dateInput) return 0;
  let target: Date;

  if (typeof dateInput === 'object' && dateInput !== null && typeof dateInput.toDate === 'function') {
    target = dateInput.toDate();
  } else {
    target = new Date(dateInput);
  }

  const today = new Date();
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const calculateAge = (birthDate?: string) => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const getDaysUntilBirthday = (birthDate: string | Date): number | null => {
  if (!birthDate) return null;
  const today = new Date();
  const dob = new Date(birthDate);
  if (isNaN(dob.getTime())) return null;

  const currentYear = today.getFullYear();
  const nextBirthday = new Date(dob);
  nextBirthday.setFullYear(currentYear);

  // If birthday has passed this year (or is today), check if it's strictly in the past
  // Note: If we want to say "Happy Birthday" today, diff should be 0.
  // If today is 2023-01-01 and birthday is 2023-01-01, diff is roughly 0.

  // Reset hours to avoid timezone/time diff issues
  today.setHours(0, 0, 0, 0);
  nextBirthday.setHours(0, 0, 0, 0);

  if (nextBirthday < today) {
    nextBirthday.setFullYear(currentYear + 1);
  }

  // Calculate difference in days
  const diffTime = nextBirthday.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const getUpcomingBirthdays = (students: any[], daysLookahead: number = 21) => {
  return students
    .map(s => {
      const daysCheck = getDaysUntilBirthday(s.birthDate);
      return { ...s, daysUntilBirthday: daysCheck };
    })
    .filter(s => s.daysUntilBirthday !== null && s.daysUntilBirthday >= 0 && s.daysUntilBirthday <= daysLookahead)
    .sort((a, b) => (a.daysUntilBirthday || 0) - (b.daysUntilBirthday || 0));
};

// --- IMAGE COMPRESSION UTILITY ---
export const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Canvas context not found"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Compress to JPEG
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// --- HELPER: Convert standard URLs to Embeddable versions ---
export const getEmbedSrc = (url: string): string | null => {
  if (!url) return null;

  // Scratch
  if (url.includes('scratch.mit.edu/projects/')) {
    const id = url.split('projects/')[1].split('/')[0];
    return `https://scratch.mit.edu/projects/${id}/embed`;
  }
  // YouTube
  if (url.includes('youtube.com/watch')) {
    const id = new URL(url).searchParams.get('v');
    return `https://www.youtube.com/embed/${id}`;
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1];
    return `https://www.youtube.com/embed/${id}`;
  }
  // Tinkercad (Public links only)
  if (url.includes('tinkercad.com/things/')) {
    return url; // Tinkercad links often need specific embed params, but raw link usually works in iframe if public
  }
  // Replit
  if (url.includes('replit.com/@')) {
    return `${url}?embed=true`;
  }

  return null; // Not a recognized embed pattern
};

// --- RESUME GENERATOR ---
export const generateMakerResume = (student: Student, projects: StudentProject[], settings: AppSettings) => {
  const win = window.open('', '_blank');
  if (!win) return;

  // Filter only published/approved projects
  const portfolio = projects
    .filter(p => p.status === 'published')
    .sort((a, b) => {
      const da = (a.createdAt as any).seconds || 0;
      const db = (b.createdAt as any).seconds || 0;
      return db - da;
    });

  // Aggregate Skills
  const allSkills = portfolio.flatMap(p => p.skillsAcquired);
  const skillCounts: Record<string, number> = {};
  allSkills.forEach(s => skillCounts[s] = (skillCounts[s] || 0) + 1);
  const topSkills = Object.entries(skillCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([skill]) => skill);

  const logoHtml = settings.logoUrl
    ? `<img src="${settings.logoUrl}" alt="Logo" class="logo" />`
    : `<div class="logo-placeholder">${settings.academyName.charAt(0)}</div>`;

  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Resume - ${student.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
        <style>
          @page { margin: 0; size: A4; }
          body { font-family: 'Inter', sans-serif; color: #1e293b; background: white; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          
          .resume-container {
            display: grid;
            grid-template-columns: 280px 1fr;
            min-height: 100vh;
          }

          /* SIDEBAR */
          .sidebar {
            background-color: #0f172a;
            color: white;
            padding: 40px 30px;
            display: flex;
            flex-direction: column;
            gap: 40px;
          }
          
          .profile-section { text-align: center; }
          .avatar-placeholder {
            width: 120px; height: 120px; background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 48px; font-weight: 800; margin: 0 auto 20px auto; color: white;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          }
          .contact-info { font-size: 12px; color: #94a3b8; line-height: 1.6; }
          .contact-item { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; justify-content: center; }

          .sidebar-block h3 {
            font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #64748b;
            border-bottom: 1px solid #334155; padding-bottom: 10px; margin-bottom: 20px;
          }
          
          .skill-tag {
            display: inline-block; background: #1e293b; color: #e2e8f0; padding: 6px 12px;
            border-radius: 6px; font-size: 11px; font-weight: 600; margin-bottom: 8px; margin-right: 5px;
            border: 1px solid #334155;
          }

          /* MAIN CONTENT */
          .main-content {
            padding: 50px;
            background: #ffffff;
          }

          .header { margin-bottom: 50px; border-bottom: 2px solid #f1f5f9; padding-bottom: 30px; }
          .name { font-size: 48px; font-weight: 800; color: #0f172a; line-height: 1; letter-spacing: -1px; margin: 0 0 10px 0; }
          .title { font-size: 18px; color: #64748b; font-weight: 500; letter-spacing: 0.5px; }

          .section-title {
            font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;
            color: #0f172a; margin-bottom: 30px; display: flex; align-items: center; gap: 10px;
          }
          .section-title::after { content: ''; flex: 1; height: 2px; background: #f1f5f9; }

          .project-item {
            display: flex; gap: 20px; margin-bottom: 30px; page-break-inside: avoid;
          }
          .project-thumb {
            width: 120px; height: 80px; background: #f1f5f9; border-radius: 8px; object-fit: cover;
            border: 1px solid #e2e8f0; flex-shrink: 0;
          }
          .project-details { flex: 1; }
          .project-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px; }
          .project-title { font-size: 16px; font-weight: 700; color: #0f172a; }
          .project-date { font-size: 11px; color: #94a3b8; font-family: 'JetBrains Mono', monospace; }
          .project-desc { font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 8px; }
          .project-station { 
            font-size: 10px; text-transform: uppercase; font-weight: 700; color: #3b82f6; 
            letter-spacing: 0.5px; margin-bottom: 4px; display: block;
          }

          .footer {
            margin-top: 50px; padding-top: 30px; border-top: 1px solid #e2e8f0;
            display: flex; justify-content: space-between; align-items: center;
          }
          .logo { height: 40px; }
          .academy-meta { font-size: 10px; color: #94a3b8; text-align: right; }

          @media print {
             .sidebar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="resume-container">
          <aside class="sidebar">
            <div class="profile-section">
              <div class="avatar-placeholder">${student.name.charAt(0)}</div>
            </div>
            
            <div class="sidebar-block">
              <h3>Contact</h3>
              <div class="contact-info">
                <div class="contact-item">${student.email || student.loginInfo?.email || 'No Email'}</div>
                <div class="contact-item">${student.address || ''}</div>
              </div>
            </div>

            <div class="sidebar-block">
              <h3>Top Skills</h3>
              <div>
                ${topSkills.slice(0, 10).map(s => `<span class="skill-tag">${s}</span>`).join('')}
              </div>
            </div>

            <div class="sidebar-block">
              <h3>Education</h3>
              <div class="contact-info">
                <strong style="color:white; font-size:13px;">${settings.academyName}</strong><br/>
                Student / Maker<br/>
                ${new Date((student.createdAt as any).toDate ? (student.createdAt as any).toDate() : student.createdAt).getFullYear()} - Present
              </div>
            </div>
          </aside>

          <main class="main-content">
            <header class="header">
              <h1 class="name">${student.name}</h1>
              <div class="title">Junior Innovator & Maker</div>
            </header>

            <section>
              <h2 class="section-title">Engineering Portfolio</h2>
              
              ${portfolio.length === 0 ? '<p>No published projects yet.</p>' : portfolio.map(p => {
    const theme = STATION_THEMES[p.station] || STATION_THEMES.general;
    return `
                    <div class="project-item">
                      <img src="${p.mediaUrls?.[0] || 'https://placehold.co/120x80/f1f5f9/94a3b8?text=Project'}" class="project-thumb" />
                      <div class="project-details">
                        <span class="project-station" style="color: ${theme.colorHex}">${theme.label}</span>
                        <div class="project-header">
                          <div class="project-title">${p.title}</div>
                          <div class="project-date">${new Date((p.createdAt as any).toDate ? (p.createdAt as any).toDate() : p.createdAt).toLocaleDateString()}</div>
                        </div>
                        <p class="project-desc">${p.description}</p>
                        <div>
                           ${p.skillsAcquired.map(s => `<span style="font-size:10px; color:#64748b; margin-right:8px;">#${s}</span>`).join('')}
                        </div>
                      </div>
                    </div>
                  `;
  }).join('')}
            </section>

            <div class="footer">
              ${logoHtml}
              <div class="academy-meta">
                Certified by ${settings.academyName}<br/>
                Generated on ${new Date().toLocaleDateString()}
              </div>
            </div>
          </main>
        </div>
        <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); }</script>
      </body>
      </html>
    `;
  win.document.write(html);
  win.document.close();
};

// Recurrence Engine
export interface VirtualSlot {
  workshopTemplateId: string;
  templateTitle: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  status: 'available' | 'full' | 'cancelled';
  slotId?: string;
}

export const getGeneratedSlots = (
  templates: WorkshopTemplate[],
  existingSlots: WorkshopSlot[],
  startDate: Date,
  daysAhead: number = 30
): VirtualSlot[] => {
  const slots: VirtualSlot[] = [];
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  templates.filter(t => t.isActive).forEach(template => {
    if (!template.recurrencePattern) return;

    if (template.recurrenceType === 'one-time' && template.recurrencePattern.date) {
      const slotDate = new Date(template.recurrencePattern.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (slotDate >= today) {
        const existing = existingSlots.find(s => s.workshopTemplateId === template.id && s.date === template.recurrencePattern.date);
        const [h, m] = (template.recurrencePattern.time || "00:00").split(':').map(Number);
        const endTimeDate = new Date();
        endTimeDate.setHours(h, m + template.duration);
        const endTimeStr = `${String(endTimeDate.getHours()).padStart(2, '0')}:${String(endTimeDate.getMinutes()).padStart(2, '0')}`;

        slots.push({
          workshopTemplateId: template.id,
          templateTitle: template.title,
          dateStr: template.recurrencePattern.date,
          startTime: template.recurrencePattern.time || "00:00",
          endTime: endTimeStr,
          capacity: existing ? existing.capacity : template.capacityPerSlot,
          bookedCount: existing ? existing.bookedCount : 0,
          status: existing ? existing.status : 'available',
          slotId: existing?.id
        });
      }
    }

    if (template.recurrenceType === 'weekly' && template.recurrencePattern.days && template.recurrencePattern.time) {
      for (let i = 0; i < daysAhead; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const dayOfWeek = d.getDay();

        if (template.recurrencePattern.days.includes(dayOfWeek)) {
          const dateStr = d.toISOString().split('T')[0];
          const existing = existingSlots.find(s => s.workshopTemplateId === template.id && s.date === dateStr);
          const [h, m] = template.recurrencePattern.time.split(':').map(Number);
          const endTimeDate = new Date();
          endTimeDate.setHours(h, m + template.duration);
          const endTimeStr = `${String(endTimeDate.getHours()).padStart(2, '0')}:${String(endTimeDate.getMinutes()).padStart(2, '0')}`;

          slots.push({
            workshopTemplateId: template.id,
            templateTitle: template.title,
            dateStr: dateStr,
            startTime: template.recurrencePattern.time,
            endTime: endTimeStr,
            capacity: existing ? existing.capacity : template.capacityPerSlot,
            bookedCount: existing ? existing.bookedCount : 0,
            status: existing ? existing.status : 'available',
            slotId: existing?.id
          });
        }
      }
    }
  });

  return slots.sort((a, b) => {
    const da = new Date(`${a.dateStr}T${a.startTime}`);
    const db = new Date(`${b.dateStr}T${b.startTime}`);
    return da.getTime() - db.getTime();
  });
};

export const generateReceipt = (payment: Payment, enrollment: Enrollment | undefined, student: Student | undefined, settings: AppSettings) => {
  const receiptWindow = window.open('', '_blank');
  if (!receiptWindow) {
    alert('Please allow popups to generate receipts');
    return;
  }

  // Language Support
  const lang = settings.language || 'en';
  const t = (key: string) => (translations[lang] as any)[key] || key;

  const isRejected = payment.status === 'check_bounced';
  const logoHtml = settings.logoUrl
    ? `<div class="logo-container"><img src="${settings.logoUrl}" alt="Logo" /></div>`
    : `<div class="logo-placeholder">${settings.academyName.charAt(0)}</div>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${t('receipt.title')} #${payment.id.slice(0, 8)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
      <style>
        @media print {
          @page { margin: 0; size: auto; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .receipt-container { border: none !important; box-shadow: none !important; padding: 40px !important; max-width: 100% !important; margin: 0 !important; }
          .no-print { display: none; }
        }
        body { font-family: 'Inter', sans-serif; color: #0f172a; background: #f8fafc; padding: 40px 0; margin: 0; -webkit-font-smoothing: antialiased; }
        .receipt-container { 
          max-width: 800px; margin: 0 auto; background: white; padding: 50px; position: relative;
          border-radius: 16px; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; overflow: hidden;
        }
        .watermark {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 80px; font-weight: 900; color: rgba(239, 68, 68, 0.15); border: 10px solid rgba(239, 68, 68, 0.15);
            padding: 20px 40px; text-transform: uppercase; z-index: 0; pointer-events: none; white-space: nowrap;
        }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 50px; border-bottom: 2px solid ${isRejected ? '#fecaca' : '#f1f5f9'}; padding-bottom: 30px; }
        .logo-container img { height: 70px; width: auto; object-fit: contain; display: block; }
        .logo-placeholder { width: 60px; height: 60px; background: #2563eb; color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 28px; }
        .company-details { margin-top: 15px; }
        .company-name { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .company-meta { font-size: 13px; color: #64748b; line-height: 1.5; }
        .receipt-info { text-align: right; }
        .receipt-title { font-size: 32px; font-weight: 800; color: ${isRejected ? '#ef4444' : '#0f172a'}; letter-spacing: -1px; margin: 0 0 5px 0; }
        .receipt-number { font-family: 'JetBrains Mono', monospace; font-size: 14px; color: #64748b; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; display: inline-block; }
        .receipt-date { font-size: 14px; color: #64748b; margin-top: 8px; font-weight: 500; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; position: relative; z-index: 1; }
        .info-group { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; color: #64748b; margin-bottom: 8px; }
        .value { font-size: 16px; font-weight: 600; color: #0f172a; line-height: 1.4; }
        .sub-value { font-size: 13px; color: #64748b; margin-top: 4px; }
        .payment-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 30px; position: relative; z-index: 1; }
        .payment-table th { text-align: left; padding: 12px 16px; background: #f8fafc; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
        .payment-table td { padding: 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #334155; }
        .payment-table tr:last-child td { border-bottom: none; }
        .payment-table td:last-child { text-align: right; font-weight: 600; font-family: 'JetBrains Mono', monospace; }
        .total-section { display: flex; flex-direction: column; align-items: flex-end; margin-top: 20px; padding-top: 20px; border-top: 2px solid #f1f5f9; position: relative; z-index: 1; }
        .total-row { display: flex; justify-content: space-between; width: 250px; margin-bottom: 10px; }
        .total-label { font-size: 14px; color: #64748b; }
        .total-amount { font-size: 16px; font-weight: 600; color: #0f172a; font-family: 'JetBrains Mono', monospace; }
        .grand-total { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1; }
        .grand-total .total-label { font-size: 16px; font-weight: 700; color: #0f172a; }
        .grand-total .total-amount { font-size: 24px; font-weight: 800; color: ${isRejected ? '#ef4444' : '#2563eb'}; }
        .footer { margin-top: 60px; text-align: center; font-size: 13px; color: #94a3b8; line-height: 1.6; padding-top: 30px; border-top: 1px solid #f1f5f9; position: relative; z-index: 1; }
        .rejected-banner { background: #fee2e2; color: #991b1b; padding: 10px; text-align: center; border-radius: 8px; font-weight: 600; font-size: 14px; margin-bottom: 20px; border: 1px solid #fecaca; }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        ${isRejected ? `<div class="watermark">${t('receipt.rejected')}</div>` : ''}
        ${isRejected ? `<div class="rejected-banner">${t('receipt.rejected_msg')}</div>` : ''}
        
        <div class="header">
          <div class="brand">
            ${logoHtml}
            <div class="company-details">
              <div class="company-name">${settings.academyName}</div>
              <div class="company-meta">${settings.academicYear}</div>
            </div>
          </div>
          <div class="receipt-info">
            <h1 class="receipt-title">${t('receipt.title')}</h1>
            <div class="receipt-number">#${payment.id.slice(0, 8).toUpperCase()}</div>
            <div class="receipt-date">${formatDate(payment.date)}</div>
          </div>
        </div>
        <div class="info-grid">
          <div class="info-group">
            <div class="label">${t('receipt.bill_to')}</div>
            <div class="value">${payment.studentName}</div>
            ${student?.parentName ? `<div class="sub-value">Parent: ${student.parentName}</div>` : ''}
            ${student?.address ? `<div class="sub-value">${student.address}</div>` : ''}
          </div>
          <div class="info-group">
            <div class="label">${t('receipt.enrollment_details')}</div>
            <div class="value">${enrollment?.programName || 'Enrollment'}</div>
            <div class="sub-value">${enrollment?.packName || ''}</div>
            ${enrollment?.gradeName ? `<div class="sub-value">${enrollment.gradeName} • ${enrollment.groupName}</div>` : ''}
            ${enrollment?.secondGroupName ? `<div class="sub-value" style="margin-top:2px; font-size:11px; color:#2563eb;">+ ${enrollment.secondGroupName} (DIY)</div>` : ''}
          </div>
        </div>
        <table class="payment-table">
          <thead><tr><th>${t('receipt.description')}</th><th>${t('receipt.method')}</th><th>${t('receipt.reference')}</th><th>${t('receipt.amount')}</th></tr></thead>
          <tbody>
            <tr>
              <td>${t('receipt.tuition_payment')}</td>
              <td>${t(`receipt.method.${payment.method}`) || payment.method}</td>
              <td>${payment.checkNumber ? `#${payment.checkNumber}` : payment.bankName || '-'}</td>
              <td>${formatCurrency(payment.amount)}</td>
            </tr>
          </tbody>
        </table>
        <div class="total-section">
          <div class="total-row grand-total"><span class="total-label">${t('receipt.total_paid')}</span><span class="total-amount">${formatCurrency(payment.amount)}</span></div>
          ${enrollment ? `<div class="total-row" style="margin-top: 15px;"><span class="total-label">${t('receipt.remaining_balance')}</span><span class="total-amount" style="color: ${enrollment.balance > 0 ? '#ef4444' : '#10b981'}">${formatCurrency(enrollment.balance)}</span></div>` : ''}
        </div>
        <div class="footer">
          <div>${settings.receiptFooter}</div>
          <div class="footer-contact">${settings.receiptContact}</div>
        </div>
      </div>
      <script>
        window.onload = function() { setTimeout(function() { window.print(); }, 500); }
      </script>
    </body>
    </html>
  `;
  receiptWindow.document.write(htmlContent);
  receiptWindow.document.close();
};

export const generateStudentSchedulePrint = (student: Student, enrollments: Enrollment[], settings: AppSettings) => {
  const win = window.open('', '_blank');
  if (!win) return;

  // Use the local logo image
  const logoHtml = `<img src="${window.location.origin}/images/logo.png" alt="MakerLab Academy" style="height: 60px; object-fit: contain;" />`;

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>MakerLab Academy</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; max-width: 1000px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
        .student-info h1 { font-size: 24px; margin: 0 0 5px 0; color: #0f172a; }
        .student-info p { color: #64748b; margin: 0; }
        .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; }
        .day-header { text-align: center; background: #f1f5f9; padding: 10px; font-weight: 600; border-radius: 8px; color: #475569; font-size: 14px; }
        .day-col { min-height: 300px; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px; }
        .class-card { background: #eff6ff; border-left: 4px solid #2563eb; padding: 10px; border-radius: 4px; margin-bottom: 10px; font-size: 13px; }
        .class-card.diy { background: #f5f3ff; border-left-color: #8b5cf6; }
        .class-title { font-weight: 700; color: #1e40af; margin-bottom: 2px; }
        .diy .class-title { color: #5b21b6; }
        .class-meta { color: #60a5fa; font-size: 11px; }
        .diy .class-meta { color: #a78bfa; }

        /* Credentials Section */
        .credentials-section { margin-top: 40px; border-top: 2px dashed #cbd5e1; padding-top: 30px; page-break-inside: avoid; }
        .credentials-header { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
        .credential-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .credential-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
        .cred-title { font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; text-transform: uppercase; }
        .cred-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
        .cred-row .label { color: #64748b; font-size: 12px; }
        .cred-row .value { font-family: monospace; font-weight: 600; color: #0f172a; }
        .login-url { margin-top: 20px; font-size: 12px; color: #64748b; text-align: center; }

        /* Flyer Section */
        .flyer-section { 
            text-align: center; 
            page-break-after: always; 
            margin-bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 90vh;
        }
        .flyer-img { 
            max-width: 95%; 
            max-height: 90vh;
            border-radius: 16px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
            border: 1px solid #e2e8f0; 
            object-fit: contain;
        }

        @media print {
          body { padding: 0; }
          .grid { gap: 5px; }
          .day-col { border: 1px solid #e2e8f0; }
          .class-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .credential-box { border: 1px solid #cbd5e1; }
          .flyer-section { min-height: 100vh; margin: 0; }
        }
      </style>
    </head>
    <body>
      <!-- Flyer Section (Page 1) -->
      <div class="flyer-section">
         <img src="${window.location.origin}/images/flyer.png" class="flyer-img" alt="Information Flyer" />
      </div>

      <!-- Schedule Section (Page 2) -->
      <div class="header">
        <div class="student-info">
          <h1>${student.name}</h1>
          <p>Weekly Class Schedule • MakerLab Academy</p>
        </div>
        <div>${logoHtml}</div>
      </div>
      <div class="grid">
        ${days.map(day => `<div class="day-header">${day}</div>`).join('')}
        ${days.map(day => {
    const slots: { title: string, time: string, sub: string, type: 'main' | 'diy' }[] = [];
    enrollments.filter(e => e.status === 'active').forEach(e => {
      if (e.groupTime && e.groupTime.includes(day)) {
        slots.push({ title: e.programName, time: e.groupTime.split(' ').slice(1).join(' '), sub: `${e.gradeName} • ${e.groupName}`, type: 'main' });
      }
      if (e.secondGroupTime && e.secondGroupTime.includes(day)) {
        slots.push({ title: `${e.programName} (DIY)`, time: e.secondGroupTime.split(' ').slice(1).join(' '), sub: e.secondGroupName || 'DIY Workshop', type: 'diy' });
      }
    });

    return `
             <div class="day-col">
               ${slots.map(c => `
                 <div class="class-card ${c.type}">
                   <div class="class-title">${c.title}</div>
                   <div class="class-meta">${c.time}</div>
                   <div style="margin-top:4px; font-size:11px; color:#64748b;">${c.sub}</div>
                 </div>
               `).join('')}
             </div>
           `;
  }).join('')}
      </div>

      <!-- Credentials Section -->
      <div class="credentials-section">
        <div class="credentials-header">Access Credentials</div>
        <div class="credential-grid">
            <div class="credential-box">
                <div class="cred-title">Student Portal</div>
                <div class="cred-row"><span class="label">Email</span> <span class="value">${student.loginInfo?.email || 'Not generated'}</span></div>
                <div class="cred-row"><span class="label">Password</span> <span class="value">${student.loginInfo?.initialPassword || '********'}</span></div>
            </div>
            ${student.parentLoginInfo ? `
            <div class="credential-box">
                <div class="cred-title">Parent Portal</div>
                <div class="cred-row"><span class="label">Email</span> <span class="value">${student.parentLoginInfo.email}</span></div>
                <div class="cred-row"><span class="label">Password</span> <span class="value">${student.parentLoginInfo.initialPassword || '********'}</span></div>
            </div>
            ` : `
             <div class="credential-box" style="opacity: 0.5; border-style: dashed;">
                <div class="cred-title">Parent Portal</div>
                <div class="cred-row" style="justify-content: center;"><span class="label">No Account</span></div>
            </div>
            `}
        </div>
        <p class="login-url">Login at: <strong>${window.location.host}</strong></p>
      </div>

      <!-- Flyer Section -->


      <script>window.onload = function() { setTimeout(function() { window.print(); }, 800); }</script>
    </body>
    </html>
  `;
  win.document.write(html);
  win.document.close();
};

export const generateRosterPrint = (programName: string, gradeName: string, groupName: string, time: string, students: Student[], academyName: string) => {
  const win = window.open('', '_blank');
  if (!win) return;
  const html = `
    <!DOCTYPE html>
    <html><head><title>Class Roster</title><style>body { font-family: sans-serif; padding: 40px; } table { width: 100%; border-collapse: collapse; } th, td { padding: 10px; border-bottom: 1px solid #ccc; text-align: left; }</style></head>
    <body>
      <h2>${programName} - ${gradeName} (${groupName})</h2>
      <p>${time}</p>
      <table>
        <thead><tr><th>Name</th><th>Phone</th><th>Notes</th></tr></thead>
        <tbody>${students.map(s => `<tr><td>${s.name}</td><td>${s.parentPhone}</td><td>________</td></tr>`).join('')}</tbody>
      </table>
      <script>window.onload = function() { window.print(); }</script>
    </body></html>`;
  win.document.write(html);
  win.document.close();
};

export const generateAccessCardPrint = (student: Student, settings: AppSettings) => {
  const win = window.open('', '_blank');
  if (!win || !student.loginInfo) return;

  const logoHtml = settings.logoUrl
    ? `<img src="${settings.logoUrl}" alt="Logo" style="height: 60px; object-fit: contain;" />`
    : `<div style="font-size: 24px; font-weight: bold; color: #2563eb;">${settings.academyName}</div>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Student Access Card - ${student.name}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
      <style>
        @media print {
          @page { margin: 0; size: auto; }
          body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .card { box-shadow: none !important; border: 1px solid #ccc !important; }
        }
        body { 
          font-family: 'Inter', sans-serif; background: #f1f5f9; color: #0f172a; 
          display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0;
        }
        .card {
          width: 400px; background: white; border-radius: 16px; padding: 40px;
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.1); text-align: center; border: 1px solid #e2e8f0;
        }
        .header { margin-bottom: 30px; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; }
        .title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #64748b; margin-top: 10px; }
        .welcome { font-size: 18px; font-weight: 600; margin-bottom: 5px; color: #0f172a; }
        .name { font-size: 24px; font-weight: 800; color: #2563eb; margin: 0; }
        .credentials { background: #f8fafc; border-radius: 12px; padding: 20px; margin: 30px 0; border: 1px solid #e2e8f0; text-align: left; }
        .field { margin-bottom: 15px; }
        .field:last-child { margin-bottom: 0; }
        .label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px; display: block; }
        .value { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 600; color: #0f172a; letter-spacing: 0.5px; }
        .footer { font-size: 12px; color: #94a3b8; line-height: 1.5; }
        .url { color: #2563eb; font-weight: 600; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          ${logoHtml}
          <div class="title">Student Access Pass</div>
        </div>
        
        <div class="welcome">Welcome to the Maker Space,</div>
        <h1 class="name">${student.name}</h1>
        
        <div class="credentials">
          <div class="field">
            <span class="label">Student Email / Login</span>
            <div class="value">${student.loginInfo.email}</div>
          </div>
          <div class="field">
            <span class="label">Password</span>
            <div class="value">${student.loginInfo.initialPassword || '********'}</div>
          </div>
        </div>
        
        <div class="footer">
          Login at <br/>
          <a href="${window.location.origin}" class="url">${window.location.host}</a>
        </div>
      </div>
      <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); }</script>
    </body>
    </html>
  `;
  win.document.write(html);
  win.document.close();
};


export const generateCredentialsPrint = (name: string, email: string, pass: string, role: string, settings: AppSettings) => {
  const win = window.open('', '_blank');
  if (!win) return;

  const logoHtml = settings.logoUrl
    ? `<img src="${settings.logoUrl}" alt="Logo" style="height: 60px; object-fit: contain;" />`
    : `<div style="font-size: 24px; font-weight: bold; color: #2563eb;">${settings.academyName}</div>`;

  const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Access Card - ${name}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
            <style>
                @media print {
                    @page { margin: 0; size: auto; }
                    body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .card { box-shadow: none !important; border: 1px solid #ccc !important; }
                }
                body {
                    font-family: 'Inter', sans-serif; background: #f1f5f9; color: #0f172a;
                    display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0;
                }
                .card {
                    width: 400px; background: white; border-radius: 16px; padding: 40px;
                    box-shadow: 0 20px 40px -10px rgba(0,0,0,0.1); text-align: center; border: 1px solid #e2e8f0;
                }
                .header { margin-bottom: 30px; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; }
                .title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #64748b; margin-top: 10px; }
                .welcome { font-size: 18px; font-weight: 600; margin-bottom: 5px; color: #0f172a; }
                .name { font-size: 24px; font-weight: 800; color: #2563eb; margin: 0; }
                .credentials { background: #f8fafc; border-radius: 12px; padding: 20px; margin: 30px 0; border: 1px solid #e2e8f0; text-align: left; }
                .field { margin-bottom: 15px; }
                .field:last-child { margin-bottom: 0; }
                .label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px; display: block; }
                .value { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 600; color: #0f172a; letter-spacing: 0.5px; }
                .footer { font-size: 12px; color: #94a3b8; line-height: 1.5; }
                .url { color: #2563eb; font-weight: 600; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="header">
                    ${logoHtml}
                    <div class="title">Access Pass</div>
                </div>
                <div class="welcome">Welcome,</div>
                <h1 class="name">${name}</h1>
                <div class="credentials">
                    <div class="field">
                        <span class="label">Email / Login</span>
                        <div class="value">${email}</div>
                    </div>
                    <div class="field">
                        <span class="label">Password</span>
                        <div class="value">${pass}</div>
                    </div>
                     <div class="field">
                        <span class="label">Role</span>
                        <div class="value">${role}</div>
                    </div>
                </div>
                <div class="footer">
                    Login at <br/>
                    <a href="${window.location.origin}" class="url">${window.location.host}</a>
                </div>
            </div>
            <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); }</script>
        </body>
        </html>
    `;
  win.document.write(html);
  win.document.close();
};
