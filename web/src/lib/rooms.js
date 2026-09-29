// Room helpers: read cohort + topic metadata off CometChat groups and derive
// the tenant (cohort) list for the dropdown filter.
import { COHORT_ALL } from "./config.js";

export function getGroupMeta(group) {
  if (!group) return {};
  const meta = typeof group.getMetadata === "function" ? group.getMetadata() : group.metadata;
  return meta || {};
}

export function getCohort(group) {
  const meta = getGroupMeta(group);
  return meta.cohort || "General";
}

export function getTopic(group) {
  const meta = getGroupMeta(group);
  return meta.topic || (typeof group.getName === "function" ? group.getName() : group.name);
}

export function getGuid(group) {
  return typeof group.getGuid === "function" ? group.getGuid() : group.guid;
}

// Build the list of cohorts present across all rooms for the picker.
export function listCohorts(groups) {
  const set = new Set();
  groups.forEach((g) => set.add(getCohort(g)));
  return [COHORT_ALL, ...Array.from(set).sort()];
}

export function filterByCohort(groups, cohort) {
  if (!cohort || cohort === COHORT_ALL) return groups;
  return groups.filter((g) => getCohort(g) === cohort);
}
