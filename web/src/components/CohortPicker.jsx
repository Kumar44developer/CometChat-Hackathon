// Cohort (tenant) filter. appearance-none + custom chevron so the control
// reads as interactive; min-h keeps it a comfortable touch target.
export default function CohortPicker({ cohorts, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
        Cohort (tenant)
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input min-h-[40px] cursor-pointer appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-10"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b6b6b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
      >
        {cohorts.map((c) => (
          <option key={c} value={c} className="bg-surface text-ink">
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
