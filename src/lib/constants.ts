export const TOPICS = [
  'Arrays',
  'Strings',
  'Linked Lists',
  'Stack',
  'Queue',
  'Hashing',
  'Binary Search',
  'Sorting',
  'Trees',
  'Graphs',
  'Dynamic Programming',
  'Greedy',
  'Backtracking',
  'Heap',
  'Recursion',
  'Math',
  'Bit Manipulation',
] as const

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const

export const LANGUAGES = [
  { id: 'python', label: 'Python', monaco: 'python' },
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript' },
  { id: 'java', label: 'Java', monaco: 'java' },
  { id: 'cpp', label: 'C++', monaco: 'cpp' },
  { id: 'c', label: 'C', monaco: 'c' },
] as const

export type LanguageId = (typeof LANGUAGES)[number]['id']

export const VERDICTS = [
  'Accepted',
  'Wrong Answer',
  'Time Limit Exceeded',
  'Runtime Error',
  'Compilation Error',
] as const

export const BATTLE_DURATION_MS = 30 * 60 * 1000

export const ACHIEVEMENT_CATALOG: Record<string, { title: string; description: string }> = {
  FIRST_BLOOD: { title: 'First Blood', description: 'Won your first battle' },
  PROBLEM_SOLVER: { title: 'Problem Solver', description: 'Solved 10 problems' },
  RISING_STAR: { title: 'Rising Star', description: 'Reached a rating above 1300' },
  BATTLE_MASTER: { title: 'Battle Master', description: 'Won 10 battles' },
  CONSISTENT_CODER: { title: 'Consistent Coder', description: 'Maintained a 7-day streak' },
}

export function verdictTone(verdict: string): 'success' | 'destructive' | 'warning' | 'muted' {
  if (verdict === 'Accepted') return 'success'
  if (verdict === 'Time Limit Exceeded') return 'warning'
  if (verdict === 'Pending' || verdict === 'Running') return 'muted'
  return 'destructive'
}

export function difficultyTone(difficulty: string): 'success' | 'warning' | 'destructive' {
  if (difficulty === 'Easy') return 'success'
  if (difficulty === 'Medium') return 'warning'
  return 'destructive'
}