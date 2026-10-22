import { NextRequest, NextResponse } from 'next/server';

// Gnani.ai / Vachana language mapping
export const GNANI_LANG_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  ur: 'ur-IN',
  hinglish: 'hi-IN',
};

// Available Gnani Timbre-v3.0 voices
export const GNANI_VOICES = [
  'Shivani',
  'Avinash',
  'Lakshmi',
  'Kalpana',
  'Shubham',
  'Prakash',
  'Devansh',
  'Yashraj',
  'Chetana',
  'Vasudha',
  'Harshad',
  'Riyaa',
  'Tarika',
];

/**
 * Fallback tone generator in case the network is completely unreachable
 */
function generateFallbackWav(text: string, durationSec: number = 3): Buffer {
  const sampleRate = 22050;
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = Math.floor(sampleRate * durationSec);
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  const baseFreq = 220;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.sin(2 * Math.PI * 3.5 * t) * 0.5 + 0.5;
    const sample =
      Math.sin(2 * Math.PI * baseFreq * t) * 0.5 +
      Math.sin(2 * Math.PI * (baseFreq * 1.5) * t) * 0.3 +
      Math.sin(2 * Math.PI * (baseFreq * 2) * t) * 0.2;
    const value = Math.floor(sample * envelope * 0.3 * 32767);
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, value)), 44 + i * 2);
  }

  return buffer;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, language = 'en', voice, speed = 1.0 } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'Text parameter is required for speech synthesis' },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GNANI_API_KEY ||
      process.env.VACH_API_KEY ||
      'vach_1ytE2CY5X2DHxShv54z8ABPKxYhx5pcjubtvY78lt9WURgwFnYGnEIX6sOonioVDS3K4xLgupRI7I9MOmFnFpmLvOF9hmr2M_99db5cdfbbc22a67a16bc656dd68a11c';

    const mappedLang = GNANI_LANG_MAP[language] || GNANI_LANG_MAP[language.toLowerCase()] || 'en-IN';
    const selectedVoice =
      voice && GNANI_VOICES.includes(voice) ? voice : 'Shivani';

    // Call Gnani.ai / Vachana Timbre TTS inference endpoint
    const gnaniRes = await fetch('https://api.vachana.ai/api/v1/tts/inference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key-ID': apiKey,
      },
      body: JSON.stringify({
        text: text.trim(),
        voice: selectedVoice,
        model: 'timbre-v3.0',
        language: mappedLang,
        speed: typeof speed === 'number' ? Math.max(0.5, Math.min(2.0, speed)) : 1.0,
        audio_config: {
          container: 'wav',
          encoding: 'linear_pcm',
          sample_rate: 24000,
        },
      }),
    });

    if (gnaniRes.ok) {
      const audioArrayBuffer = await gnaniRes.arrayBuffer();
      const wavBuffer = Buffer.from(audioArrayBuffer);
      const acceptHeader = req.headers.get('accept') || '';

      if (acceptHeader.includes('application/json')) {
        const base64Audio = `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
        return NextResponse.json({
          success: true,
          text,
          voice: selectedVoice,
          language: mappedLang,
          engine: 'Gnani.ai Timbre v3.0 (Vachana)',
          audioDurationSeconds: Math.ceil(wavBuffer.length / (24000 * 2)),
          audioDataUrl: base64Audio,
        });
      }

      return new NextResponse(new Uint8Array(wavBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'audio/wav',
          'X-TTS-Engine': 'Gnani.ai Timbre v3.0',
          'X-Gnani-Voice': selectedVoice,
          'X-Gnani-Language': mappedLang,
          'Content-Length': wavBuffer.length.toString(),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    const errorDetails = await gnaniRes.text();
    console.warn(`Gnani TTS API returned status ${gnaniRes.status}:`, errorDetails);

    // If Gnani API returned an error, fallback gracefully so clinical UI doesn't freeze
    const duration = Math.max(2, Math.min(10, Math.ceil(text.split(/\s+/).length * 0.35)));
    const fallbackBuffer = generateFallbackWav(text, duration);
    const acceptHeader = req.headers.get('accept') || '';

    if (acceptHeader.includes('application/json')) {
      return NextResponse.json({
        success: true,
        text,
        voice: selectedVoice,
        engine: 'Gnani.ai (Fallback mode)',
        audioDataUrl: `data:audio/wav;base64,${fallbackBuffer.toString('base64')}`,
      });
    }

    return new NextResponse(new Uint8Array(fallbackBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'X-TTS-Engine': 'Gnani.ai Fallback Tone',
      },
    });
  } catch (err: any) {
    console.error('Gnani TTS Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to synthesize speech with Gnani.ai' },
      { status: 500 }
    );
  }
}

