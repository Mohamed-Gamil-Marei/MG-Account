import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Upload,
  Check,
  Building,
  Award,
  Download,
  Share2,
  Film,
  Camera,
  Trash2,
  Sparkles,
  FileVideo,
  AlertCircle,
  LogIn,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { OfficeProfile } from '../../types';
import {
  savePromoVideoBlob,
  loadPromoVideoBlob,
  deletePromoVideoBlob,
} from '../../utils/promoVideoStorage';

interface MgOfficePromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  officeProfile?: OfficeProfile;
  autoPlay?: boolean;
}

export const MgOfficePromoModal: React.FC<MgOfficePromoModalProps> = ({
  isOpen,
  onClose,
  officeProfile,
  autoPlay = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState<number>(0.8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [activeScene, setActiveScene] = useState<1 | 2 | 3 | 4>(1);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [isNativeVideoMode, setIsNativeVideoMode] = useState<boolean>(false);
  const [videoDuration, setVideoDuration] = useState<number>(9.0);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [showWelcomeOnStartup, setShowWelcomeOnStartup] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mg_show_welcome_intro') === 'true';
    } catch {
      return false;
    }
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const animTimerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const PROMO_DURATION = isNativeVideoMode && videoDuration > 0 ? videoDuration : 9.0;

  // ESC key to close modal quickly
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load stored video from IndexedDB on open, or fallback to bundled official promo MP4
  useEffect(() => {
    let currentObjectUrl: string | null = null;
    if (isOpen) {
      loadPromoVideoBlob()
        .then((blob) => {
          if (blob && blob.size > 0) {
            currentObjectUrl = URL.createObjectURL(blob);
            setVideoBlobUrl(currentObjectUrl);
            setIsNativeVideoMode(true);
            setIsPlaying(autoPlay);
          } else {
            // Default to official bundled high-definition MP4 promo
            setVideoBlobUrl('/videos/mg_office_promo.mp4');
            setIsNativeVideoMode(true);
            setIsPlaying(autoPlay);
          }
        })
        .catch(() => {
          setVideoBlobUrl('/videos/mg_office_promo.mp4');
          setIsNativeVideoMode(true);
          setIsPlaying(autoPlay);
        });
    }

    return () => {
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [isOpen, autoPlay]);

  // Handle welcome on startup checkbox
  const handleToggleStartupWelcome = (checked: boolean) => {
    setShowWelcomeOnStartup(checked);
    try {
      localStorage.setItem('mg_show_welcome_intro', checked ? 'true' : 'false');
    } catch (e) {
      console.error(e);
    }
  };

  // Subtle audio synthesis for vector mode
  const playHarmonicChime = useCallback(() => {
    if (isMuted || isNativeVideoMode) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtxClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const master = ctx.createGain();
      master.gain.setValueAtTime(volume * 0.12, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.5);
      master.connect(ctx.destination);

      [261.63, 329.63, 392.0, 523.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        g.gain.setValueAtTime(0.001, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.15 - idx * 0.02, ctx.currentTime + 0.15);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.4);
        osc.connect(g);
        g.connect(master);
        osc.start();
        osc.stop(ctx.currentTime + 2.5);
      });
    } catch {
      // Audio safety
    }
  }, [isMuted, isNativeVideoMode, volume]);

  // Timer loop for the simulated 9-second cinematic scenes (if no custom video)
  useEffect(() => {
    if (!isOpen || isNativeVideoMode) return;

    if (!isPlaying) {
      if (animTimerRef.current) cancelAnimationFrame(animTimerRef.current);
      return;
    }

    let lastTime = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      setCurrentTimeSec((prev) => {
        const next = (prev + delta) % 9.0;
        // Determine scene based on seconds:
        // 0.0 - 2.8s: Scene 1 (Full Emblem Reveal)
        // 2.8 - 5.8s: Scene 2 (Macro 3D Zoom on Bills & Arrow)
        // 5.8 - 7.5s: Scene 3 (Official Typography & Reflection Floor)
        // 7.5 - 9.0s: Scene 4 (Master Seal Lockup & Sparkles)
        if (next < 2.8) setActiveScene(1);
        else if (next < 5.8) setActiveScene(2);
        else if (next < 7.5) setActiveScene(3);
        else setActiveScene(4);

        return next;
      });

      animTimerRef.current = requestAnimationFrame(loop);
    };

    animTimerRef.current = requestAnimationFrame(loop);

    return () => {
      if (animTimerRef.current) cancelAnimationFrame(animTimerRef.current);
    };
  }, [isOpen, isPlaying, isNativeVideoMode]);

  // Handle uploaded video file
  const handleProcessVideoFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|m4v)$/i)) {
      alert('يرجى اختيار ملف فيديو صالح بصيغة MP4 أو WebM');
      return;
    }

    try {
      await savePromoVideoBlob(file);
      if (videoBlobUrl) {
        URL.revokeObjectURL(videoBlobUrl);
      }
      const newUrl = URL.createObjectURL(file);
      setVideoBlobUrl(newUrl);
      setIsNativeVideoMode(true);
      setCurrentTimeSec(0);
      setIsPlaying(true);
    } catch (err) {
      console.error('Error saving video to storage:', err);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessVideoFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessVideoFile(file);
    }
  };

  const handleRemoveCustomVideo = async () => {
    if (window.confirm('هل تريد حذف الفيديو المخزن والعودة إلى محاكي الهوية السينمائي؟')) {
      await deletePromoVideoBlob();
      if (videoBlobUrl) {
        URL.revokeObjectURL(videoBlobUrl);
      }
      setVideoBlobUrl(null);
      setIsNativeVideoMode(false);
      setCurrentTimeSec(0);
      setActiveScene(1);
    }
  };

  // Jump to specific scene in simulation
  const handleSeek = (time: number) => {
    setCurrentTimeSec(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    if (time < 2.8) setActiveScene(1);
    else if (time < 5.8) setActiveScene(2);
    else if (time < 7.5) setActiveScene(3);
    else setActiveScene(4);
  };

  const copyOfficeDetails = () => {
    const text = `مكتب المحاسب القانوني ومراجع الحسابات
MOHAMED - M GAMEEL MARIE FOR ACCOUNTING AND AUDITING
المحاسب القانوني: ${officeProfile?.auditorName || 'محمد جميل مرعي'}
ترخيص وزارة المالية: ${officeProfile?.licenseNumber || 'س.م.م / 43122'}
رقم التسجيل الضريبي: ${officeProfile?.taxAuthorityRegNo || '492-817-302'}
الهاتف: ${officeProfile?.phone || '01003335360'}
العنوان: ${officeProfile?.address || 'القاهرة - جمهورية مصر العربية'}`;
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
    >
      <div
        className={`relative w-full ${
          isFullscreen ? 'max-w-none h-full m-0 rounded-none' : 'max-w-5xl max-h-[96vh] rounded-2xl'
        } bg-slate-900 border border-amber-500/30 shadow-2xl flex flex-col overflow-hidden text-white transition-all`}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-slate-950/95 border-b border-slate-800 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Medallion Monogram Badge */}
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-serif font-black text-xs sm:text-sm border border-amber-400/60 shadow-lg shrink-0"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #065f46 0%, #022c22 100%)',
              }}
            >
              <span className="text-white">M</span>
              <span className="text-amber-400">G</span>
            </div>

            <div className="min-w-0">
              <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 truncate">
                <span className="truncate">الهوية الرسمية والبرومو</span>
                {isNativeVideoMode ? (
                  <span className="hidden xs:inline-flex text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 items-center gap-1 font-semibold shrink-0">
                    <FileVideo className="w-3 h-3" />
                    فيديو MP4
                  </span>
                ) : (
                  <span className="hidden xs:inline-flex text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 items-center gap-1 font-semibold shrink-0">
                    <Sparkles className="w-3 h-3" />
                    محاكي سينمائي
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons (Direct Entry + Close always visible and prominent) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Primary Enter / Skip Button in Header */}
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-900/40 border border-emerald-400/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="تخطي العرض والدخول إلى برنامج المحاسبة"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>دخول البرنامج</span>
            </button>

            {/* Secondary Tools (hidden on mobile, visible on sm+) */}
            <div className="hidden sm:flex items-center gap-1">
              {/* Toggle Mode Button: Video MP4 vs Vector Simulation */}
              <button
                onClick={() => {
                  if (isNativeVideoMode) {
                    setIsNativeVideoMode(false);
                    setCurrentTimeSec(0);
                  } else {
                    setIsNativeVideoMode(true);
                    if (!videoBlobUrl) setVideoBlobUrl('/videos/mg_office_promo.mp4');
                  }
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition-colors cursor-pointer"
                title={isNativeVideoMode ? 'التبديل إلى المحاكي الميدالي التفاعلي' : 'التبديل إلى فيديو MP4'}
              >
                {isNativeVideoMode ? <Sparkles className="w-3.5 h-3.5 text-amber-400" /> : <FileVideo className="w-3.5 h-3.5 text-emerald-400" />}
              </button>

              {/* Download Video Button */}
              <a
                href={videoBlobUrl || '/videos/mg_office_promo.mp4'}
                download="MG_Office_Promo_Video.mp4"
                className="p-1.5 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="تحميل ملف الفيديو (MP4)"
              >
                <Download className="w-3.5 h-3.5" />
              </a>

              {/* Upload Video Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-xs transition-all cursor-pointer"
                title="إدراج أو تحديث ملف فيديو برومو مخصص"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/m4v"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {/* Remove Custom Video if present */}
              {isNativeVideoMode && (
                <button
                  onClick={handleRemoveCustomVideo}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="حذف الفيديو والعودة للمحاكي"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Fullscreen Toggle */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Close Button (Always visible with clear styling) */}
            <button
              onClick={onClose}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              title="إغلاق البرومو (Esc)"
            >
              <X className="w-4 h-4" />
              <span className="hidden md:inline">إغلاق</span>
            </button>
          </div>
        </div>

        {/* Drag and drop overlay banner */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-30 bg-emerald-950/80 backdrop-blur-sm border-2 border-dashed border-emerald-400 flex flex-col items-center justify-center text-center p-6 animate-in fade-in">
            <Upload className="w-16 h-16 text-emerald-300 animate-bounce mb-3" />
            <h3 className="text-xl font-bold text-white mb-1">أفلت ملف الفيديو هنا</h3>
            <p className="text-sm text-emerald-200">
              سيتم حفظ الفيديو فورياً في المنظومة وتشغيله تلقائياً بدقة كاملة وبشكل دائم
            </p>
          </div>
        )}

        {/* Main Stage: Native Video Player OR Vector Cinema Engine */}
        <div
          className="relative bg-black flex-1 flex items-center justify-center overflow-hidden select-none min-h-[300px] sm:min-h-[420px]"
          onClick={() => {
            if (isNativeVideoMode && videoRef.current) {
              if (videoRef.current.paused) {
                videoRef.current.play();
                setIsPlaying(true);
              } else {
                videoRef.current.pause();
                setIsPlaying(false);
              }
            } else {
              setIsPlaying(!isPlaying);
              if (!isPlaying) playHarmonicChime();
            }
          }}
        >
          {/* Floating Skip & Direct Enter Overlay Pill */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 hover:bg-emerald-600 text-white border border-emerald-500/50 text-xs font-bold shadow-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-emerald-400" />
            <span>تخطي ودخول البرنامج ⬅</span>
          </button>

          {/* Floating Close Button Top Right */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-slate-950/80 hover:bg-rose-600 border border-slate-700 hover:border-rose-500 text-slate-300 hover:text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all cursor-pointer"
            title="إغلاق العرض (Esc)"
          >
            <X className="w-4 h-4" />
          </button>

          {isNativeVideoMode && videoBlobUrl ? (
            /* Mode 1: Authentic Native Video */
            <video
              ref={videoRef}
              src={videoBlobUrl}
              autoPlay={isPlaying}
              loop
              muted={isMuted}
              playsInline
              className="w-full h-full max-h-[66vh] object-contain cursor-pointer"
              onError={() => {
                setIsNativeVideoMode(false);
              }}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTimeSec(videoRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setVideoDuration(videoRef.current.duration || 9.0);
                  if (videoRef.current.paused && isPlaying) {
                    videoRef.current.play().catch(() => {});
                  }
                }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : (
            /* Mode 2: Ultra High-End Vector & Motion Cinema Reproduction */
            <div className="relative w-full h-full max-h-[66vh] aspect-video flex items-center justify-center overflow-hidden cursor-pointer">
              {/* Emerald Green Luxury Marble Canvas */}
              <div
                className="absolute inset-0 transition-transform duration-700 ease-out"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 45%, #065f46 0%, #04382c 35%, #022c22 65%, #01140f 100%)',
                }}
              >
                {/* Marble Veins & Specular Light Streaks */}
                <svg
                  className="absolute inset-0 w-full h-full opacity-35 pointer-events-none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M-50,150 Q200,80 450,220 T950,160 T1450,300"
                    fill="none"
                    stroke="#a7f3d0"
                    strokeWidth="1.8"
                    strokeOpacity="0.4"
                  />
                  <path
                    d="M50,700 Q350,550 700,620 T1200,480 T1600,550"
                    fill="none"
                    stroke="#fde68a"
                    strokeWidth="1.2"
                    strokeOpacity="0.3"
                  />
                  <path
                    d="M200,-50 Q500,250 850,120 T1400,280"
                    fill="none"
                    stroke="#6ee7b7"
                    strokeWidth="1.0"
                    strokeOpacity="0.25"
                  />
                </svg>

                {/* Floating Gold Sparkle Dust Particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[...Array(24)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute rounded-full bg-amber-300 animate-pulse"
                      style={{
                        width: `${(i % 3) + 2}px`,
                        height: `${(i % 3) + 2}px`,
                        top: `${(i * 19) % 95}%`,
                        left: `${(i * 27) % 95}%`,
                        opacity: ((i % 5) + 3) * 0.12,
                        animationDuration: `${2 + (i % 3)}s`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Dynamic Camera Container */}
              <div
                className="relative z-10 flex flex-col items-center justify-center transition-all duration-700 ease-in-out transform"
                style={{
                  transform:
                    activeScene === 2
                      ? 'scale(1.75) translate(3%, 2%)' // Macro zoom on bills & arrow
                      : activeScene === 3
                      ? 'scale(0.88) translateY(-4%)' // Title showcase & reflection
                      : 'scale(1) translateY(0)', // Scene 1 & 4: Full Medallion
                }}
              >
                {/* SCENE 3: OFFICIAL CREDENTIALS TYPOGRAPHY (at 5.8s - 7.5s) */}
                {activeScene === 3 ? (
                  <div className="flex flex-col items-center justify-center text-center px-4 animate-in fade-in zoom-in-95 duration-500">
                    {/* Top Compact Emblem */}
                    <div className="w-24 h-24 mb-4 relative drop-shadow-2xl">
                      <MedallionSvg />
                    </div>

                    {/* Main Name in 3D Gold Serif */}
                    <h1
                      className="text-2xl sm:text-4xl md:text-5xl font-black font-serif tracking-wide drop-shadow-2xl uppercase"
                      style={{
                        background:
                          'linear-gradient(180deg, #ffffff 0%, #fef08a 25%, #f59e0b 60%, #b45309 85%, #78350f 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 4px 12px rgba(245, 158, 11, 0.5))',
                      }}
                    >
                      MOHAMED - M GAMEEL MARIE
                    </h1>

                    {/* Subtitle */}
                    <h2
                      className="text-xs sm:text-base md:text-lg font-bold tracking-[0.25em] text-amber-200/90 mt-2 uppercase drop-shadow-md"
                      style={{
                        textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                      }}
                    >
                      FOR ACCOUNTING AND AUDITING
                    </h2>

                    {/* Floor Reflection Mirror Effect */}
                    <div className="relative mt-3 opacity-25 scale-y-[-0.6] pointer-events-none blur-[1px] select-none">
                      <div
                        className="text-2xl sm:text-4xl md:text-5xl font-black font-serif tracking-wide uppercase"
                        style={{
                          background:
                            'linear-gradient(180deg, #fef08a 0%, #f59e0b 50%, transparent 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        MOHAMED - M GAMEEL MARIE
                      </div>
                      <div className="text-xs sm:text-base md:text-lg font-bold tracking-[0.25em] text-amber-300 mt-1 uppercase">
                        FOR ACCOUNTING AND AUDITING
                      </div>
                    </div>
                  </div>
                ) : (
                  /* SCENE 1, 2, 4: THE GRAND 3D GOLD MEDALLION */
                  <div className="relative w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] md:w-[500px] md:h-[500px] flex items-center justify-center drop-shadow-[0_25px_35px_rgba(0,0,0,0.75)]">
                    <MedallionSvg />

                    {/* Diamond Flare on the outer rim (active in Scene 1 & 4) */}
                    {(activeScene === 1 || activeScene === 4) && (
                      <div
                        className="absolute bottom-6 right-8 pointer-events-none animate-pulse"
                        style={{ filter: 'drop-shadow(0 0 10px #fef08a)' }}
                      >
                        <DiamondStarSvg size={36} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Large Floating Play/Pause Indicator if paused */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center cursor-pointer transition-opacity z-20">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.6)] transform hover:scale-110 transition-transform">
                <Play className="w-9 h-9 fill-slate-950 ml-1.5" />
              </div>
            </div>
          )}

          {/* Interactive Player Controls Bar (Bottom Overlay) */}
          <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 sm:p-4 flex flex-col gap-2.5 text-xs">
            {/* Timeline Scrubber */}
            <div className="flex items-center gap-3 w-full">
              <span className="text-[11px] font-mono text-amber-300 shrink-0 w-12 text-left">
                0:{Math.floor(currentTimeSec) < 10 ? `0${Math.floor(currentTimeSec)}` : Math.floor(currentTimeSec)}
              </span>

              <input
                type="range"
                min="0"
                max={PROMO_DURATION}
                step="0.05"
                value={currentTimeSec}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400 hover:accent-amber-300"
              />

              <span className="text-[11px] font-mono text-slate-400 shrink-0 w-12 text-right">
                0:{Math.floor(PROMO_DURATION) < 10 ? `0${Math.floor(PROMO_DURATION)}` : Math.floor(PROMO_DURATION)}
              </span>
            </div>

            {/* Controls Suite */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {/* Play/Pause */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isNativeVideoMode && videoRef.current) {
                      if (isPlaying) videoRef.current.pause();
                      else videoRef.current.play();
                    } else {
                      setIsPlaying(!isPlaying);
                    }
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                </button>

                {/* Replay */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSeek(0);
                    setIsPlaying(true);
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                      videoRef.current.play().catch(() => {});
                    }
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  title="إعادة التشغيل من البداية"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Sound Mute / Unmute */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = !isMuted;
                    setIsMuted(next);
                    if (videoRef.current) videoRef.current.muted = next;
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-slate-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-amber-400" />
                  )}
                </button>

                {/* Volume Slider */}
                {!isMuted && (
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setVolume(v);
                      if (videoRef.current) videoRef.current.volume = v;
                    }}
                    className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    title="مستوى الصوت"
                  />
                )}

                {/* Quick Scene Buttons (for vector simulation) */}
                {!isNativeVideoMode && (
                  <div className="hidden md:flex items-center gap-1.5 pr-2 border-r border-slate-700 text-[10px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSeek(0.2);
                      }}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                        activeScene === 1
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      1. الختم الذهبي
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSeek(3.2);
                      }}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                        activeScene === 2
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      2. الماكرو والعملات
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSeek(6.0);
                      }}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                        activeScene === 3
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      3. الاعتماد واللقب
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSeek(7.8);
                      }}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                        activeScene === 4
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      4. القفل النهائي
                    </button>
                  </div>
                )}
              </div>

              {/* Status or Direct File Upload Callout */}
              <div className="flex items-center gap-2">
                {!isNativeVideoMode && (
                  <span className="text-[11px] text-emerald-400/90 hidden sm:inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    يمكنك سحب وإفلات فيديو MP4 هنا مباشرة
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom: Official Credentials and Settings */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 space-y-4 shrink-0 overflow-y-auto max-h-[30vh]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Firm Identity Card */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                <Building className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 font-semibold">المحاسب القانوني والمراجع:</div>
                <div className="text-xs font-bold text-white truncate">
                  أ/ {officeProfile?.auditorName || 'محمد جميل مرعي'}
                </div>
                <div className="text-[10px] text-emerald-400 font-medium truncate mt-0.5">
                  زميل جمعية المحاسبين والمراجعين المصرية
                </div>
              </div>
            </div>

            {/* License & Accreditation Card */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 font-semibold">التراخيص المهنية والاعتمادات:</div>
                <div className="text-xs font-bold text-amber-300 truncate">
                  {officeProfile?.licenseNumber || 'س.م.م / 43122 - ترخيص وزارة المالية'}
                </div>
                <div className="text-[10px] text-slate-300 font-mono truncate mt-0.5">
                  ملف ضريبي: {officeProfile?.taxAuthorityRegNo || '492-817-302'}
                </div>
              </div>
            </div>

            {/* Settings & Quick Actions */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 font-semibold">خيارات الهوية:</div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showWelcomeOnStartup}
                    onChange={(e) => handleToggleStartupWelcome(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-300">عرض كمقدمة عند بدء التشغيل</span>
                </label>
              </div>

              <button
                type="button"
                onClick={copyOfficeDetails}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                title="نسخ بيانات بطاقة المكتب الرسمية"
              >
                {copiedNotification ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>نسخ البطاقة</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Primary Dedicated Action Bar to Enter App or Close */}
          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 order-2 sm:order-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>منظومة المحاسب القانوني ومراجع الحسابات أ/ محمد جميل مرعي</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
              {/* Dismiss / Close button */}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="إغلاق نافذة العرض والعودة"
              >
                <X className="w-4 h-4 text-rose-400" />
                <span>إغلاق البرومو</span>
              </button>

              {/* Main CTA Button: Enter App Directly */}
              <button
                type="button"
                onClick={onClose}
                className="flex-[2] sm:flex-none px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-950/60 border border-emerald-400/40 transition-all cursor-pointer flex items-center justify-center gap-2"
                title="الدخول الفوري إلى واجهة البرنامج الرئيسية"
              >
                <LogIn className="w-4 h-4" />
                <span>المتابعة والدخول إلى البرنامج</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// High-Fidelity 3D Gold Medallion Component
const MedallionSvg: React.FC = () => {
  return (
    <svg viewBox="0 0 500 500" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Outer Gold Rim Gradient */}
        <linearGradient id="goldRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="15%" stopColor="#fde68a" />
          <stop offset="45%" stopColor="#d97706" />
          <stop offset="70%" stopColor="#b45309" />
          <stop offset="90%" stopColor="#78350f" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>

        {/* Inner Gold Metal Gradient */}
        <linearGradient id="goldMetalGrad" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="25%" stopColor="#fef08a" />
          <stop offset="55%" stopColor="#f59e0b" />
          <stop offset="85%" stopColor="#92400e" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>

        {/* Emerald Deep Backdrop Gradient */}
        <radialGradient id="emeraldBackdrop" cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#065f46" />
          <stop offset="50%" stopColor="#022c22" />
          <stop offset="90%" stopColor="#011c16" />
          <stop offset="100%" stopColor="#010e0b" />
        </radialGradient>

        {/* Upward Arrow Golden Gradient */}
        <linearGradient id="arrowGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="40%" stopColor="#f59e0b" />
          <stop offset="70%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>

        {/* Currency Green Gradient */}
        <linearGradient id="dollarBillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ecfdf5" />
          <stop offset="35%" stopColor="#059669" />
          <stop offset="100%" stopColor="#022c22" />
        </linearGradient>

        {/* 24K Gold Bullion Bill Gradient */}
        <linearGradient id="goldBillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="30%" stopColor="#fde68a" />
          <stop offset="70%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>

        {/* Drop Shadows */}
        <filter id="medallionShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="16" stdDeviation="18" floodColor="#000000" floodOpacity="0.8" />
        </filter>
        <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#f59e0b" floodOpacity="0.5" />
        </filter>

        {/* Text Arc Paths */}
        {/* Top Arc Path: MOHAMED - M GAMEEL MARIE */}
        <path
          id="topTextArc"
          d="M 68,250 A 182,182 0 1,1 432,250"
          fill="none"
        />
        {/* Bottom Arc Path: FOR ACCOUNTING AND AUDITING */}
        <path
          id="bottomTextArc"
          d="M 412,250 A 162,162 0 0,1 88,250"
          fill="none"
        />
      </defs>

      {/* 1. Medallion Outer Drop Shadow Body */}
      <circle cx="250" cy="250" r="235" fill="#011612" filter="url(#medallionShadow)" />

      {/* 2. Outer Beveled Gold Ring */}
      <circle cx="250" cy="250" r="230" fill="none" stroke="url(#goldRimGrad)" strokeWidth="26" />

      {/* 3. Inner Circular Emerald Core */}
      <circle cx="250" cy="250" r="216" fill="url(#emeraldBackdrop)" />

      {/* 4. Thin Inner Gold Accent Rim */}
      <circle cx="250" cy="250" r="214" fill="none" stroke="#fde68a" strokeWidth="2" strokeOpacity="0.8" />
      <circle cx="250" cy="250" r="162" fill="none" stroke="#f59e0b" strokeWidth="2" strokeOpacity="0.6" />

      {/* 5. Circular Embossed Typography */}
      {/* Top Name: MOHAMED - M GAMEEL MARIE */}
      <text
        fontFamily="Cinzel, Times New Roman, serif"
        fontSize="21"
        fontWeight="bold"
        fill="url(#goldMetalGrad)"
        filter="url(#goldGlow)"
        letterSpacing="2.5"
      >
        <textPath href="#topTextArc" startOffset="50%" textAnchor="middle">
          MOHAMED - M GAMEEL MARIE
        </textPath>
      </text>

      {/* Bottom Subtitle: FOR ACCOUNTING AND AUDITING */}
      <text
        fontFamily="Cinzel, sans-serif"
        fontSize="15"
        fontWeight="600"
        fill="#fef3c7"
        letterSpacing="2.2"
      >
        <textPath href="#bottomTextArc" startOffset="50%" textAnchor="middle">
          FOR ACCOUNTING AND AUDITING
        </textPath>
      </text>

      {/* 6. Fanned Banknotes Stack (3 Currency Notes + 2 Gold Bullion Notes) */}
      <g transform="translate(195, 215)">
        {/* Bill 1 (Green Currency - far left) */}
        <g transform="rotate(-26) translate(-80, -45)">
          <rect x="0" y="0" width="150" height="78" rx="4" fill="url(#dollarBillGrad)" stroke="#34d399" strokeWidth="1.5" />
          <rect x="6" y="6" width="138" height="66" rx="2" fill="none" stroke="#6ee7b7" strokeWidth="1" strokeDasharray="4 2" />
          <ellipse cx="75" cy="39" rx="28" ry="24" fill="none" stroke="#34d399" strokeWidth="1.2" />
          <text x="75" y="46" fontFamily="sans-serif" fontSize="22" fontWeight="bold" fill="#fef08a" textAnchor="middle">$</text>
          <text x="14" y="22" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#a7f3d0">100</text>
          <text x="136" y="68" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#a7f3d0" textAnchor="end">100</text>
        </g>

        {/* Bill 2 (Green Currency - mid left) */}
        <g transform="rotate(-12) translate(-75, -45)">
          <rect x="0" y="0" width="150" height="78" rx="4" fill="url(#dollarBillGrad)" stroke="#34d399" strokeWidth="1.5" />
          <rect x="6" y="6" width="138" height="66" rx="2" fill="none" stroke="#6ee7b7" strokeWidth="1" strokeDasharray="4 2" />
          <ellipse cx="75" cy="39" rx="28" ry="24" fill="none" stroke="#34d399" strokeWidth="1.2" />
          <text x="75" y="46" fontFamily="sans-serif" fontSize="22" fontWeight="bold" fill="#fef08a" textAnchor="middle">$</text>
          <text x="14" y="22" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#a7f3d0">100</text>
          <text x="136" y="68" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#a7f3d0" textAnchor="end">100</text>
        </g>

        {/* Bill 3 (Green Currency - center) */}
        <g transform="rotate(2) translate(-70, -45)">
          <rect x="0" y="0" width="150" height="78" rx="4" fill="url(#dollarBillGrad)" stroke="#34d399" strokeWidth="1.5" />
          <rect x="6" y="6" width="138" height="66" rx="2" fill="none" stroke="#6ee7b7" strokeWidth="1" strokeDasharray="4 2" />
          <ellipse cx="75" cy="39" rx="28" ry="24" fill="none" stroke="#34d399" strokeWidth="1.2" />
          <text x="75" y="46" fontFamily="sans-serif" fontSize="22" fontWeight="bold" fill="#fef08a" textAnchor="middle">$</text>
          <text x="14" y="22" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#a7f3d0">100</text>
          <text x="136" y="68" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#a7f3d0" textAnchor="end">100</text>
        </g>

        {/* Bill 4 (24K Gold Bullion Bill) */}
        <g transform="rotate(16) translate(-65, -45)">
          <rect x="0" y="0" width="150" height="78" rx="4" fill="url(#goldBillGrad)" stroke="#fef08a" strokeWidth="2" />
          <rect x="6" y="6" width="138" height="66" rx="2" fill="none" stroke="#78350f" strokeWidth="1.2" />
          <ellipse cx="75" cy="39" rx="30" ry="26" fill="none" stroke="#78350f" strokeWidth="1.5" />
          <text x="75" y="48" fontFamily="serif" fontSize="28" fontWeight="900" fill="#78350f" textAnchor="middle">$</text>
          <text x="76" y="47" fontFamily="serif" fontSize="28" fontWeight="900" fill="#fffbeb" textAnchor="middle">$</text>
        </g>

        {/* Bill 5 (24K Gold Bullion Bill - top right) */}
        <g transform="rotate(28) translate(-60, -45)">
          <rect x="0" y="0" width="150" height="78" rx="4" fill="url(#goldBillGrad)" stroke="#fef08a" strokeWidth="2" filter="url(#goldGlow)" />
          <rect x="6" y="6" width="138" height="66" rx="2" fill="none" stroke="#78350f" strokeWidth="1.2" />
          <ellipse cx="75" cy="39" rx="30" ry="26" fill="none" stroke="#78350f" strokeWidth="1.5" />
          <text x="75" y="48" fontFamily="serif" fontSize="28" fontWeight="900" fill="#78350f" textAnchor="middle">$</text>
          <text x="76" y="47" fontFamily="serif" fontSize="28" fontWeight="900" fill="#fffbeb" textAnchor="middle">$</text>
        </g>
      </g>

      {/* 7. Upward Golden Growth Arrow (Swooping from bottom-left out to top-right) */}
      <g filter="url(#goldGlow)">
        {/* Curved Arrow Body */}
        <path
          d="M 170,330 C 230,340 330,300 375,185"
          fill="none"
          stroke="url(#arrowGrad)"
          strokeWidth="24"
          strokeLinecap="round"
        />
        <path
          d="M 170,330 C 230,340 330,300 375,185"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          strokeOpacity="0.8"
          strokeLinecap="round"
        />

        {/* Arrowhead (Piercing outward to top-right) */}
        <polygon
          points="415,145 355,160 375,198"
          fill="url(#arrowGrad)"
          stroke="#ffffff"
          strokeWidth="2"
        />
      </g>

      {/* 8. 3D Polished Gold Letters "MG" */}
      <g transform="translate(255, 275)" filter="url(#medallionShadow)">
        {/* 3D Extrusion Depth Shadows */}
        <text
          x="3"
          y="6"
          fontFamily="Cinzel, Times New Roman, serif"
          fontSize="115"
          fontWeight="900"
          fill="#1c1917"
          textAnchor="middle"
        >
          MG
        </text>
        <text
          x="1.5"
          y="3"
          fontFamily="Cinzel, Times New Roman, serif"
          fontSize="115"
          fontWeight="900"
          fill="#78350f"
          textAnchor="middle"
        >
          MG
        </text>

        {/* Main Golden Surface */}
        <text
          x="0"
          y="0"
          fontFamily="Cinzel, Times New Roman, serif"
          fontSize="115"
          fontWeight="900"
          fill="url(#goldMetalGrad)"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="1.5"
          textAnchor="middle"
        >
          MG
        </text>
      </g>

      {/* 9. Dynamic 3D Gold Checkmark (✓) */}
      <g filter="url(#goldGlow)">
        <path
          d="M 160,250 L 210,310 L 295,200"
          fill="none"
          stroke="url(#goldRimGrad)"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Specular Highlight Ridge */}
        <path
          d="M 160,250 L 210,310 L 295,200"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Sparkle Glint on Arrow Tip */}
      <g transform="translate(415, 145)">
        <DiamondStarSvg size={28} />
      </g>
    </svg>
  );
};

// 4-Point Diamond Sparkle Star SVG
const DiamondStarSvg: React.FC<{ size: number }> = ({ size }) => {
  const r = size * 0.5;
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="starGlow" cx="0%" cy="0%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#fde68a" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="0" r="45" fill="url(#starGlow)" />
      {/* 4-Point Star Flare */}
      <path
        d="M 0,-45 Q 0,0 45,0 Q 0,0 0,45 Q 0,0 -45,0 Q 0,0 0,-45 Z"
        fill="#ffffff"
      />
      <circle cx="0" cy="0" r="7" fill="#fffbeb" />
    </svg>
  );
};

export default MgOfficePromoModal;

