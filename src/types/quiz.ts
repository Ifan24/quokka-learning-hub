
export interface QuizQuestion {
  timestamp: number;
  question: string;
  choices: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  video_id: string;
  questions: QuizQuestion[];
  created_at: string;
}
