// Isolated fixture. The payment modal below is injected from App.tsx at build time.
import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Banknote,CalendarDays,CheckCircle2,ChevronDown,FileText,Image as ImageIcon,Landmark,Search,Upload,UserRound,Users,Wallet} from 'lucide-react';
import {Modal} from '../../components/Modal';
import {EnrollmentWizard} from '../../components/enrollment/EnrollmentWizard';
import {formatCurrency} from '../../utils/helpers';
import '../../components/education-ui/education-module-compat-v1.css';
import '../../components/education-ui/education-role-surfaces-v1.css';
import '../../components/layouts/education-school-themes.css';
import '../../views/dashboard/education-dashboard-playful.css';

const query=new URLSearchParams(location.search);
const student={id:'student-synthetic',organizationId:'synthetic-only',name:'Alex Example',status:'active',parentName:'Morgan Example',parentPhone:'+15550000000',birthDate:'2016-04-12',email:'alex@example.invalid',school:'Example School'};
const program={id:'program-synthetic',name:'Creative Robotics',type:'workshop',status:'active',packs:[{name:'School term',price:1200,priceAnnual:1200}],grades:[{id:'level-synthetic',name:'Explorer',groups:[{id:'group-synthetic',name:'Tuesday makers',day:'Tuesday',time:'16:00',capacity:16}]}]};
const enrollment={id:'enrollment-synthetic',studentId:student.id,studentName:student.name,programId:program.id,programName:program.name,status:'active',balance:500};
const students=[student];
const enrollments=[enrollment];
const parentAccounts=[{parentName:'Morgan Example',phone:'+15550000000',children:[{student,enrollment}],totalBalance:500}];
const proofUrl='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300"><rect width="500" height="300" fill="#eef6ff"/><text x="35" y="100" font-family="Arial" font-size="30">Synthetic proof only</text></svg>');

function EnrollmentForm({onClose,onNotice}:{onClose:()=>void,onNotice:(message:string)=>void}){
 const [step,setStep]=useState(1),[learnerMode,setLearnerMode]=useState<'existing'|'new'>('existing'),[selectedStudentId,setSelectedStudentId]=useState<string|null>(student.id);
 const [studentForm,setStudentForm]=useState({name:'',parentName:'',parentPhone:'',birthDate:'',email:'',school:''});
 const [programForm,setProgramForm]=useState({programId:'',packName:'',gradeId:'',groupId:'',paymentPlan:'full' as const,secondGroupId:'',campSessionId:'',campShiftId:'',moduleIds:[] as string[]});
 const [negotiatedPrice,setNegotiatedPrice]=useState(1200),[payments,setPayments]=useState<any[]>([]),[promises,setPromises]=useState<any[]>([]),[isSubmitting,setSubmitting]=useState(false),[error,setError]=useState('');
 const [currentPayment,setCurrentPayment]=useState({amount:'',method:'cash',date:'2026-10-20',checkNumber:'',bankName:'',depositDate:''});
 const [currentPromise,setCurrentPromise]=useState({month:'',amount:''});
 const totalPayingNow=payments.reduce((sum,p)=>sum+Number(p.amount),0),remainingBalance=negotiatedPrice-totalPayingNow;
 const finish=()=>{setSubmitting(true);setTimeout(()=>{setSubmitting(false);if(query.get('save')==='error'){setError('Synthetic enrollment save failed. Draft retained.');return;}onNotice('Synthetic enrollment saved; no school records changed.');onClose();},200);};
 return <><EnrollmentWizard isOpen onClose={onClose} {...{step,setStep,learnerMode,setLearnerMode,selectedStudentId,setSelectedStudentId,studentForm,setStudentForm,programForm,setProgramForm,negotiatedPrice,setNegotiatedPrice,payments,currentPayment,setCurrentPayment,promises,currentPromise,setCurrentPromise,isSubmitting,totalPayingNow,remainingBalance}}
 students={students as any} programs={[program] as any} enrollments={[]} selectedProgram={program as any} standardTuition={1200} remainingToSchedule={remainingBalance} pendingPayingNow={0} discountAmount={1200-negotiatedPrice} discountPercent={Math.round((1200-negotiatedPrice)/12)} requiredStudentFields={{parentName:true,birthDate:false}}
 onAddPayment={()=>setPayments([...payments,{...currentPayment,id:Date.now()}])} onRemovePayment={id=>setPayments(payments.filter(p=>p.id!==id))} onAddPromise={()=>setPromises([...promises,{...currentPromise,id:Date.now()}])} onRemovePromise={id=>setPromises(promises.filter(p=>p.id!==id))} onFinish={finish}/>{error&&<p role="alert" className="student-fixture-error">{error}</p>}</>;
}

