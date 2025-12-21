// Layout Engine - modular layout calculation for pipeline graphs
export {
  // Config
  type LayoutConfig,
  DEFAULT_LAYOUT_CONFIG,
  // Types
  type Position,
  type LayoutPositions,
  type ResourceColumn,
  type CenterLane,
  type LayoutResult,
  type StepGroups,
  type RowAssignments,
  type ColumnLayout,
  // Functions
  isAggregator,
  getResourceName,
  calculateDepthFromRoots,
  groupStepsByResource,
  assignRows,
  calculateColumnLayout,
  calculateNodePositions,
  calculateSimpleLayout,
  calculateHierarchicalPositions,
  calculateLevels,
  // Colors
  getResourceColor,
  // Text
  wrapStepName,
} from './layoutEngine'
