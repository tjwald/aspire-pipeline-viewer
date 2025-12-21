// Re-export from layout module for backward compatibility
export {
  type LayoutConfig,
  DEFAULT_LAYOUT_CONFIG,
  type Position,
  type LayoutPositions,
  type ResourceColumn,
  type CenterLane,
  type LayoutResult,
  isAggregator,
  getResourceName,
  calculateDepthFromRoots,
  calculateHierarchicalPositions,
  calculateLevels,
  getResourceColor,
  wrapStepName,
} from './layout'
