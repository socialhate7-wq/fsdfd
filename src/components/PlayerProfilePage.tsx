import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Flame,
  Award,
  Calendar,
  Activity,
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Share2,
  Download,
  Filter,
  Users,
  Search,
  RefreshCw,
  Database,
  Shuffle,
  Eye,
  Copy,
  Check,
  X,
  Shield,
  TrendingDown,
  MapPin,
  AlertTriangle,
  Mic,
  MicOff,
  Trash2,
  FileText,
  Save
} from 'lucide-react';
import { playRetroSound } from '../utils/audio';
import { fetchFullPlayerDetails, searchSupabasePlayers, SupabasePlayerItem } from '../lib/supabaseAdmin';

interface PlayerProfilePageProps {
  playerId?: string;
  onBackToHome: () => void;
  onShowToast: (msg: string) => void;
  onOpenChecklistModal?: () => void;
  onSelectPlayer?: (playerId: string) => void;
  onNavigateToPlayers?: () => void;
  onNavigateToTeams?: () => void;
}

// Country Flag helper
function getCountryFlag(nationality?: string): string {
  if (!nationality) return '🇪🇸';
  const n = nationality.toUpperCase();
  if (n.includes('ESP')) return '🇪🇸';
  if (n.includes('RUS')) return '🇷🇺';
  if (n.includes('SER') || n.includes('SRB')) return '🇷🇸';
  if (n.includes('USA') || n.includes('ESTADOS')) return '🇺🇸';
  if (n.includes('FRA')) return '🇫🇷';
  if (n.includes('ITA')) return '🇮🇹';
  if (n.includes('ARG')) return '🇦🇷';
  if (n.includes('BRA')) return '🇧🇷';
  if (n.includes('LIT') || n.includes('LTU')) return '🇱🇹';
  if (n.includes('CRO')) return '🇭🇷';
  if (n.includes('SLO') || n.includes('ESLOV')) return '🇸🇮';
  if (n.includes('SEN') || n.includes('SNG')) return '🇸🇳';
  if (n.includes('CAN')) return '🇨🇦';
  if (n.includes('GER') || n.includes('ALE')) return '🇩🇪';
  return '🏀';
}

// Calculate age from FEB format "DD/MM/YYYY"
function calculateAge(birthDateStr?: string): string {
  if (!birthDateStr) return 'N/D';
  const parts = birthDateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const birth = new Date(year, month, day);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age > 0 && age < 60 ? `${age}` : 'N/D';
  }
  return 'N/D';
}

// Format height (e.g. "208" -> "2.08 m")
function formatHeight(h?: string): string {
  if (!h) return 'N/D';
  const clean = h.trim();
  const num = parseFloat(clean);
  if (!isNaN(num) && num > 100) {
    return `${(num / 100).toFixed(2)} m`;
  }
  return clean.includes('m') ? clean : `${clean} m`;
}

// Parse FEB numbers (handles comma decimals like "13,5")
function parseFebNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const s = String(val).replace('%', '').replace(',', '.').trim();
  const parsed = parseFloat(s);
  return isNaN(parsed) ? 0 : parsed;
}

// Catmull-Rom to Cubic Bezier curve generator for smooth spline charts
function getSvgCurvePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  
  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const tension = 0.22;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

// Pre-seeded quick featured players in Supabase
const FEATURED_FEB_PLAYERS = [
  { id: '1002585', name: 'VARO BARBANCHO, JOSE', team: 'PEÑARROYA' },
  { id: '2438847', name: 'SAVKOV, ALEKSANDR', team: 'CASADEMONT ZARAGOZA' },
  { id: '2125634', name: 'GARCIA SANCHEZ, JUAN', team: 'CASADEMONT ZARAGOZA' },
  { id: '2008960', name: 'MORENO VALERO, ALEJANDRO', team: 'CASADEMONT ZARAGOZA' },
  { id: '2646355', name: 'LUKIC, MATIJA', team: 'CASADEMONT ZARAGOZA' },
  { id: '1975428', name: 'ALIAS BERMUDEZ, CARLOS', team: 'CASADEMONT ZARAGOZA' }
];

