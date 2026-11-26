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

interface RobotTrackStageProps {
  values: number[];
  pythonExpr: string;
  currentStep: ExecutionStep | null;
  speed: number;
}

function buildRobotModel() {
  const root = new THREE.Group();

  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.28,
    metalness: 0.72,
  });
  const accentBlueMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.32,
    metalness: 0.45,
  });
  const jointDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.6,
    metalness: 0.4,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    roughness: 0.15,
    metalness: 0.85,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.4,
    roughness: 0.25,
  });

  // Helper to build a leg pivoted at hip (y = 0.78) with boot bottom at local y = -0.78
  function createLeg(xOffset: number) {
    const hip = new THREE.Group();
    hip.position.set(0, 0.78, xOffset);

    const hipJoint = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), jointDarkMat);
    hipJoint.castShadow = true;
    hip.add(hipJoint);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.34, 14), chassisMat);
    thigh.position.y = -0.19;
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), accentBlueMat);
    knee.position.y = -0.37;
    knee.castShadow = true;
    hip.add(knee);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.14), jointDarkMat);
    shin.position.y = -0.53;
    shin.castShadow = true;
    hip.add(shin);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.18), accentBlueMat);
    foot.position.set(0.04, -0.73, 0);
    foot.castShadow = true;
    hip.add(foot);

    return hip;
  }

  // Robot faces +X locally
  const leftLeg = createLeg(-0.18);
  const rightLeg = createLeg(0.18);
  root.add(leftLeg, rightLeg);

  // Pelvis
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.5), jointDarkMat);
  pelvis.position.y = 0.84;
  pelvis.castShadow = true;
  root.add(pelvis);

  // Upper Body Group (for slight jump squash/lean)
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.92;
  root.add(bodyGroup);

  // Torso (extruded rounded silhouette)
  const torsoShape = new THREE.Shape();
  const w = 0.26;
  const h = 0.56;
  const r = 0.08;
  torsoShape.moveTo(-w + r, 0);
  torsoShape.lineTo(w - r, 0);
  torsoShape.quadraticCurveTo(w, 0, w, r);
  torsoShape.lineTo(w, h - r);
  torsoShape.quadraticCurveTo(w, h, w - r, h);
  torsoShape.lineTo(-w + r, h);
  torsoShape.quadraticCurveTo(-w, h, -w, h - r);
  torsoShape.lineTo(-w, r);
  torsoShape.quadraticCurveTo(-w, 0, -w + r, 0);

  const torsoGeo = new THREE.ExtrudeGeometry(torsoShape, {
    depth: 0.44,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 3,
  });
  torsoGeo.translate(0, 0, -0.22);
  const torso = new THREE.Mesh(torsoGeo, chassisMat);
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyGroup.add(torso);

  // Chest core plate
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.34), jointDarkMat);
  chestPlate.position.set(0.28, 0.32, 0);
  bodyGroup.add(chestPlate);

  const chestCore = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.22), eyeMat);
  chestCore.position.set(0.29, 0.32, 0);
  bodyGroup.add(chestCore);

  // Arms
  function createArm(zOffset: number) {
    const shoulder = new THREE.Group();
    shoulder.position.set(0, 0.48, zOffset);

    const shoulderJoint = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 10), accentBlueMat);
    shoulderJoint.castShadow = true;
    shoulder.add(shoulderJoint);

    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.26, 12), chassisMat);
    upperArm.position.y = -0.15;
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.22, 0.11), jointDarkMat);
    forearm.position.y = -0.36;
    forearm.castShadow = true;
    shoulder.add(forearm);

    return shoulder;
  }

  const leftArm = createArm(-0.34);
  const rightArm = createArm(0.34);
  bodyGroup.add(leftArm, rightArm);

  // Neck & Head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.12, 14), jointDarkMat);
  neck.position.y = 0.64;
  bodyGroup.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.y = 0.9;
  bodyGroup.add(headGroup);

  const headShell = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.48), chassisMat);
  headShell.castShadow = true;
  headGroup.add(headShell);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.38), visorMat);
  visor.position.set(0.21, 0.01, 0);
  headGroup.add(visor);

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), eyeMat);
  leftEye.position.set(0.23, 0.02, -0.09);
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), eyeMat);
  rightEye.position.set(0.23, 0.02, 0.09);
  headGroup.add(leftEye, rightEye);

  // Antenna
  const antennaMast = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.22, 10), jointDarkMat);
  antennaMast.position.set(-0.04, 0.28, 0);
  headGroup.add(antennaMast);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), beaconMat);
  beacon.position.set(-0.04, 0.4, 0);
  headGroup.add(beacon);

  return {
    root,
    bodyGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    headGroup,
    beaconMat,
    eyeMat,
  };
}

