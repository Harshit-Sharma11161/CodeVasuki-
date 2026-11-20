export type University = {
  id: string
  name: string
  slug: string
  location: string
  createdAt: string
}

export type User = {
  id: string
  email: string
  name: string
  role: string
  universityId: string | null
  rating: number
  problemsSolved: number
  battlesPlayed: number
  battlesWon: number
  contestPoints: number
  currentStreak: number
  status: string
  createdAt: string
  university?: University | null
}

export type Problem = {
  id: string
  number: number
  slug: string
  title: string
  difficulty: string
  topics: string
  description: string
  constraints: string
  examples: string
  starterCode: string
  timeLimitMs: number
  memoryLimitMb: number
  totalSubmissions: number
  acceptedSubmissions: number
  isActive: boolean
  createdAt: string
}

export type TestCase = {
  id: string
  problemId: string
  input: string
  expectedOutput: string
  isHidden: boolean
  explanation: string | null
  orderIndex: number
}

export type Submission = {
  id: string
  userId: string
  problemId: string
  battleId: string | null
  language: string
  sourceCode: string
  verdict: string
  runtimeMs: number
  memoryKb: number
  testsPassed: number
  testsTotal: number
  message: string | null
  createdAt: string
  problem?: Problem
  user?: User
}

export type Battle = {
  id: string
  problemId: string
  playerOneId: string
  playerTwoId: string
  status: string
  startedAt: string | null
  endsAt: string | null
  endedAt: string | null
  winnerId: string | null
  resultReason: string | null
  playerOneScore: number
  playerTwoScore: number
  playerOneRatingBefore: number
  playerTwoRatingBefore: number
  playerOneRatingDelta: number
  playerTwoRatingDelta: number
  createdAt: string
  problem?: Problem
  playerOne?: User
  playerTwo?: User
}

export type BattleEvent = {
  id: string
  battleId: string
  userId: string | null
  type: string
  message: string
  createdAt: string
}

export type BattleParticipantState = {
  id: string
  battleId: string
  userId: string
  solved: boolean
  solvedAt: string | null
  failedAttempts: number
  bestRuntimeMs: number
  bestMemoryKb: number
  testsPassed: number
  lastSeenAt: string
  score: number
}

export type MatchQueueEntry = {
  id: string
  userId: string
  rating: number
  status: string
  battleId: string | null
  joinedAt: string
  lastPingAt: string
}

export type RatingHistory = {
  id: string
  userId: string
  battleId: string | null
  ratingBefore: number
  ratingAfter: number
  delta: number
  reason: string
  createdAt: string
}

export type Notification = {
  id: string
  userId: string
  type: string
  title: string
  body: string
  link: string | null
  isRead: boolean
  createdAt: string
}

export type Achievement = {
  id: string
  userId: string
  code: string
  title: string
  description: string
  earnedAt: string
}

export type Contest = {
  id: string
  slug: string
  title: string
  description: string
  startsAt: string
  endsAt: string
  status: string
  createdAt: string
}

export type ContestParticipant = {
  id: string
  contestId: string
  userId: string
  score: number
  penalty: number
  problemsSolved: number
  registeredAt: string
  contest?: Contest
  user?: User
}