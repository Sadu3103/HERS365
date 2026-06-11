import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Send, Inbox, Clock, Plus, X } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Conversation {
  partnerId: number;
  partnerName: string;
  partnerRole: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}
interface ThreadMessage {
  id: number;
  content: string;
  isFromMe: boolean;
  read: boolean;
  createdAt: string;
}
interface RequestItem {
  id: number;
  athleteId: number;
  senderName: string;
  content: string;
  createdAt: string;
}

interface AthleteRow {
  id: number;
  name: string;
  position: string;
  school: string;
}

export const Messages = () => {
  const qc = useQueryClient();
  const location = useLocation();
  const [tab, setTab] = useState<'inbox' | 'requests'>('inbox');
  const [activePartner, setActivePartner] = useState<number | null>(null);
  const [activePartnerName, setActivePartnerName] = useState('');
  const [draft, setDraft] = useState('');
  const [composing, setComposing] = useState(false);
  const [composeAthletes, setComposeAthletes] = useState<AthleteRow[]>([]);
  const [composeFilter, setComposeFilter] = useState('');

  useEffect(() => {
    const state = location.state as { partnerId?: number; partnerName?: string } | null;
    if (state?.partnerId) {
      setActivePartner(state.partnerId);
      if (state.partnerName) setActivePartnerName(state.partnerName);
    }
  }, []);

  const openCompose = async () => {
    setComposing(true);
    if (composeAthletes.length > 0) return;
    try {
      const res = await apiFetch<{ data: AthleteRow[] }>('/api/athletes?limit=30');
      setComposeAthletes((res.data ?? []).map((a: any) => ({
        id: a.id,
        name: a.name ?? '',
        position: a.position ?? '',
        school: a.school ?? '',
      })));
    } catch { /* sidebar still opens, just empty */ }
  };

  const { data: convData } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiFetch<{ data: Conversation[] }>('/api/messages/conversations'),
  });
  const conversations = convData?.data ?? [];

  const { data: reqData } = useQuery({
    queryKey: ['message-requests'],
    queryFn: () => apiFetch<{ data: RequestItem[] }>('/api/messages/requests'),
  });
  const requests = reqData?.data ?? [];

  const { data: threadData } = useQuery({
    queryKey: ['thread', activePartner],
    queryFn: () => apiFetch<{ data: ThreadMessage[] }>(`/api/messages/conversations/${activePartner}/messages`),
    enabled: activePartner != null,
  });
  const thread = threadData?.data ?? [];

  const markRead = useMutation({
    mutationFn: (partnerId: number) =>
      apiFetch('/api/messages/read', { method: 'PUT', body: JSON.stringify({ partnerId }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const send = useMutation({
    mutationFn: (vars: { partnerId: number; content: string }) =>
      apiFetch('/api/messages', { method: 'POST', body: JSON.stringify(vars) }),
    onSuccess: () => {
      setDraft('');
      qc.invalidateQueries({ queryKey: ['thread', activePartner] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const respond = useMutation({
    mutationFn: (vars: { id: number; action: 'approve' | 'reject' }) =>
      apiFetch(`/api/messages/requests/${vars.id}/respond`, { method: 'POST', body: JSON.stringify({ action: vars.action }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['message-requests'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  useEffect(() => {
    if (activePartner != null) markRead.mutate(activePartner);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePartner]);

  const activeConv = conversations.find((c) => c.partnerId === activePartner);

  return (
    <div style={{ display: 'flex', height: '100%', color: '#fff' }}>
      {/* Left: list */}
      <div style={{ width: 320, borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', padding: 12, gap: 8, alignItems: 'center' }}>
          <button onClick={() => setTab('inbox')} style={tabStyle(tab === 'inbox')}>
            <Inbox size={14} /> INBOX
          </button>
          <button onClick={() => setTab('requests')} style={tabStyle(tab === 'requests')}>
            <Clock size={14} /> REQUESTS{requests.length > 0 ? ` (${requests.length})` : ''}
          </button>
          <button onClick={openCompose} title="New message" style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', background: '#ff5a2d', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={16} color="#fff" />
          </button>
        </div>

        {composing && (
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px 8px', gap: 8 }}>
              <input
                autoFocus
                value={composeFilter}
                onChange={(e) => setComposeFilter(e.target.value)}
                placeholder="Search athletes..."
                style={{ flex: 1, background: '#161616', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9999, padding: '6px 12px', color: '#fff', fontSize: '0.78rem', outline: 'none' }}
              />
              <button onClick={() => setComposing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 0, display: 'flex' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ maxHeight: 180, overflowY: 'auto' }}>
              {composeAthletes
                .filter((a) => a.name.toLowerCase().includes(composeFilter.toLowerCase()))
                .map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setActivePartner(a.id); setActivePartnerName(a.name); setComposing(false); setComposeFilter(''); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', color: '#fff' }}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#1c1c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={14} color="#888" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                      <div style={{ fontSize: '0.68rem', color: '#666' }}>{a.position}{a.school ? ` · ${a.school}` : ''}</div>
                    </div>
                  </button>
                ))}
              {composeAthletes.length === 0 && (
                <div style={{ padding: '10px 16px', fontSize: '0.75rem', color: '#555' }}>Loading...</div>
              )}
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'inbox' && conversations.length === 0 && (
            <div style={{ padding: 24, color: '#555', fontSize: '0.8rem' }}>No conversations yet.</div>
          )}

          {tab === 'inbox' && conversations.map((c) => (
            <button
              key={c.partnerId}
              onClick={() => setActivePartner(c.partnerId)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: '12px 16px', background: activePartner === c.partnerId ? 'rgba(255,90,45,0.08)' : 'transparent',
                border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', color: '#fff',
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1c1c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={18} color="#888" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.partnerName}</div>
                <div style={{ fontSize: '0.72rem', color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastMessage}</div>
              </div>
              {c.unreadCount > 0 && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5a2d', flexShrink: 0 }} />
              )}
            </button>
          ))}

          {tab === 'requests' && requests.length === 0 && (
            <div style={{ padding: 24, color: '#555', fontSize: '0.8rem' }}>No pending requests.</div>
          )}

          {tab === 'requests' && requests.map((r) => (
            <div key={r.id} style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{r.senderName}</div>
              <div style={{ fontSize: '0.75rem', color: '#888', margin: '4px 0 10px' }}>{r.content}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => respond.mutate({ id: r.id, action: 'approve' })} style={pillBtn('#ff5a2d')}>Accept</button>
                <button onClick={() => respond.mutate({ id: r.id, action: 'reject' })} style={pillBtn('#333')}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: thread */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activePartner == null ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
            Select a conversation
          </div>
        ) : (
          <>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 700 }}>
              {(activeConv?.partnerName ?? activePartnerName) || 'Conversation'}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {thread.map((m) => (
                <div key={m.id} style={{ alignSelf: m.isFromMe ? 'flex-end' : 'flex-start', maxWidth: '70%', background: m.isFromMe ? '#ff5a2d' : '#1c1c1c', color: '#fff', padding: '8px 14px', borderRadius: 14, fontSize: '0.85rem' }}>
                  {m.content}
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); if (draft.trim()) send.mutate({ partnerId: activePartner, content: draft.trim() }); }}
              style={{ display: 'flex', gap: 8, padding: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message..."
                style={{ flex: 1, background: '#161616', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9999, padding: '10px 16px', color: '#fff', outline: 'none' }}
              />
              <button type="submit" style={{ background: '#ff5a2d', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Send size={16} color="#fff" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

function tabStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '8px 0', borderRadius: 9999, border: 'none', cursor: 'pointer',
    background: active ? '#ff5a2d' : '#161616', color: active ? '#fff' : '#777',
    fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.06em',
  };
}
function pillBtn(bg: string): React.CSSProperties {
  return { background: bg, color: '#fff', border: 'none', borderRadius: 9999, padding: '5px 14px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' };
}
