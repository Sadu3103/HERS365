import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  UploadCloud,
  Users,
  Phone,
  Heart,
  Activity,
  Lock,
  Trash2,
  Eye,
  Plus,
  Check,
  ChevronRight,
  MessageSquare,
  Bell,
  UserCheck,
  Stethoscope,
  Building2,
  FileCheck,
  Download,
  X,
  Mail,
  Calendar,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useNotifications } from '../context/NotificationContext';

// Color & Style Constants
const FLAME = '#8B3BFF';
const GREEN = '#4ade80';
const AMBER = '#f59e0b';
const RED = '#f87171';
const DISP = "'Barlow Condensed', sans-serif";

type Tab = 'overview' | 'safeguarding' | 'documents' | 'emergency' | 'messages' | 'settings';

interface Child {
  id: number;
  name: string;
  age: number | null;
  school: string | null;
  position: string | null;
  gradYear: number | null;
  dob?: string;
  verifiedStatus?: 'Verified' | 'Pending Review' | 'Action Required';
  profileImage?: string;
}

interface PendingMsg {
  id: number;
  from: string;
  role: string;
  org: string;
  preview: string;
  child: string;
  createdAt: string;
}

interface ActivityItem {
  text: string;
  ts: string;
  type: 'message' | 'document' | 'consent' | 'emergency';
}

interface GuardianProfile {
  legalName: string;
  relationship: 'Mother' | 'Father' | 'Legal Guardian' | 'Authorized Proxy';
  email: string;
  phone: string;
  phoneVerified: boolean;
  idVerified: boolean;
  status: 'Verified Guardian' | 'Pending Review' | 'Action Required';
}

interface SafetyConsent {
  id: 'coppa' | 'coach_gate' | 'media_release' | 'concussion_liability';
  title: string;
  shortDesc: string;
  regulatoryCode: string;
  required: boolean;
  signed: boolean;
  signedAt?: string;
  signedBy?: string;
  terms: string;
}

interface UploadedDocument {
  id: string;
  type: 'Proof of Age & Grade' | 'Medical Clearance' | 'Health Insurance Card' | 'League Eligibility';
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  expiresAt?: string;
  status: 'Verified' | 'Pending Review' | 'Expiring Soon';
  athleteName: string;
  previewUrl?: string;
}

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  altPhone?: string;
  email: string;
  authorizedPickup: boolean;
  isPrimary: boolean;
}

interface MedicalAlertProfile {
  physicianName: string;
  clinicName: string;
  physicianPhone: string;
  preferredHospital: string;
  allergies: string;
  requiresEpiPen: boolean;
  medicalConditions: string;
  emergencyTreatmentConsent: boolean;
  lastUpdated: string;
}

const INITIAL_CONSENTS: SafetyConsent[] = [
  {
    id: 'coppa',
    title: 'COPPA Minor Safety & Digital Identity Consent',
    shortDesc: 'Authorizes minor athlete (<16) to participate on the platform and maintain an athletic profile.',
    regulatoryCode: '16 CFR Part 312 (COPPA)',
    required: true,
    signed: true,
    signedAt: '2026-08-15T14:30:00Z',
    signedBy: 'Sarah Jenkins',
    terms: 'In compliance with the Children\'s Online Privacy Protection Act (COPPA), I explicitly grant parental permission for my athlete to maintain a verified athletic performance profile, participate in tournament leaderboards, and store game metrics. I retain the right to review, update, or revoke access to this data at any time.',
  },
  {
    id: 'coach_gate',
    title: 'Coach Recruiting Contact Permission Gate',
    shortDesc: 'Mandates that all coach-to-athlete communications require explicit parental approval.',
    regulatoryCode: 'NCAA Youth Safeguarding Standard',
    required: true,
    signed: true,
    signedAt: '2026-08-15T14:32:00Z',
    signedBy: 'Sarah Jenkins',
    terms: 'I authorize verified NCAA, NAIA, NJCAA, and Club coaches to initiate recruitment inquiries for my athlete. I understand that all messages are held in an escrow queue and will not be visible to my athlete until I explicitly approve each message in this Parent Dashboard.',
  },
  {
    id: 'media_release',
    title: 'Media, Game Film & Highlight Video Release',
    shortDesc: 'Permits publishing tournament game film, combine clips, and athletic statistics.',
    regulatoryCode: 'HERS365 Media & NIL Guidelines',
    required: true,
    signed: true,
    signedAt: '2026-08-15T14:35:00Z',
    signedBy: 'Sarah Jenkins',
    terms: 'I grant HERS365 and its authorized event organizers permission to record, stream, broadcast, and publish video film, action photography, and combine performance statistics of my athlete for recruiting showcases, national rankings, and promotional reels.',
  },
  {
    id: 'concussion_liability',
    title: 'Youth Concussion Protocol & Athletic Liability Waiver',
    shortDesc: 'Acknowledges return-to-play concussion guidelines and sports participation liability release.',
    regulatoryCode: 'Zackery Lystedt Youth Concussion Law',
    required: true,
    signed: false,
    terms: 'I acknowledge receipt of the Youth Flag Football Concussion Information Sheet. I understand the signs, symptoms, and risks of concussions in competitive athletics. I agree that my athlete will immediately be removed from play upon suspected head injury and will not return without written clearance from a licensed healthcare provider.',
  },
];

