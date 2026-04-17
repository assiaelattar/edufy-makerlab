import React, { useState, useEffect } from 'react';
import { FormTemplateRenderer } from '../enrollment/FormTemplateRenderer'; // Not needed, remove if unused
import { Modal } from '../Modal';
import { Payment, Student, AppSettings, Enrollment } from '../../types';
import { generateInvoice, ClientDetails } from '../../utils/invoiceGenerator';
import { Building, User, MapPin, Hash, FileText } from 'lucide-react';

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: Payment | null;
    enrollment: Enrollment | undefined;
    student: Student | undefined;
    settings: AppSettings;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
    isOpen,
    onClose,
    payment,
    enrollment,
    student,
    settings
}) => {
    const [clientType, setClientType] = useState<'individual' | 'company'>('individual');
    const [clientData, setClientData] = useState<ClientDetails>({
        name: '',
        address: '',
        ice: '',
        rc: ''
    });

    // Initialize defaults when modal opens
    useEffect(() => {
        if (isOpen && student) {
            if (clientType === 'individual') {
                setClientData({
                    name: student.parentName || student.name,
                    address: student.address || 'Casablanca, Maroc',
                    ice: '',
                    rc: ''
                });
            } else {
                // Reset/Clear for company if switching, or keep empty
                setClientData(prev => ({
                    ...prev,
                    name: '',
                    address: student.address || 'Casablanca, Maroc',
                    ice: '',
                    rc: ''
                }));
            }
        }
    }, [isOpen, clientType, student]);

    const handleGenerate = () => {
        if (!payment || !enrollment) return;
        generateInvoice(payment, enrollment, student, clientData, settings);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Generate Invoice (Facture)" size="md">
            <div className="space-y-6">

                {/* Type Selection */}
                <div className="flex gap-4 mb-4">
                    <button
                        onClick={() => setClientType('individual')}
                        className={`flex-1 py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 font-bold transition-all ${clientType === 'individual' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
                    >
                        <User size={20} /> Particulier
                    </button>
                    <button
                        onClick={() => setClientType('company')}
                        className={`flex-1 py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 font-bold transition-all ${clientType === 'company' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
                    >
                        <Building size={20} /> Entreprise
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">
                            {clientType === 'individual' ? 'Nom du Parent / Client' : 'Raison Sociale'}
                        </label>
                        <input
                            type="text"
                            value={clientData.name}
                            onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={clientType === 'individual' ? "Ex: M. Ahmed Benani" : "Ex: Société X SARL"}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">
                            Adresse de facturation
                        </label>
                        <div className="relative">
                            <MapPin className="absolute top-3 left-3 text-slate-400" size={18} />
                            <input
                                type="text"
                                value={clientData.address}
                                onChange={(e) => setClientData({ ...clientData, address: e.target.value })}
                                className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Adresse complète"
                            />
                        </div>
                    </div>

                    {clientType === 'company' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">ICE</label>
                                <div className="relative">
                                    <Hash className="absolute top-3 left-3 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={clientData.ice}
                                        onChange={(e) => setClientData({ ...clientData, ice: e.target.value })}
                                        className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="000123456000000"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Registre Commerce</label>
                                <div className="relative">
                                    <FileText className="absolute top-3 left-3 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={clientData.rc}
                                        onChange={(e) => setClientData({ ...clientData, rc: e.target.value })}
                                        className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="RC 123456"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">
                        Annuler
                    </button>
                    <button onClick={handleGenerate} className="px-6 py-2 bg-blue-700 text-white font-bold rounded-lg hover:bg-blue-800 shadow-lg shadow-blue-900/20 active:scale-95 transition-all">
                        Générer Facture
                    </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex gap-2 items-start">
                    <div className="mt-0.5 font-bold">INFO:</div>
                    <p>La facture générée inclura automatiquement une TVA de 20% en plus du montant du paiement sélectionné. Assurez-vous que le montant du paiement correspond bien à la base HT.</p>
                </div>
            </div>
        </Modal>
    );
};
