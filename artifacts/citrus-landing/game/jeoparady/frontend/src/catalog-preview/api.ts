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

export function resolveImageUrl(url: string): string { return url }

export async function verifyAnswer(payload: VerifyRequest): Promise<VerifyResponse> {
  const category = categories.find((item) => payload.question_id.startsWith(`${item.id}-`))
  const index = Number(payload.question_id.split('-').at(-1))
  if (!category || !Number.isInteger(index) || !category.questions[index]) throw new Error('Unknown demo question')
  const [, options, correct] = category.questions[index]
  if (payload.selected_option !== null && !options.includes(payload.selected_option)) throw new Error('Invalid answer')
  return { is_correct: payload.selected_option === correct, correct_answer: correct, prize_value: [100, 300, 500][index] }
}