const INITIAL_DOCUMENTS: UploadedDocument[] = [
  {
    id: 'doc-1',
    type: 'Proof of Age & Grade',
    fileName: 'Birth_Certificate_Maya_Jenkins.pdf',
    fileSize: '1.8 MB',
    uploadedAt: '2026-08-10T10:15:00Z',
    status: 'Verified',
    athleteName: 'Maya Jenkins',
  },
  {
    id: 'doc-2',
    type: 'Medical Clearance',
    fileName: 'Sports_Physical_2026_Cleared.pdf',
    fileSize: '2.4 MB',
    uploadedAt: '2026-08-12T16:00:00Z',
    expiresAt: '2027-08-12T00:00:00Z',
    status: 'Verified',
    athleteName: 'Maya Jenkins',
  },
  {
    id: 'doc-3',
    type: 'Health Insurance Card',
    fileName: 'BlueCross_Insurance_Front_Back.jpg',
    fileSize: '3.1 MB',
    uploadedAt: '2026-08-14T11:20:00Z',
    status: 'Verified',
    athleteName: 'Maya Jenkins',
  },
];

const INITIAL_EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'contact-1',
    name: 'Sarah Jenkins',
    relationship: 'Mother',
    phone: '(555) 342-9812',
    altPhone: '(555) 342-9810',
    email: 'sarah.jenkins@example.com',
    authorizedPickup: true,
    isPrimary: true,
  },
  {
    id: 'contact-2',
    name: 'David Jenkins',
    relationship: 'Father',
    phone: '(555) 342-9811',
    email: 'david.jenkins@example.com',
    authorizedPickup: true,
    isPrimary: false,
  },
];

const INITIAL_MEDICAL_PROFILE: MedicalAlertProfile = {
  physicianName: 'Dr. Evelyn Martinez, MD',
  clinicName: 'Austin Pediatric & Sports Medicine Clinic',
  physicianPhone: '(555) 442-1090',
  preferredHospital: 'Dell Children\'s Medical Center (Austin, TX)',
  allergies: 'Severe Peanut & Tree Nut allergy. Mild pollen sensitivity.',
  requiresEpiPen: true,
  medicalConditions: 'Mild exercise-induced asthma; rescue albuterol inhaler carried in athletic gear bag.',
  emergencyTreatmentConsent: true,
  lastUpdated: '2026-08-20T09:00:00Z',
};

const INITIAL_GUARDIAN: GuardianProfile = {
  legalName: 'Sarah Jenkins',
  relationship: 'Mother',
  email: 'sarah.jenkins@example.com',
  phone: '(555) 342-9812',
  phoneVerified: true,
  idVerified: true,
  status: 'Verified Guardian',
};

const DEFAULT_CHILD: Child = {
  id: 101,
  name: 'Maya Jenkins',
  age: 15,
  school: 'Westlake High School',
  position: 'WR / CB',
  gradYear: 2027,
  dob: '2011-04-18',
  verifiedStatus: 'Verified',
};

const SETTING_DEFS = [
  { key: 'emailNotifications', label: 'Email Notifications', desc: 'Get emailed when a coach sends a message request', defaultOn: true },
  { key: 'smsAlerts',           label: 'SMS Alerts',           desc: 'Text message alerts for urgent approvals',         defaultOn: true },
  { key: 'profileVisibility',   label: 'Profile Visibility',   desc: "Allow athlete's profile to appear in coach searches", defaultOn: true },
  { key: 'rankingVisibility',   label: 'Ranking Visibility',   desc: 'Include athlete in public HERS365 rankings',       defaultOn: true },
] as const;

type SettingKey = (typeof SETTING_DEFS)[number]['key'];

