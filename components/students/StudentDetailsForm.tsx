import React from 'react';
import { Heart, School, Users, UserRound } from 'lucide-react';
import { EducationButton, EducationField, EducationFormSection, EducationNotice } from '../education-ui/EducationPrimitives';

export type StudentDetailsDraft = { name?:string; birthDate?:string; parentName?:string; parentPhone?:string; email?:string; school?:string; address?:string; medicalInfo?:string };
export const StudentDetailsForm = ({ value, onChange, onSubmit, onCancel, busy=false, error='', focusedField='name' }: {
  value:StudentDetailsDraft; onChange:(value:StudentDetailsDraft)=>void; onSubmit:(event:React.FormEvent)=>void;
  onCancel:()=>void; busy?:boolean; error?:string; focusedField?:string;
}) => {
  const input=(key:keyof StudentDetailsDraft,type='text',required=false)=><input type={type} value={value[key]||''} onChange={event=>onChange({...value,[key]:event.target.value})} autoFocus={focusedField===key} required={required} disabled={busy} />;
  return <form data-edu-system="1" onSubmit={onSubmit} aria-busy={busy}>
    <p style={{color:'var(--ds-muted)',marginBottom:24}}>Keep learner and family details up to date. Required fields are marked *.</p>
    <EducationFormSection title="Learner details" icon={UserRound} accent="green">
      <EducationField label="Full name">{input('name','text',true)}</EducationField>
      <EducationField label="Date of birth">{input('birthDate','date')}</EducationField>
    </EducationFormSection>
    <EducationFormSection title="Family contact" icon={Users} accent="blue">
      <EducationField label="Parent name">{input('parentName')}</EducationField>
      <EducationField label="Parent phone">{input('parentPhone','tel',true)}</EducationField>
      <EducationField label="Email" hint="Optional">{input('email','email')}</EducationField>
      <EducationField label="Address">{input('address')}</EducationField>
    </EducationFormSection>
    <EducationFormSection title="School & care" icon={School} accent="purple">
      <EducationField label="School">{input('school')}</EducationField>
      <EducationField label="Medical information / allergies" hint="Only record information needed to support the learner."><textarea value={value.medicalInfo||''} onChange={event=>onChange({...value,medicalInfo:event.target.value})} disabled={busy}/></EducationField>
    </EducationFormSection>
    {error&&<EducationNotice status="danger"><Heart size={18} aria-hidden="true"/>{error}</EducationNotice>}
    <footer className="edu-ds-form-footer"><EducationButton onClick={onCancel} disabled={busy}>Cancel</EducationButton><EducationButton type="submit" variant="primary" disabled={busy}>{busy?'Saving changes…':'Save changes'}</EducationButton></footer>
  </form>;
};
