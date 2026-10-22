import { TranscriptSegment } from '@/types';

let currentAudioElement: HTMLAudioElement | null = null;

export interface GnaniSpeechOptions {
  language?: string;
  voice?: string;
  speed?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

// Backwards-compatible alias
export type PiperSpeechOptions = GnaniSpeechOptions;

/**
 * Plays text aloud using Gnani.ai Timbre neural voice engine with seamless browser fallback
 */
export async function speakWithGnani(
  text: string,
  options: GnaniSpeechOptions = {}
): Promise<void> {
  stopGnaniSpeech();

  const { language = 'en', voice = 'Shivani', speed = 1.0, onStart, onEnd, onError } = options;

  try {
    onStart?.();

    // 1. Call Gnani.ai TTS API endpoint
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        text,
        language,
        voice,
        speed,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.audioDataUrl) {
        const audio = new Audio(data.audioDataUrl);
        currentAudioElement = audio;

        audio.onended = () => {
          currentAudioElement = null;
          onEnd?.();
        };

        audio.onerror = (e) => {
          console.warn('Gnani audio playback error, falling back to speech synthesis:', e);
          fallbackSpeechSynthesis(text, language, onEnd);
        };

        await audio.play();
        return;
      }
    }

    fallbackSpeechSynthesis(text, language, onEnd);
  } catch (err: any) {
    console.warn('Gnani TTS error, using browser speech engine:', err);
    onError?.(err);
    fallbackSpeechSynthesis(text, language, onEnd);
  }
}

// Export alias for seamless integration
export const speakWithPiper = speakWithGnani;

/**
 * Native SpeechSynthesis fallback tuned for Indian & international accents
 */
function fallbackSpeechSynthesis(
  text: string,
  language: string,
  onEnd?: () => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);

  const langTagMap: Record<string, string> = {
    hi: 'hi-IN',
    hinglish: 'hi-IN',
    bn: 'bn-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    mr: 'mr-IN',
    gu: 'gu-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    pa: 'pa-IN',
    ur: 'ur-PK',
    en: 'en-IN',
  };

  utterance.lang = langTagMap[language] || 'en-IN';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  utterance.onend = () => {
    onEnd?.();
  };

  utterance.onerror = () => {
    onEnd?.();
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Stops any active Gnani audio playback
 */
export function stopGnaniSpeech(): void {
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
    } catch {}
    currentAudioElement = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

// Export alias for seamless backwards compatibility
export const stopPiperSpeech = stopGnaniSpeech;

export interface STTResult {
  transcribedText: string;
  detectedLanguage: string;
  modelUsed: string;
  segments: TranscriptSegment[];
  audioBlob?: Blob;
  audioUrl?: string;
}

/**
 * Encodes PCM samples into a standard 16-bit mono RIFF WAV Blob
 */
function encodeWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');

  // fmt subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // 16 for PCM
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, 1, true); // 1 channel (mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate (16-bit mono)
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample

  // data subchunk
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // PCM data conversion
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Records real microphone audio and transcribes it using Gnani.ai Prisma STT API
 */
export class GnaniAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private pcmChunks: Float32Array[] = [];
  private audioChunks: Blob[] = [];

  async start(): Promise<void> {
    this.pcmChunks = [];
    this.audioChunks = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone audio recording is not supported in this browser.');
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    // 1. AudioContext capturing for pristine 16kHz WAV format (best for Gnani STT)
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass({ sampleRate: 16000 });
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
        this.scriptProcessor.onaudioprocess = (e) => {
          const channel = e.inputBuffer.getChannelData(0);
          this.pcmChunks.push(new Float32Array(channel));
        };
        source.connect(this.scriptProcessor);
        this.scriptProcessor.connect(this.audioContext.destination);
      }
    } catch (e) {
      console.warn('AudioContext recording initialization fallback:', e);
    }

    // 2. Also keep MediaRecorder active as browser fallback
    try {
      this.mediaRecorder = new MediaRecorder(this.mediaStream);
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      this.mediaRecorder.start(250);
    } catch {}
  }

  async stop(language: string = 'en', hintText?: string): Promise<STTResult> {
    // Stop tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch {}
      this.scriptProcessor = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }

    let audioBlob: Blob;
    // Check if we captured PCM samples for pristine WAV
    if (this.pcmChunks.length > 0) {
      const totalLength = this.pcmChunks.reduce((acc, c) => acc + c.length, 0);
      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of this.pcmChunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      audioBlob = encodeWavBlob(merged, 16000);
    } else if (this.audioChunks.length > 0) {
      audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    } else {
      audioBlob = new Blob([], { type: 'audio/wav' });
    }

    const audioUrl = URL.createObjectURL(audioBlob);

    // Send to /api/stt
    const formData = new FormData();
    formData.append('audio', audioBlob, 'patient_intake.wav');
    formData.append('language', language);
    if (hintText) formData.append('hintText', hintText);

    const res = await fetch('/api/stt', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Gnani STT API responded with status ${res.status}`);
    }

    const data = await res.json();

    return {
      transcribedText: data.transcribedText,
      detectedLanguage: data.detectedLanguage || language,
      modelUsed: data.modelUsed || 'Gnani.ai Prisma v2.5 STT',
      segments: data.segments || [],
      audioBlob,
      audioUrl,
    };
  }

  cancel(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch {}
      this.scriptProcessor = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    this.pcmChunks = [];
    this.audioChunks = [];
  }
}

// Export alias for seamless backwards compatibility
export const WhisperAudioRecorder = GnaniAudioRecorder;

