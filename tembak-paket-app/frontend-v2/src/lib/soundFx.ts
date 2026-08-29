"use client";

// =======================================================================
// Web Audio API Sound Effects Engine (Zero-Latency, Crisp & Universal)
// =======================================================================

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// 1. Success Sound (Crisp Major Chime: C5 -> E5 -> G5 -> C6)
export function playSuccessSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  const now = ctx.currentTime;

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + idx * 0.07);

    gain.gain.setValueAtTime(0.0001, now + idx * 0.07);
    gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.07 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.07);
    osc.stop(now + idx * 0.07 + 0.36);
  });
}

// 2. Error Sound (Soft Double Low Thud: F3 -> Db3)
export function playErrorSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [220, 164.81]; // A3, E3
  const now = ctx.currentTime;

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + idx * 0.12);

    gain.gain.setValueAtTime(0.0001, now + idx * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.22, now + idx * 0.12 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.12);
    osc.stop(now + idx * 0.12 + 0.22);
  });
}

// 3. Warning Sound (Gentle Dual Beep: G4 -> C5)
export function playWarningSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  [392, 523.25].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + idx * 0.1);

    gain.gain.setValueAtTime(0.0001, now + idx * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.15, now + idx * 0.1 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.1);
    osc.stop(now + idx * 0.1 + 0.2);
  });
}

// 4. Coin Claim & Promo Claim Sound (Sparkling Metallic Shimmer Ring)
export function playCoinClaimSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // High cheerful coin pings
  const notes = [987.77, 1318.51, 1567.98, 2093.0]; // B5, E6, G6, C7
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + idx * 0.06);

    gain.gain.setValueAtTime(0.0001, now + idx * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.06 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.06);
    osc.stop(now + idx * 0.06 + 0.42);
  });
}

// 5. Topup & Payment Success Sound (Triumphant Fanfare with Shimmer)
export function playTopupSuccessSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Fanfare: C5, G5, C6, E6, G6, C7
  const notes = [523.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0];
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

    gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.22, now + idx * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.52);
  });
}

// 6. Pop Bubble Sound (For Button Clicks & Modal Opens)
export function playPopSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(900, now + 0.06);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.08);
}

// 7. Ding Notification Sound (Clean Glass Ding)
export function playDingSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(1318.51, now); // E6

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.62);
}

// 8. Spin Wheel Tick Sound
export function playWheelTickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(750, now);
  osc.frequency.exponentialRampToValueAtTime(250, now + 0.03);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.04);
}

// =======================================================================
// Global SweetAlert2 Automatic Sound Binding
// =======================================================================
export function bindSwalSounds() {
  if (typeof window === "undefined") return;

  // Listen for user gesture to unlock AudioContext on mobile/iOS/Safari
  const unlockAudio = () => {
    getAudioContext();
    window.removeEventListener("click", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
  };
  window.addEventListener("click", unlockAudio, { once: true });
  window.addEventListener("touchstart", unlockAudio, { once: true });

  // Patch Swal if loaded or observe DOM for sweetalert containers
  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement) {
            // Check if a SweetAlert container was mounted
            if (node.classList?.contains("swal2-container") || node.querySelector?.(".swal2-popup")) {
              const popup = node.classList.contains("swal2-popup") ? node : node.querySelector(".swal2-popup");
              if (popup) {
                if (popup.querySelector(".swal2-icon-success") || popup.classList.contains("swal2-icon-success")) {
                  playSuccessSound();
                } else if (popup.querySelector(".swal2-icon-error") || popup.classList.contains("swal2-icon-error")) {
                  playErrorSound();
                } else if (popup.querySelector(".swal2-icon-warning") || popup.classList.contains("swal2-icon-warning")) {
                  playWarningSound();
                } else if (popup.querySelector(".swal2-icon-question") || popup.querySelector(".swal2-icon-info")) {
                  playDingSound();
                } else {
                  playPopSound();
                }
              }
            }
          }
        }
      }
    });

    try {
      observer.observe(document.body, { childList: true, subtree: true });
    } catch {}
  }
}
