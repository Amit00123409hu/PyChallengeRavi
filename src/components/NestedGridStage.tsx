import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RotateCcw } from 'lucide-react';
import { ExecutionStep } from '../types/visualizer';
import {
  applyStudioEnvironment,
  createFloorGridTexture,
  createLabelTexture,
  createStudioRenderer,
  detectSoftwareGl,
  disposeObject3D,
  scheduleSoftwareFrame,
} from '../utils/threeSetup';

interface NestedGridStageProps {
  currentStep: ExecutionStep | null;
}

export function NestedGridStage({ currentStep }: NestedGridStageProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const cameraResetRef = useRef<(() => void) | null>(null);
  const stepRef = useRef<ExecutionStep | null>(currentStep);
  stepRef.current = currentStep;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = container.clientWidth || 720;
    const height = container.clientHeight || 420;

    const renderer = createStudioRenderer(width, height, isSoftwareGl);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.035);

    const envTex = applyStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    const defaultCamPos = new THREE.Vector3(4.8, 5.4, 6.8);
    camera.position.copy(defaultCamPos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.08;
    controls.minDistance = 4.5;
    controls.maxDistance = 18;
    controls.target.set(0, 0.45, 0);
    controls.update();

    cameraResetRef.current = () => {
      camera.position.copy(defaultCamPos);
      controls.target.set(0, 0.45, 0);
      controls.update();
    };

    // Lighting
    const hemi = new THREE.HemisphereLight(0xbae6fd, 0x0f172a, 0.75);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.0);
    keyLight.position.set(5, 10, 6);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -7;
    keyLight.shadow.camera.right = 7;
    keyLight.shadow.camera.top = 7;
    keyLight.shadow.camera.bottom = -7;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-6, 5, -5);
    scene.add(rimLight);

    const activeCubeLight = new THREE.PointLight(0xf59e0b, 0, 5.5, 2);
    activeCubeLight.position.set(0, 1.8, 0);
    scene.add(activeCubeLight);

    // Floor
    const floorTex = createFloorGridTexture(renderer);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({
        map: floorTex,
        roughness: 0.85,
        metalness: 0.15,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    floor.receiveShadow = true;
    scene.add(floor);

    // Base plinth for 3x3 matrix
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(6.6, 0.24, 6.6),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.55,
        metalness: 0.45,
      })
    );
    plinth.position.y = 0.12;
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    scene.add(plinth);

    const spacing = 1.65;
    const baseSurfaceY = 0.24;

    // Row highlight bars (one per i = 0, 1, 2)
    const rowBars: THREE.MeshStandardMaterial[] = [];
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * spacing;
      const barMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.05,
        roughness: 0.4,
      });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.03, 0.12), barMat);
      bar.position.set(0, baseSurfaceY + 0.015, z);
      scene.add(bar);
      rowBars.push(barMat);

      // Row coordinate plaque on left (i=0, i=1, i=2)
      const rowTex = createLabelTexture(`i=${i}`, renderer, {
        bg: '#0f172a',
        fg: '#7dd3fc',
        border: '#0284c7',
        fontSize: 82,
      });
      const rowTile = new THREE.Mesh(
        new THREE.PlaneGeometry(0.85, 0.55),
        new THREE.MeshStandardMaterial({ map: rowTex, roughness: 0.45 })
      );
      rowTile.rotation.x = -Math.PI / 2;
      rowTile.position.set(-2.72, baseSurfaceY + 0.02, z);
      scene.add(rowTile);
    }

    // Column coordinate plaques in front (j=0, j=1, j=2)
    for (let j = 0; j < 3; j++) {
      const x = (j - 1) * spacing;
      const colTex = createLabelTexture(`j=${j}`, renderer, {
        bg: '#0f172a',
        fg: '#fcd34d',
        border: '#d97706',
        fontSize: 82,
      });
      const colTile = new THREE.Mesh(
        new THREE.PlaneGeometry(0.85, 0.55),
        new THREE.MeshStandardMaterial({ map: colTex, roughness: 0.45 })
      );
      colTile.rotation.x = -Math.PI / 2;
      colTile.position.set(x, baseSurfaceY + 0.02, 2.72);
      scene.add(colTile);
    }

    // Build 3x3 cube assemblies
    interface GridCube {
      i: number;
      j: number;
      index: number;
      group: THREE.Group;
      cubeMat: THREE.MeshStandardMaterial;
      haloMat: THREE.MeshStandardMaterial;
    }

    const cubes: GridCube[] = [];
    const cubeShape = new THREE.Shape();
    const s = 0.48;
    const r = 0.08;
    cubeShape.moveTo(-s + r, -s);
    cubeShape.lineTo(s - r, -s);
    cubeShape.quadraticCurveTo(s, -s, s, -s + r);
    cubeShape.lineTo(s, s - r);
    cubeShape.quadraticCurveTo(s, s, s - r, s);
    cubeShape.lineTo(-s + r, s);
    cubeShape.quadraticCurveTo(-s, s, -s, s - r);
    cubeShape.lineTo(-s, -s + r);
    cubeShape.quadraticCurveTo(-s, -s, -s + r, -s);

    const beveledCubeGeo = new THREE.ExtrudeGeometry(cubeShape, {
      depth: 0.84,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 3,
    });
    beveledCubeGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const x = (j - 1) * spacing;
        const z = (i - 1) * spacing;

        // Grounded socket
        const socket = new THREE.Mesh(
          new THREE.BoxGeometry(1.25, 0.06, 1.25),
          new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.65,
            metalness: 0.4,
          })
        );
        socket.position.set(x, baseSurfaceY + 0.03, z);
        scene.add(socket);

        const group = new THREE.Group();
        group.position.set(x, baseSurfaceY + 0.12, z);
        scene.add(group);

        const cubeMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          emissive: 0x0f172a,
          emissiveIntensity: 0.15,
          roughness: 0.28,
          metalness: 0.35,
        });
        const body = new THREE.Mesh(beveledCubeGeo, cubeMat);
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Top coordinate cap (i, j)
        const coordTex = createLabelTexture(`(${i},${j})`, renderer, {
          bg: '#0f172a',
          fg: '#e2e8f0',
          border: '#475569',
          fontSize: 64,
        });
        const topCap = new THREE.Mesh(
          new THREE.PlaneGeometry(0.74, 0.74),
          new THREE.MeshStandardMaterial({
            map: coordTex,
            roughness: 0.35,
            metalness: 0.1,
          })
        );
        topCap.rotation.x = -Math.PI / 2;
        topCap.position.y = 0.91;
        group.add(topCap);

        // Base rim glow collar
        const haloMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          emissive: 0x38bdf8,
          emissiveIntensity: 0.1,
          roughness: 0.3,
        });
        const halo = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.05, 1.06), haloMat);
        halo.position.y = 0.025;
        group.add(halo);

        cubes.push({
          i,
          j,
          index: i * 3 + j,
          group,
          cubeMat,
          haloMat,
        });
      }
    }

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.elapsedTime;
      const step = stepRef.current;

      const activeI = step?.gridI ?? null;
      const activeJ = step?.gridJ ?? null;
      const phase = step?.phase ?? 'idle';
      const visitedCount = step?.visitedCount ?? 0;
      const isDone = phase === 'done';

      // Row bar highlight
      rowBars.forEach((barMat, rowIdx) => {
        const isCurrentRow = !isDone && activeI === rowIdx;
        barMat.emissive.setHex(isCurrentRow ? 0x38bdf8 : 0x0ea5e9);
        barMat.emissiveIntensity = THREE.MathUtils.damp(
          barMat.emissiveIntensity,
          isCurrentRow ? 1.4 : 0.05,
          10,
          delta
        );
      });

      // Track active cube light smoothly across rows & columns
      if (!isDone && activeI !== null && activeJ !== null && step !== null) {
        const lx = (activeJ - 1) * spacing;
        const lz = (activeI - 1) * spacing;
        activeCubeLight.position.x = THREE.MathUtils.damp(activeCubeLight.position.x, lx, 12, delta);
        activeCubeLight.position.z = THREE.MathUtils.damp(activeCubeLight.position.z, lz, 12, delta);
        activeCubeLight.color.setHex(phase === 'nested-print' ? 0x10b981 : 0xf59e0b);
        activeCubeLight.intensity = THREE.MathUtils.damp(activeCubeLight.intensity, 3.6, 10, delta);
      } else {
        activeCubeLight.intensity = THREE.MathUtils.damp(activeCubeLight.intensity, 0, 10, delta);
      }

      // Update each cube smoothly
      cubes.forEach((cube) => {
        const isCurrentCell =
          !isDone && activeI === cube.i && activeJ === cube.j && step !== null;
        const isCurrentRowOnly =
          !isDone && activeI === cube.i && activeJ === null && step !== null;
        const isVisited = isDone || cube.index < visitedCount;

        let targetY = baseSurfaceY + 0.12;
        let targetScale = 1;

        if (isCurrentCell) {
          targetY = baseSurfaceY + 0.5 + Math.sin(elapsed * 4) * 0.04;
          targetScale = 1.08;
          if (phase === 'nested-print') {
            cube.cubeMat.color.setHex(0x10b981);
            cube.cubeMat.emissive.setHex(0x10b981);
            cube.cubeMat.emissiveIntensity = 1.15;
            cube.haloMat.emissive.setHex(0x34d399);
            cube.haloMat.emissiveIntensity = 1.8;
          } else {
            cube.cubeMat.color.setHex(0xf59e0b);
            cube.cubeMat.emissive.setHex(0xf59e0b);
            cube.cubeMat.emissiveIntensity = 1.1;
            cube.haloMat.emissive.setHex(0xfbbf24);
            cube.haloMat.emissiveIntensity = 1.6;
          }
        } else if (isVisited) {
          targetY = baseSurfaceY + 0.22;
          cube.cubeMat.color.setHex(0x0d9488);
          cube.cubeMat.emissive.setHex(0x059669);
          cube.cubeMat.emissiveIntensity = 0.65;
          cube.haloMat.emissive.setHex(0x10b981);
          cube.haloMat.emissiveIntensity = 0.9;
        } else if (isCurrentRowOnly) {
          targetY = baseSurfaceY + 0.18;
          cube.cubeMat.color.setHex(0x1e3a5f);
          cube.cubeMat.emissive.setHex(0x0284c7);
          cube.cubeMat.emissiveIntensity = 0.35;
          cube.haloMat.emissive.setHex(0x38bdf8);
          cube.haloMat.emissiveIntensity = 0.6;
        } else {
          cube.cubeMat.color.setHex(0x334155);
          cube.cubeMat.emissive.setHex(0x0f172a);
          cube.cubeMat.emissiveIntensity = 0.12;
          cube.haloMat.emissive.setHex(0x38bdf8);
          cube.haloMat.emissiveIntensity = 0.08;
        }

        cube.group.position.y = THREE.MathUtils.damp(cube.group.position.y, targetY, 10, delta);
        const sVal = THREE.MathUtils.damp(cube.group.scale.x, targetScale, 10, delta);
        cube.group.scale.set(sVal, sVal, sVal);
      });

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        scheduleSoftwareFrame(renderer, tick, (id) => {
          frameId = id;
        });
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      scheduleSoftwareFrame(renderer, tick, (id) => {
        frameId = id;
      });
    } else {
      frameId = requestAnimationFrame(tick);
    }

    const ro = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth || 720;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      controls.dispose();
      beveledCubeGeo.dispose();
      disposeObject3D(scene);
      envTex.dispose();
      renderer.dispose();
    };
  }, []);

  const gridI = currentStep?.gridI;
  const gridJ = currentStep?.gridJ;
  const visitedCount = currentStep?.visitedCount ?? 0;

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            3D Nested Loop Cube Matrix
          </h2>
          <p className="text-sm text-slate-600">
            Cubes illuminate row by row across{' '}
            <code className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
              i in range(3)
            </code>{' '}
            and{' '}
            <code className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
              j in range(3)
            </code>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
          <span>{visitedCount} / 9 lit</span>
          <span aria-hidden="true">·</span>
          <span>
            {gridI !== null && gridI !== undefined
              ? gridJ !== null && gridJ !== undefined
                ? `i = ${gridI}, j = ${gridJ}`
                : `Row i = ${gridI}`
              : 'Ready'}
          </span>
        </div>
      </div>

      <div className="relative flex-1 min-h-[340px] rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
        <div ref={mountRef} className="w-full h-full min-h-[340px]" />

        <button
          type="button"
          onClick={() => cameraResetRef.current?.()}
          title="Reset 3D camera"
          className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reset View</span>
        </button>

        <div className="pointer-events-none absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-slate-900/85 border border-slate-800 text-[11px] text-slate-300">
          Drag to orbit · Scroll to zoom
        </div>
      </div>
    </div>
  );
}
