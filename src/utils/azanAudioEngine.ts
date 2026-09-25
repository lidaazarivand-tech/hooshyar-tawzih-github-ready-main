// Genuine Azan Audio Engine (Real Azan Voices only)

import { getCachedAzanUrl, cacheAzanAudio, cacheAllAzans, isAzanCached } from './azanCache';
import { stopNativeAzanPlayback, checkNativeAzanPlaying, addNativeAzanPlaybackListener } from './nativeAzan';

export interface ReciterProfile {
  id: string;
  name: string;
  title: string;
  style: string;
  desc: string;
  country: string;
  isArabic: boolean;
  famous: boolean;
  audioUrls: string[];
}

export const AZAN_RECITERS: ReciterProfile[] = [
  {
    id: 'moazenzadeh',
    name: 'مؤذن‌زاده اردبیلی',
    title: 'دستگاه بیات ترک (گوشه روح‌الارواح) - صوت اصلی ۱۳۳۴',
    style: 'صدای اصلی و ماندگارترین اذان شیعی تاریخ ایران با نوای «أشهد أن علیا ولی الله»',
    desc: 'صوت واقعی و تاریخی ضبط شده در استودیو ۶ رادیو ایران سال ۱۳۳۴، ثبت شده در فهرست میراث معنوی ملی ایران',
    country: 'ایران',
    isArabic: false,
    famous: true,
    audioUrls: [
      '/audio/azan/moazenzadeh.mp3'
    ]
  },
  {
    id: 'sobhdel',
    name: 'صبحدل',
    title: 'نغمه بیات ترک و سحرگاهی - صوت واقعی و کامل',
    style: 'صدای واقعی و ملکوتی اذان سحرگاهی حاج حسین صبحدل با طنین آرامش‌بخش',
    desc: 'معروف به اذان سحرگاهی، از شاهکارهای صوتی معنوی و خاطره‌انگیز رادیو و سحرهای ماه مبارک رمضان',
    country: 'ایران',
    isArabic: false,
    famous: true,
    audioUrls: [
      '/audio/azan/sobhdel.mp3'
    ]
  },
  {
    id: 'gholosh',
    name: 'راغب مصطفی غلوش',
    title: 'دستگاه بیات و رست - صوت تاریخی و مجلسی',
    style: 'صدای ماندگار و حزین استاد راغب مصطفی غلوش در سفر به ایران',
    desc: 'از زیباترین و مشهورترین اذان‌های جهان اسلام ضبط شده در مسجد امام تهران',
    country: 'مصر',
    isArabic: true,
    famous: true,
    audioUrls: [
      '/audio/azan/gholosh.mp3'
    ]
  }
];

export function resolveAzanAudioUrls(reciterId: string): string[] {
  const urls: string[] = [];
  const reciter = AZAN_RECITERS.find(r => r.id === reciterId);
  const base = (typeof window !== 'undefined' && window.location ? window.location.origin : '');
  const metaEnv = (import.meta as unknown as { env?: { BASE_URL?: string } })?.env;
  const basePath = metaEnv?.BASE_URL || '/';
  const cleanBase = basePath.endsWith('/') ? basePath : `${basePath}/`;

  // 1. Base URL path (primary standard)
  urls.push(`${cleanBase}audio/azan/${reciterId}.mp3`);
  
  // 2. Absolute root path
  urls.push(`/audio/azan/${reciterId}.mp3`);

  // 3. Explicit origin path
  if (base) {
    urls.push(`${base}${cleanBase}audio/azan/${reciterId}.mp3`);
    urls.push(`${base}/audio/azan/${reciterId}.mp3`);
  }

  // 4. Relative paths
  urls.push(`./audio/azan/${reciterId}.mp3`);
  urls.push(`audio/azan/${reciterId}.mp3`);

  // 5. Configured audioUrls in reciter profile
  if (reciter?.audioUrls) {
    for (const u of reciter.audioUrls) {
      if (!urls.includes(u)) {
        urls.push(u);
      }
    }
  }

  return urls;
}

export interface AzanVerse {
  id: number;
  arabic: string;
  persian: string;
  repeatCount: number;
}

