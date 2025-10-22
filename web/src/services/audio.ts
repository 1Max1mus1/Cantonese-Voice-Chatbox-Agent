let unlocked = false;
let audioEl: HTMLAudioElement | null = null;
let isPlaying = false;
let listenersBound = false;
let queue: { url: string }[] = [];
let progressSubscribers: Array<(s: { current: number; duration: number; playing: boolean }) => void> = [];

// Attempt to unlock audio playback on iOS/Safari using a user gesture
export async function unlockAudioWithGesture(): Promise<void> {
  if (unlocked) return;

  try {
    // Create AudioContext and play a short silent tone under user gesture
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      try {
        await ctx.resume();
      } catch {}
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0; // silent
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.01);
    }

    if (!audioEl) {
      audioEl = new Audio();
      audioEl.preload = 'auto';
    }

    unlocked = true;
  } catch (e) {
    console.warn('Audio unlock failed', e);
  }
}

function notifyProgress(): void {
  if (!audioEl) return;
  const duration = isFinite(audioEl.duration) ? audioEl.duration : 0;
  const state = { current: audioEl.currentTime || 0, duration, playing: !audioEl.paused && !audioEl.ended };
  progressSubscribers.forEach((cb) => {
    try { cb(state); } catch {}
  });
}

function ensureAudio(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = 'auto';
  }
  // bind basic lifecycle to track playing state
  audioEl.onplay = () => {
    isPlaying = true;
    // 當真正開始播放時，移除隊首項（避免 Autoplay 被阻擋時提前 shift）
    if (queue.length && audioEl && audioEl.src === queue[0].url) {
      queue.shift();
    }
    notifyProgress();
  };
  audioEl.onended = () => { isPlaying = false; notifyProgress(); void playNextFromQueue(); };
  audioEl.onpause = () => { isPlaying = false; notifyProgress(); };
  if (!listenersBound) {
    audioEl.addEventListener('timeupdate', () => notifyProgress());
    audioEl.addEventListener('loadedmetadata', () => notifyProgress());
    listenersBound = true;
  }
  return audioEl;
}

export function isAudioPlaying(): boolean {
  return isPlaying;
}

export async function playAudioUrl(url: string): Promise<void> {
  const el = ensureAudio();
  el.src = url;
  el.crossOrigin = 'anonymous';
  try {
    await unlockAudioWithGesture();
    await el.play();
  } catch (e: any) {
    if (!unlocked) {
      throw new Error('Audio not unlocked. Call unlockAudioWithGesture() on a user gesture first.');
    }
    throw e;
  }
}

export async function playAudioUrlAwaitEnd(url: string): Promise<void> {
  const el = ensureAudio();
  el.src = url;
  el.crossOrigin = 'anonymous';
  try {
    await unlockAudioWithGesture();
    await el.play();
    await new Promise<void>((resolve, reject) => {
      const onEnded = () => { el.removeEventListener('ended', onEnded); resolve(); };
      const onError = () => { el.removeEventListener('error', onError as any); reject(new Error('Audio playback error')); };
      el.addEventListener('ended', onEnded, { once: true });
      el.addEventListener('error', onError as any, { once: true });
    });
  } catch (e: any) {
    if (!unlocked) {
      throw new Error('Audio not unlocked. Call unlockAudioWithGesture() on a user gesture first.');
    }
    throw e;
  }
}

async function playNextFromQueue(): Promise<void> {
  if (isPlaying) return;
  const next = queue[0];
  if (!next) return;
  const el = ensureAudio();
  if (el.src !== next.url) {
    el.src = next.url;
    el.crossOrigin = 'anonymous';
  }
  try {
    await el.play();
  } catch (e: any) {
    // 如果是 Autoplay 被阻擋，保留隊首項，等待使用者點擊「播放」或有手勢後再 resume
    const msg = String(e?.message ?? e);
    const name = String(e?.name ?? '');
    const autoplayBlocked = name === 'NotAllowedError' || /user (didn'?t|did not) interact/i.test(msg) || /play\(\) failed/i.test(msg);
    if (autoplayBlocked) {
      console.warn('Autoplay blocked; waiting for user gesture to start playback');
      notifyProgress();
      return; // 不移除隊列
    }
    // 其他錯誤：跳過此項，嘗試下一個
    console.warn('Audio play failed, skipping item', e);
    queue.shift();
    notifyProgress();
    await playNextFromQueue();
  }
}

export function enqueueAudio(url: string): void {
  queue.push({ url });
  if (!isPlaying) {
    void playNextFromQueue();
  }
}

export function clearQueue(): void {
  queue = [];
}

export function getQueueLength(): number {
  return queue.length;
}

export function setPlaybackRate(rate: number): void {
  const el = ensureAudio();
  el.playbackRate = rate;
  notifyProgress();
}

export function seekAudio(seconds: number): void {
  const el = ensureAudio();
  const duration = isFinite(el.duration) ? el.duration : seconds;
  el.currentTime = Math.max(0, Math.min(seconds, duration));
  notifyProgress();
}

export function pauseAudio(): void {
  const el = ensureAudio();
  try { el.pause(); } catch {}
  notifyProgress();
}

export async function resumeAudio(): Promise<void> {
  const el = ensureAudio();
  // 如果目前沒有載入任何來源，但隊列有項目，先載入隊首項
  if (!el.src && queue.length) {
    el.src = queue[0].url;
    el.crossOrigin = 'anonymous';
  }
  try {
    await unlockAudioWithGesture();
    await el.play();
  } finally {
    notifyProgress();
  }
}

export function subscribeProgress(cb: (s: { current: number; duration: number; playing: boolean }) => void): () => void {
  progressSubscribers.push(cb);
  // immediate push
  notifyProgress();
  return () => {
    progressSubscribers = progressSubscribers.filter((x) => x !== cb);
  };
}

export function stopPlayback(): void {
  if (audioEl) {
    try {
      audioEl.pause();
      audioEl.currentTime = 0;
      isPlaying = false;
    } catch {}
  }
}