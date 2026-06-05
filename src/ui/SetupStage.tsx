// Setup stage: capture the job/client details and load the floor plan. This is
// the first guided step; once a plan is loaded the user advances to Survey.

import { useRef } from "react";
import { useStore } from "../state/store";
import type { ClientInfo } from "../state/project";
import { useFloorPlanLoader } from "./useFloorPlanLoader";

export function SetupStage() {
  const project = useStore((s) => s.project);
  const commit = useStore((s) => s.commit);
  const loadFloorPlan = useFloorPlanLoader();
  const planRef = useRef<HTMLInputElement>(null);

  const setClient = (field: keyof ClientInfo) => (v: string) =>
    commit((d) => {
      d.client[field] = v;
    });

  return (
    <div className="setup">
      <div className="setup-grid">
        <div className="setup-card">
          <h2>Job details</h2>
          <div className="field">
            <div className="label">Project name</div>
            <input
              value={project.name}
              placeholder="e.g. Maple St. Warehouse"
              onChange={(e) => {
                const name = e.target.value;
                commit((d) => {
                  d.name = name;
                });
              }}
            />
          </div>
          <div className="field">
            <div className="label">Site / address</div>
            <input
              value={project.client.notes}
              placeholder="Site address or reference"
              onChange={(e) => setClient("notes")(e.target.value)}
            />
          </div>
        </div>

        <div className="setup-card">
          <h2>Client</h2>
          <div className="field">
            <div className="label">Contact name</div>
            <input value={project.client.name} onChange={(e) => setClient("name")(e.target.value)} />
          </div>
          <div className="field">
            <div className="label">Company</div>
            <input value={project.client.company} onChange={(e) => setClient("company")(e.target.value)} />
          </div>
          <div className="field row" style={{ gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div className="label">Email</div>
              <input value={project.client.email} onChange={(e) => setClient("email")(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="label">Phone</div>
              <input value={project.client.phone} onChange={(e) => setClient("phone")(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="setup-card setup-full">
          <h2>Floor plan</h2>
          <div
            className={`dropzone ${project.floorPlan ? "has-image" : ""}`}
            onClick={() => planRef.current?.click()}
          >
            {project.floorPlan ? (
              <img src={project.floorPlan.imageDataUrl} alt="Floor plan" />
            ) : (
              <>
                <div className="dz-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
                <div style={{ fontWeight: 600, color: "var(--text)" }}>
                  Take a photo or upload the floor plan
                </div>
                <div style={{ fontSize: 12.5, marginTop: 4 }}>PNG or JPG · you'll calibrate the scale next</div>
              </>
            )}
          </div>
          {project.floorPlan && (
            <button style={{ marginTop: 10 }} onClick={() => planRef.current?.click()}>
              Replace plan
            </button>
          )}
          <input
            ref={planRef}
            className="hidden-input"
            type="file"
            accept="image/png,image/jpeg"
            capture="environment"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void loadFloorPlan(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}
