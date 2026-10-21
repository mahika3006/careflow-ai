'use client';

import React, { useState } from 'react';
import { 
  FileArchive, 
  Volume2, 
  FileText, 
  Image as ImageIcon, 
  Search, 
  Play, 
  Pause, 
  CheckCircle2, 
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { useCareFlow } from '@/lib/store';
import { MediaEvidence } from '@/types';

interface MedicalRecordsViewProps {
  onSelectPatient: (patientId: string) => void;
}

export function MedicalRecordsView({ onSelectPatient }: MedicalRecordsViewProps) {
  const { patients } = useCareFlow();

  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{ media: MediaEvidence; patientName: string; patientId: string } | null>(null);

  // Playback simulation
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSec, setPlaybackSec] = useState(0);

  // Flatten media items across all patients
  const allMediaItems = patients.flatMap((p) =>
    p.mediaEvidence.map((m) => ({
      media: m,
      patientName: p.name,
      patientId: p.id,
    }))
  );

  const filteredMedia = allMediaItems.filter((item) => {
    if (selectedType !== 'ALL' && item.media.type !== selectedType) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        item.media.title.toLowerCase().includes(q) ||
        item.patientName.toLowerCase().includes(q) ||
        item.patientId.toLowerCase().includes(q) ||
        (item.media.extractedText && item.media.extractedText.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Multimodal Medical Evidence & OCR Repository
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Original patient audio statements, scanned clinical reports, ECG strips, and grounded OCR extractions
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1.5 self-start sm:self-auto text-xs">
          {(['ALL', 'audio', 'image', 'report_pdf'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                selectedType === t
                  ? 'bg-[#0F2E22] text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {t === 'ALL' ? 'All Formats' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search clinical text, patient name, or document title..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
        />
      </div>

      {/* Grid: Media Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredMedia.map((item) => {
          const { media, patientName, patientId } = item;
          const isAudio = media.type === 'audio';
          const isImage = media.type === 'image';
          const isReport = media.type === 'report_pdf';

          return (
            <div
              key={media.id}
              className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {isAudio && <Volume2 className="w-4 h-4" />}
                      {isImage && <ImageIcon className="w-4 h-4" />}
                      {isReport && <FileText className="w-4 h-4" />}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{media.title}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{media.id}</p>
                    </div>
                  </div>

                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {media.type}
                  </span>
                </div>

                {/* Patient association */}
                <div className="text-xs text-slate-600 mb-3 flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100">
                  <span>Patient: <strong className="text-slate-800">{patientName}</strong></span>
                  <button
                    onClick={() => onSelectPatient(patientId)}
                    className="text-[10px] text-emerald-800 font-bold hover:underline"
                  >
                    {patientId}
                  </button>
                </div>

                {/* Preview Thumbnail or Audio Bars */}
                {isImage && media.url && (
                  <div className="mb-3 rounded overflow-hidden max-h-36 bg-black flex items-center justify-center border border-slate-200">
                    <img src={media.url} alt="" className="w-full max-h-36 object-cover opacity-90" />
                  </div>
                )}

                {isAudio && (
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 mb-3 flex items-center space-x-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-7 h-7 rounded-full bg-[#0F2E22] text-white flex items-center justify-center shrink-0"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                    </button>
                    <div className="flex-1 flex items-center space-x-1 h-5">
                      {[10, 20, 14, 24, 18, 12, 22, 16, 26, 12].map((h, i) => (
                        <div
                          key={i}
                          className="w-1 bg-emerald-600 rounded-full"
                          style={{ height: `${h}px` }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{media.durationOrPages}</span>
                  </div>
                )}

                {/* OCR snippet if present */}
                {media.extractedText && (
                  <div className="text-[11px] text-slate-600 font-mono bg-slate-50 p-2.5 rounded border border-slate-200 line-clamp-3">
                    <span className="text-[9px] font-bold text-slate-400 block mb-0.5">OCR TEXT:</span>
                    {media.extractedText}
                  </div>
                )}

                {/* Transcript preview if present */}
                {media.transcript && (
                  <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 line-clamp-2 mt-2">
                    <span className="font-bold text-slate-800">Transcript: </span>
                    "{media.transcript[1]?.text || media.transcript[0]?.text}"
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Uploaded {new Date(media.uploadedAt).toLocaleTimeString()}</span>
                <button
                  onClick={() => onSelectPatient(patientId)}
                  className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
                >
                  <span>Open Dossier</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
