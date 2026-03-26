export const RiskAndPriority = [
  { id: 1, name: "Very low" },
  { id: 2, name: "Low" },
  { id: 3, name: "Medium" },
  { id: 4, name: "High" },
  { id: 5, name: "Very high" }
];

export function getRiskOrPriorityName(value: number | null) {
  if (value === null) return "—";
  const item = RiskAndPriority.find(r => r.id === value);
  return item ? item.name : "Unknown";
}