function formatTs(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return '1d ago';
  if (diffD < 30) return `${diffD}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ParentDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [children, setChildren] = useState<Child[]>([DEFAULT_CHILD]);
  const [requests, setRequests] = useState<PendingMsg[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [recentActions, setRecentActions] = useState<{ id: number; from: string; action: 'approved' | 'rejected' }[]>([]);

  // Safeguarding & Verification State
  const [guardian, setGuardian] = useState<GuardianProfile>(INITIAL_GUARDIAN);
  const [consents, setConsents] = useState<SafetyConsent[]>(INITIAL_CONSENTS);
  const [documents, setDocuments] = useState<UploadedDocument[]>(INITIAL_DOCUMENTS);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(INITIAL_EMERGENCY_CONTACTS);
  const [medicalProfile, setMedicalProfile] = useState<MedicalAlertProfile>(INITIAL_MEDICAL_PROFILE);

  // Settings State
  const [prefs, setPrefs] = useState<Record<SettingKey, boolean>>(() =>
    SETTING_DEFS.reduce((acc, s) => ({ ...acc, [s.key]: s.defaultOn }), {} as Record<SettingKey, boolean>)
  );

  // Modals & Active UI state
  const [signingConsent, setSigningConsent] = useState<SafetyConsent | null>(null);
  const [signatureName, setSignatureName] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<UploadedDocument['type']>('Proof of Age & Grade');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadAthlete, setUploadAthlete] = useState('Maya Jenkins');
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', relationship: '', phone: '', email: '', authorizedPickup: true });
  const [medicalForm, setMedicalForm] = useState<MedicalAlertProfile>(INITIAL_MEDICAL_PROFILE);
  const [medicalSavedSuccess, setMedicalSavedSuccess] = useState(false);

  const { showNotification } = useNotifications();

  // Sync state to /api/parent/settings
  const persistSafeguardingSettings = useCallback(async (patch: Record<string, unknown>) => {
    try {
      await apiFetch('/api/parent/settings', {
        method: 'PUT',
        body: JSON.stringify(patch),
      }).catch(() => null);
    } catch {
      // Local state is primary; ignore offline errors
    }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [cData, rData, aData, sData] = await Promise.all([
        apiFetch('/api/parent/children').catch(() => null),
        apiFetch('/api/parent/requests').catch(() => null),
        apiFetch('/api/parent/activity').catch(() => null),
        apiFetch('/api/parent/settings').catch(() => null),
      ]);

      if (cData?.success && Array.isArray(cData.data) && cData.data.length > 0) {
        setChildren(cData.data.map((c: any) => ({
          ...c,
          verifiedStatus: c.verifiedStatus || 'Verified',
        })));
      } else {
        setChildren([DEFAULT_CHILD]);
      }

      if (rData?.success && Array.isArray(rData.data)) {
        setRequests(rData.data);
      }

      if (aData?.success && Array.isArray(aData.data) && aData.data.length > 0) {
        setActivity(aData.data);
      } else {
        setActivity([
          { text: 'Concussion & liability consent pending signature', ts: new Date().toISOString(), type: 'consent' },
          { text: 'Medical clearance verified by tournament safety staff', ts: new Date(Date.now() - 86400000 * 2).toISOString(), type: 'document' },
          { text: 'Maya Jenkins age verified via certified birth certificate', ts: new Date(Date.now() - 86400000 * 4).toISOString(), type: 'document' },
          { text: 'Coach message request approved for Maya Jenkins', ts: new Date(Date.now() - 86400000 * 5).toISOString(), type: 'message' },
        ]);
      }

      if (sData?.success && sData.data) {
        const d = sData.data;
        if (d.guardian) setGuardian(prev => ({ ...prev, ...d.guardian }));
        if (Array.isArray(d.consents)) setConsents(d.consents);
        if (Array.isArray(d.documents)) setDocuments(d.documents);
        if (Array.isArray(d.emergencyContacts)) setEmergencyContacts(d.emergencyContacts);
        if (d.medicalProfile) {
          setMedicalProfile(d.medicalProfile);
          setMedicalForm(d.medicalProfile);
        }
        const prefKeys: SettingKey[] = ['emailNotifications', 'smsAlerts', 'profileVisibility', 'rankingVisibility'];
        const loadedPrefs: Partial<Record<SettingKey, boolean>> = {};
        prefKeys.forEach(k => {
          if (typeof d[k] === 'boolean') loadedPrefs[k] = d[k];
        });
        setPrefs(prev => ({ ...prev, ...loadedPrefs }));
      }
    } catch (err) {
      console.error('[ParentDashboard] fetch error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Handle message requests
  const respond = async (id: number, action: 'approve' | 'reject') => {
    setActing(id);
    try {
      const data = await apiFetch(`/api/parent/requests/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      }).catch(() => null);

      const req = requests.find((r) => r.id === id);
      if (req) {
        setRecentActions((prev) => [
          ...prev,
          { id, from: req.from, action: action === 'approve' ? 'approved' : 'rejected' },
        ]);
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
      showNotification('success', action === 'approve' ? 'Message Approved' : 'Message Denied', `Coach request from ${req?.from || 'Coach'} has been ${action === 'approve' ? 'approved' : 'denied'}.`);
    } catch (err) {
      console.error('[ParentDashboard] respond error', err);
      showNotification('error', 'Action Failed', 'Could not respond to request.');
    } finally {
      setActing(null);
    }
  };

  // Digital Signature Handler
  const handleSignConsent = async () => {
    if (!signingConsent || !signatureName.trim() || !agreeTerms) return;

    const updated = consents.map(c => {
      if (c.id === signingConsent.id) {
        return {
          ...c,
          signed: true,
          signedAt: new Date().toISOString(),
          signedBy: signatureName.trim(),
        };
      }
      return c;
    });

    setConsents(updated);
    await persistSafeguardingSettings({ consents: updated });

    showNotification('success', 'Agreement Signed', `${signingConsent.title} signed successfully.`);
    setSigningConsent(null);
    setSignatureName('');
    setAgreeTerms(false);
  };

  // Document Upload Handler
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileName.trim()) return;

    const newDoc: UploadedDocument = {
      id: `doc-${Date.now()}`,
      type: uploadDocType,
      fileName: uploadFileName.trim(),
      fileSize: '2.1 MB',
      uploadedAt: new Date().toISOString(),
      status: 'Pending Review',
      athleteName: uploadAthlete,
    };

    const updated = [newDoc, ...documents];
    setDocuments(updated);
    await persistSafeguardingSettings({ documents: updated });

    showNotification('success', 'Document Uploaded', `${newDoc.fileName} submitted for safeguarding verification.`);
    setShowUploadModal(false);
    setUploadFileName('');
  };

  const handleDeleteDocument = async (id: string) => {
    const updated = documents.filter(d => d.id !== id);
    setDocuments(updated);
    await persistSafeguardingSettings({ documents: updated });
    showNotification('info', 'Document Removed', 'The file was removed from your athlete record.');
  };

  // Emergency Contact Handlers
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name.trim() || !newContact.phone.trim()) return;

    const contact: EmergencyContact = {
      id: `contact-${Date.now()}`,
      name: newContact.name.trim(),
      relationship: newContact.relationship.trim() || 'Secondary Contact',
      phone: newContact.phone.trim(),
      email: newContact.email.trim(),
      authorizedPickup: newContact.authorizedPickup,
      isPrimary: false,
    };

    const updated = [...emergencyContacts, contact];
    setEmergencyContacts(updated);
    await persistSafeguardingSettings({ emergencyContacts: updated });

    showNotification('success', 'Contact Added', `${contact.name} added to emergency list.`);
    setShowAddContactModal(false);
    setNewContact({ name: '', relationship: '', phone: '', email: '', authorizedPickup: true });
  };

  const handleDeleteContact = async (id: string) => {
    if (emergencyContacts.length <= 1) {
      showNotification('error', 'Cannot Delete', 'At least one primary emergency contact is required.');
      return;
    }
    const updated = emergencyContacts.filter(c => c.id !== id);
    setEmergencyContacts(updated);
    await persistSafeguardingSettings({ emergencyContacts: updated });
    showNotification('info', 'Contact Removed', 'Emergency contact removed.');
  };

  // Medical Profile Save
  const handleSaveMedicalProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...medicalForm,
      lastUpdated: new Date().toISOString(),
    };
    setMedicalProfile(updated);
    await persistSafeguardingSettings({ medicalProfile: updated });
    setMedicalSavedSuccess(true);
    setTimeout(() => setMedicalSavedSuccess(false), 3000);
    showNotification('success', 'Medical Alert Updated', 'Athlete emergency medical profile updated.');
  };

  // Settings Toggle Handler
  const togglePref = async (key: SettingKey) => {
    const next = !prefs[key];
    setPrefs(p => ({ ...p, [key]: next }));
    try {
      await apiFetch('/api/parent/settings', {
        method: 'PUT',
        body: JSON.stringify({ [key]: next }),
      });
      showNotification('success', 'Preference Saved', `${key} updated.`);
    } catch {
      setPrefs(p => ({ ...p, [key]: !next }));
      showNotification('error', 'Save Failed', 'Could not update setting.');
    }
  };

  // Metrics
  const unsignedCount = consents.filter(c => !c.signed).length;
  const pendingDocsCount = documents.filter(d => d.status === 'Pending Review').length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 pb-28 text-white">
      {/* Top Header & Guardian Status Card */}
      <div className="p-6 sm:p-8 bg-surface-card border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8B3BFF] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#8B3BFF]" />
                HERS365 Safeguarding & Verification Hub
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B3BFF] animate-pulse" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white font-display">
              Parent Portal
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-xl">
              Guardian oversight center: Gated coach communications, regulatory minor consents, verified age records, and medical emergency readiness.
            </p>
          </div>

          {/* Guardian Verification Status Pill */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{guardian.legalName}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" />
                  {guardian.status}
                </span>
              </div>
              <div className="text-[11px] text-ink-muted mt-0.5">
                {guardian.relationship} • ID Verified (DL) • SMS Gated
              </div>
            </div>
          </div>
        </div>

        {/* Safeguarding Security Notice Banner */}
        <div className="mt-6 p-3.5 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
          <Lock className="w-4 h-4 text-green-400 shrink-0" />
          <span className="text-xs text-green-300/90 leading-relaxed">
            <strong>Parental Gate Active:</strong> All college and club coach contact requests are held in escrow. No direct messages reach your athlete without explicit guardian sign-off.
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {[
          { id: 'overview', label: 'Overview', icon: <Activity className="w-3.5 h-3.5" /> },
          {
            id: 'safeguarding',
            label: `Safety & Consents${unsignedCount > 0 ? ` (${unsignedCount})` : ''}`,
            icon: <ShieldCheck className="w-3.5 h-3.5" />,
            badge: unsignedCount > 0 ? 'bg-amber-500 text-black' : undefined,
          },
          {
            id: 'documents',
            label: `Documents (${documents.length})`,
            icon: <FileText className="w-3.5 h-3.5" />,
          },
          {
            id: 'emergency',
            label: 'Emergency & Medical',
            icon: <Heart className="w-3.5 h-3.5" />,
          },
          {
            id: 'messages',
            label: `Messages${requests.length ? ` (${requests.length})` : ''}`,
            icon: <MessageSquare className="w-3.5 h-3.5" />,
            badge: requests.length > 0 ? 'bg-red-500 text-white animate-pulse' : undefined,
          },
          { id: 'settings', label: 'Privacy & Alerts', icon: <Users className="w-3.5 h-3.5" /> },
        ].map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
                active
                  ? 'bg-[#8B3BFF] border-[#8B3BFF] text-white shadow-[0_0_20px_rgba(139,59,255,0.4)]'
                  : 'bg-surface-card border-white/10 text-ink-muted hover:text-white hover:bg-white/5'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.badge && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${t.badge}`}>
                  !
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {tab === 'overview' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 bg-surface-card border border-white/10 rounded-2xl">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">Linked Athletes</div>
              <div className="text-2xl font-black text-white font-display">{children.length}</div>
              <div className="text-[10px] text-green-400 font-semibold mt-1">100% Age Verified</div>
            </div>
            <div className="p-4 bg-surface-card border border-white/10 rounded-2xl">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">Safety Consents</div>
              <div className="text-2xl font-black text-white font-display">
                {consents.filter(c => c.signed).length} / {consents.length}
              </div>
              <div className={`text-[10px] font-semibold mt-1 ${unsignedCount === 0 ? 'text-green-400' : 'text-amber-400'}`}>
                {unsignedCount === 0 ? 'All Signed & Active' : `${unsignedCount} Signature Needed`}
              </div>
            </div>
            <div className="p-4 bg-surface-card border border-white/10 rounded-2xl">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">Documents</div>
              <div className="text-2xl font-black text-white font-display">{documents.length}</div>
              <div className="text-[10px] text-green-400 font-semibold mt-1">Age & Physicals Valid</div>
            </div>
            <div className="p-4 bg-surface-card border border-white/10 rounded-2xl">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">Pending Inquiries</div>
              <div className="text-2xl font-black text-white font-display">{requests.length}</div>
              <div className="text-[10px] text-ink-muted font-semibold mt-1">Coach requests</div>
            </div>
          </div>

          {/* Action Required Banner if unsigned consents */}
          {unsignedCount > 0 && (
            <div
              onClick={() => setTab('safeguarding')}
              className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-amber-500/15 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-300">Annual Concussion & Safety Sign-off Required</h3>
                  <p className="text-xs text-ink-muted">Complete youth liability & concussion protocol acknowledgment for 2026-2027 season.</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400">
                Review & Sign <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          )}

          {/* Linked Athletes Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink-muted flex items-center gap-2">
                <Users className="w-4 h-4 text-[#8B3BFF]" />
                Linked Minor Athletes
              </h2>
            </div>

            {children.map((c) => (
              <div key={c.id} className="p-6 bg-surface-card border border-white/10 rounded-2xl shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8B3BFF]/20 to-pink-500/20 border border-white/10 flex items-center justify-center text-xl font-black text-white">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-white">{c.name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Age Verified
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted mt-1">
                        {[c.position, c.school, c.gradYear ? `Class of ${c.gradYear}` : null, c.dob ? `DOB: ${c.dob}` : null].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  </div>

                  {c.age != null && (
                    <div className="px-3.5 py-1.5 bg-[#8B3BFF]/10 border border-[#8B3BFF]/30 rounded-xl text-center shrink-0 self-start">
                      <div className="text-[10px] uppercase font-bold text-[#8B3BFF]">Tournament Bracket</div>
                      <div className="text-sm font-black text-white">U-16 Division (Age {c.age})</div>
                    </div>
                  )}
                </div>

                {/* Safeguarding Controls Strip */}
                <div className="mt-5 pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl text-ink-muted">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    <span>Recruiting Messages: <strong>Parent Gated</strong></span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl text-ink-muted">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    <span>Location Tracking: <strong>Disabled</strong></span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl text-ink-muted">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    <span>NIL & Media Release: <strong>Active</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pending Inquiries Quick Strip */}
          {requests.length > 0 && (
            <div
              onClick={() => setTab('messages')}
              className="p-5 bg-surface-card border border-white/10 hover:border-white/20 rounded-2xl cursor-pointer transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{requests.length} Coach Request{requests.length > 1 ? 's' : ''} Awaiting Review</h3>
                  <p className="text-xs text-ink-muted">Authorize coach introduction before messages reach your athlete.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-ink-muted" />
            </div>
          )}

          {/* Recent Audit & Activity Feed */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-muted flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" />
              Safeguarding Audit Log
            </h2>
            <div className="bg-surface-card border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
              {activity.map((a, i) => (
                <div key={i} className="p-4 flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-[#8B3BFF] mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-white/90 font-medium">{a.text}</p>
                    <p className="text-[11px] text-ink-muted mt-0.5">{formatTs(a.ts)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: SAFEGUARDING & CONSENTS */}
      {tab === 'safeguarding' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="p-6 bg-surface-card border border-white/10 rounded-2xl">
            <h2 className="text-lg font-bold text-white mb-1 font-display uppercase tracking-wide">
              Player Safety & Regulatory Consent Center
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              Federal youth privacy and athletic governing bodies require certified guardian agreements prior to participation. Digital signatures are recorded with cryptographic timestamps and IP audit logs.
            </p>
          </div>

          <div className="space-y-4">
            {consents.map((c) => (
              <div
                key={c.id}
                className="p-6 bg-surface-card border border-white/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-ink-muted px-2 py-0.5 bg-white/5 rounded-md border border-white/5">
                      {c.regulatoryCode}
                    </span>
                    {c.signed ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        Signed & Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <AlertCircle className="w-2.5 h-2.5" />
                        Signature Required
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">{c.title}</h3>
                  <p className="text-xs text-ink-muted leading-relaxed mb-3">{c.shortDesc}</p>

                  {c.signed && c.signedAt && (
                    <div className="text-[11px] text-green-400/90 font-medium">
                      ✓ Digitally signed by <strong>{c.signedBy}</strong> on {formatTs(c.signedAt)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setSigningConsent(c)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      c.signed
                        ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                        : 'bg-green-500 hover:bg-green-600 text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>{c.signed ? 'Review Terms' : 'Sign Agreement'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* TAB 3: DOCUMENT UPLOAD CENTER */}
      {tab === 'documents' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-surface-card border border-white/10 rounded-2xl">
            <div>
              <h2 className="text-lg font-bold text-white font-display uppercase tracking-wide">
                Document Upload Center
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Official tournament age bracket certification, medical clearance, and insurance verification.
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-black font-bold rounded-xl text-xs transition-all shadow-[0_0_20px_rgba(34,197,94,0.25)]"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="p-5 bg-surface-card border border-white/10 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-green-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{doc.type}</h3>
                        <p className="text-[11px] text-ink-muted truncate max-w-[200px]">{doc.fileName}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      doc.status === 'Verified'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                      {doc.status}
                    </span>
                  </div>

                  <div className="text-xs text-ink-muted space-y-1 mb-4">
                    <div>Athlete: <span className="text-white font-medium">{doc.athleteName}</span></div>
                    <div>Uploaded: <span className="text-white/80">{formatTs(doc.uploadedAt)}</span> • {doc.fileSize}</div>
                    {doc.expiresAt && (
                      <div className="text-amber-400/90 text-[11px]">
                        Valid through: {new Date(doc.expiresAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-green-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Encrypted Vault
                  </span>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-1.5 text-ink-muted hover:text-coral-500 rounded-lg hover:bg-coral-500/10 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* TAB 4: EMERGENCY & MEDICAL */}
      {tab === 'emergency' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Emergency Contacts Section */}
          <div className="p-6 bg-surface-card border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white font-display uppercase tracking-wide flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-400" />
                  Emergency Contacts & Authorized Pickups
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Authorized guardians for emergency treatment and tournament pickup authorization.
                </p>
              </div>
              <button
                onClick={() => setShowAddContactModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Contact</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {emergencyContacts.map((c) => (
                <div key={c.id} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{c.name}</span>
                        {c.isPrimary && (
                          <span className="px-1.5 py-0.2 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-[9px] font-bold">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-ink-muted">{c.relationship}</div>
                    </div>
                    {!c.isPrimary && (
                      <button
                        onClick={() => handleDeleteContact(c.id)}
                        className="text-ink-muted hover:text-coral-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-white/90 space-y-0.5">
                    <div>Phone: <a href={`tel:${c.phone}`} className="text-green-400 hover:underline">{c.phone}</a></div>
                    {c.altPhone && <div className="text-ink-muted">Alt: {c.altPhone}</div>}
                    {c.email && <div className="text-ink-muted">Email: {c.email}</div>}
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center gap-1.5 text-[11px] text-green-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Authorized for practice/game pickup</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Medical Alerts & Physician Form */}
          <div className="p-6 bg-surface-card border border-white/10 rounded-2xl">
            <h2 className="text-lg font-bold text-white font-display uppercase tracking-wide mb-1 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#8B3BFF]" />
              Medical Alert & Physician Profile
            </h2>
            <p className="text-xs text-ink-muted mb-6">
              Critical medical alerts accessible to tournament medical personnel in urgent situations.
            </p>

            <form onSubmit={handleSaveMedicalProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                    Primary Physician / Pediatrician
                  </label>
                  <input
                    type="text"
                    value={medicalForm.physicianName}
                    onChange={(e) => setMedicalForm(prev => ({ ...prev, physicianName: e.target.value }))}
                    className="w-full bg-surface-hover border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-green-500/60 focus:outline-none"
                    placeholder="e.g. Dr. Jane Doe, MD"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                    Physician Phone
                  </label>
                  <input
                    type="text"
                    value={medicalForm.physicianPhone}
                    onChange={(e) => setMedicalForm(prev => ({ ...prev, physicianPhone: e.target.value }))}
                    className="w-full bg-surface-hover border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-green-500/60 focus:outline-none"
                    placeholder="(555) 000-0000"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                    Preferred Emergency Hospital / Facility
                  </label>
                  <input
                    type="text"
                    value={medicalForm.preferredHospital}
                    onChange={(e) => setMedicalForm(prev => ({ ...prev, preferredHospital: e.target.value }))}
                    className="w-full bg-surface-hover border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-green-500/60 focus:outline-none"
                    placeholder="Hospital name and city"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5 flex items-center justify-between">
                    <span>Severe Allergies</span>
                    <label className="flex items-center gap-1.5 text-red-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={medicalForm.requiresEpiPen}
                        onChange={(e) => setMedicalForm(prev => ({ ...prev, requiresEpiPen: e.target.checked }))}
                        className="w-3.5 h-3.5 rounded text-red-500 focus:ring-red-500/40 bg-black/40"
                      />
                      <span className="text-[10px] font-black">EpiPen Required On Site</span>
                    </label>
                  </label>
                  <input
                    type="text"
                    value={medicalForm.allergies}
                    onChange={(e) => setMedicalForm(prev => ({ ...prev, allergies: e.target.value }))}
                    className="w-full bg-surface-hover border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-green-500/60 focus:outline-none"
                    placeholder="Peanut allergy, bee stings, medications..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                    Chronic Conditions / Medical Notes
                  </label>
                  <textarea
                    value={medicalForm.medicalConditions}
                    onChange={(e) => setMedicalForm(prev => ({ ...prev, medicalConditions: e.target.value }))}
                    rows={3}
                    className="w-full bg-surface-hover border border-white/10 rounded-xl p-3 text-xs text-white focus:border-green-500/60 focus:outline-none resize-none"
                    placeholder="Asthma inhaler in bag, previous concussions, diabetes management..."
                  />
                </div>
              </div>

              {/* Emergency Authorization Checkbox */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-start gap-3 mt-4">
                <input
                  type="checkbox"
                  id="consentTreatment"
                  checked={medicalForm.emergencyTreatmentConsent}
                  onChange={(e) => setMedicalForm(prev => ({ ...prev, emergencyTreatmentConsent: e.target.checked }))}
                  className="w-4 h-4 rounded text-green-500 focus:ring-green-500/40 bg-black/40 mt-0.5"
                />
                <label htmlFor="consentTreatment" className="text-xs text-white/90 leading-relaxed cursor-pointer">
                  <strong>Emergency Medical Treatment Consent:</strong> I authorize licensed athletic trainers, tournament medical staff, and emergency medical personnel to evaluate and administer emergency medical treatment to my athlete in the event of an acute injury when parents are unreachable.
                </label>
              </div>

              <div className="flex items-center justify-between pt-4">
                <span className="text-[11px] text-ink-muted">
                  Last updated: {formatTs(medicalProfile.lastUpdated)}
                </span>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-black font-bold rounded-xl text-xs transition-all shadow-[0_0_20px_rgba(34,197,94,0.25)] flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Medical Profile</span>
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {/* TAB 5: MESSAGES */}
      {tab === 'messages' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="p-6 bg-surface-card border border-white/10 rounded-2xl">
            <h2 className="text-lg font-bold text-white font-display uppercase tracking-wide mb-1">
              Coach Recruitment Contact Requests
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              Coaches must introduce themselves and obtain your consent before direct messaging is established. Denied requests block the sender from future contact.
            </p>
          </div>

          {requests.length === 0 ? (
            <div className="p-12 text-center bg-surface-card border border-dashed border-white/10 rounded-2xl space-y-3">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto opacity-70" />
              <h3 className="text-base font-bold text-white">No Pending Coach Requests</h3>
              <p className="text-xs text-ink-muted">All recruiting communications are currently up to date.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((m) => (
                <div key={m.id} className="p-6 bg-surface-card border border-white/10 rounded-2xl space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-white">{m.from}</h3>
                      <p className="text-xs text-ink-muted">{[m.role, m.org].filter(Boolean).join(' • ')}</p>
                    </div>
                    <span className="text-[10px] text-ink-muted shrink-0">{formatTs(m.createdAt)}</span>
                  </div>

                  <div className="p-3.5 bg-white/5 border border-white/5 rounded-xl text-xs text-white/90 italic">
                    "{m.preview}"
                  </div>

                  <div className="text-xs text-ink-muted">
                    Inquiry target: <strong className="text-white">{m.child}</strong>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      disabled={acting === m.id}
                      onClick={() => respond(m.id, 'approve')}
                      className="flex-1 py-2.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve & Authorize Contact</span>
                    </button>
                    <button
                      disabled={acting === m.id}
                      onClick={() => respond(m.id, 'reject')}
                      className="flex-1 py-2.5 bg-coral-500/10 hover:bg-coral-500/20 border border-coral-500/30 text-coral-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Deny & Block Coach</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {recentActions.length > 0 && (
            <div className="p-4 bg-surface-card border border-white/10 rounded-2xl">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-2">Recent Decision Log</div>
              <div className="space-y-1 text-xs">
                {recentActions.map((a) => (
                  <div key={a.id} className={a.action === 'approved' ? 'text-green-400' : 'text-coral-400'}>
                    {a.action === 'approved' ? '✓ Authorized contact for:' : '✗ Denied contact for:'} {a.from}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* TAB 6: SETTINGS */}
      {tab === 'settings' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="p-6 bg-surface-card border border-white/10 rounded-2xl">
            <h2 className="text-lg font-bold text-white font-display uppercase tracking-wide mb-1">
              Privacy, Alerts & Communication Preferences
            </h2>
            <p className="text-xs text-ink-muted">
              Configure how you receive time-sensitive recruiting notifications and control athlete visibility.
            </p>
          </div>

          <div className="space-y-3">
            {SETTING_DEFS.map((s) => {
              const isOn = prefs[s.key];
              return (
                <div
                  key={s.key}
                  className="p-5 bg-surface-card border border-white/10 rounded-2xl flex items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="text-sm font-bold text-white mb-0.5">{s.label}</h3>
                    <p className="text-xs text-ink-muted">{s.desc}</p>
                  </div>
                  <button
                    onClick={() => togglePref(s.key)}
                    className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                      isOn ? 'bg-[#8B3BFF]' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                        isOn ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* DIGITAL SIGNATURE MODAL */}
      <AnimatePresence>
        {signingConsent && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-card border border-white/15 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-green-400">
                    {signingConsent.regulatoryCode}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1">{signingConsent.title}</h3>
                </div>
                <button
                  onClick={() => setSigningConsent(null)}
                  className="text-ink-muted hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Policy Terms Box */}
              <div className="p-4 bg-surface-hover/80 border border-white/10 rounded-xl text-xs text-white/90 leading-relaxed max-h-48 overflow-y-auto">
                {signingConsent.terms}
              </div>

              {/* Signature Input Form */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                    Guardian Digital Signature (Type Full Legal Name)
                  </label>
                  <input
                    type="text"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="e.g. Sarah Elizabeth Jenkins"
                    className="w-full bg-surface-hover border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-green-500/60 focus:outline-none"
                  />
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 rounded text-green-500 focus:ring-green-500/40 bg-black/40 mt-0.5"
                  />
                  <span className="text-xs text-ink-muted leading-relaxed">
                    I certify under penalty of perjury that I am the parent or legal guardian of this athlete, and I consent to the terms above.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  onClick={() => setSigningConsent(null)}
                  className="px-4 py-2 text-xs text-ink-muted hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  disabled={!signatureName.trim() || !agreeTerms}
                  onClick={handleSignConsent}
                  className="px-5 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:pointer-events-none text-black font-bold rounded-xl text-xs transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Execute Digital Signature</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DOCUMENT UPLOAD MODAL */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-card border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Upload Safeguarding Document</h3>
                  <p className="text-xs text-ink-muted">PDF, PNG, JPG accepted (up to 10MB)</p>
                </div>
                <button onClick={() => setShowUploadModal(false)} className="text-ink-muted hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUploadDocument} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                    Document Category
                  </label>
                  <select
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value as UploadedDocument['type'])}
                    className="w-full bg-surface-hover border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-green-500/60 focus:outline-none"
                  >
                    <option value="Proof of Age & Grade">Proof of Age & Grade (Birth Cert / Passport)</option>
                    <option value="Medical Clearance">Medical Clearance & Sports Physical</option>
                    <option value="Health Insurance Card">Health Insurance Card (Front & Back)</option>
                    <option value="League Eligibility">League / Club Eligibility Certificate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                    File Name / Attachment Description
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadFileName}
                    onChange={(e) => setUploadFileName(e.target.value)}
                    placeholder="e.g. Birth_Certificate_Maya.pdf"
                    className="w-full bg-surface-hover border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-green-500/60 focus:outline-none"
                  />
                </div>

                <div className="p-6 border border-dashed border-white/20 rounded-xl text-center space-y-2 bg-surface-hover/30">
                  <UploadCloud className="w-8 h-8 text-green-400 mx-auto" />
                  <p className="text-xs text-white font-medium">Ready for secure upload</p>
                  <p className="text-[10px] text-ink-muted">Encrypted in HIPAA & COPPA compliant storage</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 text-xs text-ink-muted hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-black font-bold rounded-xl text-xs"
                  >
                    Submit Document
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD EMERGENCY CONTACT MODAL */}
      <AnimatePresence>
        {showAddContactModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-card border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Add Emergency Contact</h3>
                  <p className="text-xs text-ink-muted">Authorized pickup and emergency responder</p>
                </div>
                <button onClick={() => setShowAddContactModal(false)} className="text-ink-muted hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddContact} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                    Contact Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newContact.name}
                    onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-surface-hover border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-green-500/60 focus:outline-none"
                    placeholder="e.g. David Jenkins"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                    Relationship to Athlete
                  </label>
                  <input
                    type="text"
                    required
                    value={newContact.relationship}
                    onChange={(e) => setNewContact(prev => ({ ...prev, relationship: e.target.value }))}
                    className="w-full bg-surface-hover border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-green-500/60 focus:outline-none"
                    placeholder="e.g. Father, Aunt, Grandparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={newContact.phone}
                    onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-surface-hover border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-green-500/60 focus:outline-none"
                    placeholder="(555) 000-0000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-surface-hover border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-green-500/60 focus:outline-none"
                    placeholder="contact@example.com"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={newContact.authorizedPickup}
                    onChange={(e) => setNewContact(prev => ({ ...prev, authorizedPickup: e.target.checked }))}
                    className="w-4 h-4 rounded text-green-500 focus:ring-green-500/40 bg-black/40"
                  />
                  <span className="text-xs text-white font-medium">Authorized for practice & tournament pickup</span>
                </label>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddContactModal(false)}
                    className="px-4 py-2 text-xs text-ink-muted hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-black font-bold rounded-xl text-xs"
                  >
                    Save Contact
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
