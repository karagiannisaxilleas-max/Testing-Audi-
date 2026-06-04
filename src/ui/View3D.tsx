// 3D walk view (Phase 6). Renders the floor plan, walls and cameras in 3D so an
// installer (or client) can see mounting heights, tilt and the true coverage
// frustum. Raw three.js (no react-three-fiber) and lazy-loaded so it stays out
// of the main bundle. Requires a calibrated plan (needs real-world scale).

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useStore } from "../state/store";
import { effectiveRangeMeters } from "../engine/lighting";
import type { Project } from "../state/project";

const WALL_HEIGHT_M = 3;
const DEG = Math.PI / 180;

export function View3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const project = useStore((s) => s.project);
  const night = useStore((s) => s.view.night);

  const hasScale = project.scale !== null && project.floorPlan !== null;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !hasScale) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(night ? 0x05070b : 0x0a0c10);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, night ? 0.35 : 0.75));
    const dir = new THREE.DirectionalLight(0xffffff, night ? 0.4 : 0.9);
    dir.position.set(20, 40, 20);
    scene.add(dir);

    buildScene(scene, project, night);

    // Frame the building.
    const fp = project.floorPlan!;
    const pxPerM = project.scale!.pxPerMeter;
    const wM = fp.width / pxPerM;
    const hM = fp.height / pxPerM;
    const center = new THREE.Vector3(wM / 2, 0, hM / 2);
    controls.target.copy(center);
    camera.position.set(wM / 2, Math.max(wM, hM) * 0.9, hM * 1.6);

    let raf = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [project, night, hasScale]);

  if (!hasScale) {
    return (
      <div className="empty-hint">
        <div style={{ fontSize: 16 }}>3D needs a calibrated plan</div>
        <div>Load a floor plan and calibrate the scale, then switch to 3D.</div>
      </div>
    );
  }
  return <div ref={mountRef} style={{ position: "absolute", inset: 0 }} />;
}

function buildScene(scene: THREE.Scene, project: Project, night: boolean) {
  const pxPerM = project.scale!.pxPerMeter;
  const fp = project.floorPlan!;
  const wM = fp.width / pxPerM;
  const hM = fp.height / pxPerM;
  const toWorld = (p: { x: number; y: number }) =>
    new THREE.Vector3(p.x / pxPerM, 0, p.y / pxPerM);

  // Floor with the plan image as a texture.
  const tex = new THREE.TextureLoader().load(fp.imageDataUrl);
  tex.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(wM, hM),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(wM / 2, 0, hM / 2);
  scene.add(floor);

  // Walls: full = solid grey box; glass = translucent cyan.
  for (const wall of project.walls) {
    const glass = wall.occlusion === "glass";
    for (let i = 0; i < wall.points.length - 1; i++) {
      const a = toWorld(wall.points[i]);
      const b = toWorld(wall.points[i + 1]);
      const len = a.distanceTo(b);
      if (len < 1e-3) continue;
      const geo = new THREE.BoxGeometry(len, WALL_HEIGHT_M, 0.12);
      const mat = new THREE.MeshStandardMaterial({
        color: glass ? 0x22d3ee : 0xcfd4dc,
        transparent: glass,
        opacity: glass ? 0.3 : 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const mid = a.clone().lerp(b, 0.5);
      mesh.position.set(mid.x, WALL_HEIGHT_M / 2, mid.z);
      mesh.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      scene.add(mesh);
    }
  }

  // Cameras: a body box + a translucent coverage frustum (cone).
  for (const cam of project.cameras) {
    const base = toWorld(cam.position);
    const h = cam.mountHeightMeters;
    const apex = new THREE.Vector3(base.x, h, base.z);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(cam.color) }),
    );
    body.position.copy(apex);
    scene.add(body);

    const range = effectiveRangeMeters(cam, night);
    const fovRad = cam.fovAngleDeg * DEG;
    const radius = range * Math.tan(fovRad / 2);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(radius, range, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(cam.color),
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    // View direction: horizontal heading, tilted down by tiltDeg.
    const head = cam.heading * DEG;
    const tilt = cam.tiltDeg * DEG;
    const d = new THREE.Vector3(
      Math.cos(head) * Math.cos(tilt),
      -Math.sin(tilt),
      Math.sin(head) * Math.cos(tilt),
    ).normalize();
    // Apex at the camera; cone widens along d.
    cone.position.copy(apex.clone().add(d.clone().multiplyScalar(range / 2)));
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().negate());
    scene.add(cone);
  }
}
