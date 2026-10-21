import { TranscriptSegment } from '@/types';

let currentAudioElement: HTMLAudioElement | null = null;

export interface PiperSpeechOptions {
  language?: string;
  voice?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

/**
 * Plays text aloud using Piper neural TTS engine with seamless browser audio fallback
 */
export async function speakWithPiper(
  text: string,
  options: PiperSpeechOptions = {}
): Promise<void> {
  stopPiperSpeech();

  const { language = 'en', onStart, onEnd, onError } = options;

  try {
    onStart?.();

    // 1. First attempt to call Piper TTS API endpoint
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        text,
        language,
        voice: options.voice,
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
          console.warn('Piper audio playback error, falling back to speech synthesis:', e);
          fallbackSpeechSynthesis(text, language, onEnd);
        };

        await audio.play();

        // Also trigger gentle speech utterance in parallel so the exact words are spoken naturally
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          fallbackSpeechSynthesis(text, language, onEnd, true);
        }
        return;
      }
    }

    // Fallback if API was not returning data URL
    fallbackSpeechSynthesis(text, language, onEnd);
  } catch (err: any) {
    console.warn('Piper TTS network error, using browser speech engine:', err);
    fallbackSpeechSynthesis(text, language, onEnd);
  }
}

/**
 * Native SpeechSynthesis fallback tuned for Indian & international accents
 */
function fallbackSpeechSynthesis(
  text: string,
  language: string,
  onEnd?: () => void,
  isSilentSecondary = false
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

  utterance.lang = langTagMap[language] || 'en-US';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  if (isSilentSecondary) {
    utterance.volume = 0.85;
  }

  utterance.onend = () => {
    onEnd?.();
  };

  utterance.onerror = () => {
    onEnd?.();
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Stops any active Piper audio playback
 */
export function stopPiperSpeech(): void {
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

export interface STTResult {
  transcribedText: string;
  detectedLanguage: string;
  modelUsed: string;
  segments: TranscriptSegment[];
  audioBlob?: Blob;
  audioUrl?: string;
}

/**
 * Records real microphone audio and transcribes it using faster-whisper / IndicWhisper API
 */
export class WhisperAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    this.audioChunks = [];
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone audio recording is not supported in this browser.');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.stream);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(250); // Slice every 250ms
  }

  async stop(language: string = 'en', hintText?: string): Promise<STTResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);

          // Stop all mic tracks
          if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
          }

          // Send to /api/stt
          const formData = new FormData();
          formData.append('audio', audioBlob, 'patient_intake.webm');
          formData.append('language', language);
          if (hintText) formData.append('hintText', hintText);

          const res = await fetch('/api/stt', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            throw new Error(`STT API responded with status ${res.status}`);
          }

          const data = await res.json();

          resolve({
            transcribedText: data.transcribedText,
            detectedLanguage: data.detectedLanguage || language,
            modelUsed: data.modelUsed || 'faster-whisper/IndicWhisper-v2',
            segments: data.segments || [],
            audioBlob,
            audioUrl,
          });
        } catch (err) {
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.audioChunks = [];
  }
}
