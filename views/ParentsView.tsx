import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Copy,
  CreditCard,
  FileDown,
  KeyRound,
  Link2,
  Loader2,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";
import {
  EducationButton,
  EducationField,
  EducationNotice,
  EducationState,
  EducationStatusPill,
  EducationSurface,
  EducationTabs,
} from "../components/education-ui/EducationPrimitives";
import { Modal } from "../components/Modal";
import {
  getParentDirectory,
  manageParentAccess,
  type ParentDirectoryAccount,
} from "../services/parentAccess";
import {
  formatCurrency,
  generateParentStatementPrint,
  normalizePhone,
} from "../utils/helpers";
import { getEnrollmentFinancialSummary } from "../utils/enrollmentFinancials";
import type { Student } from "../types";
import "./parents/education-parents-v1.css";

type FamilyRecord = {
  key: string;
  parentName: string;
  phone: string;
  contactEmail: string;
  students: Student[];
  baseStudentIds: string[];
  accounts: ParentDirectoryAccount[];
  recordedLogins: string[];
  duplicateAccess: boolean;
};
type DetailTab = "learners" | "access" | "billing";
const unique = <T,>(values: T[]) => [...new Set(values)];
const contactEmail = (student: Student) => {
  const legacy =
    student.email &&
    student.email !== student.loginInfo?.email &&
    student.email !== student.parentLoginInfo?.email
      ? student.email
      : "";
  return (student.parentEmail || legacy || "").trim().toLowerCase();
};
const recordName = (students: Student[]) =>
  students.map((student) => student.parentName?.trim()).find(Boolean) ||
  "Family contact to verify";

