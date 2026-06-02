import { getCreatorBoardLimit, type CreatorPlan } from '@jobuki/types'

export function getBoardCreationLimit(plan: CreatorPlan) {
  return getCreatorBoardLimit(plan)
}

export function canCreateBoard(plan: CreatorPlan, existingBoards: number) {
  const limit = getBoardCreationLimit(plan)
  return {
    allowed: existingBoards < limit,
    limit,
    remaining: Math.max(0, limit - existingBoards),
  }
}
