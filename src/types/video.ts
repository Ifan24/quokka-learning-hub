
export interface TranscriptionChunk {
  timestamp: [number, number];
  text: string;
}

export interface VideoDetails {
  id: string;
  title: string;
  description: string;
  views: number;
  duration: string;
  file_path: string;
  created_at: string;
  user_id: string;
  transcription_status?: string;
  transcription_text?: string;
  transcription_chunks?: TranscriptionChunk[];
}