export const ParentsView = () => {
  const { students, enrollments, programs, settings, navigateTo } =
    useAppContext();
  const { can, currentOrganization } = useAuth();
  const { alert: showAlert, confirm } = useConfirm();
  const [directory, setDirectory] = useState<ParentDirectoryAccount[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [activeTab, setActiveTab] = useState<DetailTab>("learners");
  const [parentName, setParentName] = useState("");
  const [aliasBasis, setAliasBasis] = useState("");
  const [targetUid, setTargetUid] = useState("");
  const [relationshipVerified, setRelationshipVerified] = useState(false);
  const [working, setWorking] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [learnerSearch, setLearnerSearch] = useState("");
  const [pendingStudentIds, setPendingStudentIds] = useState<string[]>([]);
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
    count: number;
    retirementIncomplete?: boolean;
  } | null>(null);

  const refreshDirectory = async () => {
    if (!currentOrganization?.id) {
      setDirectory([]);
      setDirectoryLoading(false);
      return;
    }
    setDirectoryLoading(true);
    setDirectoryError("");
    try {
      setDirectory(await getParentDirectory(currentOrganization.id));
    } catch (error) {
      setDirectoryError((error as Error).message);
    } finally {
      setDirectoryLoading(false);
    }
  };
  useEffect(() => {
    void refreshDirectory();
  }, [currentOrganization?.id]);

  const activeStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          student.status !== "inactive" &&
          student.organizationId === currentOrganization?.id,
      ),
    [students, currentOrganization?.id],
  );
  const familyRecords = useMemo(() => {
    const byId = new Map(
      activeStudents.map((student) => [student.id, student]),
    );
    const accountByUid = new Map(
      directory.map((account) => [account.uid, account]),
    );
    const groups = new Map<string, Student[]>();
    activeStudents.forEach((student) => {
      const phone = normalizePhone(student.parentPhone || "");
      const uid = student.parentLoginInfo?.uid;
      const key = phone
        ? `contact:${phone}`
        : uid
          ? `family-link:${uid}`
          : `learner:${student.id}`;
      groups.set(key, [...(groups.get(key) || []), student]);
    });
    return [...groups]
      .map(([key, base]): FamilyRecord => {
        const uids = unique(
          base
            .map((student) => student.parentLoginInfo?.uid)
            .filter(Boolean) as string[],
        );
        const accounts = uids
          .map((uid) => accountByUid.get(uid))
          .filter(Boolean) as ParentDirectoryAccount[];
        const expanded = new Map(base.map((student) => [student.id, student]));
        accounts.forEach((account) =>
          account.children.forEach((child) => {
            const student = byId.get(child.id);
            if (student) expanded.set(student.id, student);
          }),
        );
        return {
          key,
          parentName: accounts[0]?.parentName || recordName(base),
          phone: base.map((student) => student.parentPhone).find(Boolean) || "",
          contactEmail: base.map(contactEmail).find(Boolean) || "",
          students: [...expanded.values()].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
          baseStudentIds: base.map((student) => student.id),
          accounts,
          recordedLogins: unique(
            base
              .map((student) => student.parentLoginInfo?.email?.toLowerCase())
              .filter(Boolean) as string[],
          ),
          duplicateAccess: uids.length > 1,
        };
      })
      .sort((a, b) => a.parentName.localeCompare(b.parentName));
  }, [activeStudents, directory]);
  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return familyRecords;
    return familyRecords.filter((record) =>
      [
        record.parentName,
        record.phone,
        record.contactEmail,
        ...record.accounts.map((a) => a.email),
        ...record.students.map((s) => s.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [familyRecords, search]);
  const selected =
    familyRecords.find((record) => record.key === selectedKey) ||
    filteredRecords[0] ||
    familyRecords[0];
  useEffect(() => {
    if (!selected) return;
    setSelectedKey(selected.key);
    setTargetUid(
      selected.accounts.length === 1 ? selected.accounts[0].uid : "",
    );
    setParentName(
      selected.accounts.length === 1
        ? selected.accounts[0].parentName
        : selected.parentName,
    );
    setAliasBasis(selected.parentName.replace(/\s+family$/i, ""));
    setRelationshipVerified(false);
    setPendingStudentIds([]);
    setLearnerSearch("");
  }, [selected?.key]);
  useEffect(() => {
    const account = directory.find((item) => item.uid === targetUid);
    if (account) setParentName(account.parentName);
  }, [targetUid, directory]);

  const selectedEnrollments = useMemo(
    () =>
      selected
        ? selected.students.map((student) => ({
            student,
            enrollments: enrollments.filter(
              (item) =>
                item.studentId === student.id && item.status === "active",
            ),
          }))
        : [],
    [selected, enrollments],
  );
  const totals = useMemo(
    () =>
      selectedEnrollments.reduce(
        (summary, child) => {
          child.enrollments.forEach((enrollment) => {
            const finance = getEnrollmentFinancialSummary(enrollment, programs);
            summary.expected += finance.agreedAmount;
            summary.paid += Number(enrollment.paidAmount || 0);
            summary.balance += Math.max(
              0,
              Number(
                enrollment.balance ??
                  finance.agreedAmount - Number(enrollment.paidAmount || 0),
              ),
            );
          });
          return summary;
        },
        { expected: 0, paid: 0, balance: 0 },
      ),
    [selectedEnrollments, programs],
  );
  const statementData = selected
    ? {
        parentName: selected.parentName,
        phone: selected.phone,
        children: selectedEnrollments,
        totalExpected: totals.expected,
        totalPaid: totals.paid,
        totalBalance: totals.balance,
      }
    : null;
  const availableStudents = useMemo(() => {
    if (!selected) return [];
    const shown = new Set(selected.students.map((student) => student.id));
    const q = learnerSearch.trim().toLowerCase();
    return activeStudents.filter(
      (student) =>
        !shown.has(student.id) &&
        (!q ||
          [student.name, student.parentName, student.parentPhone]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)),
    );
  }, [activeStudents, selected, learnerSearch]);
  const replacementStudentIds = selected
    ? unique([...selected.baseStudentIds, ...pendingStudentIds])
    : [];
  const canReplaceSelectedLogins = replacementStudentIds.length >= 2 &&
    replacementStudentIds.every(id => activeStudents.some(student => student.id === id && student.parentLoginInfo?.uid)) &&
    new Set(replacementStudentIds.map(id => activeStudents.find(student => student.id === id)?.parentLoginInfo?.uid)).size === replacementStudentIds.length;

  const runFamilyAction = async (
    studentIds: string[],
    mode: "issueFamily" | "linkFamily" | "replaceFamily",
  ) => {
    if (
      !currentOrganization?.id ||
      working ||
      !can("students.edit") ||
      !selected
    )
      return;
    if (!studentIds.length) {
      await showAlert(
        "Select learners",
        "Select at least one learner for this family or care group.",
        "warning",
      );
      return;
    }
    const account = directory.find((item) => item.uid === targetUid);
    if (mode === "replaceFamily") {
      const approved = await confirm({
        title: "Create one new family login",
        message: `Move ${studentIds.length} verified learners to one new SparkQuest parent account? Their current parent logins will be revoked and deleted. Learner work, payments, and contact emails stay with their records.`,
        variant: "warning",
        confirmText: "Create and move learners",
      });
      if (!approved) return;
    }
    setWorking(true);
    try {
      const result = await manageParentAccess({
        action: mode,
        organizationId: currentOrganization.id,
        studentIds,
        parentName: mode === "replaceFamily" ? parentName : account?.parentName || parentName,
        aliasBasis,
        relationshipVerified,
        reuseParentUid: mode === "linkFamily" ? account?.uid : undefined,
        reuseParentEmail: mode === "linkFamily" ? account?.email : undefined,
      });
      if (result.password)
        setCredentials({
          email: result.email,
          password: result.password,
          count: result.linkedLearnerCount || studentIds.length,
          retirementIncomplete: result.retirementIncomplete,
        });
      await refreshDirectory();
      setAddOpen(false);
      setPendingStudentIds([]);
      await showAlert(
        result.retirementIncomplete ? "New family access created; old login needs review" : "Family access updated",
        result.retirementIncomplete
          ? `${result.linkedLearnerCount || studentIds.length} learners now use ${result.email}, but an old authentication account could not be deleted. Ask an administrator to review it before sharing the new access.`
          : `${result.linkedLearnerCount || studentIds.length} learner${studentIds.length === 1 ? "" : "s"} can now be managed through ${result.email}.`,
        result.retirementIncomplete ? "warning" : "success",
      );
    } catch (error) {
      await showAlert(
        "Family access could not be updated",
        (error as Error).message,
        "danger",
      );
    } finally {
      setWorking(false);
    }
  };
  const resetPassword = async (account: ParentDirectoryAccount) => {
    const linked = selected?.students.find(
      (student) => student.parentLoginInfo?.uid === account.uid,
    );
    if (!linked || !currentOrganization?.id || working) return;
    setWorking(true);
    try {
      const result = await manageParentAccess({
        action: "reset",
        studentId: linked.id,
        organizationId: currentOrganization.id,
        parentName: account.parentName,
        relationshipVerified,
      });
      if (result.password)
        setCredentials({
          email: result.email,
          password: result.password,
          count: result.linkedLearnerCount || account.children.length,
        });
    } catch (error) {
      await showAlert(
        "Password could not be issued",
        (error as Error).message,
        "danger",
      );
    } finally {
      setWorking(false);
    }
  };
  const accountCount = unique(
    familyRecords.flatMap((record) =>
      record.accounts.map((account) => account.uid),
    ),
  ).length;
  const reviewCount = familyRecords.filter(
    (record) => !record.accounts.length,
  ).length;
  const conflictCount = familyRecords.filter(
    (record) => record.duplicateAccess,
  ).length;
  if (!can("students.view"))
    return (
      <EducationState
        kind="restricted"
        title="Parents access restricted"
        description="Your role cannot view learner family records."
      />
    );

  return (
    <div className="edu-parent-v1" data-edu-system="1">
      <header className="edu-parent-v1__hero">
        <div className="edu-parent-v1__hero-icon">
          <Users size={28} />
        </div>
        <div className="edu-parent-v1__hero-copy">
          <span>Family operations</span>
          <h1>Parents & care groups</h1>
          <p>
            Keep each family together, then manage its learners, generated
            logins and billing in one place.
          </p>
        </div>
        <EducationButton
          icon={RefreshCw}
          onClick={() => void refreshDirectory()}
          disabled={directoryLoading}
        >
          Refresh
        </EducationButton>
      </header>
      <section className="edu-parent-v1__metrics" aria-label="Family summary">
        <article data-tone="green">
          <ShieldCheck />
          <div>
            <strong>{accountCount}</strong>
            <span>Generated logins</span>
          </div>
        </article>
        <article data-tone="blue">
          <Users />
          <div>
            <strong>{familyRecords.length}</strong>
            <span>Family groups</span>
          </div>
        </article>
        <article data-tone="orange">
          <UserRound />
          <div>
            <strong>{reviewCount}</strong>
            <span>Need access setup</span>
          </div>
        </article>
        <article data-tone={conflictCount ? "red" : "green"}>
          <AlertTriangle />
          <div>
            <strong>{conflictCount}</strong>
            <span>Duplicate access reviews</span>
          </div>
        </article>
      </section>
      {directoryError && (
        <EducationNotice status="danger">{directoryError}</EducationNotice>
      )}
      <div className="edu-parent-v1__workspace">
        <aside
          className="edu-parent-v1__directory"
          aria-label="Family directory"
        >
          <div className="edu-parent-v1__search">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search family, learner or phone"
              aria-label="Search family records"
            />
          </div>
          <div className="edu-parent-v1__family-list">
            {directoryLoading && !familyRecords.length ? (
              <EducationState
                kind="loading"
                title="Loading families"
                description="Checking contacts and access links."
              />
            ) : filteredRecords.length === 0 ? (
              <EducationState
                title="No family records"
                description="No matching family or learner was found."
              />
            ) : (
              filteredRecords.map((record) => (
                <button
                  key={record.key}
                  type="button"
                  className="edu-parent-v1__family-card"
                  data-selected={selected?.key === record.key}
                  onClick={() => setSelectedKey(record.key)}
                >
                  <span className="edu-parent-v1__avatar">
                    {record.parentName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="edu-parent-v1__family-copy">
                    <strong>{record.parentName}</strong>
                    <small>
                      {record.students.length} learner
                      {record.students.length === 1 ? "" : "s"} ·{" "}
                      {record.accounts.length} login
                      {record.accounts.length === 1 ? "" : "s"}
                    </small>
                  </span>
                  <EducationStatusPill
                    status={
                      record.duplicateAccess
                        ? "danger"
                        : record.accounts.length
                          ? "success"
                          : "attention"
                    }
                  >
                    {record.duplicateAccess
                      ? "Review"
                      : record.accounts.length
                        ? "Ready"
                        : "Setup"}
                  </EducationStatusPill>
                </button>
              ))
            )}
          </div>
        </aside>
        {!selected ? (
          <EducationState
            title="Select a family"
            description="Choose a family or care group to manage its learners and access."
          />
        ) : (
          <main className="edu-parent-v1__detail">
            <section className="edu-parent-v1__identity">
              <div className="edu-parent-v1__identity-main">
                <span className="edu-parent-v1__identity-avatar">
                  {selected.parentName.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <span>Family / care group</span>
                  <h2>{selected.parentName}</h2>
                  <p>
                    <Phone size={15} />
                    {selected.phone || "No phone recorded"} <Mail size={15} />
                    {selected.contactEmail || "No contact email recorded"}
                  </p>
                </div>
              </div>
              {can("students.edit") && (
                <EducationButton
                  variant="primary"
                  icon={Plus}
                  onClick={() => setAddOpen(true)}
                >
                  Add learner
                </EducationButton>
              )}
            </section>
            {selected.duplicateAccess && (
              <EducationNotice status="danger">
                This family candidate contains{" "}
                {selected.accounts.length || selected.recordedLogins.length}{" "}
                generated logins. The learners stay together here for review.
                Verify the caregiver, then create one new account below or
                transfer each learner to an exact account you choose to retain.
              </EducationNotice>
            )}
            <EducationTabs
              label="Family workspace"
              value={activeTab}
              onChange={(value) => setActiveTab(value as DetailTab)}
              items={[
                {
                  id: "learners",
                  label: "Learners",
                  icon: Users,
                  count: selected.students.length,
                },
                {
                  id: "access",
                  label: "Access",
                  icon: KeyRound,
                  count: selected.accounts.length,
                  status: selected.duplicateAccess
                    ? "attention"
                    : selected.accounts.length
                      ? "complete"
                      : "attention",
                },
                { id: "billing", label: "Billing", icon: CreditCard },
              ]}
            />
            {activeTab === "learners" && (
              <EducationSurface className="edu-parent-v1__panel">
                <div className="edu-parent-v1__panel-head">
                  <div>
                    <h3>Learners in this care group</h3>
                    <p>
                      Every relationship is added explicitly. A learner can keep
                      access for another parent or caregiver.
                    </p>
                  </div>
                  {can("students.edit") && (
                    <EducationButton
                      variant="primary"
                      icon={Plus}
                      onClick={() => setAddOpen(true)}
                    >
                      Add learner
                    </EducationButton>
                  )}
                </div>
                <div className="edu-parent-v1__learner-list">
                  {selected.students.map((student) => {
                    const primary = selected.accounts.find(
                      (a) => a.uid === student.parentLoginInfo?.uid,
                    );
                    const care = selected.accounts.filter((a) =>
                      student.parentUids?.includes(a.uid),
                    );
                    return (
                      <article
                        key={student.id}
                        className="edu-parent-v1__learner-row"
                      >
                        <span className="edu-parent-v1__learner-avatar">
                          {student.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <strong>{student.name}</strong>
                          <small>
                            {primary
                              ? `Primary: ${primary.email}`
                              : care.length
                                ? `Care access: ${care.map((a) => a.email).join(", ")}`
                                : "No generated parent login"}
                          </small>
                        </div>
                        <EducationButton
                          variant="quiet"
                          onClick={() =>
                            navigateTo("student-details", {
                              studentId: student.id,
                              studentTab: "Access",
                            })
                          }
                        >
                          {selected.duplicateAccess
                            ? "Resolve access"
                            : "Open profile"}
                        </EducationButton>
                      </article>
                    );
                  })}
                </div>
              </EducationSurface>
            )}
            {activeTab === "access" && (
              <div className="edu-parent-v1__access-grid">
                <EducationSurface className="edu-parent-v1__panel">
                  <div className="edu-parent-v1__panel-head">
                    <div>
                      <h3>Generated MakerLab logins</h3>
                      <p>
                        Contact emails are ignored for sign in. All new accounts
                        use a p.*@makerlab.academy ID.
                      </p>
                    </div>
                  </div>
                  {selected.accounts.length ? (
                    <div className="edu-parent-v1__account-list">
                      {selected.accounts.map((account) => (
                        <article
                          key={account.uid}
                          className="edu-parent-v1__account-card"
                          data-selected={targetUid === account.uid}
                        >
                          <button
                            type="button"
                            onClick={() => setTargetUid(account.uid)}
                            aria-pressed={targetUid === account.uid}
                          >
                            <ShieldCheck />
                            <span>
                              <strong>{account.email}</strong>
                              <small>
                                {account.parentName} · {account.children.length}{" "}
                                learner
                                {account.children.length === 1 ? "" : "s"}
                              </small>
                            </span>
                          </button>
                          <EducationButton
                            icon={KeyRound}
                            disabled={working || !relationshipVerified}
                            onClick={() => void resetPassword(account)}
                          >
                            New password
                          </EducationButton>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EducationState
                      title="No family login yet"
                      description="Verify the caregiver and create one generated MakerLab login for this group."
                    />
                  )}
                </EducationSurface>
                <EducationSurface className="edu-parent-v1__panel">
                  <div className="edu-parent-v1__panel-head">
                    <div>
                      <h3>
                        {selected.accounts.length
                          ? "Access verification"
                          : "Create family access"}
                      </h3>
                      <p>
                        Selecting a login never changes a recorded contact
                        email.
                      </p>
                    </div>
                  </div>
                  <div className="edu-parent-v1__form">
                    {(!selected.accounts.length || selected.duplicateAccess) && (
                      <>
                        <EducationField label="Verified caregiver name">
                          <input
                            value={parentName}
                            onChange={(e) => setParentName(e.target.value)}
                          />
                        </EducationField>
                        <EducationField
                          label="Login alias"
                          hint="Creates a generated p.*@makerlab.academy ID."
                        >
                          <input
                            value={aliasBasis}
                            onChange={(e) => setAliasBasis(e.target.value)}
                          />
                        </EducationField>
                      </>
                    )}
                    <label className="edu-parent-v1__verify">
                      <input
                        type="checkbox"
                        checked={relationshipVerified}
                        onChange={(e) =>
                          setRelationshipVerified(e.target.checked)
                        }
                      />
                      <span>
                        <strong>Relationship verified</strong>
                        <small>
                          I verified this caregiver’s identity and authority for
                          every learner affected by this action.
                        </small>
                      </span>
                    </label>
                    {!selected.accounts.length && (
                      <EducationButton
                        variant="primary"
                        icon={KeyRound}
                        disabled={
                          working ||
                          !relationshipVerified ||
                          !parentName.trim() ||
                          !aliasBasis.trim()
                        }
                        onClick={() =>
                          void runFamilyAction(
                            selected.baseStudentIds,
                            "issueFamily",
                          )
                        }
                      >
                        {working ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Creating…
                          </>
                        ) : (
                          `Create login for ${selected.baseStudentIds.length} learner${selected.baseStudentIds.length === 1 ? "" : "s"}`
                        )}
                      </EducationButton>
                    )}
                    {selected.duplicateAccess && (
                      <EducationButton
                        variant="primary"
                        icon={KeyRound}
                        disabled={working || !relationshipVerified || !parentName.trim() || !aliasBasis.trim() ||
                          selected.baseStudentIds.length < 2 ||
                          selected.baseStudentIds.some(id => !selected.students.find(student => student.id === id)?.parentLoginInfo?.uid)}
                        onClick={() => void runFamilyAction(selected.baseStudentIds, "replaceFamily")}
                      >
                        {working ? "Creating…" : `Create one new login for ${selected.baseStudentIds.length} learners`}
                      </EducationButton>
                    )}
                  </div>
                </EducationSurface>
              </div>
            )}
            {activeTab === "billing" && (
              <div className="edu-parent-v1__billing">
                <section>
                  <span>Agreed fees</span>
                  <strong>{formatCurrency(totals.expected)}</strong>
                </section>
                <section>
                  <span>Received</span>
                  <strong>{formatCurrency(totals.paid)}</strong>
                </section>
                <section data-attention={totals.balance > 0}>
                  <span>Balance</span>
                  <strong>{formatCurrency(totals.balance)}</strong>
                </section>
                <EducationSurface className="edu-parent-v1__billing-actions">
                  <div>
                    <h3>Family billing</h3>
                    <p>
                      Use Finance for payment editing and the family statement
                      for sharing.
                    </p>
                  </div>
                  <div>
                    <EducationButton
                      icon={CreditCard}
                      onClick={() => navigateTo("finance")}
                    >
                      Open Finance
                    </EducationButton>
                    <EducationButton
                      icon={FileDown}
                      disabled={!statementData}
                      onClick={() =>
                        statementData &&
                        generateParentStatementPrint(
                          statementData,
                          settings,
                          programs,
                        )
                      }
                    >
                      Print statement
                    </EducationButton>
                  </div>
                </EducationSurface>
              </div>
            )}
          </main>
        )}
      </div>
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title={`Add learner to ${selected?.parentName || "care group"}`}
        size="lg"
        designSystem
      >
        {selected && (
          <div className="edu-parent-v1__add-dialog">
            <EducationNotice status="info">
              Choose any active learner in this workspace. Surname, phone and
              biological relationship are not used as proof; staff verification
              is required. To replace separate old logins with one new account,
              select the sibling below and use the replacement action.
            </EducationNotice>
            {selected.accounts.length > 0 && (
              <EducationField
                label="Caregiver login"
                hint={
                  selected.accounts.length > 1
                    ? "Choose the verified login that will receive access."
                    : "This generated login will receive access."
                }
              >
                <select
                  value={targetUid}
                  onChange={(e) => setTargetUid(e.target.value)}
                >
                  <option value="">Select a generated login</option>
                  {selected.accounts.map((account) => (
                    <option key={account.uid} value={account.uid}>
                      {account.parentName} — {account.email}
                    </option>
                  ))}
                </select>
              </EducationField>
            )}
            {!selected.accounts.length && (
              <div className="edu-parent-v1__dialog-grid">
                <EducationField label="Verified caregiver name">
                  <input
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                  />
                </EducationField>
                <EducationField label="Login alias">
                  <input
                    value={aliasBasis}
                    onChange={(e) => setAliasBasis(e.target.value)}
                  />
                </EducationField>
              </div>
            )}
            {selected.accounts.length > 0 && (
              <div className="edu-parent-v1__dialog-grid">
                <EducationField label="New verified caregiver name">
                  <input value={parentName} onChange={(e) => setParentName(e.target.value)} />
                </EducationField>
                <EducationField label="New login alias" hint="Used only when replacing old logins with one new account.">
                  <input value={aliasBasis} onChange={(e) => setAliasBasis(e.target.value)} />
                </EducationField>
              </div>
            )}
            <div className="edu-parent-v1__search">
              <Search size={18} />
              <input
                value={learnerSearch}
                onChange={(e) => setLearnerSearch(e.target.value)}
                placeholder="Search all active learners"
                aria-label="Search learners to add"
              />
            </div>
            <div className="edu-parent-v1__picker">
              {availableStudents.length ? (
                availableStudents.map((student) => (
                  <label
                    key={student.id}
                    data-selected={pendingStudentIds.includes(student.id)}
                  >
                    <input
                      type="checkbox"
                      checked={pendingStudentIds.includes(student.id)}
                      onChange={(e) =>
                        setPendingStudentIds((ids) =>
                          e.target.checked
                            ? [...ids, student.id]
                            : ids.filter((id) => id !== student.id),
                        )
                      }
                    />
                    <span>
                      <strong>{student.name}</strong>
                      <small>
                        {student.parentName || "No parent contact name"} ·{" "}
                        {student.parentLoginInfo?.email
                          ? "already has a primary family login"
                          : "no primary family login"}
                      </small>
                    </span>
                  </label>
                ))
              ) : (
                <EducationState
                  title="No learners to add"
                  description="All matching active learners are already shown in this group."
                />
              )}
            </div>
            <label className="edu-parent-v1__verify">
              <input
                type="checkbox"
                checked={relationshipVerified}
                onChange={(e) => setRelationshipVerified(e.target.checked)}
              />
              <span>
                <strong>Relationship verified</strong>
                <small>
                  I verified this caregiver’s identity and authority for each
                  selected learner.
                </small>
              </span>
            </label>
            <div className="edu-parent-v1__dialog-actions">
              <EducationButton onClick={() => setAddOpen(false)}>
                Cancel
              </EducationButton>
              <EducationButton
                variant="primary"
                icon={selected.accounts.length ? Link2 : KeyRound}
                disabled={
                  working ||
                  !relationshipVerified ||
                  !pendingStudentIds.length ||
                  (selected.accounts.length
                    ? !targetUid
                    : !parentName.trim() || !aliasBasis.trim())
                }
                onClick={() =>
                  void runFamilyAction(
                    selected.accounts.length
                      ? pendingStudentIds
                      : unique([
                          ...selected.baseStudentIds,
                          ...pendingStudentIds,
                        ]),
                    selected.accounts.length ? "linkFamily" : "issueFamily",
                  )
                }
              >
                {working ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  selected.accounts.length
                    ? `Add this caregiver to ${pendingStudentIds.length} learner${pendingStudentIds.length === 1 ? "" : "s"}`
                    : `Add ${pendingStudentIds.length || ""} learner${pendingStudentIds.length === 1 ? "" : "s"}`
                )}
              </EducationButton>
              {selected.accounts.length > 0 && canReplaceSelectedLogins && (
                <EducationButton
                  variant="primary"
                  icon={KeyRound}
                  disabled={working || !relationshipVerified || !parentName.trim() || !aliasBasis.trim()}
                  onClick={() => void runFamilyAction(replacementStudentIds, "replaceFamily")}
                >
                  Replace {replacementStudentIds.length} old logins with one new account
                </EducationButton>
              )}
            </div>
          </div>
        )}
      </Modal>
      <Modal
        isOpen={Boolean(credentials)}
        onClose={() => setCredentials(null)}
        title="One-time parent credentials"
        designSystem
      >
        {credentials && (
          <div className="edu-parent-v1__credentials">
            <EducationNotice status={credentials.retirementIncomplete ? "danger" : "success"}>
              {credentials.retirementIncomplete
                ? "An old login could not be deleted. Ask an administrator to review it before sharing this new password."
                : <>One generated login now covers {credentials.count} learner{credentials.count === 1 ? "" : "s"}. Share the password securely; Edufy does not store it.</>}
            </EducationNotice>
            <div>
              <span>Sign-in ID</span>
              <strong>{credentials.email}</strong>
            </div>
            <div>
              <span>Temporary password</span>
              <strong>{credentials.password}</strong>
            </div>
            <EducationButton
              variant="primary"
              icon={Copy}
              disabled={credentials.retirementIncomplete}
              onClick={() =>
                void navigator.clipboard.writeText(
                  `MakerLab login: ${credentials.email}\nTemporary password: ${credentials.password}`,
                )
              }
            >
              Copy credentials
            </EducationButton>
          </div>
        )}
      </Modal>
    </div>
  );
};
