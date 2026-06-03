// Save the project to a downloadable JSON file and load one back, going through
// the schema migration hook so older files upgrade in one tested place.

import { migrateProject, type Project } from "../state/project";

export function downloadProject(project: Project): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name.replace(/\s+/g, "-").toLowerCase() || "plan"}.cctv.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readProjectFile(file: File): Promise<Project> {
  const text = await file.text();
  const raw = JSON.parse(text);
  return migrateProject(raw);
}
