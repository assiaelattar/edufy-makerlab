
import React from 'react';
import { AppSettings } from '../types';

interface CredentialsCardProps {
  name: string;
  email: string;
  pass: string;
  role: string;
  settings: AppSettings;
}

export const CredentialsCard: React.FC<CredentialsCardProps> = ({ name, email, pass, role, settings }) => {
  const logoHtml = settings.logoUrl 
    ? `<img src="${settings.logoUrl}" alt="Logo" style="height: 60px; object-fit: contain;" />` 
    : `<div style="font-size: 24px; font-weight: bold; color: #2563eb;">${settings.academyName}</div>`;

  return (
    <html>
      <head>
        <title>{role} Access Card - {name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
        <style>
          {`
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
          `}
        </style>
      </head>
      <body>
        <div className="card">
          <div className="header" dangerouslySetInnerHTML={{ __html: logoHtml }}></div>
          <div className="title">{role} Access Pass</div>
          <div className="welcome">Welcome,</div>
          <h1 className="name">{name}</h1>
          <div className="credentials">
            <div className="field">
              <span className="label">Email / Login</span>
              <div className="value">{email}</div>
            </div>
            <div className="field">
              <span className="label">Password</span>
              <div className="value">{pass || '********'}</div>
            </div>
          </div>
          <div className="footer">
            Login at <br />
            <a href={window.location.origin} className="url">{window.location.host}</a>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `window.onload = function() { setTimeout(function() { window.print(); }, 500); }` }} />
      </body>
    </html>
  );
};