export const AZAN_VERSES: AzanVerse[] = [
  { id: 1, arabic: 'اللهُ أَکْبَرُ', persian: 'خداوند بزرگتر از آن است که به وصف آید', repeatCount: 4 },
  { id: 2, arabic: 'أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللهُ', persian: 'گواهی می‌دهم که هیچ معبودی جز خدای یگانه نیست', repeatCount: 2 },
  { id: 3, arabic: 'أَشْهَدُ أَنَّ مُحَمَّداً رَسُولُ اللهِ', persian: 'گواهی می‌دهم که محمد (ص) فرستاده و پیامبر خداست', repeatCount: 2 },
  { id: 4, arabic: 'أَشْهَدُ أَنَّ عَلِیّاً وَلِیُّ اللهِ', persian: 'گواهی می‌دهم که علی (ع) ولی و حجت خداست', repeatCount: 2 },
  { id: 5, arabic: 'حَیَّ عَلَى الصَّلَاةِ', persian: 'بشتابید به سوی نماز و بندگی حق', repeatCount: 2 },
  { id: 6, arabic: 'حَیَّ عَلَى الْفَلَاحِ', persian: 'بشتابید به سوی رستگاری و نیک‌بختی', repeatCount: 2 },
  { id: 7, arabic: 'حَیَّ عَلَى خَیْرِ الْعَمَلِ', persian: 'بشتابید به سوی بهترین کارها', repeatCount: 2 },
  { id: 8, arabic: 'اللهُ أَکْبَرُ', persian: 'خداوند بزرگترین است', repeatCount: 2 },
  { id: 9, arabic: 'لَا إِلٰهَ إِلَّا اللهُ', persian: 'هیچ معبودی جز خدای یکتا نیست', repeatCount: 2 }
];

export interface AzanPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  isPaused: boolean;
  isAutoplayBlocked?: boolean;
  reciterId: string;
  prayerName?: string;
  cityName?: string;
  currentTime: number;
  duration: number;
  progressPercent: number;
  currentVerseIndex: number;
  sourceType: 'real';
  volume: number;
  errorMessage: string | null;
}

type AzanListener = (state: AzanPlayerState) => void;

class AzanAudioEngine {
  private audioElement: HTMLAudioElement | null = null;
  private currentReciterId: string = 'moazenzadeh';
  private currentVolume: number = 0.85;
  private candidateUrls: string[] = [];
  private currentUrlIndex: number = 0;
  private currentPrayerName: string = 'اذان';
  private currentCityName: string = '';
  private gestureUnlockHandler: (() => void) | null = null;
  private playbackRequestId: number = 0;
  
  private state: AzanPlayerState = {
    isPlaying: false,
    isLoading: false,
    isPaused: false,
    isAutoplayBlocked: false,
    reciterId: 'moazenzadeh',
    prayerName: 'اذان',
    cityName: '',
    currentTime: 0,
    duration: 0,
    progressPercent: 0,
    currentVerseIndex: -1,
    sourceType: 'real',
    volume: 0.85,
    errorMessage: null
  };

