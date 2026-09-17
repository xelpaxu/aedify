export const analysisIssueOptions = [
  { value: 'wrong-class', label: 'Correct detection, wrong classification' },
  { value: 'wrong-detection', label: 'Incorrect detection' },
  { value: 'missed-detection', label: 'Missed a relevant object or condition' },
  { value: 'partially-correct', label: 'Partially correct / multiple corrections' },
  { value: 'wrong-risk', label: 'Incorrect risk assessment' },
  { value: 'details-only', label: 'Analysis is correct; report details need correction' },
] as const

export type AnalysisIssue = typeof analysisIssueOptions[number]['value']

export function getAnalysisIssueLabel(value: string) {
  return analysisIssueOptions.find(option => option.value === value)?.label || value
}