export function RobotTrackStage({
  values,
  pythonExpr,
  currentStep,
  speed,
}: RobotTrackStageProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const cameraResetRef = useRef<(() => void) | null>(null);

  // Mutable live state synced to the 3D render loop
  const stateRef = useRef({
    values,
    currentStep,
    speed,
  });
  stateRef.current = { values, currentStep, speed };

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
    scene.fog = new THREE.FogExp2(0x0f172a, 0.032);

    const envTex = applyStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    const defaultCamPos = new THREE.Vector3(0, 4.6, 9.6);
    camera.position.copy(defaultCamPos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.08;
    controls.minDistance = 4;
    controls.maxDistance = 24;
    controls.target.set(0, 0.9, 0);
    controls.update();

    cameraResetRef.current = () => {
      camera.position.copy(defaultCamPos);
      controls.target.set(0, 0.9, 0);
      controls.update();
    };

    // Three-point studio lighting
    const hemi = new THREE.HemisphereLight(0xbae6fd, 0x0f172a, 0.75);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.0);
    keyLight.position.set(6, 11, 7);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -12;
    keyLight.shadow.camera.right = 12;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(-7, 5, -6);
    scene.add(rimLight);

    // Floor grid
    const floorTex = createFloorGridTexture(renderer);
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.85,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    floor.receiveShadow = true;
    scene.add(floor);

    // Track group (rebuilt when `values` changes)
    const trackGroup = new THREE.Group();
    scene.add(trackGroup);

    const padSpacing = 2.0;
    const trackSurfaceY = 0.18;

    interface PadVisual {
      x: number;
      ringMat: THREE.MeshStandardMaterial;
      tileMesh: THREE.Mesh;
      beaconLight: THREE.Mesh;
    }
    let pads: PadVisual[] = [];
    let startPadX = -2;

    const rebuildTrack = (vals: number[]) => {
      while (trackGroup.children.length > 0) {
        const child = trackGroup.children[0];
        trackGroup.remove(child);
        disposeObject3D(child);
      }
      pads = [];

      const count = Math.max(1, vals.length);
      const totalSpan = (count - 1) * padSpacing;
      const startX = -totalSpan / 2;
      startPadX = vals.length > 0 ? startX - 1.75 : 0;

      // Track base beam
      const beamCenterX = vals.length > 0 ? -0.875 : 0;
      const beamLength = Math.max(4.5, totalSpan + 3.8);
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(beamLength, trackSurfaceY, 1.55),
        new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.55,
          metalness: 0.5,
        })
      );
      beam.position.set(beamCenterX, trackSurfaceY / 2, 0);
      beam.receiveShadow = true;
      beam.castShadow = true;
      trackGroup.add(beam);

      // Side guide rails
      const railMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.35,
        metalness: 0.8,
      });
      for (const zSign of [-0.72, 0.72]) {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(beamLength, 0.08, 0.08),
          railMat
        );
        rail.position.set(beamCenterX, trackSurfaceY + 0.04, zSign);
        trackGroup.add(rail);
      }

      // Start staging pad
      if (vals.length > 0) {
        const startDisc = new THREE.Mesh(
          new THREE.CylinderGeometry(0.45, 0.5, 0.04, 24),
          new THREE.MeshStandardMaterial({
            color: 0x334155,
            roughness: 0.4,
            metalness: 0.6,
          })
        );
        startDisc.position.set(startPadX, trackSurfaceY + 0.02, 0);
        trackGroup.add(startDisc);
      }

      // Numbered milestone pads
      vals.forEach((val, idx) => {
        const x = startX + idx * padSpacing;

        const ringMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          emissive: 0x0ea5e9,
          emissiveIntensity: 0.12,
          roughness: 0.35,
          metalness: 0.6,
        });
        const ring = new THREE.Mesh(
          new THREE.CylinderGeometry(0.56, 0.62, 0.05, 28),
          ringMat
        );
        ring.position.set(x, trackSurfaceY + 0.025, 0);
        ring.receiveShadow = true;
        trackGroup.add(ring);

        // Front number plaque tilted toward camera
        const labelTex = createLabelTexture(String(val), renderer, {
          bg: '#0f172a',
          fg: '#f8fafc',
          border: '#38bdf8',
          fontSize: 108,
        });
        const tileMat = new THREE.MeshStandardMaterial({
          map: labelTex,
          roughness: 0.4,
          metalness: 0.1,
        });
        const tileMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.08), tileMat);
        tileMesh.position.set(x, 0.45, 1.18);
        tileMesh.rotation.x = -0.35;
        tileMesh.castShadow = true;
        trackGroup.add(tileMesh);

        // Small glowing pylon behind pad
        const beaconMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          emissive: 0x334155,
          emissiveIntensity: 0.2,
          roughness: 0.3,
        });
        const beaconLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 12, 10),
          beaconMat
        );
        beaconLight.position.set(x, trackSurfaceY + 0.14, -0.58);
        trackGroup.add(beaconLight);

        pads.push({ x, ringMat, tileMesh, beaconLight });
      });

      // Adjust camera distance smoothly for wider tracks
      const camZ = Math.max(8.8, 6.2 + count * 0.75);
      defaultCamPos.set(0, 4.4, camZ);
      camera.position.copy(defaultCamPos);
      controls.target.set(0, 0.85, 0);
      controls.update();
    };

    rebuildTrack(stateRef.current.values);

    // Build 3D Robot
    const robot = buildRobotModel();
    robot.root.position.set(startPadX, trackSurfaceY + 0.04, 0);
    scene.add(robot.root);

    // Track kinetic state
    let trackedValuesKey = stateRef.current.values.join(',');
    let robotX = startPadX;
    let targetX = startPadX;
    let walkPhase = 0;
    let lastStepKey = '';
    let jumpActive = false;
    let jumpProgress = 0;
    let facingAngle = 0; // 0 = +X, Math.PI = -X

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const tick = () => {
      if (disposed) return;

      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.elapsedTime;
      const { values: curVals, currentStep: step, speed: spd } = stateRef.current;

      // Rebuild track if sequence values changed
      const valsKey = curVals.join(',');
      if (valsKey !== trackedValuesKey) {
        trackedValuesKey = valsKey;
        rebuildTrack(curVals);
        robotX = startPadX;
        targetX = startPadX;
        jumpActive = false;
        jumpProgress = 0;
        lastStepKey = '';
      }

      // Detect step change
      const stepKey = step ? `${step.stepIndex}-${step.phase}-${step.iterIndex}` : 'idle';
      if (stepKey !== lastStepKey) {
        lastStepKey = stepKey;
        if (!step || curVals.length === 0) {
          targetX = startPadX;
          jumpActive = false;
          jumpProgress = 0;
        } else if (step.iterIndex >= 0 && step.iterIndex < pads.length) {
          const nextPadX = pads[step.iterIndex].x;
          if (Math.abs(nextPadX - targetX) > 0.01 || step.phase === 'robot-move') {
            targetX = nextPadX;
            if (Math.abs(targetX - robotX) < 0.05 && step.phase === 'robot-move') {
              // Already at pad (e.g. step 0 after reset if on pad), trigger small jump!
              jumpActive = true;
              jumpProgress = 0;
            }
          }
        }
      }

      // Move robot toward targetX
      const dist = targetX - robotX;
      const walkSpeed = 4.6 * Math.max(0.5, spd);
      const isWalking = Math.abs(dist) > 0.04;

      if (isWalking) {
        const dir = Math.sign(dist);
        const moveAmt = Math.min(Math.abs(dist), walkSpeed * delta);
        robotX += dir * moveAmt;
        facingAngle = dir >= 0 ? 0 : Math.PI;
        walkPhase += delta * 11 * Math.max(0.75, spd);

        // Leg and arm stride
        const swing = Math.sin(walkPhase) * 0.55;
        robot.leftLeg.rotation.z = swing;
        robot.rightLeg.rotation.z = -swing;
        robot.leftArm.rotation.z = -swing * 0.8;
        robot.rightArm.rotation.z = swing * 0.8;

        // Subtle walk bob
        robot.root.position.y = trackSurfaceY + 0.04 + Math.abs(Math.sin(walkPhase)) * 0.06;

        // Arrived at target pad -> trigger small celebratory jump!
        if (Math.abs(targetX - robotX) <= 0.04 && step && step.phase === 'robot-move') {
          robotX = targetX;
          jumpActive = true;
          jumpProgress = 0;
        }
      } else {
        // Settle limbs smoothly
        robot.leftLeg.rotation.z = THREE.MathUtils.damp(robot.leftLeg.rotation.z, 0, 12, delta);
        robot.rightLeg.rotation.z = THREE.MathUtils.damp(robot.rightLeg.rotation.z, 0, 12, delta);

        if (jumpActive) {
          jumpProgress += delta * 2.8 * Math.max(0.75, Math.min(spd, 2));
          if (jumpProgress >= 1) {
            jumpActive = false;
            jumpProgress = 0;
            robot.root.position.y = trackSurfaceY + 0.04;
          } else {
            const arc = Math.sin(jumpProgress * Math.PI);
            robot.root.position.y = trackSurfaceY + 0.04 + arc * 0.68;
            robot.leftArm.rotation.z = arc * 0.75;
            robot.rightArm.rotation.z = arc * 0.75;
          }
        } else {
          robot.root.position.y =
            trackSurfaceY + 0.04 + Math.sin(elapsed * 2.5) * 0.015;
          robot.leftArm.rotation.z = THREE.MathUtils.damp(robot.leftArm.rotation.z, 0, 10, delta);
          robot.rightArm.rotation.z = THREE.MathUtils.damp(robot.rightArm.rotation.z, 0, 10, delta);
        }
      }

      robot.root.position.x = robotX;
      // Smooth facing rotation (0 = +X, Math.PI = -X, or slight turn toward camera when idle)
      const desiredRotY = isWalking ? facingAngle : -Math.PI / 8;
      robot.root.rotation.y = THREE.MathUtils.damp(robot.root.rotation.y, desiredRotY, 10, delta);

      // Head subtle look
      robot.headGroup.rotation.y = Math.sin(elapsed * 1.4) * 0.08;

      // Beacon & pad emissive highlights
      const isPrinting = step?.phase === 'robot-print';
      const isDone = step?.phase === 'done';
      if (isPrinting) {
        robot.beaconMat.color.setHex(0x10b981);
        robot.beaconMat.emissive.setHex(0x10b981);
        robot.beaconMat.emissiveIntensity = 2.6;
      } else if (jumpActive) {
        robot.beaconMat.color.setHex(0xf59e0b);
        robot.beaconMat.emissive.setHex(0xf59e0b);
        robot.beaconMat.emissiveIntensity = 2.4;
      } else {
        robot.beaconMat.color.setHex(0x38bdf8);
        robot.beaconMat.emissive.setHex(0x38bdf8);
        robot.beaconMat.emissiveIntensity = 1.2;
      }

      const activeIter = step ? step.iterIndex : -1;
      const visitedCount = step ? step.visitedCount : 0;

      pads.forEach((pad, idx) => {
        const isCurrent = !isDone && idx === activeIter && step !== null;
        const isVisited = isDone || idx < visitedCount;
        const beaconMat = pad.beaconLight.material as THREE.MeshStandardMaterial;

        if (isCurrent) {
          pad.ringMat.emissive.setHex(isPrinting ? 0x10b981 : 0xf59e0b);
          pad.ringMat.emissiveIntensity = 1.5;
          beaconMat.color.setHex(isPrinting ? 0x10b981 : 0xf59e0b);
          beaconMat.emissive.setHex(isPrinting ? 0x10b981 : 0xf59e0b);
          beaconMat.emissiveIntensity = 1.8;
        } else if (isVisited) {
          pad.ringMat.emissive.setHex(0x059669);
          pad.ringMat.emissiveIntensity = 0.85;
          beaconMat.color.setHex(0x10b981);
          beaconMat.emissive.setHex(0x10b981);
          beaconMat.emissiveIntensity = 1.0;
        } else {
          pad.ringMat.emissive.setHex(0x0ea5e9);
          pad.ringMat.emissiveIntensity = 0.14;
          beaconMat.color.setHex(0x334155);
          beaconMat.emissive.setHex(0x334155);
          beaconMat.emissiveIntensity = 0.2;
        }
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

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 720;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      controls.dispose();
      disposeObject3D(scene);
      envTex.dispose();
      renderer.dispose();
    };
  }, []);

  const currentVal = currentStep?.currentInput;
  const phase = currentStep?.phase ?? 'idle';

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            3D Robot Loop Track
          </h2>
          <p className="text-sm text-slate-600">
            Robot walks to each value in{' '}
            <code className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
              {pythonExpr}
            </code>{' '}
            and jumps on each stop
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500 tabular-nums">
          <span>
            {values.length} {values.length === 1 ? 'stop' : 'stops'}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {phase === 'done'
              ? 'Track complete'
              : currentVal !== null && currentVal !== undefined
                ? `Current i = ${currentVal}`
                : 'At start pad'}
          </span>
        </div>
      </div>

      {/* Dedicated 3D WebGL Mount Container */}
      <div className="relative flex-1 min-h-[340px] rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
        <div ref={mountRef} className="w-full h-full min-h-[340px]" />

        {/* Subtle non-blur camera reset control */}
        <button
          type="button"
          onClick={() => cameraResetRef.current?.()}
          title="Reset 3D camera"
          className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reset View</span>
        </button>

        {/* Bottom-left subtle camera hint */}
        <div className="pointer-events-none absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-slate-900/85 border border-slate-800 text-[11px] text-slate-300">
          Drag to orbit · Scroll to zoom
        </div>
      </div>
    </div>
  );
}