  private listeners: Set<AzanListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioElement();
      this.initNativeSync();
    }
  }

  private initNativeSync() {
    // Check initial native status (e.g. if opened by tapping the active Azan notification)
    checkNativeAzanPlaying().then(res => {
      if (res && res.isPlaying) {
        if (this.audioElement && !this.audioElement.paused) {
          try {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
          } catch (e) {}
        }
        this.updateState({
          isPlaying: true,
          prayerName: res.prayerName || this.currentPrayerName,
          reciterId: res.reciterId || this.currentReciterId,
          isLoading: false,
          isPaused: false
        });
      }
    }).catch(() => {});

    // Listen to real-time events from native Azan service
    addNativeAzanPlaybackListener(state => {
      if (state.isPlaying) {
        // Native service is playing: silence any local HTML audio to prevent overlapping audio
        if (this.audioElement && !this.audioElement.paused) {
          try {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
          } catch (e) {}
        }
        this.updateState({
          isPlaying: true,
          prayerName: state.prayerName || this.currentPrayerName,
          reciterId: state.reciterId || this.currentReciterId,
          isLoading: false,
          isPaused: false
        });
      } else {
        // Native stopped: if web is not playing, mark as stopped
        if (!this.audioElement || this.audioElement.paused) {
          this.updateState({
            isPlaying: false,
            isLoading: false,
            isPaused: false,
            currentTime: 0,
            progressPercent: 0,
            currentVerseIndex: -1
          });
        }
      }
    }).catch(() => {});
  }

  private initAudioElement(): HTMLAudioElement {
    if (this.audioElement) return this.audioElement;
    
    this.audioElement = new Audio();
    this.audioElement.preload = 'auto';
    this.audioElement.volume = this.currentVolume;

    this.audioElement.addEventListener('loadstart', () => {
      this.updateState({ isLoading: true, errorMessage: null });
    });

    this.audioElement.addEventListener('canplay', () => {
      if (this.audioElement) {
        this.updateState({ 
          duration: this.audioElement.duration || 0,
          isLoading: false 
        });
      }
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      if (this.audioElement) {
        this.updateState({ 
          duration: this.audioElement.duration || 0,
          isLoading: false 
        });
      }
    });

    this.audioElement.addEventListener('timeupdate', () => {
      if (!this.audioElement) return;
      const cur = this.audioElement.currentTime || 0;
      const rawDur = this.audioElement.duration;
      const dur = (Number.isFinite(rawDur) && rawDur > 0) ? rawDur : 0;
      const progress = dur > 0 ? Math.min(100, Math.max(0, (cur / dur) * 100)) : 0;
      
      const verseIdx = this.estimateVerseIndex(progress, cur, this.currentReciterId);

      this.updateState({
        currentTime: cur,
        duration: dur,
        progressPercent: progress,
        currentVerseIndex: verseIdx,
        isPlaying: true,
        isLoading: false
      });
    });

    this.audioElement.addEventListener('playing', () => {
      this.updateState({ 
        isPlaying: true, 
        isPaused: false, 
        isLoading: false,
        isAutoplayBlocked: false,
        errorMessage: null
      });
    });

    this.audioElement.addEventListener('pause', () => {
      if (this.audioElement) {
        const isNearEnd = this.audioElement.currentTime >= (this.audioElement.duration || 0) - 0.5;
        if (!isNearEnd) {
          this.updateState({ isPlaying: false, isPaused: true });
        }
      }
    });

    this.audioElement.addEventListener('ended', () => {
      this.stop();
    });

    this.audioElement.addEventListener('error', () => {
      this.handleAudioError();
    });

    return this.audioElement;
  }

  private estimateVerseIndex(progressPercent: number, currentTimeSeconds: number = 0, reciterId: string = ''): number {
    // If we have precise elapsed time for known reciters, use the real chanted verse boundaries
    if (currentTimeSeconds > 0) {
      if (reciterId === 'moazenzadeh') {
        // Moazenzadeh Ardabili recorded timeline (~327s)
        if (currentTimeSeconds < 68) return 0;  // Allahu Akbar
        if (currentTimeSeconds < 110) return 1; // Ashhadu an la ilaha illallah
        if (currentTimeSeconds < 155) return 2; // Ashhadu anna Muhammadan rasulullah
        if (currentTimeSeconds < 195) return 3; // Ashhadu anna Aliyyan waliyyullah
        if (currentTimeSeconds < 232) return 4; // Hayya ala-s-salah
        if (currentTimeSeconds < 268) return 5; // Hayya ala-l-falah
        if (currentTimeSeconds < 295) return 6; // Hayya ala khayril amal
        if (currentTimeSeconds < 312) return 7; // Allahu Akbar
        return 8; // La ilaha illallah
      }
      
      if (reciterId === 'sobhdel') {
        // Hossein Sobhdel recorded timeline (~215s)
        if (currentTimeSeconds < 35) return 0;  // Allahu Akbar
        if (currentTimeSeconds < 65) return 1;  // Ashhadu an la ilaha illallah
        if (currentTimeSeconds < 98) return 2;  // Ashhadu anna Muhammadan rasulullah
        if (currentTimeSeconds < 125) return 3; // Ashhadu anna Aliyyan waliyyullah
        if (currentTimeSeconds < 150) return 4; // Hayya ala-s-salah
        if (currentTimeSeconds < 175) return 5; // Hayya ala-l-falah
        if (currentTimeSeconds < 195) return 6; // Hayya ala khayril amal
        if (currentTimeSeconds < 205) return 7; // Allahu Akbar
        return 8; // La ilaha illallah
      }

      if (reciterId === 'gholosh') {
        // Ragheb Mostafa Gholosh recorded timeline (~278s)
        if (currentTimeSeconds < 48) return 0;
        if (currentTimeSeconds < 88) return 1;
        if (currentTimeSeconds < 135) return 2;
        if (currentTimeSeconds < 175) return 3;
        if (currentTimeSeconds < 210) return 4;
        if (currentTimeSeconds < 240) return 5;
        if (currentTimeSeconds < 260) return 6;
        if (currentTimeSeconds < 270) return 7;
        return 8;
      }
    }

    // Relative percentage fallback
    if (progressPercent <= 0) return 0;
    if (progressPercent < 13) return 0; // Allahu Akbar
    if (progressPercent < 25) return 1; // Ashhadu an la ilaha illallah
    if (progressPercent < 39) return 2; // Ashhadu anna Muhammadan rasulullah
    if (progressPercent < 51) return 3; // Ashhadu anna Aliyyan waliyyullah
    if (progressPercent < 64) return 4; // Hayya ala-s-salah
    if (progressPercent < 76) return 5; // Hayya ala-l-falah
    if (progressPercent < 86) return 6; // Hayya ala khayril amal
    if (progressPercent < 94) return 7; // Allahu Akbar
    return 8; // La ilaha illallah
  }

  private handleAudioError() {
    this.currentUrlIndex++;

    if (this.currentUrlIndex < this.candidateUrls.length && this.audioElement) {
      const nextUrl = this.candidateUrls[this.currentUrlIndex];
      try {
        this.audioElement.src = nextUrl;
        this.audioElement.load();
        const p = this.audioElement.play();
        if (p !== undefined) {
          p.catch(() => this.handleAudioError());
        }
      } catch (e) {
        this.handleAudioError();
      }
    } else {
      // If genuine Azan audio file is not reachable, do not play music or synthetic tones
      this.updateState({
        isPlaying: false,
        isLoading: false,
        isPaused: false,
        currentTime: 0,
        progressPercent: 0,
        currentVerseIndex: -1,
        errorMessage: 'فایل صوتی اذان در دسترس نیست.'
      });
    }
  }

  private setupOneTimeGestureUnlock() {
    this.cleanupGestureUnlock();

    const unlock = () => {
      this.cleanupGestureUnlock();
      if (this.state.isAutoplayBlocked) {
        this.play(this.currentReciterId, this.currentVolume, this.currentPrayerName, this.currentCityName);
      }
    };

    this.gestureUnlockHandler = unlock;
    if (typeof window !== 'undefined') {
      window.addEventListener('click', unlock, { once: true, passive: true });
      window.addEventListener('touchstart', unlock, { once: true, passive: true });
      window.addEventListener('keydown', unlock, { once: true, passive: true });
    }
  }

  private cleanupGestureUnlock() {
    if (this.gestureUnlockHandler && typeof window !== 'undefined') {
      window.removeEventListener('click', this.gestureUnlockHandler);
      window.removeEventListener('touchstart', this.gestureUnlockHandler);
      window.removeEventListener('keydown', this.gestureUnlockHandler);
      this.gestureUnlockHandler = null;
    }
  }

  public subscribe(listener: AzanListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public setListener(cb: (playing: boolean, currentVerseIndex: number) => void) {
    return this.subscribe((s) => {
      cb(s.isPlaying, s.currentVerseIndex);
    });
  }

  public getState(): AzanPlayerState {
    return this.state;
  }

  public getIsPlaying(): boolean {
    return this.state.isPlaying;
  }

  private updateState(partial: Partial<AzanPlayerState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(l => {
      try {
        l(this.state);
      } catch (e) {
        // Safe listener execution
      }
    });
  }

  public async play(reciterId?: string, volume?: number, prayerName?: string, cityName?: string) {
    const requestId = ++this.playbackRequestId;

    // Silence any native background playback so there is never duplicate audio
    stopNativeAzanPlayback().catch(() => {});

    if (reciterId) this.currentReciterId = reciterId;
    if (volume !== undefined) this.currentVolume = Math.max(0, Math.min(1, volume));
    if (prayerName) this.currentPrayerName = prayerName;
    if (cityName) this.currentCityName = cityName;

    this.candidateUrls = resolveAzanAudioUrls(this.currentReciterId);
    this.currentUrlIndex = 0;

    this.updateState({
      isPlaying: true,
      isLoading: true,
      isPaused: false,
      isAutoplayBlocked: false,
      reciterId: this.currentReciterId,
      prayerName: this.currentPrayerName,
      cityName: this.currentCityName,
      sourceType: 'real',
      volume: this.currentVolume,
      currentVerseIndex: 0,
      errorMessage: null
    });

    const audio = this.initAudioElement();
    audio.volume = this.currentVolume;

    // Check if we have an offline cached audio URL for this reciter
    let targetUrl: string | null = null;
    try {
      targetUrl = await getCachedAzanUrl(this.currentReciterId);
    } catch (e) {
      targetUrl = null;
    }

    if (requestId !== this.playbackRequestId) return;

    if (!targetUrl) {
      targetUrl = this.candidateUrls[0];
      // Background offline caching for future offline playback
      cacheAzanAudio(this.currentReciterId).catch(() => {});
    }

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.src = targetUrl;
      audio.load();

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        if (requestId !== this.playbackRequestId) {
          audio.pause();
          audio.currentTime = 0;
          return;
        }
        this.updateState({ 
          isPlaying: true, 
          isPaused: false, 
          isAutoplayBlocked: false, 
          isLoading: false,
          errorMessage: null
        });
      }
    } catch (err: any) {
      if (requestId !== this.playbackRequestId) return;

      if (err && (err.name === 'NotAllowedError' || err.name === 'NotSupportedError' || err.code === 20)) {
        // Autoplay policy prevented playback without prior user gesture
        this.updateState({ 
          isPlaying: false, 
          isPaused: true, 
          isAutoplayBlocked: true, 
          isLoading: false,
          errorMessage: 'برای شروع پخش اذان، روی دکمه پخش ضربه بزنید.' 
        });
        this.setupOneTimeGestureUnlock();
      } else if (err && err.name === 'AbortError') {
        // Ignored: interrupted by fresh request
      } else {
        this.handleAudioError();
      }
    }
  }

  public async downloadForOffline(reciterId: string): Promise<string | null> {
    return cacheAzanAudio(reciterId);
  }

  public async downloadAllForOffline(
    onProgress?: (cur: number, total: number, name: string) => void
  ): Promise<{ success: number; failed: number }> {
    return cacheAllAzans(onProgress);
  }

  public pause() {
    if (this.audioElement && this.state.isPlaying) {
      try {
        this.audioElement.pause();
      } catch (e) {}
      this.updateState({ isPlaying: false, isPaused: true });
    }
  }

  public resume() {
    if (this.audioElement && this.state.isPaused) {
      const p = this.audioElement.play();
      if (p !== undefined) {
        p.catch(() => {});
      }
      this.updateState({ isPlaying: true, isPaused: false });
    }
  }

  public seek(seconds: number) {
    if (this.audioElement && this.state.sourceType === 'real') {
      try {
        this.audioElement.currentTime = Math.max(0, Math.min(seconds, this.audioElement.duration || seconds));
      } catch (e) {}
    }
  }

  public setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.audioElement) {
      try {
        this.audioElement.volume = this.currentVolume;
      } catch (e) {}
    }
    this.updateState({ volume: this.currentVolume });
  }

  public stop() {
    this.playbackRequestId++;
    this.cleanupGestureUnlock();
    // Silence native background playback as well
    stopNativeAzanPlayback().catch(() => {});

    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.audioElement.removeAttribute('src');
        this.audioElement.load();
      } catch (e) {}
    }

    this.updateState({
      isPlaying: false,
      isLoading: false,
      isPaused: false,
      isAutoplayBlocked: false,
      currentTime: 0,
      progressPercent: 0,
      currentVerseIndex: -1,
      errorMessage: null
    });
  }

  // Play Azan test sound
  public playChime(volume: number = 0.85, reciterId?: string) {
    if (this.state.isPlaying) {
      this.stop();
    } else {
      this.play(reciterId || this.currentReciterId || 'moazenzadeh', volume);
    }
  }

  // Alias for backward compatibility
  public playSynthesizedAzan(reciterId?: string, volume?: number) {
    this.play(reciterId, volume);
  }
}

export const azanAudioEngine = new AzanAudioEngine();

