import React, { useState } from 'react';
import { Database, FileSpreadsheet, Table, RefreshCw, Download, Wrench, Zap } from 'lucide-react';
import * as XLSX from 'xlsx';

export const ToolsView = () => {
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [fileName, setFileName] = useState('');
    const [mapping, setMapping] = useState<{ [key: string]: string }>({
      Name: '',
      ParentPhone: '',
      Email: '',
      ParentName: '',
      Address: '',
      School: '',
      BirthDate: '',
      MedicalInfo: ''
    });
    const [isConverting, setIsConverting] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFileName(file.name);
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (data.length > 0) {
           const headers = data[0] as string[];
           setHeaders(headers);
           // Remove header row
           setFileData(data.slice(1));
           // Auto-map if possible
           const newMapping = { ...mapping };
           headers.forEach(h => {
               const lowerH = h.toLowerCase().replace(/[^a-z]/g, '');
               if (lowerH.includes('name') && !lowerH.includes('parent')) newMapping.Name = h;
               else if (lowerH.includes('phone') || lowerH.includes('mobile')) newMapping.ParentPhone = h;
               else if (lowerH.includes('email')) newMapping.Email = h;
               else if (lowerH.includes('parent') || lowerH.includes('father') || lowerH.includes('mother')) newMapping.ParentName = h;
               else if (lowerH.includes('address') || lowerH.includes('city')) newMapping.Address = h;
               else if (lowerH.includes('school')) newMapping.School = h;
               else if (lowerH.includes('birth') || lowerH.includes('dob')) newMapping.BirthDate = h;
               else if (lowerH.includes('medical') || lowerH.includes('note')) newMapping.MedicalInfo = h;
           });
           setMapping(newMapping);
        }
      };
      reader.readAsBinaryString(file);
    };

    const handleConvertAndDownload = () => {
      setIsConverting(true);
      // Generate CSV content based on mapping
      const standardHeaders = "Name,ParentPhone,Email,ParentName,Address,School,BirthDate(YYYY-MM-DD),MedicalInfo";
      let csvContent = standardHeaders + "\n";
      
      fileData.forEach((row: any[]) => {
          // row is an array of values corresponding to 'headers'
          const getVal = (field: string) => {
              const headerName = mapping[field];
              if (!headerName) return "";
              const idx = headers.indexOf(headerName);
              if (idx === -1) return "";
              let val = row[idx];
              if (val === undefined || val === null) return "";
              
              if (field === 'BirthDate' && typeof val === 'number') {
                  // Excel date to JS Date
                  const date = new Date(Math.round((val - 25569) * 86400 * 1000));
                  val = date.toISOString().split('T')[0];
              }
              
              const strVal = String(val);
              if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
                  return `"${strVal.replace(/"/g, '""')}"`;
              }
              return strVal;
          };

          const line = [
              getVal('Name'),
              getVal('ParentPhone'),
              getVal('Email'),
              getVal('ParentName'),
              getVal('Address'),
              getVal('School'),
              getVal('BirthDate'),
              getVal('MedicalInfo')
          ].join(',');
          
          csvContent += line + "\n";
      });

      const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `converted_students_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsConverting(false);
      alert("Conversion successful! The file has been downloaded. You can now use 'Bulk Upload' in Settings to import these students.");
    };

    return (
        <div className="space-y-6 pb-24 md:pb-8 h-full flex flex-col animate-in fade-in slide-in-from-right-4">
             <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Wrench size={120} className="text-blue-500"/></div>
                <h1 className="text-2xl font-bold text-white relative z-10">Tools & Utilities</h1>
                <p className="text-slate-400 mt-1 relative z-10 text-sm">Helper tools to manage data and extend functionality.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Smart Import Assistant */}
                 <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                     <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-emerald-900/20 to-slate-900 flex justify-between items-center">
                         <h3 className="font-bold text-white flex items-center gap-2"><Database className="w-4 h-4 text-emerald-400"/> Smart Import Assistant</h3>
                     </div>
                     <div className="p-6 flex-1 flex flex-col space-y-4">
                         <p className="text-sm text-slate-400">Convert any Excel (.xlsx) or CSV file into the standardized format required for StemFlow bulk import. No manual template matching needed!</p>
                         
                         <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-emerald-500 hover:bg-slate-800/30 transition-all cursor-pointer relative bg-slate-950/50">
                            <input 
                                type="file" 
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                                onChange={handleFileUpload} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center gap-2">
                                <FileSpreadsheet className="w-8 h-8 text-emerald-500"/>
                                <span className="text-sm font-medium text-slate-300">{fileName || "Upload Excel / CSV File"}</span>
                                <span className="text-xs text-slate-500">{fileName ? "Click to change file" : "Drag & drop or click to browse"}</span>
                            </div>
                         </div>

                         {headers.length > 0 && (
                             <div className="flex-1 overflow-hidden flex flex-col animate-in slide-in-from-bottom-2">
                                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 mt-2 flex items-center gap-2"><Table size={12}/> Map Columns</h4>
                                 <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex-1 overflow-y-auto custom-scrollbar">
                                     <table className="w-full text-left text-xs">
                                         <thead className="bg-slate-900 text-slate-500">
                                             <tr><th className="p-3">Required Field</th><th className="p-3">Your File Column</th></tr>
                                         </thead>
                                         <tbody className="divide-y divide-slate-800">
                                             {Object.keys(mapping).map((field) => (
                                                 <tr key={field}>
                                                     <td className="p-3 font-medium text-slate-300">
                                                         {field.replace(/([A-Z])/g, ' $1').trim()} 
                                                         {(field === 'Name' || field === 'ParentPhone') && <span className="text-red-400">*</span>}
                                                     </td>
                                                     <td className="p-2">
                                                         <select 
                                                            className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200 focus:border-blue-500 outline-none"
                                                            value={mapping[field]}
                                                            onChange={(e) => setMapping({...mapping, [field]: e.target.value})}
                                                         >
                                                             <option value="">-- Select Column --</option>
                                                             {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                                         </select>
                                                     </td>
                                                 </tr>
                                             ))}
                                         </tbody>
                                     </table>
                                 </div>
                                 <button 
                                    onClick={handleConvertAndDownload}
                                    disabled={!mapping.Name || !mapping.ParentPhone || isConverting}
                                    className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-900/20"
                                 >
                                    {isConverting ? <RefreshCw className="animate-spin w-4 h-4"/> : <Download className="w-4 h-4"/>}
                                    Convert & Download Template
                                 </button>
                             </div>
                         )}
                     </div>
                 </div>

                 {/* Future Tools Placeholders */}
                 <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center opacity-50">
                     <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                         <Zap className="w-6 h-6 text-slate-600"/>
                     </div>
                     <h3 className="font-bold text-white mb-2">More Tools Coming Soon</h3>
                     <p className="text-sm text-slate-500 max-w-xs">We are building more utilities like Bulk Email Sender, Financial Reports Exporter, and more.</p>
                 </div>
             </div>
        </div>
    );
};
