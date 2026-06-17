import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, CheckCircle2, MessageSquare, ArrowLeft, Loader2 } from 'lucide-react';

interface Player {
  id: number;
  name: string;
  position?: string;
  school?: string;
  state?: string;
  gradYear?: number;
  height?: string;
  weight?: string;
  bio?: string;
  gpa?: number;
  verified?: boolean;
  subscriptionTier?: string;
}

interface Stat {
  id: number;
  playerId: number;
  season?: string;
  touchdowns?: number;
  yards?: number;
  completionPct?: number;
  [key: string]: any;
}


export const PlayerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playerId = parseInt(id ?? '', 10);

  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (!id || isNaN(playerId)) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/athletes/${playerId}`);
        if (res.ok) {
          const data = await res.json();
          if (data) setPlayer(data);
          else setNotFound(true);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      }

      try {
        const sRes = await fetch(`/api/athletes/${playerId}/stats`);
        if (sRes.ok) setStats(await sRes.json());
      } catch { /* stats optional */ }

      setLoading(false);
    };
    load();
  }, [playerId]);

  const handleMessage = () => {
    navigate('/messages', { state: { partnerId: player?.id, partnerName: player?.name } });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: '#555' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Loading profile...</span>
      </div>
    );
  }

  if (notFound || !player) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#555' }}>
        <p style={{ fontSize: '1.2rem', marginBottom: 16 }}>Player not found.</p>
        <button onClick={() => navigate('/recruiting')}
          style={{ background: '#ff5a2d', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>
          Back to Recruiting
        </button>
      </div>
    );
  }

  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(player.name || '')}`;

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>

      {/* Back */}
      <button onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginBottom: 20, fontSize: '0.85rem', padding: 0 }}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header */}
      <div className="k-card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <img src={avatarUrl} alt={player.name}
            style={{ width: 80, height: 80, borderRadius: '50%', background: '#1c1c1c', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.8rem', textTransform: 'uppercase', color: '#fff', margin: 0 }}>
                {player.name}
              </h1>
              {player.verified && <CheckCircle2 size={16} color="#ff5a2d" fill="#ff5a2d" />}
            </div>
            {player.position && (
              <span style={{ background: 'rgba(255,90,45,0.1)', color: '#ff5a2d', fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: 4, letterSpacing: '0.06em', marginBottom: 8, display: 'inline-block' }}>
                {player.position}
              </span>
            )}
            {player.school && (
              <div style={{ fontSize: '0.82rem', color: '#666', marginTop: 4 }}>{player.school}</div>
            )}
            {(player.state || player.gradYear) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, fontSize: '0.78rem', color: '#555' }}>
                {player.state && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{player.state}</span>}
                {player.gradYear && <span>Class of {player.gradYear}</span>}
              </div>
            )}
          </div>
          <button onClick={handleMessage}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ff5a2d', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', flexShrink: 0 }}>
            <MessageSquare size={15} /> Message
          </button>
        </div>

        {player.bio && (
          <p style={{ color: '#888', fontSize: '0.85rem', lineHeight: 1.6, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {player.bio}
          </p>
        )}
      </div>

      {/* Quick stats */}
      {(player.height || player.gpa != null) && (
        <div className="k-card" style={{ padding: 20, marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#666', marginBottom: 16, letterSpacing: '0.08em' }}>
            Athlete Info
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
            {player.height && (
              <div style={{ background: '#0d0d0d', borderRadius: 8, padding: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', marginBottom: 4 }}>Height</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ddd' }}>{player.height}</div>
              </div>
            )}
            {player.gpa != null && (
              <div style={{ background: '#0d0d0d', borderRadius: 8, padding: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', marginBottom: 4 }}>GPA</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ddd' }}>{player.gpa}</div>
              </div>
            )}
            {player.weight && (
              <div style={{ background: '#0d0d0d', borderRadius: 8, padding: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', marginBottom: 4 }}>Weight</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ddd' }}>{player.weight}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats from API */}
      {stats.length > 0 && (
        <div className="k-card" style={{ padding: 20 }}>
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#666', marginBottom: 16, letterSpacing: '0.08em' }}>
            Game Stats
          </h2>
          {stats.map((s, i) => (
            <div key={i} style={{ fontSize: '0.82rem', color: '#888', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {s.season && <span style={{ color: '#ff5a2d', marginRight: 8 }}>{s.season}</span>}
              {s.touchdowns !== undefined && <span style={{ marginRight: 12 }}>TDs: <b style={{ color: '#ddd' }}>{s.touchdowns}</b></span>}
              {s.yards !== undefined && <span style={{ marginRight: 12 }}>Yds: <b style={{ color: '#ddd' }}>{s.yards}</b></span>}
              {s.completionPct !== undefined && <span>Comp%: <b style={{ color: '#ddd' }}>{s.completionPct}%</b></span>}
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
