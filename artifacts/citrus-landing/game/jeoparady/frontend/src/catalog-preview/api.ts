import type { GameBoardResponse, VerifyRequest, VerifyResponse } from '../types/game'

// Explicit, offline catalog-demo content. No accounts, personal data, server
// leaderboard, or campaign results are simulated or persisted.
const categories: { id: string; title: string; image: string; questions: [string, string[], string][] }[] = [
  { id: 'geography', title: 'Geography', image: 'category-geography.jpg', questions: [
    ['Which ocean is the largest?', ['Atlantic', 'Pacific', 'Indian', 'Arctic'], 'Pacific'],
    ['What is the capital of Japan?', ['Tokyo', 'Kyoto', 'Osaka', 'Nagoya'], 'Tokyo'],
    ['Which river flows through Egypt?', ['Amazon', 'Nile', 'Danube', 'Thames'], 'Nile'],
  ] },
  { id: 'food', title: 'Food & Drink', image: 'category-food.jpg', questions: [
    ['What is the main ingredient in guacamole?', ['Avocado', 'Tomato', 'Potato', 'Spinach'], 'Avocado'],
    ['Which country is widely credited as the birthplace of pizza?', ['France', 'Italy', 'Spain', 'Greece'], 'Italy'],
    ['What gives bread dough its rise?', ['Salt', 'Sugar', 'Yeast', 'Oil'], 'Yeast'],
  ] },
  { id: 'science', title: 'Science', image: 'category-pharma.jpg', questions: [
    ['What does H₂O represent?', ['Oxygen', 'Water', 'Hydrogen', 'Salt'], 'Water'],
    ['Which planet is known as the Red Planet?', ['Venus', 'Jupiter', 'Mars', 'Saturn'], 'Mars'],
    ['Which gas do plants absorb during photosynthesis?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium'], 'Carbon dioxide'],
  ] },
  { id: 'technology', title: 'Technology', image: 'category-jobs.jpg', questions: [
    ['What does CPU stand for?', ['Central Processing Unit', 'Computer Power Utility', 'Core Program Update', 'Central Print Unit'], 'Central Processing Unit'],
    ['Which unit measures electrical resistance?', ['Watt', 'Volt', 'Ampere', 'Ohm'], 'Ohm'],
    ['What is the binary representation of decimal 5?', ['100', '101', '110', '111'], '101'],
  ] },
]

export const board: GameBoardResponse = {
  starting_balance: 2000,
  categories: categories.map((category) => ({
    id: category.id,
    title: category.title,
    image_url: `${import.meta.env.BASE_URL}${category.image}`,
    questions: category.questions.map(([prompt, options], index) => ({
      id: `${category.id}-${index}`,
      value: [100, 300, 500][index],
      prefix: '',
      prompt,
      options,
    })),
  })),
}

let currentBoard = board
let customAnswers: Map<string, { correct: string; points: number; options: string[] }> | null = null

export function setCustomQuestions(content: { questions: { text: string; options: string[]; answerIndex: number; category: string; points: number }[] } | null): GameBoardResponse {
  if (!content) { currentBoard = board; customAnswers = null; return board }
  const groups = new Map<string, GameBoardResponse['categories'][number]>()
  customAnswers = new Map()
  content.questions.forEach((q, index) => {
    const key = q.category.toLowerCase()
    if (!groups.has(key)) groups.set(key, {
      id: `custom-category-${groups.size}`, title: q.category,
      image_url: `${import.meta.env.BASE_URL}${categories[groups.size % categories.length].image}`, questions: [],
    })
    const id = `custom-question-${index}`
    groups.get(key)!.questions.push({ id, value: q.points, prefix: '', prompt: q.text, options: q.options })
    customAnswers!.set(id, { correct: q.options[q.answerIndex], points: q.points, options: q.options })
  })
  groups.forEach((group) => group.questions.sort((a, b) => a.value - b.value))
  currentBoard = { starting_balance: 2000, categories: [...groups.values()] }
  return currentBoard
}

export function resolveImageUrl(url: string): string { return url }

export async function verifyAnswer(payload: VerifyRequest): Promise<VerifyResponse> {
  if (customAnswers) {
    const answer = customAnswers.get(payload.question_id)
    if (!answer || (payload.selected_option !== null && !answer.options.includes(payload.selected_option))) throw new Error('Invalid custom question or answer')
    return { is_correct: payload.selected_option === answer.correct, correct_answer: answer.correct, prize_value: answer.points }
  }
  const category = categories.find((item) => payload.question_id.startsWith(`${item.id}-`))
  const index = Number(payload.question_id.split('-').at(-1))
  if (!category || !Number.isInteger(index) || !category.questions[index]) throw new Error('Unknown demo question')
  const [, options, correct] = category.questions[index]
  if (payload.selected_option !== null && !options.includes(payload.selected_option)) throw new Error('Invalid answer')
  return { is_correct: payload.selected_option === correct, correct_answer: correct, prize_value: [100, 300, 500][index] }
}