function PaymentForm({onClose,onNotice}:{onClose:()=>void,onNotice:(message:string)=>void}){
 const [isPaymentModalOpen,setIsPaymentModalOpen]=useState(true);
 const [paymentMode,setPaymentMode]=useState<'individual'|'parent'>('individual');
 const [paymentForm,setPaymentForm]=useState({studentId:student.id,enrollmentId:enrollment.id,amount:500,method:'cash',date:'2026-10-20',checkNumber:'',bankName:'',depositDate:'',proofUrl:''});
 const [selectedParentAccount,setSelectedParentAccount]=useState<any>(null),[showPaymentDetails,setShowPaymentDetails]=useState(false),[paymentSearchQuery,setPaymentSearchQuery]=useState(''),[isDropdownOpen,setIsDropdownOpen]=useState(false),[parentPaymentSearchQuery,setParentPaymentSearchQuery]=useState(''),[isParentDropdownOpen,setIsParentDropdownOpen]=useState(false),[isSubmittingPayment,setSubmittingPayment]=useState(false);
 const selectedPaymentEnrollment=enrollments.find(item=>item.id===paymentForm.enrollmentId);
 const hasSelectedPaymentTarget=Boolean(selectedPaymentEnrollment||selectedParentAccount);
 const close=()=>{setIsPaymentModalOpen(false);onClose();};
 const handleProofUpload=(event:React.ChangeEvent<HTMLInputElement>)=>{if(event.target.files?.length)setPaymentForm(previous=>({...previous,proofUrl}));};
 const handleSubmitPayment=(event:React.FormEvent)=>{event.preventDefault();if(paymentMode==='parent'&&(!selectedParentAccount||!Number.isFinite(Number(paymentForm.amount))||Number(paymentForm.amount)<=0)){onNotice('Choose a family and enter a positive amount.');return;}if(paymentMode==='individual'&&!paymentForm.enrollmentId){onNotice('Choose a student enrollment.');return;}setSubmittingPayment(true);setTimeout(()=>{setSubmittingPayment(false);if(query.get('save')==='error'){onNotice('Synthetic payment save failed; draft retained.');return;}onNotice('Synthetic payment saved; no school records changed.');close();},200);};
 return <>
 /* APP_PAYMENT_MODAL_SOURCE */
 </>;
}

function App(){const [theme,setTheme]=useState(query.get('theme')==='dark'?'dark':'light'),[form,setForm]=useState<'enroll'|'payment'|null>(null),[notice,setNotice]=useState('');
 useEffect(()=>{document.body.className='education-ui-v1-active';document.body.dataset.eduTheme=theme;document.documentElement.style.colorScheme=theme;},[theme]);
 return <div data-edu-system="1" data-edu-theme={theme} className="student-fixture-page edu-v1 edu-shell-v1"><header className="student-fixture-toolbar"><div><strong>Student Details · App-owned forms</strong><small>Exact payment markup from App.tsx · actual EnrollmentWizard · synthetic data</small></div><button type="button" onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?'Dark theme':'Light theme'}</button></header>
 <main className="student-fixture-form-start"><h1>Student forms</h1><p>Open each form with invented records. Every submit stays in this isolated fixture.</p><div><button type="button" onClick={()=>{setNotice('');setForm('enroll');}}>Open enrollment wizard</button><button type="button" onClick={()=>{setNotice('');setForm('payment');}}>Record a payment</button></div></main>
 {form==='enroll'&&<EnrollmentForm onClose={()=>setForm(null)} onNotice={setNotice}/>}{form==='payment'&&<PaymentForm onClose={()=>setForm(null)} onNotice={setNotice}/>}{notice&&<p role="status" className="student-fixture-notice">{notice}</p>}
 </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
