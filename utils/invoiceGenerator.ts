import { Payment, Student, AppSettings, Enrollment } from '../types';
import { formatDate, formatCurrency } from './helpers';

export interface ClientDetails {
    name: string;
    address: string;
    ice?: string; // Identifiant Commun de l'Entreprise
    rc?: string;  // Registre de Commerce
}

export const generateInvoice = (
    payment: Payment,
    enrollment: Enrollment,
    student: Student | undefined,
    client: ClientDetails,
    settings: AppSettings
) => {
    const win = window.open('', '_blank');
    if (!win) return;

    // Calculate tax details
    // The payment amount is considered HT (Hors Taxe) base for calculation logic as requested: "add 20% as fees of TVA"
    const amountHT = payment.amount;
    const tvaRate = 0.20;
    const tvaAmount = amountHT * tvaRate;
    const amountTTC = amountHT + tvaAmount;

    const receiptDate = new Date(payment.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const invoiceNumber = `${new Date().getFullYear()}-${payment.id.substring(0, 4).toUpperCase()}`;

    const academyName = settings.documentConfig?.headerName || settings.academyName;
    const logoUrl = settings.documentConfig?.logoUrl || settings.logoUrl;
    const address = settings.documentConfig?.address || 'Casablanca, Maroc';
    const taxId = settings.documentConfig?.taxId || '002798577000063';
    const rc = settings.documentConfig?.regId || '506877';
    const patente = settings.documentConfig?.patente || '50314209';
    const cnss = settings.documentConfig?.cnss || '';
    const website = settings.documentConfig?.website || '';
    const email = settings.documentConfig?.email || '';
    const phone = settings.documentConfig?.phone || '';

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture ${invoiceNumber}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        body { 
            font-family: 'Inter', sans-serif; 
            background-color: #f3f4f6;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
        }

        /* Format A4 Standard à 96 DPI (794px x 1123px) */
        #invoice-container {
            width: 210mm;
            min-height: 297mm;
            background: white;
            margin: 20px auto;
            padding: 40px 50px;
            box-sizing: border-box;
            position: relative;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }

        .table-compta th {
            background-color: #1e40af;
            color: white;
            font-size: 10px;
            text-transform: uppercase;
            padding: 10px;
            letter-spacing: 0.05em;
        }

        .table-compta td {
            padding: 12px 10px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 12px;
        }

        @media print {
            .no-print { display: none !important; }
            body { background: white; margin: 0; padding: 0; display: block; }
            #invoice-container { box-shadow: none !important; margin: 0; width: 100%; height: auto; border: none; }
        }
    </style>
</head>
<body class="py-8">

    <div class="max-w-[210mm] w-full mx-auto mb-6 flex justify-between items-center no-print px-4 md:px-0">
        <div>
            <h2 class="text-blue-900 font-bold text-lg">Aperçu Facture</h2>
            <p class="text-slate-500 text-xs">Vérifiez les détails avant d'imprimer.</p>
        </div>
        <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-800 text-white font-bold py-2.5 px-6 rounded-lg shadow-lg transition-all active:scale-95 flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            IMPRIMER / PDF
        </button>
    </div>

    <!-- ZONE DE CAPTURE PDF -->
    <div id="invoice-container">
        
        <!-- En-tête -->
        <div style="display: flex; justify-content: space-between; border-bottom: 4px solid #1e40af; padding-bottom: 20px; margin-bottom: 30px;">
            <div>
                <h1 style="font-size: 36px; font-weight: 900; color: #1e3a8a; margin: 0; text-transform: uppercase;">Facture</h1>
                <p style="font-weight: 700; color: #374151; margin-top: 5px;">N° ${invoiceNumber}</p>
                <p style="color: #6b7280; font-size: 14px;">Date : ${receiptDate}</p>
            </div>
            <div style="text-align: right;">
                <h2 style="font-size: 20px; font-weight: 800; color: #111827; margin: 0;">${academyName}</h2>
                <div style="font-size: 11px; color: #6b7280; margin-top: 5px; line-height: 1.4;">
                    <p>Siège Social : Casablanca</p>
                    <p style="font-weight: 700; color: #1f2937; margin-top: 5px;">ICE : ${taxId}</p>
                </div>
            </div>
        </div>

        <!-- Coordonnées -->
        <div style="display: flex; justify-content: space-between; gap: 40px; margin-bottom: 30px;">
            <div style="width: 45%;">
                <p style="color: #2563eb; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #dbeafe; padding-bottom: 4px; margin-bottom: 10px;">Prestataire</p>
                <p style="font-weight: 800; font-size: 16px; color: #1f2937;">${academyName}</p>
                <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">RC N° ${rc} | Patente ${patente}</p>
                <p style="font-size: 12px; color: #6b7280;">${address}</p>
                ${phone ? `<p style="font-size: 12px; color: #6b7280;">Tél: ${phone}</p>` : ''}
            </div>
            <div style="width: 45%; text-align: right;">
                <p style="color: #2563eb; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #dbeafe; padding-bottom: 4px; margin-bottom: 10px;">Facturé à</p>
                <p style="font-weight: 800; font-size: 16px; color: #111827;">${client.name}</p>
                <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">${client.address}</p>
                ${client.ice ? `<p style="font-size: 12px; color: #1f2937; font-weight: 700;">ICE : ${client.ice}</p>` : ''}
                ${client.rc ? `<p style="font-size: 12px; color: #6b7280;">RC : ${client.rc}</p>` : ''}
            </div>
        </div>

        <!-- Objet -->
        <div style="background-color: #f8fafc; border-left: 5px solid #1e40af; padding: 15px; margin-bottom: 30px; border-radius: 0 4px 4px 0;">
            <p style="font-size: 14px; color: #334155;"><span style="font-weight: 800; color: #1e3a8a; margin-right: 10px;">OBJET :</span> Frais d'inscription / Formation - ${enrollment.programName}</p>
        </div>

        <!-- Tableau Détail -->
        <table class="table-compta w-full" style="margin-bottom: 30px; width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="text-align: left;">Désignation de la prestation</th>
                    <th style="text-align: right;">Prix Unitaire HT</th>
                    <th style="text-align: right;">Qté</th>
                    <th style="text-align: right;">TVA (20%)</th>
                    <th style="text-align: right;">Total TTC</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <p style="font-weight: 700; color: #1f2937;">${enrollment.programName} - ${enrollment.gradeName}</p>
                        <p style="font-size: 10px; color: #9ca3af; font-style: italic;">Élève: ${student?.name || 'Étudiant'}</p>
                        ${enrollment.groupName ? `<p style="font-size: 10px; color: #9ca3af;">Groupe: ${enrollment.groupName}</p>` : ''}
                    </td>
                    <td style="text-align: right; color: #6b7280;">${new Intl.NumberFormat('fr-MA', { style: 'decimal', minimumFractionDigits: 2 }).format(amountHT)}</td>
                    <td style="text-align: right; font-weight: 500;">1</td>
                    <td style="text-align: right;">${new Intl.NumberFormat('fr-MA', { style: 'decimal', minimumFractionDigits: 2 }).format(tvaAmount)}</td>
                    <td style="text-align: right; font-weight: 800; color: #1e3a8a;">${new Intl.NumberFormat('fr-MA', { style: 'decimal', minimumFractionDigits: 2 }).format(amountTTC)}</td>
                </tr>
            </tbody>
        </table>

        <!-- Bloc Totaux -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 50px;">
            <div style="width: 280px; border: 2px solid #1e40af; border-radius: 8px; overflow: hidden;">
                <div style="padding: 15px; background: white; border-bottom: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
                        <span style="color: #64748b; font-weight: 600;">TOTAL HORS TAXE</span>
                        <span style="font-weight: 700;">${new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amountHT)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: #64748b; font-weight: 600;">TVA (20%)</span>
                        <span style="font-weight: 700;">${new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(tvaAmount)}</span>
                    </div>
                </div>
                <div style="background-color: #1e40af; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; font-weight: 800; letter-spacing: 0.05em;">TOTAL TTC</span>
                    <span style="font-size: 20px; font-weight: 900;">${new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amountTTC)}</span>
                </div>
            </div>
        </div>

        <!-- Bas de page fixe -->
        <div style="position: absolute; bottom: 60px; left: 50px; right: 50px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #f3f4f6; padding-top: 20px;">
                <!-- Paiement -->
                <div style="width: 55%; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <p style="font-size: 10px; font-weight: 900; color: #1e40af; margin-bottom: 10px; text-transform: uppercase;">💳 Coordonnées de paiement</p>
                    <p style="font-size: 13px; font-weight: 700; color: #1f2937; margin-bottom: 5px;">Attijariwafa bank</p>
                    <div style="background: white; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center;">
                        <p style="font-size: 16px; font-weight: 800; font-family: monospace; letter-spacing: -0.5px; color: #1e3a8a;">007 780 0015115000001132 50</p>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; margin-top: 5px;">
                        <span>SWIFT : BCMAMAMC</span>
                        <span>Bénéficiaire : FUTURE MAKERS</span>
                    </div>
                </div>

                <!-- Signature -->
                <div style="width: 35%; text-align: center;">
                    <div style="height: 100px; border: 2px dashed #e2e8f0; border-radius: 8px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-style: italic; font-size: 12px;">
                        Cachet et Signature
                    </div>
                    <p style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em;">${academyName}</p>
                </div>
            </div>
            
            <p style="text-align: center; font-size: 9px; color: #cbd5e1; margin-top: 40px; letter-spacing: 0.5em; text-transform: uppercase;">${website} • ${email}</p>
        </div>
    </div>
</body>
</html>
    `;

    win.document.write(html);
    win.document.close();
};
