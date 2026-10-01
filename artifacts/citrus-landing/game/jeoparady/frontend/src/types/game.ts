export interface PublicQuestion {
  id: string
  value: number
  prefix: string
  prompt: string
  options: string[]
}

export interface PublicCategory {
  id: string
  title: string
  image_url: string | null
  questions: PublicQuestion[]
}

export interface GameBoardResponse {
  categories: PublicCategory[]
  starting_balance: number
}

export interface VerifyRequest {
  question_id: string
  selected_option: string | null
  player_id?: number | null
  time_taken_seconds?: number | null
}

export interface VerifyResponse {
  is_correct: boolean
  correct_answer: string
  prize_value: number
}

export interface LeaderboardEntry {
  username: string
  balance: number
}

export type AnswerStatus = 'correct' | 'incorrect' | 'unanswered'

export type PlayerRole = 'player' | 'admin'

export interface Player {
  id: number
  username: string
  role: PlayerRole
}

export interface PlayerSummary {
  id: number
  username: string
  role: PlayerRole
  games_played: number
  best_balance: number | null
  average_balance: number | null
  questions_answered: number
  accuracy: number | null
}

export interface PlayerAnswerDetail {
  id: number
  question_id: string
  category_title: string
  prompt: string
  options: string[]
  selected_option: string | null
  correct_answer: string
  is_correct: boolean
  prize_value: number
  time_taken_seconds: number | null
  answered_at: string
}

export interface CategoryAccuracy {
  category_title: string
  total_answers: number
  correct_answers: number
  accuracy: number
}

export interface AdminOverview {
  total_players: number
  total_games_played: number
  total_answers: number
  overall_accuracy: number | null
  category_accuracy: CategoryAccuracy[]
}

export interface AdminQuestionDetail {
  id: string
  value: number
  prefix: string
  prompt: string
  options: string[]
  correct_answer: string
}

export interface AdminCategoryDetail {
  id: string
  title: string
  image_url: string | null
  questions: AdminQuestionDetail[]
}

export interface QuestionPatch {
  prefix?: string
  prompt?: string
  options?: string[]
  correct_answer?: string
}
