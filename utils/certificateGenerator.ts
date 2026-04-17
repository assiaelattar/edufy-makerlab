import { Student, Enrollment, AppSettings } from '../types';
import { formatDate } from './helpers';

export const generateRegistrationCertificate = (student: Student, enrollment: Enrollment, settings: AppSettings, options?: { admissionDate?: string, issueDate?: string }) => {
  const win = window.open('', '_blank');
  if (!win) return;

  const academyName = settings.documentConfig?.headerName || settings.academyName;
  const logoUrl = settings.documentConfig?.logoUrl || settings.logoUrl;

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="Logo" class="logo" />`
    : `<div class="logo-placeholder">${academyName.charAt(0)}</div>`;

  // Use custom dates if provided, otherwise default to current date
  const issueDateFormatted = options?.issueDate
    ? new Date(options.issueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  // Format admission date
  const admissionDateRaw = options?.admissionDate || enrollment.startDate;
  const admissionDateFormatted = new Date(admissionDateRaw).toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric', year: 'numeric' });

  const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Attestation d'inscription - ${student.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
          
          /* Theme Colors */
          :root {
            --primary-red: #D32F2F;
            --primary-black: #000000;
            --text-dark: #1e293b;
          }

          body { 
            font-family: 'Roboto', sans-serif; 
            background-color: #f3f4f6;
            margin: 0; 
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
          }

          /* A4 Paper Dimensions */
          .certificate-container {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            box-sizing: border-box;
            position: relative;
            background-color: #fff;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            margin: 20px auto;
            display: flex;
            flex-direction: column;
            border: 1px solid #e2e8f0;
          }

          .header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 60px;
            border-bottom: 3px solid var(--primary-red);
            padding-bottom: 20px;
          }

          .logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
          }

          .logo {
            max-height: 120px;
            max-width: 220px;
            object-fit: contain;
          }

          .logo-placeholder {
             width: 60px; height: 60px; 
             background: var(--primary-red); color: white; 
             display: flex; align-items: center; justify-content: center; 
             font-size: 24px; font-weight: bold; border-radius: 8px; 
          }

          .academy-info {
            text-align: right;
          }

          .academy-name {
            font-size: 24px;
            font-weight: 800;
            color: var(--primary-black);
            text-transform: uppercase;
            letter-spacing: 1px;
            line-height: 1.2;
          }
          
          .academy-year {
            font-size: 14px;
            color: #64748b;
            font-weight: 500;
            margin-top: 5px;
          }

          .title-container {
            text-align: center;
            margin-bottom: 60px;
          }

          .certificate-title {
            font-family: 'Playfair Display', serif;
            font-size: 42px;
            font-weight: 700;
            color: var(--primary-black);
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 0;
            position: relative;
            display: inline-block;
          }
          
          .certificate-title::after {
            content: '';
            display: block;
            width: 80px;
            height: 4px;
            background: var(--primary-red);
            margin: 15px auto 0;
          }

          .content {
            flex: 1;
            padding: 0 20px;
            line-height: 2.2;
            font-size: 16px;
            text-align: justify;
            color: #334155;
          }

          .content p {
            margin-bottom: 25px;
          }

          .student-name {
            font-family: 'Playfair Display', serif;
            font-weight: 700;
            color: var(--primary-red);
            font-size: 32px;
            text-transform: uppercase;
            display: block;
            margin: 10px 0;
            letter-spacing: 1px;
          }

          .program-box {
             background-color: #fff1f2; /* Very light red/pink bg */
             border-left: 4px solid var(--primary-red);
             padding: 20px 30px;
             margin: 30px 0;
             border-radius: 0 8px 8px 0;
          }

          .program-box ul {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .program-box li {
            margin-bottom: 8px;
            font-size: 15px;
            display: flex;
            align-items: center;
          }
          
          .program-box li:last-child { margin-bottom: 0; }

          .program-label {
            font-weight: 700;
            color: #475569;
            width: 120px;
            display: inline-block;
          }
          
          .program-value {
            font-weight: 600;
            color: var(--primary-black);
          }

          .footer {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding-top: 20px;
          }

          .date-location {
            font-size: 14px;
            color: #64748b;
            font-style: italic;
          }

          .signature-box {
            text-align: center;
            width: 250px;
          }

          .signature-line {
            border-top: 1px solid #cbd5e1;
            margin-top: 80px;
            margin-bottom: 8px;
            width: 100%;
          }

          .signature-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 1px;
          }
          
          .stamp-placeholder {
             width: 120px;
             height: 120px;
             border: 2px dashed #cbd5e1;
             border-radius: 50%;
             margin: 0 auto -60px auto;
             display: flex;
             align-items: center; justify-content: center;
             color: #cbd5e1; 
             font-size: 10px;
             position: relative;
             z-index: 10;
             background: rgba(255,255,255,0.9);
          }

          /* Watermark background */
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            font-weight: 900;
            text-transform: uppercase;
            color: rgba(211, 47, 47, 0.03); /* Subtle red watermark */
            pointer-events: none;
            z-index: 0;
            white-space: nowrap;
          }

          @media print {
             @page { margin: 0; size: A4; }
             body { background: white; margin: 0; padding: 0; display: block; }
             .no-print { display: none !important; }
             .certificate-container { 
                box-shadow: none; 
                margin: 0; 
                width: 100%; 
                height: 100vh; 
                padding: 20mm; 
                border: none;
             }
          }
        </style>
      </head>
      <body>

        <!-- Control Bar -->
        <div class="no-print w-full max-w-[210mm] mx-auto mt-6 mb-4 flex justify-between items-center px-4 md:px-0">
            <div>
                <h2 class="text-slate-800 font-bold text-lg">Aperçu du Certificat</h2>
                <p class="text-slate-500 text-xs">Vérifiez les informations avant d'imprimer.</p>
            </div>
            <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-lg transition-all flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Imprimer / Télécharger PDF
            </button>
        </div>

        <div class="certificate-container">
          <div class="watermark">${academyName}</div>
          
          <div class="header">
            <div class="logo-section">
                ${logoHtml}
            </div>
            <div class="academy-info">
                <div class="academy-name">${academyName}</div>
                <div class="academy-year">Année Académique : ${settings.academicYear}</div>
                ${settings.documentConfig?.website ? `<div style="font-size: 12px; color: #94a3b8; margin-top:2px;">${settings.documentConfig.website}</div>` : ''}
            </div>
          </div>

          <div class="title-container">
            <h1 class="certificate-title">Attestation d'inscription</h1>
          </div>

          <div class="content">
            <p>
              La direction de <strong>${academyName}</strong> atteste par la présente que l'élève :
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
              <span class="student-name">${student.name}</span>
              ${student.birthDate ? `<div style="font-size: 14px; color: #64748b; margin-top: 5px;">Né(e) le : ${new Date(student.birthDate).toLocaleDateString('fr-FR')}</div>` : ''}
            </div>

            <p>
              Est régulièrement inscrit(e) au sein de notre établissement pour l'année académique <strong>${settings.academicYear}</strong>.
            </p>

            <div class="program-box">
                <ul>
                   <li><span class="program-label">Programme</span> <span class="program-value">${enrollment.programName}</span></li>
                   <li><span class="program-label">Niveau</span> <span class="program-value">${enrollment.gradeName}</span></li>
                   ${enrollment.groupName ? `<li><span class="program-label">Groupe</span> <span class="program-value">${enrollment.groupName}</span></li>` : ''}
                   <li><span class="program-label">Date début</span> <span class="program-value">${admissionDateFormatted}</span></li>
                </ul>
            </div>

            <p>
              Cette attestation est délivrée à la demande de l'intéressé(e) pour servir et valoir ce que de droit.
            </p>
          </div>

          <div class="footer">
            <div class="date-location">
              Fait à Casablanca, le <strong>${issueDateFormatted}</strong>
            </div>

            <div class="signature-box">
              <div class="stamp-placeholder">Cachet</div>
              <div class="signature-line"></div>
              <div class="signature-label">Le Directeur / La Directrice</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

  win.document.write(html);
  win.document.close();
};