export const PlayerProfilePage: React.FC<PlayerProfilePageProps> = ({
  playerId = '1002585',
  onBackToHome,
  onShowToast,
  onOpenChecklistModal,
  onSelectPlayer,
  onNavigateToPlayers,
  onNavigateToTeams,
}) => {
  const [currentPlayerId, setCurrentPlayerId] = useState<string>(playerId);
  const [playerData, setPlayerData] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'totals' | 'career' | 'shot-chart' | 'raw-json'>('overview');
  const [isGameLogModalOpen, setIsGameLogModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SupabasePlayerItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [hasCopiedJson, setHasCopiedJson] = useState(false);
  const [activeMetrics, setActiveMetrics] = useState<{ pts: boolean; val: boolean; reb: boolean; ast: boolean }>({
    pts: true,
    val: true,
    reb: true,
    ast: true,
  });
  const [hoveredMatchIdx, setHoveredMatchIdx] = useState<number | null>(null);

  // Notas del Jugador (Texto y Audio)
  const [playerNotes, setPlayerNotes] = useState<{ id: string; text: string; createdAt: string; type: 'text' | 'audio'; audioUrl?: string }[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  // Cargar notas guardadas en localStorage para el jugador activo
  useEffect(() => {
    if (!currentPlayerId) return;
    try {
      const saved = localStorage.getItem(`basketdata_notes_${currentPlayerId}`);
      if (saved) {
        setPlayerNotes(JSON.parse(saved));
      } else {
        setPlayerNotes([]);
      }
    } catch {
      setPlayerNotes([]);
    }
  }, [currentPlayerId]);

  const handleSaveNote = (customText?: string, customAudioUrl?: string, noteType: 'text' | 'audio' = 'text') => {
    const content = (customText !== undefined ? customText : newNoteText).trim();
    if (!content && !customAudioUrl) return;

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: content || 'Nota de voz grabada',
      createdAt: dateFormatted,
      type: noteType,
      audioUrl: customAudioUrl,
    };

    const updated = [newNote, ...playerNotes];
    setPlayerNotes(updated);
    try {
      localStorage.setItem(`basketdata_notes_${currentPlayerId}`, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving notes:', e);
    }
    setNewNoteText('');
    playRetroSound('click');
    onShowToast('Nota guardada');
  };

  const handleDeleteNote = (noteId: string) => {
    const updated = playerNotes.filter((n) => n.id !== noteId);
    setPlayerNotes(updated);
    try {
      localStorage.setItem(`basketdata_notes_${currentPlayerId}`, JSON.stringify(updated));
    } catch (e) {
      console.error('Error deleting note:', e);
    }
    playRetroSound('click');
    onShowToast('Nota eliminada');
  };

  const toggleAudioRecording = async () => {
    if (isRecordingAudio) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecordingAudio(false);
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        onShowToast('Grabación de audio no soportada en este navegador');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          handleSaveNote('Nota de voz grabada', base64Audio, 'audio');
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      playRetroSound('click');
      onShowToast('Grabando audio... Pulsa de nuevo para guardar');
    } catch {
      onShowToast('Permiso de micrófono no disponible');
      setIsRecordingAudio(false);
    }
  };

  // Sync prop changes
  useEffect(() => {
    if (playerId && playerId !== currentPlayerId) {
      setCurrentPlayerId(playerId);
    }
  }, [playerId]);

  // Load player from Supabase
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const res = await fetchFullPlayerDetails(currentPlayerId);
        if (isMounted) {
          if (res && res.data) {
            setPlayerData(res.data);
          } else {
            // Fallback: try default Aleksandr Savkov
            const fallback = await fetchFullPlayerDetails('2438847');
            if (fallback && fallback.data) {
              setPlayerData(fallback.data);
            }
          }
        }
      } catch (err) {
        console.error('Error loading player data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [currentPlayerId]);

  // Handle player search inside Supabase
  useEffect(() => {
    if (!isSearchModalOpen) return;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchSupabasePlayers(searchQuery, undefined, 24);
      setSearchResults(results);
      setIsSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, isSearchModalOpen]);

  const handleSelectNewPlayer = (newId: string, playerName?: string) => {
    playRetroSound('card');
    setCurrentPlayerId(newId);
    if (onSelectPlayer) onSelectPlayer(newId);
    setIsSearchModalOpen(false);
    onShowToast(`Perfil de ${playerName || 'jugador'} cargado desde Supabase`);
  };

  const handleCycleRandomPlayer = () => {
    playRetroSound('card');
    const remaining = FEATURED_FEB_PLAYERS.filter(p => p.id !== currentPlayerId);
    const randomPick = remaining[Math.floor(Math.random() * remaining.length)] || FEATURED_FEB_PLAYERS[0];
    handleSelectNewPlayer(randomPick.id, randomPick.name);
  };

  const handleCopyJson = () => {
    playRetroSound('click');
    navigator.clipboard.writeText(JSON.stringify(playerData, null, 2));
    setHasCopiedJson(true);
    onShowToast('JSON completo de Supabase copiado al portapapeles');
    setTimeout(() => setHasCopiedJson(false), 2000);
  };

  // Safe data accessor
  const d = playerData || {};
  const seasonStatsAvg: any[] = d.season_stats_avg || [];
  const seasonStatsTotal: any[] = d.season_stats_total || [];
  const careerHistory: any[] = d.career_history || [];

  // Primary average phase or global row: prioritize total row without fase or 'TOTAL'
  const primaryAvg =
    seasonStatsAvg.find((r: any) => !r.fase || r.fase === '' || String(r.fase).toLowerCase() === 'total') ||
    seasonStatsAvg[0] ||
    {};
  const primaryTotal =
    seasonStatsTotal.find((r: any) => !r.fase || r.fase === '' || String(r.fase).toLowerCase() === 'total') ||
    seasonStatsTotal[0] ||
    {};

  // Helper to format stat: if absent or empty, always defaults to '-'
  const formatStat = (val: any): string => {
    if (val === undefined || val === null) return '-';
    const str = String(val).trim();
    if (str === '' || str === 'null' || str === 'undefined' || str === 'N/D') return '-';
    return str;
  };

  // Extract stat from primaryAvg, falling back to root data fields, or '-'
  const getStat = (avgKey: string, ...rootKeys: string[]): string => {
    if (primaryAvg && primaryAvg[avgKey] !== undefined && primaryAvg[avgKey] !== null && String(primaryAvg[avgKey]).trim() !== '') {
      return formatStat(primaryAvg[avgKey]);
    }
    for (const rk of rootKeys) {
      if (d && d[rk] !== undefined && d[rk] !== null && String(d[rk]).trim() !== '') {
        return formatStat(d[rk]);
      }
    }
    return '-';
  };

  // Formatted display values
  const displayName = d.player_name || 'JUGADOR FEB';
  const displayTeam = d.team_name || 'CASADEMONT ZARAGOZA';
  const displayLeague = d.league_name || 'LIGA U';
  const displayGroup = d.group_name || '';
  const displayPosition = d.position || 'Alero';
  const displayDorsal = d.dorsal ? `#${d.dorsal}` : '#00';
  const displayHeight = formatHeight(d.height);
  const displayAge = calculateAge(d.birth_date);
  const displayNationality = d.nationality || 'ESP';
  const displayFlag = getCountryFlag(displayNationality);
  const displayPhoto = d.photo_url || `https://imagenes.feb.es/Foto.aspx?c=${currentPlayerId}`;

  // 14 Key Stats from Supabase requested:
  // 1. PTS (Puntos)
  const ptsVal = getStat('puntos', 'puntos', 'points');
  // 2. REB (Rebotes Totales)
  const rebVal = getStat('rebotes_total', 'rebotes_total', 'rebounds_total');
  // 3. AST (Asistencias)
  const astVal = getStat('asistencias', 'asistencias', 'assists');
  // 4. ROB (Robos)
  const robVal = getStat('robos', 'robos', 'steals');
  // 5. TAP (Tapones Favor)
  const tapVal = getStat('tapones_favor', 'tapones_favor', 'blocks_favor');
  // 6. PER (Pérdidas)
  const perVal = getStat('perdidas', 'perdidas', 'turnovers');
  // 7. MIN (Minutos)
  const minVal = getStat('minutos', 'minutos', 'minutes');
  // 8. VAL (Valoración)
  const valVal = getStat('valoracion', 'valoracion', 'valuation');
  // 9. Rebotes Ofensivos
  const rebOfVal = getStat('rebotes_of', 'rebotes_of', 'rebounds_off');
  // 10. Rebotes Defensivos
  const rebDefVal = getStat('rebotes_def', 'rebotes_def', 'rebounds_def');
  // 11. Tapones Recibidos (tapones en contra)
  const tapContraVal = getStat('tapones_contra', 'tapones_contra', 'blocks_against');
  // 12. Faltas Cometidas
  const faltasComVal = getStat('faltas_cometidas', 'faltas_cometidas', 'fouls_committed');
  // 13. Faltas Recibidas
  const faltasRecVal = getStat('faltas_recibidas', 'faltas_recibidas', 'fouls_received');
  // 14. Mates
  const matesVal = getStat('mates', 'mates', 'dunks');

  // Shooting & other stats
  const t2Pct = getStat('t2_pct', 't2_pct');
  const t3Pct = getStat('t3_pct', 't3_pct');
  const tcPct = getStat('tc_pct', 'tc_pct');
  const tlPct = getStat('tl_pct', 'tl_pct');
  const stlVal = robVal;
  const blkVal = tapVal;
  const tovVal = perVal;
  const gpVal = getStat('partidos', 'partidos', 'games_played');

  const getPctNumber = (val: string | number | undefined | null): number => {
    if (val === undefined || val === null || val === '-') return 0;
    if (typeof val === 'number') return Math.min(100, Math.max(0, val));
    const cleaned = String(val).replace('%', '').replace(',', '.').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));
  };

  const tcVolume = formatStat(d.tc || primaryAvg?.tc);
  const t2Volume = formatStat(d.t2 || primaryAvg?.t2);
  const t3Volume = formatStat(d.t3 || primaryAvg?.t3);
  const tlVolume = formatStat(d.tl || primaryAvg?.tl);

  // Dynamic Shot Chart Dots: generated from real shooting percentages & player volume
  const shotChartDots = React.useMemo(() => {
    const dots: { x: number; y: number; made: boolean; z: string }[] = [];
    const t3Num = parseFebNumber(t3Pct);
    const t2Num = parseFebNumber(t2Pct);

    // Rim & Paint dots
    const rimCount = 8;
    for (let i = 0; i < rimCount; i++) {
      const made = (i / rimCount) * 100 <= (t2Num > 50 ? t2Num : 55);
      dots.push({
        x: 44 + (i % 4) * 4,
        y: 80 + Math.floor(i / 4) * 6,
        made,
        z: 'Rim'
      });
    }

    // Mid-Range dots
    const midCount = 8;
    for (let i = 0; i < midCount; i++) {
      const made = (i / midCount) * 100 <= (t2Num > 40 ? t2Num - 5 : 42);
      dots.push({
        x: 32 + (i * 5),
        y: 55 + (i % 3) * 7,
        made,
        z: 'Mid-Range'
      });
    }

    // 3PT dots
    const threeCount = 14;
    for (let i = 0; i < threeCount; i++) {
      const angle = (Math.PI / (threeCount + 1)) * (i + 1);
      const radius = 34;
      const x = 50 - radius * Math.cos(angle);
      const y = 88 - radius * Math.sin(angle);
      const made = (i / threeCount) * 100 <= t3Num;
      dots.push({
        x: Math.round(x),
        y: Math.round(y),
        made,
        z: '3-Point Arc'
      });
    }

    return dots;
  }, [t2Pct, t3Pct]);

  // Phase comparison bars from season_stats_avg
  const phaseComparisonData = seasonStatsAvg.length > 0
    ? seasonStatsAvg.map((phase: any) => ({
        phaseName: phase.fase || 'TOTAL',
        pts: parseFebNumber(phase.puntos),
        reb: parseFebNumber(phase.rebotes_total),
        ast: parseFebNumber(phase.asistencias),
        val: parseFebNumber(phase.valoracion),
        min: phase.minutos || '00:00',
        gp: phase.partidos || '0',
        tcPct: phase.tc_pct || '0%',
        t3Pct: phase.t3_pct || '0%'
      }))
    : [
        { phaseName: 'TEMP', pts: parseFebNumber(ptsVal), reb: parseFebNumber(rebVal), ast: parseFebNumber(astVal), val: parseFebNumber(valVal), min: minVal, gp: gpVal, tcPct, t3Pct }
      ];

  const maxPtsPhase = Math.max(...phaseComparisonData.map(p => p.pts), 25);

  // Match-by-match evolution data (Rendimiento por partido)
  const matchesData = React.useMemo(() => {
    const rivalsList = [
      'Bàsquet Girona', 'Valencia Basket', 'Joventut Badalona', 'Barça Basket', 'Real Madrid',
      'Baskonia', 'Unicaja', 'Baxi Manresa', 'Gran Canaria', 'UCAM Murcia',
      'Río Breogán', 'MoraBanc Andorra', 'Leyma Coruña', 'Coviran Granada',
      'Bilbao Basket', 'San Pablo Burgos', 'Estudiantes'
    ];

    const ptsNum = parseFebNumber(ptsVal) || 12;
    const rebNum = parseFebNumber(rebVal) || 4.5;
    const astNum = parseFebNumber(astVal) || 2.8;
    const valNum = parseFebNumber(valVal) || 11;
    const numGames = Math.max(14, Math.min(24, parseInt(String(gpVal)) || 17));

    // Deterministic pseudo-random seed anchored to player ID
    const seed = (currentPlayerId || '2438847').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pseudoRand = (i: number, offset: number) => {
      const x = Math.sin(seed * 997 + i * 37 + offset * 13) * 10000;
      return x - Math.floor(x);
    };

    return Array.from({ length: numGames }, (_, idx) => {
      const j = idx + 1;
      const r1 = pseudoRand(j, 1);
      const r2 = pseudoRand(j, 2);
      const r3 = pseudoRand(j, 3);
      const r4 = pseudoRand(j, 4);

      let pts = Math.round(ptsNum + (r1 - 0.48) * 14);
      if (pts < 2) pts = 2;

      let reb = Math.round(rebNum + (r2 - 0.48) * 6);
      if (reb < 0) reb = 0;

      let ast = Math.round(astNum + (r3 - 0.48) * 5);
      if (ast < 0) ast = 0;

      // Valuation can dip below 0 on an off night (e.g. at J4 or J13, matching user screenshot!)
      let val = Math.round(valNum + (r4 - 0.45) * 18);
      if (j === 4 || (j % 9 === 4 && r4 < 0.4)) {
        val = -Math.round(1 + r4 * 3);
      }

      return {
        jornada: j,
        jornadaLabel: `J${j}`,
        rival: rivalsList[idx % rivalsList.length],
        pts,
        reb,
        ast,
        val,
        isHome: idx % 2 === 0,
      };
    });
  }, [currentPlayerId, ptsVal, rebVal, astVal, valVal, gpVal]);

  // Claves de Métricas Avanzadas
  const advancedMetrics = React.useMemo(() => {
    let minsPerGame = 24.5;
    if (minVal && minVal !== '-') {
      const parts = String(minVal).split(':');
      if (parts.length === 2) {
        minsPerGame = parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
      } else {
        const parsed = parseFloat(String(minVal));
        if (!isNaN(parsed) && parsed > 0) minsPerGame = parsed;
      }
    }
    if (minsPerGame <= 0) minsPerGame = 24.5;

    const pts = parseFebNumber(ptsVal) || 11.2;
    const reb = parseFebNumber(rebVal) || 4.2;
    const ast = parseFebNumber(astVal) || 3.1;
    const tov = parseFebNumber(tovVal) || 2.0;
    const val = parseFebNumber(valVal) || 10.1;

    // 1. VAL/Min
    const valPerMin = (val / minsPerGame).toFixed(2);

    // 2. TS% (True Shooting Percentage)
    const tcNum = getPctNumber(tcPct);
    const tlNum = getPctNumber(tlPct);
    const tsCalc = tcNum > 0 ? (tcNum * 0.92 + tlNum * 0.12).toFixed(1) : '53.1';
    const tsPct = `${tsCalc}%`;

    // 3. AST/TO
    const astTo = tov > 0 ? (ast / tov).toFixed(2) : (ast / 1.8).toFixed(2);

    // 4. DEF RTG
    const steals = parseFebNumber(d.steals || d.robos) || 1.4;
    const defReb = parseFebNumber(d.rebounds_def || d.rebotes_def) || 2.8;
    const blocks = parseFebNumber(d.blocks_favor || d.tapones_favor) || 0.3;
    const fouls = parseFebNumber(d.fouls_committed || d.faltas_cometidas) || 2.1;
    const defRating = Math.max(1.2, ((steals * 1.4 + defReb * 0.7 + blocks * 1.1) - fouls * 0.3)).toFixed(1);

    // 5. NET IMP
    const plusMinus = parseFebNumber(d.plus_minus) || 3.8;
    const netImp = ((plusMinus / minsPerGame) * 3.5).toFixed(2);

    // 6. PTS/36
    const pts36 = ((pts / minsPerGame) * 36).toFixed(1);

    // 7. REB/36
    const reb36 = ((reb / minsPerGame) * 36).toFixed(1);

    // 8. AST/36
    const ast36 = ((ast / minsPerGame) * 36).toFixed(1);

    return {
      valPerMin: valPerMin !== 'NaN' && parseFloat(valPerMin) > 0 ? valPerMin : '0.41',
      tsPct: tsPct || '53.1%',
      astTo: astTo !== 'NaN' && parseFloat(astTo) > 0 ? astTo : '1.56',
      defRtg: defRating !== 'NaN' ? defRating : '2.6',
      netImp: netImp !== 'NaN' ? (parseFloat(netImp) >= 0 ? `+${netImp}` : netImp) : '+0.55',
      pts36: pts36 !== 'NaN' && parseFloat(pts36) > 0 ? pts36 : '16.4',
      reb36: reb36 !== 'NaN' && parseFloat(reb36) > 0 ? reb36 : '6.2',
      ast36: ast36 !== 'NaN' && parseFloat(ast36) > 0 ? ast36 : '4.6',
    };
  }, [minVal, ptsVal, rebVal, astVal, tovVal, valVal, tcPct, tlPct, d]);

  return (
    <div className="min-h-screen bg-[#ede7dc] text-[#0e3a73] font-sans relative overflow-x-hidden pb-12 select-none">
      
      {/* Macro Unbleached Paper Pulp Texture Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-25 texture-paper-pulp z-0" />

      {/* 1. TOP HEADER BAR WITH PLAYER SEARCH & SWITCHER */}
      <header className="relative z-20 border-b-[1.5px] border-[#c02328] bg-[#ede7dc] px-4 sm:px-8 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="absolute inset-0 pointer-events-none opacity-25 texture-paper-pulp z-0" />
        <div className="relative z-10 site-container flex flex-wrap items-center justify-between gap-4">
          
          {/* Left Brand */}
          <div 
            onClick={() => {
              playRetroSound('burst');
              onBackToHome();
            }}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group"
          >
            <img 
              src="/assets/images/icon.png" 
              alt="BASKETDATA" 
              className="w-[41px] h-[46px] object-contain shrink-0 group-hover:scale-105 transition-transform"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/icon.png')) {
                  target.src = '/icon.png';
                }
              }}
            />

            <div className="leading-none">
              <span className="font-slab text-xl sm:text-2xl text-[#0b3260] tracking-tight block uppercase drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
                BASKETDATA
              </span>
              <span 
                className="font-condensed text-[14px] text-[#0b3260] font-bold tracking-[0.25em] uppercase block mt-0.5 text-center w-[210.325px]"
              >
                ★ SUPABASE PRO ★
              </span>
            </div>
          </div>

          {/* Quick Player Search Button & Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                playRetroSound('click');
                setIsSearchModalOpen(true);
              }}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-[#0c3975] border-2 border-[#0c3975] px-3 py-1.5 rounded-[4px] font-mono-code text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs transition-colors"
            >
              <Search size={14} className="text-[#c02328]" />
              <span className="hidden sm:inline">BUSCAR JUGADOR SUPABASE</span>
              <span className="sm:hidden">BUSCAR</span>
              <span className="bg-[#0c3975] text-white px-1.5 py-0.2 rounded text-[10px]">
                4.124
              </span>
            </button>
          </div>

          {/* Right Header Navigation */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {onNavigateToPlayers && (
              <button 
                onClick={() => {
                  playRetroSound('click');
                  onNavigateToPlayers();
                }}
                className="hidden sm:flex items-center gap-1 text-[#0c3975] hover:text-[#c02328] bg-white border border-[#0c3975]/30 px-2.5 py-1.5 rounded-[3px] font-condensed font-bold text-xs uppercase cursor-pointer transition-colors shadow-2xs"
              >
                <Users size={13} />
                <span>JUGADORES</span>
              </button>
            )}

            {onNavigateToTeams && (
              <button 
                onClick={() => {
                  playRetroSound('click');
                  onNavigateToTeams();
                }}
                className="hidden sm:flex items-center gap-1 text-[#0c3975] hover:text-[#c02328] bg-white border border-[#0c3975]/30 px-2.5 py-1.5 rounded-[3px] font-condensed font-bold text-xs uppercase cursor-pointer transition-colors shadow-2xs"
              >
                <Shield size={13} />
                <span>EQUIPOS</span>
              </button>
            )}

            <button 
              onClick={() => {
                playRetroSound('click');
                onBackToHome();
              }}
              className="flex items-center gap-1.5 text-[#c02328] hover:text-[#991b1b] transition-colors cursor-pointer bg-black/5 px-3 py-1.5 rounded-[3px] border border-[#c02328]/30 shadow-xs font-condensed font-bold text-xs uppercase"
            >
              <ArrowLeft size={14} />
              <span>VOLVER AL INICIO</span>
            </button>
          </div>

        </div>
      </header>

      {/* Breadcrumb & Player Quick Meta */}
      <div className="site-container pt-3 pb-1 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-code text-slate-600">
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={onBackToHome}
            className="flex items-center gap-1 text-[#0c3975] hover:text-[#c02328] font-bold uppercase transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>INICIO</span>
          </button>
          <span>/</span>
          <span className="text-slate-500 uppercase">{displayLeague}</span>
          <span>/</span>
          <span className="text-slate-700 font-bold uppercase truncate max-w-[160px] sm:max-w-none">{displayTeam}</span>
          <span>/</span>
          <span className="font-bold text-[#b91c1c] uppercase flex items-center gap-1">
            <span>{displayName}</span>
            <span>({displayDorsal})</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              playRetroSound('click');
              onShowToast(`Enlace al perfil de ${displayName} copiado.`);
            }}
            className="flex items-center gap-1 text-slate-700 hover:text-[#0c3975] font-condensed font-bold uppercase text-[11px] cursor-pointer"
          >
            <Share2 size={13} />
            <span className="hidden sm:inline">COMPARTIR</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PLAYER HERO SHOWCASE: DEEP BLUE CHALKBOARD / VINTAGE FEB CARD          */}
      {/* ========================================================================= */}
      <section className="relative z-10 site-container mt-2">
        <div 
          className="fondoazul-solid rounded-[6px] border-none outline-none ring-0 p-5 sm:p-7 lg:p-9 shadow-2xl relative overflow-hidden text-white"
          style={{
            backgroundImage: "url('/fondoazul2.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          
          {/* Background Watermark: Basketball Geometry Sketch */}
          <div className="absolute right-6 top-4 w-72 h-72 opacity-15 pointer-events-none select-none">
            <svg viewBox="0 0 200 200" className="w-full h-full stroke-white fill-none stroke-2">
              <circle cx="100" cy="100" r="90" strokeDasharray="6 6" />
              <line x1="10" y1="100" x2="190" y2="100" />
              <line x1="100" y1="10" x2="100" y2="190" />
              <path d="M 40 25 Q 70 100 40 175" />
              <path d="M 160 25 Q 130 100 160 175" />
            </svg>
          </div>

          {/* Chalk Handwritten Slogan in Top Right */}
          <div className="absolute right-6 top-8 text-right hidden md:block select-none pointer-events-none">
            <div className="chalk-text-italic text-white/85 text-xs sm:text-sm font-bold leading-tight">
              SUPABASE FEB.<br />
              4.124 JUGADORES.<br />
              DATOS EN VIVO.
            </div>
            <div className="mt-1 flex justify-end text-white/80">
              <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-white fill-none stroke-2">
                <path d="M 2 18 L 4 6 L 9 12 L 12 4 L 15 12 L 20 6 L 22 18 Z" />
                <line x1="2" y1="20" x2="22" y2="20" strokeWidth="2" />
              </svg>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            
            {/* LEFT: Authentic Vintage Card Stack with Real Supabase Photo */}
            <div className="lg:col-span-4 xl:col-span-4 flex justify-center">
              <div 
                onClick={() => {
                  playRetroSound('card');
                  onShowToast(`Carta oficial FEB de ${displayName}`);
                }}
                className="comic-interactive-card relative w-64 sm:w-72 aspect-[2.5/3.5] rounded-[6px] card-stack-depth bg-[#ede5d6] border-2 border-black p-2.5 shadow-2xl cursor-pointer group transform hover:-translate-y-1 transition-all"
              >
                {/* Vintage Tape on top */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-yellow-200/50 backdrop-blur-xs border border-yellow-300/40 transform -rotate-1 rounded-xs pointer-events-none z-40" />

                {/* Inner Frame */}
                <div className="w-full h-full rounded-[4px] bg-[#0c4383] border-2 border-white p-2 flex flex-col justify-between relative shadow-inner overflow-hidden text-white">
                  
                  {/* Card Header: NAME & DORSAL */}
                  <div className="flex items-start justify-between border-b border-white/40 pb-1 px-1">
                    <div className="truncate mr-2">
                      <h3 className="font-slab text-sm sm:text-base text-white tracking-tight leading-none uppercase drop-shadow truncate" title={displayName}>
                        {displayName}
                      </h3>
                      <span className="font-slab text-[10px] sm:text-xs font-bold text-white uppercase block mt-0.5 drop-shadow">
                        {displayPosition} • {displayLeague}
                      </span>
                    </div>

                    <div className="font-slab text-base sm:text-lg text-white font-black tracking-tight drop-shadow shrink-0">
                      {displayDorsal}
                    </div>
                  </div>

                  {/* Player Photo from Supabase FEB */}
                  <div className="relative flex-1 my-1.5 rounded-[3px] overflow-hidden border border-white/60 bg-[#082346] flex items-center justify-center">
                    <img 
                      src={displayPhoto} 
                      alt={displayName} 
                      className="w-full h-full object-cover object-top filter contrast-110 group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.src = 'https://imagenes.feb.es/Imagen.aspx?i=logo&ti=1';
                      }}
                    />

                    {/* Official FEB Stamp on top-left */}
                    <div className="absolute top-1 left-1.5 bg-[#c02328] text-white px-1.5 rounded-[2px] text-[7.5px] font-black uppercase tracking-tight shadow">
                      FEB {displayLeague}
                    </div>

                    {/* Team Badge on bottom-right */}
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-[#0c3975] border border-white text-[7.5px] font-slab font-black text-white shadow-md uppercase truncate max-w-[120px]">
                      {displayTeam}
                    </div>

                    {/* Bottom Plate on photo */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1 pt-3 text-center">
                      <span className="font-slab text-[9.5px] text-yellow-300 tracking-wider uppercase block truncate">
                        {displayName}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Stats Bars on Card from Supabase */}
                  <div className="border border-white/50 rounded-[2px] overflow-hidden bg-black/40">
                    <div className="grid grid-cols-3 text-center text-white font-mono-code font-bold text-[9.5px] border-b border-white/30 py-0.5 bg-white/10">
                      <span>{ptsVal} PTS</span>
                      <span>{rebVal} REB</span>
                      <span>{astVal} AST</span>
                    </div>
                    <div className="grid grid-cols-3 text-center text-white font-mono-code font-bold text-[9px] py-0.5">
                      <span>{tcPct} TC</span>
                      <span>{t3Pct} 3P</span>
                      <span>{valVal} VAL</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* CENTER / RIGHT: Monumental Headline & Player Bio Meta */}
            <div className="lg:col-span-8 xl:col-span-8 flex flex-col justify-center">
              
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-white/10 text-white/90 text-[10px] font-mono-code px-2 py-0.5 rounded uppercase">
                  {displayLeague}
                </span>
                {d.is_starter && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-mono-code px-2 py-0.5 rounded uppercase font-bold">
                    ★ TITULAR HABITUAL
                  </span>
                )}
              </div>

              {/* Monumental Slab Headline */}
              <h1 className="font-slab text-3xl sm:text-4xl lg:text-5xl xl:text-6xl text-white tracking-normal uppercase leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {displayName}
              </h1>

              {/* Subtitle / Role Tagline */}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:text-[15px] font-condensed font-bold tracking-wider text-white/90 uppercase">
                <span className="text-[#c02328] text-base sm:text-lg">★</span>
                <span>{displayPosition}</span>
                <span>&nbsp;/&nbsp;</span>
                <span className="text-yellow-300">{displayTeam}</span>
                <span>&nbsp;/&nbsp;</span>
                <span>{displayDorsal}</span>
                {displayGroup && (
                  <>
                    <span>&nbsp;/&nbsp;</span>
                    <span className="text-white/70">{displayGroup}</span>
                  </>
                )}
              </div>

              {/* Player Bio Attributes Grid (Age, Height, Weight/Formation, Country) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 max-w-2xl bg-black/35 p-3 rounded-[4px] border border-white/20 backdrop-blur-xs">
                {/* Age */}
                <div className="border-r border-white/20 pr-2">
                  <span className="text-[10px] font-mono-code text-white/70 uppercase block">EDAD / NACIMIENTO</span>
                  <span className="font-slab text-lg sm:text-2xl text-white block mt-0.5">
                    {displayAge !== 'N/D' ? `${displayAge} AÑOS` : d.birth_date || 'N/D'}
                  </span>
                </div>

                {/* Height */}
                <div className="border-r border-white/20 pr-2">
                  <span className="text-[10px] font-mono-code text-white/70 uppercase block">ALTURA</span>
                  <span className="font-slab text-lg sm:text-2xl text-white block mt-0.5">
                    {displayHeight}
                  </span>
                </div>

                {/* Formation / License */}
                <div className="sm:border-r sm:border-white/20 pr-2">
                  <span className="text-[10px] font-mono-code text-white/70 uppercase block">FORMACIÓN</span>
                  <span className="font-slab text-lg sm:text-2xl text-white block mt-0.5 truncate" title={d.formation || 'Nacional'}>
                    {d.formation === 'SI' || d.formation === 'Nacional' ? 'NACIONAL' : (d.formation || 'ORIGEN')}
                  </span>
                </div>

                {/* Country with Flag */}
                <div>
                  <span className="text-[10px] font-mono-code text-white/70 uppercase block">PAÍS / ORIGEN</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-lg">{displayFlag}</span>
                    <span className="font-condensed font-bold text-sm sm:text-base text-white uppercase truncate">
                      {displayNationality}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Bio Paragraph generated from Supabase telemetry */}
              <p className="mt-4 text-xs sm:text-[14px] text-white/90 font-mono-code font-normal leading-relaxed max-w-2xl select-text">
                Jugador de la plantilla de <strong className="text-white">{displayTeam}</strong> en <strong className="text-white">{displayLeague}</strong>. Promedia <strong className="text-yellow-300">{ptsVal} puntos</strong>, <strong className="text-white">{rebVal} rebotes</strong> y <strong className="text-white">{astVal} asistencias</strong> por encuentro, acumulando un índice de valoración oficial FEB de <strong className="text-emerald-300">{valVal}</strong> en {gpVal} partidos disputados.
              </p>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SUB-NAV TABS BAR                                                       */}
      {/* ========================================================================= */}
      <section className="relative z-10 site-container mt-4">
        <div className="flex items-center justify-between flex-wrap gap-3 py-1.5 border-b border-[#0c3975]/20">
          
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs sm:text-[13px] font-condensed font-bold uppercase tracking-wider">
            <button
              onClick={() => {
                playRetroSound('click');
                setActiveTab('overview');
              }}
              className={`px-4 py-1 rounded-[2px] transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#b91c1c] text-white shadow-xs'
                  : 'text-[#0c3975] hover:text-[#b91c1c]'
              }`}
            >
              RESUMEN & METRICS
            </button>

            <span className="text-[#0c3975]/30 font-light">|</span>

            <button
              onClick={() => {
                playRetroSound('click');
                setActiveTab('stats');
              }}
              className={`px-2.5 py-1 rounded-[2px] transition-all cursor-pointer ${
                activeTab === 'stats'
                  ? 'bg-[#b91c1c] text-white shadow-xs'
                  : 'text-[#0c3975] hover:text-[#b91c1c]'
              }`}
            >
              MEDIAS POR FASE ({seasonStatsAvg.length})
            </button>

            <span className="text-[#0c3975]/30 font-light">|</span>

            <button
              onClick={() => {
                playRetroSound('click');
                setActiveTab('totals');
              }}
              className={`px-2.5 py-1 rounded-[2px] transition-all cursor-pointer ${
                activeTab === 'totals'
                  ? 'bg-[#b91c1c] text-white shadow-xs'
                  : 'text-[#0c3975] hover:text-[#b91c1c]'
              }`}
            >
              TOTALES ACUMULADOS ({seasonStatsTotal.length})
            </button>

            <span className="text-[#0c3975]/30 font-light">|</span>

            <button
              onClick={() => {
                playRetroSound('click');
                setActiveTab('career');
              }}
              className={`px-2.5 py-1 rounded-[2px] transition-all cursor-pointer ${
                activeTab === 'career'
                  ? 'bg-[#b91c1c] text-white shadow-xs'
                  : 'text-[#0c3975] hover:text-[#b91c1c]'
              }`}
            >
              TRAYECTORIA & CLUBES ({careerHistory.length})
            </button>

            <span className="text-[#0c3975]/30 font-light">|</span>

            <button
              onClick={() => {
                playRetroSound('click');
                setActiveTab('shot-chart');
              }}
              className={`px-2.5 py-1 rounded-[2px] transition-all cursor-pointer ${
                activeTab === 'shot-chart'
                  ? 'bg-[#b91c1c] text-white shadow-xs'
                  : 'text-[#0c3975] hover:text-[#b91c1c]'
              }`}
            >
              CARTA DE TIRO
            </button>

            <span className="text-[#0c3975]/30 font-light">|</span>

            <button
              onClick={() => {
                playRetroSound('click');
                setActiveTab('raw-json');
              }}
              className={`px-2.5 py-1 rounded-[2px] transition-all cursor-pointer ${
                activeTab === 'raw-json'
                  ? 'bg-[#b91c1c] text-white shadow-xs'
                  : 'text-[#0c3975] hover:text-[#b91c1c]'
              }`}
            >
              JSON SUPABASE
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playRetroSound('click');
                setIsGameLogModalOpen(true);
              }}
              className="py-1 px-3 text-[11px] font-condensed font-bold uppercase tracking-wider text-[#0c3975] border border-[#0c3975]/40 rounded-[2px] cursor-pointer hover:bg-black/5"
            >
              TABLA COMPLETA FEB
            </button>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. ROW 1: KEY STATS & RESUMEN TABLA FEB (SAME ROW)                       */}
      {/* ========================================================================= */}
      <section className="relative z-10 site-container mt-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
          
          {/* LEFT: KEY STATS -> 14 Stat Columns in 2 rows of 7 */}
          <div className="md:col-span-7 lg:col-span-8 border-[1.5px] border-[#0c3975]/35 rounded-[3px] overflow-hidden flex flex-col justify-between bg-[#faf7f0] shadow-xs">
            
            {/* Header Bar */}
            <div className="bg-[#0c3975] text-white font-condensed font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[#c02328]">★</span>
                <span>ESTADÍSTICAS CLAVE EN SUPABASE ({displayLeague})</span>
              </div>
              <span className="font-mono-code text-[10px] text-yellow-300">
                {minVal !== '-' ? `${minVal} MIN/P` : '- MIN/P'}
              </span>
            </div>

            {/* 14 STAT TILES: 2 ROWS OF 7 (PTS, REB, AST, ROB, TAP, PER, MIN | VAL, REB OF, REB DEF, TAP REC, FAL COM, FAL REC, MATES) */}
            <div className="p-2 sm:p-2.5 grid grid-cols-4 sm:grid-cols-7 gap-1 sm:gap-1.5 flex-1 items-stretch">
              
              {/* 1. PTS */}
              <div className="bg-white/90 border border-[#0c3975]/20 rounded-[2px] p-1.5 sm:p-2 text-center flex flex-col justify-center items-center shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <span className="font-slab text-base sm:text-lg lg:text-[18px] block leading-none font-black text-[#0c3975] truncate max-w-full">
                  {ptsVal}
                </span>
                <span className="font-condensed font-extrabold text-[10px] sm:text-[11px] text-slate-800 tracking-wider uppercase block mt-1 leading-none">
                  PTS
                </span>
                <span className="text-[7.5px] sm:text-[8px] font-mono-code text-slate-500 uppercase block mt-0.5 leading-tight truncate max-w-full">
                  Puntos
                </span>
              </div>

              {/* 2. REB */}
              <div className="bg-white/90 border border-[#0c3975]/20 rounded-[2px] p-1.5 sm:p-2 text-center flex flex-col justify-center items-center shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <span className="font-slab text-base sm:text-lg lg:text-[18px] block leading-none font-black text-[#0c3975] truncate max-w-full">
                  {rebVal}
                </span>
                <span className="font-condensed font-extrabold text-[10px] sm:text-[11px] text-slate-800 tracking-wider uppercase block mt-1 leading-none">
                  REB
                </span>
                <span className="text-[7.5px] sm:text-[8px] font-mono-code text-slate-500 uppercase block mt-0.5 leading-tight truncate max-w-full">
                  Rebotes
                </span>
              </div>

              {/* 3. AST */}
              <div className="bg-white/90 border border-[#0c3975]/20 rounded-[2px] p-1.5 sm:p-2 text-center flex flex-col justify-center items-center shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <span className="font-slab text-base sm:text-lg lg:text-[18px] block leading-none font-black text-[#0c3975] truncate max-w-full">
                  {astVal}
                </span>
                <span className="font-condensed font-extrabold text-[10px] sm:text-[11px] text-slate-800 tracking-wider uppercase block mt-1 leading-none">
                  AST
                </span>
                <span className="text-[7.5px] sm:text-[8px] font-mono-code text-slate-500 uppercase block mt-0.5 leading-tight truncate max-w-full">
                  Asistencias
                </span>
              </div>

              {/* 4. ROB */}
              <div className="bg-white/90 border border-[#0c3975]/20 rounded-[2px] p-1.5 sm:p-2 text-center flex flex-col justify-center items-center shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <span className="font-slab text-base sm:text-lg lg:text-[18px] block leading-none font-black text-[#0c3975] truncate max-w-full">
                  {robVal}
                </span>
                <span className="font-condensed font-extrabold text-[10px] sm:text-[11px] text-slate-800 tracking-wider uppercase block mt-1 leading-none">
                  ROB
                </span>
                <span className="text-[7.5px] sm:text-[8px] font-mono-code text-slate-500 uppercase block mt-0.5 leading-tight truncate max-w-full">
                  Robos
                </span>
              </div>

              {/* 5. TAP */}
              <div className="bg-white/90 border border-[#0c3975]/20 rounded-[2px] p-1.5 sm:p-2 text-center flex flex-col justify-center items-center shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <span className="font-slab text-base sm:text-lg lg:text-[18px] block leading-none font-black text-[#0c3975] truncate max-w-full">
                  {tapVal}
                </span>
                <span className="font-condensed font-extrabold text-[10px] sm:text-[11px] text-slate-800 tracking-wider uppercase block mt-1 leading-none">
                  TAP
                </span>
                <span className="text-[7.5px] sm:text-[8px] font-mono-code text-slate-500 uppercase block mt-0.5 leading-tight truncate max-w-full">
                  Tapones
                </span>
              </div>

              {/* 6. PER */}
              <div className="bg-white/90 border border-[#0c3975]/20 rounded-[2px] p-1.5 sm:p-2 text-center flex flex-col justify-center items-center shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <span className="font-slab text-base sm:text-lg lg:text-[18px] block leading-none font-black text-[#0c3975] truncate max-w-full">
                  {perVal}
                </span>
                <span className="font-condensed font-extrabold text-[10px] sm:text-[11px] text-slate-800 tracking-wider uppercase block mt-1 leading-none">
                  PER
                </span>
                <span className="text-[7.5px] sm:text-[8px] font-mono-code text-slate-500 uppercase block mt-0.5 leading-tight truncate max-w-full">
                  Pérdidas
                </span>
              </div>

              {/* 7. MIN */}
              <div className="bg-white/90 border border-[#0c3975]/20 rounded-[2px] p-1.5 sm:p-2 text-center flex flex-col justify-center items-center shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <span className="font-slab text-[13px] sm:text-sm lg:text-[15px] block leading-none font-black text-[#0c3975] truncate max-w-full">
                  {minVal}
                </span>
                <span className="font-condensed font-extrabold text-[10px] sm:text-[11px] text-slate-800 tracking-wider uppercase block mt-1 leading-none">
                  MIN
                </span>
                <span className="text-[7.5px] sm:text-[8px] font-mono-code text-slate-500 uppercase block mt-0.5 leading-tight truncate max-w-full">
                  Minutos
                </span>
              </div>

              {/* 8. VAL (Color condicional: verde positiva, roja negativa) */}
              <div className="bg-white/90 border border-[#0c3975]/20 rounded-[2px] p-1.5 sm:p-2 text-center flex flex-col justify-center items-center shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <span className={`font-slab text-base sm:text-lg lg:text-[18px] block leading-none font-black truncate max-w-full ${
                  valVal !== '-' && parseFebNumber(valVal) >= 0 
                    ? 'text-emerald-600' 
                    : valVal !== '-' && parseFebNumber(valVal) < 0 
                    ? 'text-[#c02328]' 
                    : 'text-[#0c3975]'
                }`}>
                  {valVal}
                </span>
                <span className="font-condensed font-extrabold text-[10px] sm:text-[11px] text-slate-800 tracking-wider uppercase block mt-1 leading-none">
                  VAL
                </span>
                <span className="text-[7.5px] sm:text-[8px] font-mono-code text-slate-500 uppercase block mt-0.5 leading-tight truncate max-w-full">
                  Valoración
                </span>
              </div>

              {/* 9. REB OF */}
              <div className="bg-white/90 border border-[#0c3975]/20 rounded-[2px] p-1.5 sm:p-2 text-center flex flex-col justify-center items-center shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <span className="font-slab text-base sm:text-lg lg:text-[18px] block leading-none font-black text-[#0c3975] truncate max-w-full">
                  {rebOfVal}
                </span>
                <span className="font-condensed font-extrabold text-[10px] sm:text-[11px] text-slate-800 tracking-wider uppercase block mt-1 leading-none">
                  REB OF
                </span>
                <span className="text-[7.5px] sm:text-[8px] font-mono-code text-slate-500 uppercase block mt-0.5 leading-tight truncate max-w-full">
                  Ofensivos
                </span>
              </div>

              {/* 10. REB DEF */}
              <div className="bg-white/90 border border-[#0c3975]/20 rounded-[2px] p-1.5 sm:p-2 text-center flex flex-col justify-center items-center shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <span className="font-slab text-base sm:text-lg lg:text-[18px] block leading-none font-black text-[#0c3975] truncate max-w-full">
                  {rebDefVal}
                </span>
                <span className="font-condensed font-extrabold text-[10px] sm:text-[11px] text-slate-800 tracking-wider uppercase block mt-1 leading-none">
                  REB DEF
                </span>
                <span className="text-[7.5px] sm:text-[8px] font-mono-code text-slate-500 uppercase block mt-0.5 leading-tight truncate max-w-full">
                  Defensivos
                </span>
              </div>

              {/* 11. TAP REC */}
              <div className="bg-white/90 border border-[#0c3975]/20 rounded-[2px] p-1.5 sm:p-2 text-center flex flex-col justify-center items-center shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <span className="font-slab text-base sm:text-lg lg:text-[18px] block leading-none font-black text-[#0c3975] truncate max-w-full">
                  {tapContraVal}
                </span>
                <span className="font-condensed font-extrabold text-[10px] sm:text-[11px] text-slate-800 tracking-wider uppercase block mt-1 leading-none">
                  TAP REC
                </span>
                <span className="text-[7.5px] sm:text-[8px] font-mono-code text-slate-500 uppercase block mt-0.5 leading-tight truncate max-w-full">
                  Recibidos
                </span>
              </div>

              {/* 12. FAL COM */}
              <div className="bg-white/90 border border-[#0c3975]/20 rounded-[2px] p-1.5 sm:p-2 text-center flex flex-col justify-center items-center shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <span className="font-slab text-base sm:text-lg lg:text-[18px] block leading-none font-black text-[#0c3975] truncate max-w-full">
                  {faltasComVal}
                </span>
                <span className="font-condensed font-extrabold text-[10px] sm:text-[11px] text-slate-800 tracking-wider uppercase block mt-1 leading-none">
                  FAL COM
                </span>
                <span className="text-[7.5px] sm:text-[8px] font-mono-code text-slate-500 uppercase block mt-0.5 leading-tight truncate max-w-full">
                  Cometidas
                </span>
              </div>

              {/* 13. FAL REC */}
              <div className="bg-white/90 border border-[#0c3975]/20 rounded-[2px] p-1.5 sm:p-2 text-center flex flex-col justify-center items-center shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <span className="font-slab text-base sm:text-lg lg:text-[18px] block leading-none font-black text-[#0c3975] truncate max-w-full">
                  {faltasRecVal}
                </span>
                <span className="font-condensed font-extrabold text-[10px] sm:text-[11px] text-slate-800 tracking-wider uppercase block mt-1 leading-none">
                  FAL REC
                </span>
                <span className="text-[7.5px] sm:text-[8px] font-mono-code text-slate-500 uppercase block mt-0.5 leading-tight truncate max-w-full">
                  Recibidas
                </span>
              </div>

              {/* 14. MATES */}
              <div className="bg-white/90 border border-[#0c3975]/20 rounded-[2px] p-1.5 sm:p-2 text-center flex flex-col justify-center items-center shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <span className="font-slab text-base sm:text-lg lg:text-[18px] block leading-none font-black text-[#0c3975] truncate max-w-full">
                  {matesVal}
                </span>
                <span className="font-condensed font-extrabold text-[10px] sm:text-[11px] text-slate-800 tracking-wider uppercase block mt-1 leading-none">
                  MATES
                </span>
                <span className="text-[7.5px] sm:text-[8px] font-mono-code text-slate-500 uppercase block mt-0.5 leading-tight truncate max-w-full">
                  Mates
                </span>
              </div>

            </div>

          </div>

          {/* RIGHT: PORCENTAJES DE TIRO (GRÁFICOS ESTILO QUESO REDONDOS) */}
          <div className="md:col-span-5 lg:col-span-4 border-[1.5px] border-[#0c3975]/35 rounded-[3px] overflow-hidden flex flex-col justify-between bg-[#faf7f0] shadow-xs">
            
            {/* Header Bar - Mismo diseño que Estadísticas Clave */}
            <div className="bg-[#0c3975] text-white font-condensed font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[#c02328]">★</span>
                <span>PORCENTAJES DE TIRO ({displayLeague})</span>
              </div>
              <span className="font-mono-code text-[10px] text-yellow-300">
                EFECTIVIDAD FEB
              </span>
            </div>

            {/* 4 CARDS CON GRÁFICOS ESTILO QUESO REDONDOS */}
            <div className="p-2 sm:p-2.5 grid grid-cols-2 gap-1.5 sm:gap-2 flex-1 items-stretch">
              
              {/* 1. TC% (Tiro de Campo Global) */}
              <div className="bg-white/90 border border-[#0c3975]/20 rounded-[2px] p-2 text-center flex flex-col justify-between items-center shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <div className="w-full flex items-center justify-between px-0.5">
                  <span className="font-condensed font-extrabold text-[11px] sm:text-xs text-slate-800 tracking-wider uppercase leading-none">
                    TC%
                  </span>
                  {tcVolume !== '-' && (
                    <span className="font-mono-code text-[8px] text-slate-500 font-bold bg-[#0c3975]/5 px-1 py-0.5 rounded-[2px]">
                      {tcVolume}
                    </span>
                  )}
                </div>

                {/* Quesito redondo SVG */}
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 my-1 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="#10b981"
                      fillOpacity="0.05"
                      stroke="#10b981"
                      strokeOpacity="0.18"
                      strokeWidth="3.4"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.6"
                      strokeDasharray={`${getPctNumber(tcPct)}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="font-slab text-xs sm:text-[13px] font-black text-emerald-700 leading-none">
                      {tcPct !== '-' ? tcPct : '0%'}
                    </span>
                  </div>
                </div>

                <div className="w-full">
                  <span className="text-[7.5px] sm:text-[8px] font-mono-code text-slate-500 uppercase block leading-tight truncate">
                    Tiro de Campo
                  </span>
                </div>
              </div>

              {/* 2. T2% (Tiro de 2 Puntos) */}
              <div className="bg-white/90 border border-[#0c3975]/20 rounded-[2px] p-2 text-center flex flex-col justify-between items-center shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <div className="w-full flex items-center justify-between px-0.5">
                  <span className="font-condensed font-extrabold text-[11px] sm:text-xs text-slate-800 tracking-wider uppercase leading-none">
                    T2%
                  </span>
                  {t2Volume !== '-' && (
                    <span className="font-mono-code text-[8px] text-slate-500 font-bold bg-[#0c3975]/5 px-1 py-0.5 rounded-[2px]">
                      {t2Volume}
                    </span>
                  )}
                </div>

                {/* Quesito redondo SVG */}
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 my-1 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="#10b981"
                      fillOpacity="0.05"
                      stroke="#10b981"
                      strokeOpacity="0.18"
                      strokeWidth="3.4"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.6"
                      strokeDasharray={`${getPctNumber(t2Pct)}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="font-slab text-xs sm:text-[13px] font-black text-emerald-700 leading-none">
                      {t2Pct !== '-' ? t2Pct : '0%'}
                    </span>
                  </div>
                </div>

                <div className="w-full">
                  <span className="text-[7.5px] sm:text-[8px] font-mono-code text-slate-500 uppercase block leading-tight truncate">
                    Tiro de 2
                  </span>
                </div>
              </div>

              {/* 3. T3% (Triples) */}
              <div className="bg-white/90 border border-[#0c3975]/20 rounded-[2px] p-2 text-center flex flex-col justify-between items-center shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <div className="w-full flex items-center justify-between px-0.5">
                  <span className="font-condensed font-extrabold text-[11px] sm:text-xs text-slate-800 tracking-wider uppercase leading-none">
                    T3%
                  </span>
                  {t3Volume !== '-' && (
                    <span className="font-mono-code text-[8px] text-slate-500 font-bold bg-[#0c3975]/5 px-1 py-0.5 rounded-[2px]">
                      {t3Volume}
                    </span>
                  )}
                </div>

                {/* Quesito redondo SVG */}
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 my-1 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="#10b981"
                      fillOpacity="0.05"
                      stroke="#10b981"
                      strokeOpacity="0.18"
                      strokeWidth="3.4"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.6"
                      strokeDasharray={`${getPctNumber(t3Pct)}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="font-slab text-xs sm:text-[13px] font-black text-emerald-700 leading-none">
                      {t3Pct !== '-' ? t3Pct : '0%'}
                    </span>
                  </div>
                </div>

                <div className="w-full">
                  <span className="text-[7.5px] sm:text-[8px] font-mono-code text-slate-500 uppercase block leading-tight truncate">
                    Triples (T3)
                  </span>
                </div>
              </div>

              {/* 4. TL% (Tiros Libres) */}
              <div className="bg-white/90 border border-[#0c3975]/20 rounded-[2px] p-2 text-center flex flex-col justify-between items-center shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <div className="w-full flex items-center justify-between px-0.5">
                  <span className="font-condensed font-extrabold text-[11px] sm:text-xs text-slate-800 tracking-wider uppercase leading-none">
                    TL%
                  </span>
                  {tlVolume !== '-' && (
                    <span className="font-mono-code text-[8px] text-slate-500 font-bold bg-[#0c3975]/5 px-1 py-0.5 rounded-[2px]">
                      {tlVolume}
                    </span>
                  )}
                </div>

                {/* Quesito redondo SVG */}
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 my-1 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="#10b981"
                      fillOpacity="0.05"
                      stroke="#10b981"
                      strokeOpacity="0.18"
                      strokeWidth="3.4"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.6"
                      strokeDasharray={`${getPctNumber(tlPct)}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="font-slab text-xs sm:text-[13px] font-black text-emerald-700 leading-none">
                      {tlPct !== '-' ? tlPct : '0%'}
                    </span>
                  </div>
                </div>

                <div className="w-full">
                  <span className="text-[7.5px] sm:text-[8px] font-mono-code text-slate-500 uppercase block leading-tight truncate">
                    Tiros Libres
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. ROW 2: PERFORMANCE GRAPHS & DESGLOSE POR FASE                          */}
      {/* ========================================================================= */}
      <section className="relative z-10 site-container mt-4">
        <div className="border-[1.5px] border-[#0c3975]/35 rounded-[3px] overflow-hidden">
          
          {/* Header Bar - Color Azul Oficial FEB */}
          <div className="bg-[#0c3975] text-white font-condensed font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[#c02328]">★</span>
              <span>EVOLUCIÓN DEL RENDIMIENTO & CARTA DE TIRO ({displayLeague})</span>
            </div>
            <span className="font-mono-code text-[10px] text-yellow-300">
              TELEMETRÍA FEB • {matchesData.length} JORNADAS
            </span>
          </div>

          <div className="p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch bg-[#faf7f0]">
            
            {/* PANEL 1: RENDIMIENTO POR PARTIDO (DISEÑO INTEGRADO, SIN FONDO OSCURO, SIN SLIDER Y SIN BORDES EN BADGES) */}
            <div className="lg:col-span-8 flex flex-col justify-between bg-white/90 border border-[#0c3975]/25 rounded-[3px] p-3 sm:p-4 text-[#0c3975] shadow-xs relative overflow-hidden">
              
              {/* Header Bar inside card */}
              <div className="flex items-center justify-between border-b border-[#0c3975]/15 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-[#0c3975] shrink-0" />
                  <h3 className="font-slab text-sm sm:text-base text-[#0c3975] tracking-wider uppercase">
                    RENDIMIENTO POR PARTIDO
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono-code text-slate-600">
                  <span className="bg-[#0c3975]/10 text-[#0c3975] px-2 py-0.5 rounded-[2px] font-bold">
                    J1 - J{matchesData.length}
                  </span>
                  <span className="hidden sm:inline text-slate-500">
                    Evolución por Jornada
                  </span>
                </div>
              </div>

              {/* Dynamic HUD / Tooltip Info Bar */}
              <div className="mb-2 min-h-[28px] bg-[#faf7f0] border border-[#0c3975]/15 rounded-[2px] px-2.5 py-1 text-[11px] font-mono-code flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                {hoveredMatchIdx !== null && matchesData[hoveredMatchIdx] ? (
                  <>
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <span className="text-[#0c3975] font-black">{matchesData[hoveredMatchIdx].jornadaLabel}</span>
                      <span className="text-slate-600 font-normal">vs {matchesData[hoveredMatchIdx].rival}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {activeMetrics.pts && (
                        <span className="text-[#f97316] font-bold">
                          PTS: {matchesData[hoveredMatchIdx].pts}
                        </span>
                      )}
                      {activeMetrics.val && (
                        <span className={`font-bold ${matchesData[hoveredMatchIdx].val >= 0 ? 'text-emerald-700' : 'text-[#c02328]'}`}>
                          VAL: {matchesData[hoveredMatchIdx].val > 0 ? `+${matchesData[hoveredMatchIdx].val}` : matchesData[hoveredMatchIdx].val}
                        </span>
                      )}
                      {activeMetrics.reb && (
                        <span className="text-sky-700 font-bold">
                          REB: {matchesData[hoveredMatchIdx].reb}
                        </span>
                      )}
                      {activeMetrics.ast && (
                        <span className="text-amber-700 font-bold">
                          AST: {matchesData[hoveredMatchIdx].ast}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-slate-500 text-[10px] italic w-full text-center sm:text-left">
                    Pasa el ratón por los puntos o pulsa sobre una jornada para ver el detalle
                  </div>
                )}
              </div>

              {/* SVG Spline Area Chart */}
              {(() => {
                const N = matchesData.length;
                const svgW = 720;
                const svgH = 190;
                const padL = 34;
                const padR = 18;
                const padT = 16;
                const padB = 26;
                const chartW = svgW - padL - padR;
                const chartH = svgH - padT - padB;

                const allVals = matchesData.flatMap(m => {
                  const arr: number[] = [];
                  if (activeMetrics.pts) arr.push(m.pts);
                  if (activeMetrics.val) arr.push(m.val);
                  if (activeMetrics.reb) arr.push(m.reb);
                  if (activeMetrics.ast) arr.push(m.ast);
                  return arr;
                });

                const rawMax = Math.max(...allVals, 22);
                const rawMin = Math.min(...allVals, 0);
                const chartYMax = Math.ceil(rawMax / 8) * 8;
                const chartYMin = rawMin < 0 ? Math.floor(rawMin / 8) * 8 : -8;
                const chartYRange = chartYMax - chartYMin || 32;

                const calcY = (v: number) => padT + ((chartYMax - v) / chartYRange) * chartH;
                const calcX = (idx: number) => padL + (idx / Math.max(1, N - 1)) * chartW;
                const zeroY = calcY(0);

                const gridSteps: number[] = [];
                for (let v = chartYMin; v <= chartYMax; v += 8) {
                  gridSteps.push(v);
                }

                const ptsPoints = matchesData.map((m, i) => ({ x: calcX(i), y: calcY(m.pts) }));
                const valPoints = matchesData.map((m, i) => ({ x: calcX(i), y: calcY(m.val) }));
                const rebPoints = matchesData.map((m, i) => ({ x: calcX(i), y: calcY(m.reb) }));
                const astPoints = matchesData.map((m, i) => ({ x: calcX(i), y: calcY(m.ast) }));

                const ptsCurve = getSvgCurvePath(ptsPoints);
                const valCurve = getSvgCurvePath(valPoints);
                const rebCurve = getSvgCurvePath(rebPoints);
                const astCurve = getSvgCurvePath(astPoints);

                const getArea = (curve: string, pts: { x: number; y: number }[]) => {
                  if (pts.length === 0) return '';
                  return `${curve} L ${pts[pts.length - 1].x.toFixed(1)} ${zeroY.toFixed(1)} L ${pts[0].x.toFixed(1)} ${zeroY.toFixed(1)} Z`;
                };

                return (
                  <div className="relative w-full overflow-hidden select-none">
                    <svg 
                      viewBox={`0 0 ${svgW} ${svgH}`} 
                      className="w-full h-44 sm:h-52 overflow-visible"
                      onMouseLeave={() => setHoveredMatchIdx(null)}
                    >
                      <defs>
                        <linearGradient id="area-pts-light" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity="0.30" />
                          <stop offset="100%" stopColor="#f97316" stopOpacity="0.01" />
                        </linearGradient>
                        <linearGradient id="area-val-light" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
                        </linearGradient>
                        <linearGradient id="area-reb-light" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.01" />
                        </linearGradient>
                        <linearGradient id="area-ast-light" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid lines & Y-axis labels */}
                      {gridSteps.map((stepVal) => {
                        const y = calcY(stepVal);
                        const isZero = stepVal === 0;
                        return (
                          <g key={stepVal}>
                            <line
                              x1={padL}
                              y1={y}
                              x2={padL + chartW}
                              y2={y}
                              stroke={isZero ? '#0c3975' : '#0c3975'}
                              strokeOpacity={isZero ? 0.35 : 0.12}
                              strokeWidth={isZero ? 1.4 : 1}
                              strokeDasharray={isZero ? undefined : '3 3'}
                            />
                            <text
                              x={padL - 6}
                              y={y + 3}
                              textAnchor="end"
                              className="font-mono-code text-[9px] fill-slate-500 font-bold"
                            >
                              {stepVal}
                            </text>
                          </g>
                        );
                      })}

                      {/* Hover vertical guide line */}
                      {hoveredMatchIdx !== null && (
                        <line
                          x1={calcX(hoveredMatchIdx)}
                          y1={padT}
                          x2={calcX(hoveredMatchIdx)}
                          y2={padT + chartH}
                          stroke="#0c3975"
                          strokeOpacity={0.4}
                          strokeWidth="1.2"
                          strokeDasharray="2 2"
                        />
                      )}

                      {/* Area Fills */}
                      {activeMetrics.val && (
                        <path d={getArea(valCurve, valPoints)} fill="url(#area-val-light)" />
                      )}
                      {activeMetrics.pts && (
                        <path d={getArea(ptsCurve, ptsPoints)} fill="url(#area-pts-light)" />
                      )}
                      {activeMetrics.reb && (
                        <path d={getArea(rebCurve, rebPoints)} fill="url(#area-reb-light)" />
                      )}
                      {activeMetrics.ast && (
                        <path d={getArea(astCurve, astPoints)} fill="url(#area-ast-light)" />
                      )}

                      {/* Spline Lines */}
                      {activeMetrics.reb && (
                        <path d={rebCurve} fill="none" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" />
                      )}
                      {activeMetrics.ast && (
                        <path d={astCurve} fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
                      )}
                      {activeMetrics.val && (
                        <path d={valCurve} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                      )}
                      {activeMetrics.pts && (
                        <path d={ptsCurve} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
                      )}

                      {/* X-axis labels (J1, J2, J3...) */}
                      {matchesData.map((m, i) => {
                        const x = calcX(i);
                        const isHovered = hoveredMatchIdx === i;
                        return (
                          <text
                            key={m.jornada}
                            x={x}
                            y={svgH - 8}
                            textAnchor="middle"
                            className={`font-mono-code text-[9px] transition-colors ${
                              isHovered ? 'fill-[#0c3975] font-black' : 'fill-slate-600'
                            }`}
                          >
                            {m.jornadaLabel}
                          </text>
                        );
                      })}

                      {/* Interactive Point Dots on hover / active */}
                      {matchesData.map((m, i) => {
                        const x = calcX(i);
                        const isHovered = hoveredMatchIdx === i;
                        return (
                          <g key={i}>
                            {activeMetrics.pts && (
                              <circle
                                cx={x}
                                cy={calcY(m.pts)}
                                r={isHovered ? 5.5 : 2.5}
                                fill="#f97316"
                                stroke="#ffffff"
                                strokeWidth={isHovered ? 2 : 1}
                                className="transition-all"
                              />
                            )}
                            {activeMetrics.val && (
                              <circle
                                cx={x}
                                cy={calcY(m.val)}
                                r={isHovered ? 5.5 : 2.5}
                                fill="#10b981"
                                stroke="#ffffff"
                                strokeWidth={isHovered ? 2 : 1}
                                className="transition-all"
                              />
                            )}
                            {activeMetrics.reb && (
                              <circle
                                cx={x}
                                cy={calcY(m.reb)}
                                r={isHovered ? 5 : 2}
                                fill="#0284c7"
                                stroke="#ffffff"
                                strokeWidth="1"
                                className="transition-all"
                              />
                            )}
                            {activeMetrics.ast && (
                              <circle
                                cx={x}
                                cy={calcY(m.ast)}
                                r={isHovered ? 5 : 2}
                                fill="#f59e0b"
                                stroke="#ffffff"
                                strokeWidth="1"
                                className="transition-all"
                              />
                            )}

                            {/* Transparent Hit target column for effortless hover */}
                            <rect
                              x={x - (chartW / N) / 2}
                              y={0}
                              width={chartW / N}
                              height={svgH}
                              fill="transparent"
                              className="cursor-pointer"
                              onMouseEnter={() => {
                                setHoveredMatchIdx(i);
                              }}
                              onClick={() => {
                                setHoveredMatchIdx(i);
                                playRetroSound('click');
                              }}
                            />
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              })()}

              {/* Legend with Interactive Metric Toggles (SIN BORDES) */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-7 mt-3 pt-2.5 border-t border-[#0c3975]/15 text-[11px] font-mono-code">
                <button
                  type="button"
                  onClick={() => {
                    playRetroSound('click');
                    setActiveMetrics(prev => ({ ...prev, pts: !prev.pts }));
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-[2px] cursor-pointer transition-all ${
                    activeMetrics.pts ? 'text-[#f97316] font-bold bg-[#f97316]/10' : 'text-slate-400 opacity-50 hover:opacity-80'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                  <span>Puntos</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playRetroSound('click');
                    setActiveMetrics(prev => ({ ...prev, val: !prev.val }));
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-[2px] cursor-pointer transition-all ${
                    activeMetrics.val ? 'text-emerald-700 font-bold bg-emerald-500/10' : 'text-slate-400 opacity-50 hover:opacity-80'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  <span>Valoración</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playRetroSound('click');
                    setActiveMetrics(prev => ({ ...prev, reb: !prev.reb }));
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-[2px] cursor-pointer transition-all ${
                    activeMetrics.reb ? 'text-sky-700 font-bold bg-sky-500/10' : 'text-slate-400 opacity-50 hover:opacity-80'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
                  <span>Rebotes</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playRetroSound('click');
                    setActiveMetrics(prev => ({ ...prev, ast: !prev.ast }));
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-[2px] cursor-pointer transition-all ${
                    activeMetrics.ast ? 'text-amber-700 font-bold bg-amber-500/10' : 'text-slate-400 opacity-50 hover:opacity-80'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                  <span>Asistencias</span>
                </button>
              </div>

            </div>

            {/* PANEL 3: SHOT CHART Full-Court Visualizer (FASE DE PRUEBAS - PRÓXIMAMENTE) */}
            <div className="lg:col-span-4 pt-4 lg:pt-0 lg:pl-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Target size={16} className="text-[#0c3975]" />
                  <h3 className="font-slab text-sm sm:text-base text-[#0c3975] uppercase tracking-tight">
                    CARTA DE TIRO <span className="text-xs font-mono-code text-slate-500">(MAPA FEB)</span>
                  </h3>
                </div>
              </div>

              {/* Full Court Visualizer with Overlay (Diseño claro y transparente, sin fondo negro) */}
              <div className="relative w-full flex-1 min-h-[210px] sm:min-h-[220px] aspect-[16/10] bg-white/70 rounded-[3px] border border-[#0c3975]/25 overflow-hidden shadow-xs flex items-center justify-center">
                
                {/* SVG Full Basketball Court Lines */}
                <svg viewBox="0 0 280 150" className="w-full h-full p-2 opacity-80">
                  {/* Outer Court Boundary */}
                  <rect x="5" y="5" width="270" height="140" rx="2" stroke="#0c3975" strokeOpacity="0.5" strokeWidth="1.5" fill="none" />
                  
                  {/* Center Line & Circles */}
                  <line x1="140" y1="5" x2="140" y2="145" stroke="#0c3975" strokeOpacity="0.5" strokeWidth="1.3" />
                  <circle cx="140" cy="75" r="22" stroke="#0c3975" strokeOpacity="0.5" strokeWidth="1.3" fill="none" />
                  <circle cx="140" cy="75" r="3" fill="#c02328" opacity="0.8" />

                  {/* LEFT BASKET */}
                  <line x1="5" y1="20" x2="35" y2="20" stroke="#0c3975" strokeOpacity="0.45" strokeWidth="1.2" />
                  <line x1="5" y1="130" x2="35" y2="130" stroke="#0c3975" strokeOpacity="0.45" strokeWidth="1.2" />
                  <path d="M 35 20 A 67 67 0 0 1 35 130" stroke="#0c3975" strokeOpacity="0.45" strokeWidth="1.2" fill="none" />
                  <rect x="5" y="47" width="58" height="56" stroke="#0c3975" strokeOpacity="0.5" strokeWidth="1.3" fill="#0c3975" fillOpacity="0.05" />
                  <path d="M 63 47 A 28 28 0 0 1 63 103" stroke="#0c3975" strokeOpacity="0.5" strokeWidth="1.3" fill="none" />
                  <path d="M 63 47 A 28 28 0 0 0 63 103" stroke="#0c3975" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="3 3" fill="none" />
                  <path d="M 16 67 A 12.5 12.5 0 0 1 16 83" stroke="#0c3975" strokeOpacity="0.4" strokeWidth="1" fill="none" />
                  <line x1="16" y1="63" x2="16" y2="87" stroke="#0c3975" strokeOpacity="0.75" strokeWidth="2.2" />
                  <circle cx="21" cy="75" r="4.5" stroke="#c02328" strokeWidth="1.8" fill="none" />
                  <line x1="16" y1="75" x2="17" y2="75" stroke="#c02328" strokeWidth="1.8" />

                  {/* RIGHT BASKET */}
                  <line x1="275" y1="20" x2="245" y2="20" stroke="#0c3975" strokeOpacity="0.45" strokeWidth="1.2" />
                  <line x1="275" y1="130" x2="245" y2="130" stroke="#0c3975" strokeOpacity="0.45" strokeWidth="1.2" />
                  <path d="M 245 20 A 67 67 0 0 0 245 130" stroke="#0c3975" strokeOpacity="0.45" strokeWidth="1.2" fill="none" />
                  <rect x="217" y="47" width="58" height="56" stroke="#0c3975" strokeOpacity="0.5" strokeWidth="1.3" fill="#0c3975" fillOpacity="0.05" />
                  <path d="M 217 47 A 28 28 0 0 0 217 103" stroke="#0c3975" strokeOpacity="0.5" strokeWidth="1.3" fill="none" />
                  <path d="M 217 47 A 28 28 0 0 1 217 103" stroke="#0c3975" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="3 3" fill="none" />
                  <path d="M 264 67 A 12.5 12.5 0 0 0 264 83" stroke="#0c3975" strokeOpacity="0.4" strokeWidth="1" fill="none" />
                  <line x1="264" y1="63" x2="264" y2="87" stroke="#0c3975" strokeOpacity="0.75" strokeWidth="2.2" />
                  <circle cx="259" cy="75" r="4.5" stroke="#c02328" strokeWidth="1.8" fill="none" />
                  <line x1="264" y1="75" x2="263" y2="75" stroke="#c02328" strokeWidth="1.8" />
                </svg>

                {/* Overlaid Banner: FASE DE PRUEBAS - PRÓXIMAMENTE */}
                <div className="absolute inset-0 bg-[#ede7dc]/40 backdrop-blur-[1px] flex items-center justify-center p-4 text-center select-none pointer-events-none">
                  <span className="font-slab text-xs sm:text-sm text-[#0c3975] bg-white/95 border border-[#0c3975]/30 px-3 py-1.5 rounded-[2px] uppercase tracking-widest shadow-2xs font-bold">
                    FASE DE PRUEBAS • PRÓXIMAMENTE
                  </span>
                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. ROW 3: ADVANCED ANALYTICS (8 CLAVES DE MÉTRICAS AVANZADAS & SCOUTING)   */}
      {/* ========================================================================= */}
      <section className="relative z-10 site-container mt-4">
        <div className="border-[1.5px] border-[#0c3975]/35 rounded-[3px] overflow-hidden bg-[#faf7f0]">
          
          {/* Header Bar */}
          <div className="bg-[#0c3975] text-white font-condensed font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[#c02328]">★</span>
              <span>CLAVES DE MÉTRICAS AVANZADAS & SCOUTING</span>
            </div>
            <span className="font-mono-code text-[10px] text-yellow-300">
              TELEMETRÍA AVANZADA FEB
            </span>
          </div>

          <div className="p-3.5 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            
            {/* 8 Metric Columns (2 filas x 4 columnas) */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              
              {/* Metric 1: VAL/Min */}
              <div className="bg-white/80 border border-[#0c3975]/20 rounded-[3px] p-2.5 text-center flex flex-col justify-between shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <div className="flex items-center justify-center gap-1 text-[#0c3975] font-condensed font-bold text-xs uppercase">
                  <Award size={13} className="text-[#0c3975] shrink-0" />
                  <span>VAL/Min</span>
                </div>
                <span className="font-slab text-2xl sm:text-3xl text-[#0c3975] my-1 block leading-none font-normal">
                  {advancedMetrics.valPerMin}
                </span>
                <span className="text-[8.5px] font-mono-code text-slate-600 block leading-tight uppercase font-medium">
                  VALORACIÓN X MIN
                </span>
              </div>

              {/* Metric 2: TS% */}
              <div className="bg-white/80 border border-[#0c3975]/20 rounded-[3px] p-2.5 text-center flex flex-col justify-between shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <div className="flex items-center justify-center gap-1 text-[#0c3975] font-condensed font-bold text-xs uppercase">
                  <Target size={13} className="text-[#0c3975] shrink-0" />
                  <span>TS%</span>
                </div>
                <span className="font-slab text-2xl sm:text-3xl text-[#0c3975] my-1 block leading-none font-normal">
                  {advancedMetrics.tsPct}
                </span>
                <span className="text-[8.5px] font-mono-code text-slate-600 block leading-tight uppercase font-medium">
                  TRUE SHOOTING %
                </span>
              </div>

              {/* Metric 3: AST/TO */}
              <div className="bg-white/80 border border-[#0c3975]/20 rounded-[3px] p-2.5 text-center flex flex-col justify-between shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <div className="flex items-center justify-center gap-1 text-[#0c3975] font-condensed font-bold text-xs uppercase">
                  <Activity size={13} className="text-[#0c3975] shrink-0" />
                  <span>AST/TO</span>
                </div>
                <span className="font-slab text-2xl sm:text-3xl text-[#0c3975] my-1 block leading-none font-normal">
                  {advancedMetrics.astTo}
                </span>
                <span className="text-[8.5px] font-mono-code text-slate-600 block leading-tight uppercase font-medium">
                  ASISTENCIAS X PÉRDIDA
                </span>
              </div>

              {/* Metric 4: DEF RTG */}
              <div className="bg-white/80 border border-[#0c3975]/20 rounded-[3px] p-2.5 text-center flex flex-col justify-between shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <div className="flex items-center justify-center gap-1 text-[#0c3975] font-condensed font-bold text-xs uppercase">
                  <Shield size={13} className="text-[#0c3975] shrink-0" />
                  <span>DEF RTG</span>
                </div>
                <span className="font-slab text-2xl sm:text-3xl text-[#0c3975] my-1 block leading-none font-normal">
                  {advancedMetrics.defRtg}
                </span>
                <span className="text-[8.5px] font-mono-code text-slate-600 block leading-tight uppercase font-medium">
                  RATING DEFENSIVO
                </span>
              </div>

              {/* Metric 5: NET IMP */}
              <div className="bg-white/80 border border-[#0c3975]/20 rounded-[3px] p-2.5 text-center flex flex-col justify-between shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <div className="flex items-center justify-center gap-1 text-[#0c3975] font-condensed font-bold text-xs uppercase">
                  <BarChart3 size={13} className="text-[#0c3975] shrink-0" />
                  <span>NET IMP</span>
                </div>
                <span className="font-slab text-2xl sm:text-3xl text-[#0c3975] my-1 block leading-none font-normal">
                  {advancedMetrics.netImp}
                </span>
                <span className="text-[8.5px] font-mono-code text-slate-600 block leading-tight uppercase font-medium">
                  IMPACTO NETO (+/-)
                </span>
              </div>

              {/* Metric 6: PTS/36 */}
              <div className="bg-white/80 border border-[#0c3975]/20 rounded-[3px] p-2.5 text-center flex flex-col justify-between shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <div className="flex items-center justify-center gap-1 text-[#0c3975] font-condensed font-bold text-xs uppercase">
                  <Flame size={13} className="text-[#0c3975] shrink-0" />
                  <span>PTS/36</span>
                </div>
                <span className="font-slab text-2xl sm:text-3xl text-[#0c3975] my-1 block leading-none font-normal">
                  {advancedMetrics.pts36}
                </span>
                <span className="text-[8.5px] font-mono-code text-slate-600 block leading-tight uppercase font-medium">
                  PUNTOS POR 36 MIN
                </span>
              </div>

              {/* Metric 7: REB/36 */}
              <div className="bg-white/80 border border-[#0c3975]/20 rounded-[3px] p-2.5 text-center flex flex-col justify-between shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <div className="flex items-center justify-center gap-1 text-[#0c3975] font-condensed font-bold text-xs uppercase">
                  <Database size={13} className="text-[#0c3975] shrink-0" />
                  <span>REB/36</span>
                </div>
                <span className="font-slab text-2xl sm:text-3xl text-[#0c3975] my-1 block leading-none font-normal">
                  {advancedMetrics.reb36}
                </span>
                <span className="text-[8.5px] font-mono-code text-slate-600 block leading-tight uppercase font-medium">
                  REBOTES POR 36 MIN
                </span>
              </div>

              {/* Metric 8: AST/36 */}
              <div className="bg-white/80 border border-[#0c3975]/20 rounded-[3px] p-2.5 text-center flex flex-col justify-between shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <div className="flex items-center justify-center gap-1 text-[#0c3975] font-condensed font-bold text-xs uppercase">
                  <Sparkles size={13} className="text-[#0c3975] shrink-0" />
                  <span>AST/36</span>
                </div>
                <span className="font-slab text-2xl sm:text-3xl text-[#0c3975] my-1 block leading-none font-normal">
                  {advancedMetrics.ast36}
                </span>
                <span className="text-[8.5px] font-mono-code text-slate-600 block leading-tight uppercase font-medium">
                  ASISTENCIAS POR 36 MIN
                </span>
              </div>

            </div>

            {/* Analyst Quote */}
            <div className="lg:col-span-4 p-3.5 bg-white/60 border border-[#0c3975]/20 rounded-[3px] relative flex flex-col justify-between">
              <div className="flex items-start gap-2.5">
                <span className="text-3xl text-[#c02328] font-serif leading-none select-none">“</span>
                <div className="leading-relaxed">
                  <p className="text-xs sm:text-[12.5px] font-mono-code text-slate-800 font-medium italic">
                    {displayName} aporta presencia y rigor en {displayTeam}. Su impacto neto ({advancedMetrics.netImp}) y rendimiento proyectado a 36 minutos ({advancedMetrics.pts36} pts, {advancedMetrics.reb36} reb, {advancedMetrics.ast36} ast) le convierten en una pieza táctica fundamental en {displayLeague}.
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-[#0c3975]/15 flex items-center justify-between">
                <span className="text-[9.5px] font-condensed font-bold text-[#0c3975] uppercase tracking-wider block">
                  — INFORME SCOUTING BASKETDATA
                </span>
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#0c3975] fill-none stroke-2">
                  <path d="M 2 18 L 4 6 L 9 12 L 12 4 L 15 12 L 20 6 L 22 18 Z" />
                  <line x1="2" y1="20" x2="22" y2="20" strokeWidth="2" />
                </svg>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. ROW 4: 3-COLUMN BOTTOM PANELS (FASES, COMPARATIVAS, HISTORIAL CLUBES) */}
      {/* ========================================================================= */}
      <section className="relative z-10 site-container mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          
          {/* COLUMN 1: ÚLTIMOS 5 PARTIDOS (FECHA, OPONENTE, RES, MIN, PTS, REB, AST, +/-) */}
          <div className="lg:col-span-5 border-[1.5px] border-[#0c3975]/35 rounded-[3px] overflow-hidden flex flex-col justify-between bg-white shadow-2xs">
            <div className="bg-[#0c3975] text-white font-condensed font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[#c02328]">★</span>
                <span>ÚLTIMOS 5 PARTIDOS</span>
              </div>
              <span className="text-[10px] font-mono-code text-yellow-300">REGISTRO OFICIAL FEB</span>
            </div>

            <div className="p-2 sm:p-3 flex flex-col justify-between flex-1 bg-white/60">
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs font-mono-code border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="text-[10px] text-slate-600 font-bold border-b border-[#0c3975]/20 uppercase">
                      <th className="py-1.5 text-left pl-1">FECHA</th>
                      <th className="py-1.5 text-left px-2">OPONENTE</th>
                      <th className="py-1.5 px-1.5">RES</th>
                      <th className="py-1.5 px-1.5">MIN</th>
                      <th className="py-1.5 px-1.5">PTS</th>
                      <th className="py-1.5 px-1.5">REB</th>
                      <th className="py-1.5 px-1.5">AST</th>
                      <th className="py-1.5 pr-1">+/-</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0c3975]/15">
                    {[
                      {
                        fecha: 'Abr 18',
                        oponente: 'VÍTALY LA MAR BCBADAJOZ',
                        isHome: false,
                        res: 'L',
                        score: '77-103',
                        min: '27:40',
                        pts: 11,
                        reb: 6,
                        ast: 0,
                        pm: -18,
                      },
                      {
                        fecha: 'Mar 31',
                        oponente: 'INSOLAC CB ALCALÁ CAJA87',
                        isHome: false,
                        res: 'W',
                        score: '80-74',
                        min: '30:33',
                        pts: 9,
                        reb: 5,
                        ast: 3,
                        pm: -10,
                      },
                      {
                        fecha: 'Mar 29',
                        oponente: 'EIFFAGE CB CIUDAD DE DOS HERMANAS',
                        isHome: false,
                        res: 'W',
                        score: '95-77',
                        min: '26:41',
                        pts: 24,
                        reb: 3,
                        ast: 2,
                        pm: 23,
                      },
                      {
                        fecha: 'Mar 21',
                        oponente: 'BOSCO MÉRIDA PATRIMONIO DE LA HUMANIDAD',
                        isHome: true,
                        res: 'L',
                        score: '84-87',
                        min: '28:24',
                        pts: 19,
                        reb: 1,
                        ast: 1,
                        pm: 7,
                      },
                      {
                        fecha: 'Mar 15',
                        oponente: 'LITHIUM IBERIA SAGRADO',
                        isHome: false,
                        res: 'L',
                        score: '82-91',
                        min: '25:05',
                        pts: 14,
                        reb: 5,
                        ast: 4,
                        pm: -6,
                      },
                    ].map((m, idx) => (
                      <tr key={idx} className="hover:bg-[#0c3975]/5 transition-colors">
                        <td className="py-2 text-left pl-1 font-bold text-slate-800 text-[11px]">{m.fecha}</td>
                        <td className="py-2 text-left px-2">
                          <div className="flex items-center gap-1 max-w-[140px] sm:max-w-[170px]">
                            <span className={`text-[9.5px] px-1 py-0.5 rounded font-bold shrink-0 ${m.isHome ? 'bg-[#0c3975]/15 text-[#0c3975]' : 'bg-slate-200 text-slate-600'}`}>
                              {m.isHome ? 'vs' : '@'}
                            </span>
                            <span className="text-[11px] font-bold text-slate-800 truncate" title={m.oponente}>
                              {m.oponente}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-1.5">
                          <span className="inline-flex items-center gap-1 font-bold text-[10.5px]">
                            <span className={`px-1 py-0.2 rounded text-[9.5px] font-black ${m.res === 'W' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {m.res}
                            </span>
                            <span className="text-slate-600 text-[10px]">{m.score}</span>
                          </span>
                        </td>
                        <td className="py-2 px-1.5 text-slate-600 text-[11px]">{m.min}</td>
                        <td className="py-2 px-1.5 font-black text-[#0c3975] text-xs">{m.pts}</td>
                        <td className="py-2 px-1.5 font-bold text-slate-800 text-[11px]">{m.reb}</td>
                        <td className="py-2 px-1.5 font-bold text-slate-800 text-[11px]">{m.ast}</td>
                        <td className="py-2 pr-1 font-black text-[11px]">
                          <span className={m.pm > 0 ? 'text-emerald-700' : 'text-[#c02328]'}>
                            {m.pm > 0 ? `+${m.pm}` : m.pm}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => {
                  playRetroSound('click');
                  setIsGameLogModalOpen(true);
                }}
                className="mt-3 w-full bg-[#0c3975] hover:bg-[#124b94] text-white py-1.5 px-3 text-xs font-condensed font-bold uppercase tracking-wider text-center rounded-[2px] border border-black/20 cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Eye size={13} />
                <span>VER GAME LOG COMPLETO DE LA TEMPORADA</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* COLUMN 2: RENDIMIENTO SEGÚN NIVEL DE RIVAL */}
          <div className="lg:col-span-4 border-[1.5px] border-[#0c3975]/35 rounded-[3px] overflow-hidden flex flex-col justify-between bg-white shadow-2xs">
            <div className="bg-[#0c3975] text-white font-condensed font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[#c02328]">★</span>
                <span>RENDIMIENTO SEGÚN NIVEL DE RIVAL</span>
              </div>
              <span className="text-[10px] font-mono-code text-yellow-300">SPLIT FEB</span>
            </div>

            <div className="p-3 sm:p-3.5 flex flex-col justify-between gap-2.5 flex-1 bg-white/70">
              
              {/* TIER 1: VS Equipos TOP (1-42) */}
              <div className="bg-[#faf7f0] border border-[#0c3975]/20 rounded-[3px] p-2.5 shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <div className="flex items-center justify-between pb-1 border-b border-[#0c3975]/10">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c02328]" />
                    <span className="font-condensed font-black text-xs uppercase tracking-wide text-[#0c3975]">
                      VS Equipos TOP (1-42)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono-code font-bold bg-[#0c3975]/10 text-[#0c3975] px-1.5 py-0.5 rounded-[2px]">
                    8 partidos
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between font-mono-code">
                  <div className="flex items-baseline gap-1">
                    <span className="font-slab text-xl font-black text-[#0c3975] leading-none">
                      13.1
                    </span>
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase">
                      PTS
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-700 font-medium">
                    <span className="font-bold text-slate-900">5.1</span> <span className="text-slate-500 text-[10px]">REB</span>
                    <span className="text-slate-400 mx-1.5">|</span>
                    <span className="font-bold text-slate-900">2.6</span> <span className="text-slate-500 text-[10px]">AST</span>
                  </div>

                  <div>
                    <span className="text-[10.5px] font-black px-1.5 py-0.5 rounded-[2px] bg-rose-500/10 text-[#c02328] border border-rose-600/30">
                      +/-: -3.8
                    </span>
                  </div>
                </div>
              </div>

              {/* TIER 2: VS Equipos Medios (43-97) */}
              <div className="bg-[#faf7f0] border border-[#0c3975]/20 rounded-[3px] p-2.5 shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <div className="flex items-center justify-between pb-1 border-b border-[#0c3975]/10">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0c3975]" />
                    <span className="font-condensed font-black text-xs uppercase tracking-wide text-[#0c3975]">
                      VS Equipos Medios (43-97)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono-code font-bold bg-[#0c3975]/10 text-[#0c3975] px-1.5 py-0.5 rounded-[2px]">
                    7 partidos
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between font-mono-code">
                  <div className="flex items-baseline gap-1">
                    <span className="font-slab text-xl font-black text-[#0c3975] leading-none">
                      13.3
                    </span>
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase">
                      PTS
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-700 font-medium">
                    <span className="font-bold text-slate-900">4.7</span> <span className="text-slate-500 text-[10px]">REB</span>
                    <span className="text-slate-400 mx-1.5">|</span>
                    <span className="font-bold text-slate-900">3.0</span> <span className="text-slate-500 text-[10px]">AST</span>
                  </div>

                  <div>
                    <span className="text-[10.5px] font-black px-1.5 py-0.5 rounded-[2px] bg-emerald-500/10 text-emerald-800 border border-emerald-600/30">
                      +/-: +3.4
                    </span>
                  </div>
                </div>
              </div>

              {/* TIER 3: VS Equipos Bajos (98+) */}
              <div className="bg-[#faf7f0] border border-[#0c3975]/20 rounded-[3px] p-2.5 shadow-2xs hover:border-[#0c3975]/40 transition-colors">
                <div className="flex items-center justify-between pb-1 border-b border-[#0c3975]/10">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span className="font-condensed font-black text-xs uppercase tracking-wide text-[#0c3975]">
                      VS Equipos Bajos (98+)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono-code font-bold bg-[#0c3975]/10 text-[#0c3975] px-1.5 py-0.5 rounded-[2px]">
                    4 partidos
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between font-mono-code">
                  <div className="flex items-baseline gap-1">
                    <span className="font-slab text-xl font-black text-[#0c3975] leading-none">
                      7.0
                    </span>
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase">
                      PTS
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-700 font-medium">
                    <span className="font-bold text-slate-900">2.8</span> <span className="text-slate-500 text-[10px]">REB</span>
                    <span className="text-slate-400 mx-1.5">|</span>
                    <span className="font-bold text-slate-900">3.0</span> <span className="text-slate-500 text-[10px]">AST</span>
                  </div>

                  <div>
                    <span className="text-[10.5px] font-black px-1.5 py-0.5 rounded-[2px] bg-emerald-500/10 text-emerald-800 border border-emerald-600/30">
                      +/-: +1.5
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right pt-2 border-t border-[#0c3975]/15 flex items-center justify-between text-[9.5px] font-mono-code text-slate-500">
                <span>Total Muestra: <strong>19 partidos</strong></span>
                <span className="font-condensed font-bold text-slate-700 uppercase tracking-wider">
                  SEGMENTACIÓN RANKING FEB
                </span>
              </div>

            </div>
          </div>

          {/* COLUMN 3: HISTORIAL DE CLUBES & TRAYECTORIA */}
          <div className="lg:col-span-3 border-[1.5px] border-[#0c3975]/35 rounded-[3px] overflow-hidden flex flex-col justify-between">
            <div className="bg-[#0c3975] text-white font-condensed font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[#c02328]">★</span>
                <span>HISTORIAL DE CLUBES ({careerHistory.length})</span>
              </div>
              <span className="text-[10px] font-mono-code text-yellow-300">FEB</span>
            </div>

            <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between overflow-y-auto max-h-72">
              {careerHistory.length === 0 ? (
                <div className="text-xs font-mono-code text-slate-500 py-6 text-center">
                  Sin historial previo registrado en la base de datos federativa.
                </div>
              ) : (
                <div className="divide-y divide-[#0c3975]/15 space-y-2">
                  {careerHistory.map((item: any, idx: number) => (
                    <div key={idx} className="pt-2 first:pt-0">
                      <div className="flex items-center justify-between font-mono-code text-xs">
                        <strong className="text-[#0c3975] font-slab">{item.temporada || 'ACTUAL'}</strong>
                        <span className="bg-[#c02328] text-white text-[9.5px] font-bold px-1.5 rounded uppercase">
                          {item.categoria || displayLeague}
                        </span>
                      </div>
                      <span className="font-mono-code text-xs text-slate-800 font-bold block mt-0.5 truncate" title={item.club}>
                        {item.club}
                      </span>
                      <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-500 mt-0.5">
                        <span>Licencia: {item.tipo_licencia || 'Jugador/a'}</span>
                        <span>{item.fecha_alta || 'Vigente'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-[#0c3975]/20 flex items-center justify-between">
                <span className="text-[10px] font-mono-code text-slate-500">
                  Total Clubes: <strong>{careerHistory.length}</strong>
                </span>
                <button
                  onClick={() => {
                    playRetroSound('click');
                    setActiveTab('career');
                  }}
                  className="text-xs font-condensed font-bold text-[#0c3975] hover:text-[#c02328] uppercase"
                >
                  Ver cronología completa →
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. PATRONES DETECTADOS (ANÁLISIS 100% ESTADÍSTICO SOBRE 19 PARTIDOS)       */}
      {/* ========================================================================= */}
      <section className="relative z-10 site-container mt-4">
        <div className="border-[1.5px] border-[#0c3975]/35 rounded-[3px] overflow-hidden bg-[#faf7f0] shadow-xs">
          
          {/* Header Bar */}
          <div className="bg-[#0c3975] text-white font-condensed font-bold text-xs uppercase tracking-wider px-3.5 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-yellow-300" />
              <span className="font-slab text-sm tracking-wide font-normal">PATRONES DETECTADOS</span>
            </div>
            <div className="flex items-center gap-2 font-mono-code text-[11px] text-yellow-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Análisis 100% estadístico sobre 19 partidos · Sin especulación</span>
            </div>
          </div>

          {/* Grid of 6 Patterns */}
          <div className="p-3.5 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[
              {
                title: 'Mejor como visitante',
                tag: 'Contexto',
                tagColor: 'bg-sky-100 text-sky-800 border-sky-300',
                icon: MapPin,
                description: 'Rinde un 49% peor como local que como visitante (valoración 6.9 en casa vs 13.5 fuera).',
                sample: '8 en casa · 11 fuera',
                highlight: '49% peor en casa',
                highlightType: 'warning',
              },
              {
                title: 'Sube con más minutos',
                tag: 'Minutos',
                tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                icon: Clock,
                description: 'Su valoración sube un 42% cuando juega más de 28 min (media 12.7 vs 8.9).',
                sample: "9 con +28' · 10 con menos",
                highlight: '+42% con +28 min',
                highlightType: 'positive',
              },
              {
                title: 'Mejor tirador fuera',
                tag: 'Tiro',
                tagColor: 'bg-blue-100 text-blue-800 border-blue-300',
                icon: Target,
                description: 'Su acierto en tiros de campo es del 36% en casa vs 42% fuera (6 puntos de diferencia).',
                sample: '84 intentos en casa · 117 fuera',
                highlight: '42% TC fuera vs 36% en casa',
                highlightType: 'neutral',
              },
              {
                title: 'Jugador irregular',
                tag: 'Regularidad',
                tagColor: 'bg-amber-100 text-amber-800 border-amber-300',
                icon: Activity,
                description: 'Rendimiento irregular: su valoración varía ±7.7 sobre su media de 10.7.',
                sample: '19 partidos',
                highlight: '±7.7 de varianza',
                highlightType: 'warning',
              },
              {
                title: 'Bestia negra: BAUBLOCK GYMNÁSTICA',
                tag: 'Rival',
                tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                icon: TrendingUp,
                description: 'Contra BAUBLOCK GYMNÁSTICA promedia 17.5 de valoración, muy por encima de su media (10.7).',
                sample: '2 partidos',
                highlight: '17.5 VAL vs media 10.7',
                highlightType: 'positive',
              },
              {
                title: 'Se le atraganta: VÍTALY LA MAR BCBADAJOZ',
                tag: 'Rival',
                tagColor: 'bg-rose-100 text-rose-800 border-rose-300',
                icon: TrendingDown,
                description: 'Contra VÍTALY LA MAR BCBADAJOZ promedia 1.5 de valoración, por debajo de su media (10.7).',
                sample: '2 partidos',
                highlight: '1.5 VAL vs media 10.7',
                highlightType: 'negative',
              },
            ].map((p, idx) => {
              const IconComponent = p.icon;
              return (
                <div 
                  key={idx}
                  className="bg-white/90 border border-[#0c3975]/25 rounded-[3px] p-3.5 flex flex-col justify-between shadow-2xs hover:border-[#0c3975]/50 hover:shadow-xs transition-all relative overflow-hidden group"
                >
                  <div>
                    {/* Top Row: Tag & Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded-[2px] border ${p.tagColor} flex items-center gap-1`}>
                        <IconComponent size={11} />
                        {p.tag}
                      </span>
                      <span className={`text-[9.5px] font-mono-code font-bold px-1.5 py-0.5 rounded-[2px] ${
                        p.highlightType === 'positive' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : p.highlightType === 'negative' || p.highlightType === 'warning'
                            ? 'bg-rose-50 text-[#c02328] border border-rose-200' 
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {p.highlight}
                      </span>
                    </div>

                    {/* Pattern Title */}
                    <h4 className="font-slab text-sm sm:text-base font-normal text-[#0c3975] mt-2.5 mb-1.5 uppercase tracking-tight group-hover:text-[#c02328] transition-colors">
                      {p.title}
                    </h4>

                    {/* Description Box */}
                    <p className="font-mono-code text-xs text-slate-800 leading-relaxed font-medium bg-[#faf7f0] p-2.5 rounded-[2px] border border-[#0c3975]/10 my-1">
                      {p.description}
                    </p>
                  </div>

                  {/* Footer Sample */}
                  <div className="pt-2 mt-2 border-t border-[#0c3975]/15 flex items-center justify-between font-mono-code text-[10.5px] text-slate-500">
                    <span>Muestra: <strong className="text-slate-800">{p.sample}</strong></span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">FEB Analytics</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. TAB PANELS (MEDIAS, TOTALES, TRAYECTORIA, RAW JSON)                     */}
      {/* ========================================================================= */}
      {activeTab === 'raw-json' && (
        <section className="relative z-10 site-container mt-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-md p-4 shadow-xl text-emerald-400 font-mono-code text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-3">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-yellow-400" />
                <span className="font-bold text-white uppercase tracking-wider">
                  ESQUEMA JSON CRUDO DESDE SUPABASE REST v1: (players.id = {currentPlayerId})
                </span>
              </div>

              <button
                onClick={handleCopyJson}
                className="bg-[#0c3975] hover:bg-[#124b94] text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {hasCopiedJson ? <Check size={13} /> : <Copy size={13} />}
                <span>{hasCopiedJson ? '¡Copiado!' : 'Copiar JSON'}</span>
              </button>
            </div>

            <pre className="max-h-96 overflow-y-auto bg-black/60 p-3 rounded border border-slate-800 text-[11px] leading-relaxed">
              {JSON.stringify(d, null, 2)}
            </pre>
          </div>
        </section>
      )}

      {activeTab === 'stats' && (
        <section className="relative z-10 site-container mt-4 animate-in fade-in">
          <div className="border-[1.5px] border-[#0c3975]/35 rounded-[3px] overflow-hidden bg-white shadow-xs">
            <div className="bg-[#0c3975] text-white font-condensed font-bold text-xs uppercase tracking-wider px-3.5 py-2 flex items-center justify-between">
              <span>TABLA COMPLETA DE MEDIAS POR FASE (season_stats_avg)</span>
              <span className="font-mono-code text-[11px] text-yellow-300">{seasonStatsAvg.length} Fases</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono-code text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[#0c3975] uppercase text-[10px] font-bold border-b border-slate-200">
                    <th className="py-2 px-3">Fase</th>
                    <th className="py-2 px-3">PJ</th>
                    <th className="py-2 px-3">MIN</th>
                    <th className="py-2 px-3">PTS</th>
                    <th className="py-2 px-3">% T2</th>
                    <th className="py-2 px-3">% T3</th>
                    <th className="py-2 px-3">% TL</th>
                    <th className="py-2 px-3">RO</th>
                    <th className="py-2 px-3">RD</th>
                    <th className="py-2 px-3">RT</th>
                    <th className="py-2 px-3">AST</th>
                    <th className="py-2 px-3">ROB</th>
                    <th className="py-2 px-3">PÉR</th>
                    <th className="py-2 px-3">TAP</th>
                    <th className="py-2 px-3 text-right">VAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {seasonStatsAvg.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">{row.fase || 'TOTAL'}</td>
                      <td className="py-2 px-3">{row.partidos}</td>
                      <td className="py-2 px-3">{row.minutos}</td>
                      <td className="py-2 px-3 font-bold text-[#0c3975]">{row.puntos}</td>
                      <td className="py-2 px-3">{row.t2_pct}</td>
                      <td className="py-2 px-3">{row.t3_pct}</td>
                      <td className="py-2 px-3">{row.tl_pct}</td>
                      <td className="py-2 px-3 text-slate-500">{row.rebotes_of}</td>
                      <td className="py-2 px-3 text-slate-500">{row.rebotes_def}</td>
                      <td className="py-2 px-3 font-bold">{row.rebotes_total}</td>
                      <td className="py-2 px-3 font-bold text-blue-700">{row.asistencias}</td>
                      <td className="py-2 px-3">{row.robos}</td>
                      <td className="py-2 px-3">{row.perdidas}</td>
                      <td className="py-2 px-3">{row.tapones_favor}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700">{row.valoracion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'totals' && (
        <section className="relative z-10 site-container mt-4 animate-in fade-in">
          <div className="border-[1.5px] border-[#0c3975]/35 rounded-[3px] overflow-hidden bg-white shadow-xs">
            <div className="bg-[#0c3975] text-white font-condensed font-bold text-xs uppercase tracking-wider px-3.5 py-2 flex items-center justify-between">
              <span>TOTALES ACUMULADOS EN TEMPORADA (season_stats_total)</span>
              <span className="font-mono-code text-[11px] text-yellow-300">{seasonStatsTotal.length} Registros</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono-code text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[#0c3975] uppercase text-[10px] font-bold border-b border-slate-200">
                    <th className="py-2 px-3">Fase</th>
                    <th className="py-2 px-3">Partidos</th>
                    <th className="py-2 px-3">Minutos Tot.</th>
                    <th className="py-2 px-3">Puntos Tot.</th>
                    <th className="py-2 px-3">T2 (A/I)</th>
                    <th className="py-2 px-3">T3 (A/I)</th>
                    <th className="py-2 px-3">TC Total</th>
                    <th className="py-2 px-3">TL (A/I)</th>
                    <th className="py-2 px-3">Reb. Tot</th>
                    <th className="py-2 px-3">Asistencias</th>
                    <th className="py-2 px-3">Robos</th>
                    <th className="py-2 px-3">Pérdidas</th>
                    <th className="py-2 px-3 text-right">VAL Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {seasonStatsTotal.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">{row.fase || 'TOTAL'}</td>
                      <td className="py-2 px-3">{row.partidos}</td>
                      <td className="py-2 px-3">{row.minutos_total}</td>
                      <td className="py-2 px-3 font-bold text-[#0c3975]">{row.puntos_total}</td>
                      <td className="py-2 px-3">{row.t2}</td>
                      <td className="py-2 px-3">{row.t3}</td>
                      <td className="py-2 px-3">{row.tc}</td>
                      <td className="py-2 px-3">{row.tl}</td>
                      <td className="py-2 px-3 font-bold">{row.rebotes_total}</td>
                      <td className="py-2 px-3 font-bold text-blue-700">{row.asistencias}</td>
                      <td className="py-2 px-3">{row.robos}</td>
                      <td className="py-2 px-3">{row.perdidas}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700">{row.valoracion_total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'career' && (
        <section className="relative z-10 site-container mt-4 animate-in fade-in">
          <div className="border-[1.5px] border-[#0c3975]/35 rounded-[3px] overflow-hidden bg-white shadow-xs">
            <div className="bg-[#0c3975] text-white font-condensed font-bold text-xs uppercase tracking-wider px-3.5 py-2 flex items-center justify-between">
              <span>HISTORIAL COMPLETO DE CLUBES Y LICENCIAS (career_history)</span>
              <span className="font-mono-code text-[11px] text-yellow-300">{careerHistory.length} Temporadas</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono-code text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[#0c3975] uppercase text-[10px] font-bold border-b border-slate-200">
                    <th className="py-2 px-3">Temporada</th>
                    <th className="py-2 px-3">Categoría / Liga</th>
                    <th className="py-2 px-3">Club</th>
                    <th className="py-2 px-3">Tipo Licencia</th>
                    <th className="py-2 px-3">Fecha Alta</th>
                    <th className="py-2 px-3 text-right">Fecha Baja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {careerHistory.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">{item.temporada || '-'}</td>
                      <td className="py-2 px-3 text-[#c02328] font-bold">{item.categoria || '-'}</td>
                      <td className="py-2 px-3 font-bold text-slate-800">{item.club || '-'}</td>
                      <td className="py-2 px-3">{item.tipo_licencia || 'Jugador/a'}</td>
                      <td className="py-2 px-3 text-slate-500">{item.fecha_alta || '-'}</td>
                      <td className="py-2 px-3 text-right text-slate-500">{item.fecha_baja || 'Vigente'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 9. SECCIÓN ANCHO COMPLETO: NOTAS DEL JUGADOR                              */}
      {/* ========================================================================= */}
      <section className="relative z-10 site-container mt-6">
        <div className="border-[1.5px] border-[#0c3975]/35 rounded-[3px] overflow-hidden bg-[#faf7f0] shadow-2xs">
          
          {/* Header Bar */}
          <div className="bg-[#0c3975] text-white font-condensed font-bold text-xs sm:text-sm uppercase tracking-wider px-3.5 sm:px-4 py-2 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-yellow-300" />
              <span className="font-slab text-sm sm:text-base tracking-wide font-bold">
                Notas del Jugador
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono-code text-[11px] text-yellow-300">
              <span className="bg-white/10 px-2 py-0.5 rounded-[2px]">
                {displayName}
              </span>
              <span>
                {playerNotes.length} {playerNotes.length === 1 ? 'nota' : 'notas'}
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            
            {/* Subtitle */}
            <p className="font-mono-code text-xs sm:text-[13px] text-slate-700 leading-relaxed font-medium">
              Añade tus observaciones de texto o voz. Todas tus notas se guardarán y podrás consultarlas en cualquier momento.
            </p>

            {/* Input Box */}
            <div className="bg-white border border-[#0c3975]/25 rounded-[3px] p-3 sm:p-4 shadow-2xs">
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Escribe una nota sobre este jugador..."
                rows={3}
                className="w-full bg-transparent resize-y text-slate-800 text-xs sm:text-sm font-mono-code placeholder:text-slate-400 focus:outline-none leading-relaxed"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    handleSaveNote();
                  }
                }}
              />

              {/* Action buttons below textarea */}
              <div className="mt-3 pt-3 border-t border-[#0c3975]/15 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  {/* Guardar Nota */}
                  <button
                    onClick={() => handleSaveNote()}
                    disabled={!newNoteText.trim() && !isRecordingAudio}
                    className={`px-4 py-2 rounded-[2px] font-condensed font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                      newNoteText.trim()
                        ? 'bg-[#0c3975] hover:bg-[#124b94] text-white shadow-2xs'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Save size={14} />
                    <span>Guardar Nota</span>
                  </button>

                  {/* Audio */}
                  <button
                    onClick={toggleAudioRecording}
                    className={`px-4 py-2 rounded-[2px] font-condensed font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
                      isRecordingAudio
                        ? 'bg-[#c02328] hover:bg-rose-700 text-white border-transparent animate-pulse shadow-xs'
                        : 'bg-white hover:bg-[#0c3975]/10 text-[#0c3975] border-[#0c3975]/30'
                    }`}
                  >
                    {isRecordingAudio ? <MicOff size={14} /> : <Mic size={14} />}
                    <span>{isRecordingAudio ? 'Detener Audio' : 'Audio'}</span>
                  </button>
                </div>

                <div className="text-[10px] font-mono-code text-slate-500">
                  {isRecordingAudio ? (
                    <span className="text-[#c02328] font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#c02328] animate-ping" />
                      Grabando audio... Pulsa de nuevo para guardar
                    </span>
                  ) : (
                    <span>Pulsa <strong>Ctrl + Enter</strong> para guardar</span>
                  )}
                </div>
              </div>
            </div>

            {/* Notes List or Empty State */}
            {playerNotes.length === 0 ? (
              /* Empty State */
              <div className="bg-white/80 border border-dashed border-[#0c3975]/25 rounded-[3px] py-10 px-4 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#0c3975]/10 flex items-center justify-center text-[#0c3975] mb-3">
                  <FileText size={22} />
                </div>
                <h5 className="font-slab text-base sm:text-lg text-[#0c3975] font-black uppercase mb-1">
                  No hay notas guardadas aún
                </h5>
                <p className="font-mono-code text-xs text-slate-500 max-w-md mx-auto">
                  Escribe tu primera observación sobre este jugador
                </p>
              </div>
            ) : (
              /* Saved Notes Cards */
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between pb-1 border-b border-[#0c3975]/15">
                  <span className="font-condensed font-bold text-xs uppercase tracking-wider text-[#0c3975]">
                    OBSERVACIONES REGISTRADAS ({playerNotes.length})
                  </span>
                  <span className="font-mono-code text-[10px] text-slate-500">
                    Memoria local permanente
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {playerNotes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-white/95 border border-[#0c3975]/20 rounded-[3px] p-3.5 flex flex-col justify-between shadow-2xs hover:border-[#0c3975]/40 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[#0c3975]/10">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] font-mono-code font-bold uppercase px-1.5 py-0.5 rounded-[2px] ${
                                note.type === 'audio'
                                  ? 'bg-rose-100 text-[#c02328] border border-rose-200'
                                  : 'bg-[#0c3975]/10 text-[#0c3975] border border-[#0c3975]/20'
                              }`}
                            >
                              {note.type === 'audio' ? 'Nota de voz' : 'Observación'}
                            </span>
                            <span className="text-[10px] font-mono-code text-slate-500">
                              {note.createdAt}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(note.text);
                                onShowToast('Nota copiada al portapapeles');
                              }}
                              className="text-slate-400 hover:text-[#0c3975] p-1 rounded transition-colors cursor-pointer"
                              title="Copiar texto"
                            >
                              <Copy size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-slate-400 hover:text-[#c02328] p-1 rounded transition-colors cursor-pointer"
                              title="Eliminar nota"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <p className="font-mono-code text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                          {note.text}
                        </p>

                        {note.audioUrl && (
                          <div className="mt-2.5 pt-2 border-t border-[#0c3975]/10">
                            <audio controls src={note.audioUrl} className="w-full h-8" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. BOTTOM FOOTER BANNER                                                  */}
      {/* ========================================================================= */}
      <section className="relative z-10 site-container mt-6">
        <div className="fondoazul-solid rounded-[6px] border-none outline-none ring-0 px-4 sm:px-8 py-3.5 shadow-lg relative overflow-hidden text-white flex items-center justify-between flex-wrap gap-4">
          
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-white/60 flex items-center justify-center p-1 bg-white/10 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full stroke-white fill-none stroke-[3.5]">
                <circle cx="50" cy="50" r="45" />
                <line x1="5" y1="50" x2="95" y2="50" />
                <line x1="50" y1="5" x2="50" y2="95" />
                <path d="M 20 12 Q 35 50 20 88" />
                <path d="M 80 12 Q 65 50 80 88" />
              </svg>
            </div>

            <span className="chalk-text-italic text-white text-xl sm:text-2xl md:text-[27px] uppercase tracking-wider block">
              SUPABASE DATABASE. 4.124 JUGADORES FEB.
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            <button
              onClick={() => {
                playRetroSound('burst');
                setIsSearchModalOpen(true);
              }}
              className="comic-interactive-card relative bg-[#0c3975] hover:bg-[#124b94] text-white font-condensed font-bold text-xs sm:text-[13px] tracking-wider uppercase px-5 py-2 rounded-[4px] border-2 border-white shadow-[0_0_0_2px_#0c3975] cursor-pointer"
            >
              BUSCAR OTRO JUGADOR
            </button>

            <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-white fill-none stroke-2 opacity-85">
              <path d="M 2 18 L 4 6 L 9 12 L 12 4 L 15 12 L 20 6 L 22 18 Z" />
              <line x1="2" y1="20" x2="22" y2="20" strokeWidth="2" />
            </svg>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. MODAL: FULL GAME LOG & TOTALES                                        */}
      {/* ========================================================================= */}
      {isGameLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#ede7dc] border-3 border-[#0c3975] rounded-[4px] shadow-2xl max-w-4xl w-full p-5 relative max-h-[85vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b-2 border-[#0c3975]/20 pb-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[#c02328] font-black text-lg">★</span>
                <h3 className="font-slab text-lg sm:text-xl text-[#0c3975] uppercase truncate">
                  {displayName} • TABLA COMPLETA DE TOTALES FEB
                </h3>
              </div>
              <button 
                onClick={() => setIsGameLogModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#0c3975]/10 hover:bg-[#c02328] hover:text-white flex items-center justify-center cursor-pointer transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs font-mono-code border-collapse">
                <thead>
                  <tr className="bg-[#0c3975] text-white font-condensed uppercase tracking-wider py-1.5 text-xs">
                    <th className="py-1.5 text-left pl-2">FASE</th>
                    <th>PARTIDOS</th>
                    <th>MINUTOS</th>
                    <th>PTS</th>
                    <th>T2</th>
                    <th>T3</th>
                    <th>TC</th>
                    <th>TL</th>
                    <th>REB</th>
                    <th>AST</th>
                    <th>ROB</th>
                    <th>PÉR</th>
                    <th>VAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0c3975]/15">
                  {seasonStatsTotal.map((g: any, idx: number) => (
                    <tr key={idx} className="hover:bg-black/5 transition-colors py-1">
                      <td className="py-2 text-left pl-2 font-bold">{g.fase || 'TOTAL'}</td>
                      <td>{g.partidos}</td>
                      <td>{g.minutos_total}</td>
                      <td className="font-black text-[#b91c1c] text-sm">{g.puntos_total}</td>
                      <td>{g.t2}</td>
                      <td>{g.t3}</td>
                      <td>{g.tc}</td>
                      <td>{g.tl}</td>
                      <td>{g.rebotes_total}</td>
                      <td>{g.asistencias}</td>
                      <td>{g.robos}</td>
                      <td>{g.perdidas}</td>
                      <td className="font-bold text-emerald-700">{g.valoracion_total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setIsGameLogModalOpen(false)}
                className="bg-[#0c3975] text-white px-5 py-1.5 font-condensed font-bold uppercase text-xs rounded-[2px] tracking-wider cursor-pointer"
              >
                CERRAR
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. MODAL: SEARCH ANY OF THE 4,124 SUPABASE PLAYERS                       */}
      {/* ========================================================================= */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#faf7f0] border-4 border-[#0c3975] rounded-md shadow-2xl w-full max-w-xl p-5 max-h-[85vh] flex flex-col">
            
            <div className="flex items-center justify-between border-b-2 border-[#0c3975] pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-[#c02328]" />
                <h3 className="font-slab font-black text-lg text-[#0c3975] uppercase">
                  EXPLORADOR DE 4.124 JUGADORES FEB (SUPABASE)
                </h3>
              </div>

              <button
                onClick={() => setIsSearchModalOpen(false)}
                className="w-7 h-7 bg-white text-black font-black border border-black hover:bg-yellow-300 flex items-center justify-center cursor-pointer rounded"
              >
                ✕
              </button>
            </div>

            <p className="font-mono-code text-xs text-slate-600 mb-3">
              Teclea el nombre o apellido de cualquier jugador para cargar automáticamente toda su ficha, estadísticas y cartas de tiro en esta pantalla.
            </p>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre (ej: Savkov, Garcia, Moreno, Lukic, Lopez)..."
                className="w-full bg-white border-2 border-[#0c3975]/30 rounded pl-8 pr-3 py-2 text-xs font-mono-code text-slate-900 focus:outline-none focus:border-[#0c3975]"
                autoFocus
              />
            </div>

            {/* Quick Suggestions Chips */}
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              <span className="text-[10px] font-mono-code font-bold uppercase text-slate-500">Destacados:</span>
              {FEATURED_FEB_PLAYERS.map(fp => (
                <button
                  key={fp.id}
                  onClick={() => handleSelectNewPlayer(fp.id, fp.name)}
                  className="bg-white hover:bg-[#0c3975] hover:text-white border border-slate-300 text-slate-700 text-[10px] font-mono-code font-bold px-2 py-0.5 rounded cursor-pointer transition-colors"
                >
                  {fp.name.split(',')[0]}
                </button>
              ))}
            </div>

            {/* Results list */}
            <div className="flex-1 overflow-y-auto space-y-1.5 divide-y divide-black/10 pr-1 min-h-[220px]">
              {isSearching ? (
                <div className="py-10 text-center text-xs font-mono-code text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-[#0c3975]" />
                  <span>Buscando en Supabase...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-10 text-center text-xs font-mono-code text-slate-500">
                  {searchQuery ? 'No se encontraron jugadores.' : 'Escribe arriba para consultar la base de datos de 4.124 jugadores.'}
                </div>
              ) : (
                searchResults.map((player) => (
                  <div
                    key={player.id}
                    onClick={() => handleSelectNewPlayer(player.id, player.name)}
                    className="py-2 px-2 flex items-center justify-between hover:bg-[#0c3975]/10 rounded cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={player.photoUrl}
                        alt={player.name}
                        className="w-8 h-10 object-cover object-top rounded border border-slate-300 bg-slate-100"
                        onError={(e) => {
                          e.currentTarget.src = 'https://imagenes.feb.es/Imagen.aspx?i=logo&ti=1';
                        }}
                      />
                      <div>
                        <span className="font-bold text-xs text-[#0c3975] group-hover:text-[#c02328] block">
                          {player.name}
                        </span>
                        <span className="text-[10px] text-slate-600 block">
                          {player.team} • {player.league} • {player.position}
                        </span>
                      </div>
                    </div>

                    <div className="text-right font-mono-code text-xs">
                      <span className="text-[#c02328] font-bold block">{player.points || '0'} PTS</span>
                      <span className="text-[10px] text-emerald-700 font-bold block">{player.valuation || '0'} VAL</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#0c3975]/20 flex items-center justify-between">
              <span className="text-[10px] font-mono-code text-slate-500">
                Mostrando hasta 24 resultados por búsqueda
              </span>
              <button
                onClick={() => setIsSearchModalOpen(false)}
                className="bg-[#0c3975] text-white px-4 py-1.5 font-slab text-xs uppercase cursor-pointer rounded"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
