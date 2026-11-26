import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Award,
} from 'lucide-react';
import { QUIZ_QUESTIONS } from '../data/quizQuestions';
import {
  applyStudioEnvironment,
  createFloorGridTexture,
  createStudioRenderer,
  detectSoftwareGl,
  disposeObject3D,
  scheduleSoftwareFrame,
} from '../utils/threeSetup';

type FeedbackState = 'idle' | 'correct' | 'wrong';

export function QuizGameView() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>('idle');
  const [feedbackPulseId, setFeedbackPulseId] = useState(0);

  const mountRef = useRef<HTMLDivElement>(null);
  const animStateRef = useRef({
    feedback: 'idle' as FeedbackState,
    pulseId: 0,
  });
  animStateRef.current = { feedback, pulseId: feedbackPulseId };

  const currentQ = QUIZ_QUESTIONS[questionIndex];
  const isAnswered = selectedOption !== null;
  const isCorrect = isAnswered && selectedOption === currentQ.correctIndex;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = container.clientWidth || 560;
    const height = container.clientHeight || 420;

    const renderer = createStudioRenderer(width, height, isSoftwareGl);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.045);

    const envTex = applyStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    camera.position.set(0, 2.2, 5.4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.enablePan = false;
    controls.minDistance = 3.6;
    controls.maxDistance = 9;
    controls.target.set(0, 1.35, 0);
    controls.update();

    // Lighting
    const hemi = new THREE.HemisphereLight(0xbae6fd, 0x0f172a, 0.7);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.8);
    keyLight.position.set(4, 8, 5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const orbLight = new THREE.PointLight(0x38bdf8, 2.2, 10, 2);
    orbLight.position.set(0, 1.65, 0);
    scene.add(orbLight);

    // Floor
    const floorTex = createFloorGridTexture(renderer);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 36),
      new THREE.MeshStandardMaterial({
        map: floorTex,
        roughness: 0.85,
        metalness: 0.15,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grounded Pedestal Assembly
    const pedestalGroup = new THREE.Group();
    scene.add(pedestalGroup);

    const basePlate = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.32, 0.18, 32),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.45,
        metalness: 0.65,
      })
    );
    basePlate.position.y = 0.09;
    basePlate.receiveShadow = true;
    basePlate.castShadow = true;
    pedestalGroup.add(basePlate);

    const emitterRingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.0,
      roughness: 0.25,
    });
    const emitterRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.04, 14, 40),
      emitterRingMat
    );
    emitterRing.rotation.x = Math.PI / 2;
    emitterRing.position.y = 0.2;
    pedestalGroup.add(emitterRing);

    // 3D Energy Orb Group (multi-part assembly)
    const orbGroup = new THREE.Group();
    orbGroup.position.set(0, 1.55, 0);
    scene.add(orbGroup);

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.6,
      roughness: 0.18,
      metalness: 0.35,
    });
    const innerCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.54, 1),
      coreMat
    );
    innerCore.castShadow = true;
    orbGroup.add(innerCore);

    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.35,
      roughness: 0.12,
      metalness: 0.2,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const outerShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.84, 32, 24),
      shellMat
    );
    outerShell.renderOrder = 2;
    orbGroup.add(outerShell);

    const gyroMat1 = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.85,
    });
    const gyroRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.06, 0.035, 16, 48),
      gyroMat1
    );
    orbGroup.add(gyroRing1);

    const gyroMat2 = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.4,
      roughness: 0.25,
      metalness: 0.85,
    });
    const gyroRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.22, 0.028, 16, 48),
      gyroMat2
    );
    gyroRing2.rotation.x = Math.PI / 3;
    orbGroup.add(gyroRing2);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let lastPulseId = 0;
    let shakeTimer = 0;
    let celebrateTimer = 0;

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.elapsedTime;
      const { feedback: fb, pulseId } = animStateRef.current;

      if (pulseId !== lastPulseId) {
        lastPulseId = pulseId;
        if (fb === 'wrong') {
          shakeTimer = 0.75;
        } else if (fb === 'correct') {
          celebrateTimer = 1.0;
        }
      }

      // Target colors based on feedback state
      let targetHex = 0x38bdf8;
      let targetEmissiveIntensity = 1.3;
      let spinBoost = 1;
      let targetY = 1.55 + Math.sin(elapsed * 2.2) * 0.08;
      let shakeX = 0;

      if (fb === 'correct') {
        targetHex = 0x10b981;
        targetEmissiveIntensity = 2.8;
        spinBoost = 2.4;
        if (celebrateTimer > 0) {
          celebrateTimer = Math.max(0, celebrateTimer - delta);
          targetY += Math.sin((1 - celebrateTimer) * Math.PI) * 0.35;
        }
      } else if (fb === 'wrong') {
        targetHex = 0xef4444;
        targetEmissiveIntensity = 2.6;
        spinBoost = 0.5;
        if (shakeTimer > 0) {
          shakeTimer = Math.max(0, shakeTimer - delta);
          const decay = shakeTimer / 0.75;
          shakeX = Math.sin(elapsed * 44) * 0.38 * decay;
        }
      }

      orbGroup.position.x = shakeX;
      orbGroup.position.y = THREE.MathUtils.damp(orbGroup.position.y, targetY, 10, delta);

      const scaleTarget = fb === 'correct' ? 1.1 : 1.0;
      const sVal = THREE.MathUtils.damp(orbGroup.scale.x, scaleTarget, 8, delta);
      orbGroup.scale.set(sVal, sVal, sVal);

      // Update colors smoothly
      coreMat.color.setHex(targetHex);
      coreMat.emissive.setHex(targetHex);
      coreMat.emissiveIntensity = THREE.MathUtils.damp(
        coreMat.emissiveIntensity,
        targetEmissiveIntensity,
        8,
        delta
      );

      shellMat.emissive.setHex(targetHex);
      shellMat.emissiveIntensity = THREE.MathUtils.damp(
        shellMat.emissiveIntensity,
        fb === 'idle' ? 0.3 : 1.1,
        8,
        delta
      );

      gyroMat1.emissive.setHex(targetHex);
      gyroMat2.emissive.setHex(targetHex);
      emitterRingMat.color.setHex(targetHex);
      emitterRingMat.emissive.setHex(targetHex);
      orbLight.color.setHex(targetHex);
      orbLight.intensity = THREE.MathUtils.damp(
        orbLight.intensity,
        fb === 'idle' ? 2.0 : 4.2,
        8,
        delta
      );

      // Rotations
      innerCore.rotation.y += delta * 0.9 * spinBoost;
      innerCore.rotation.x += delta * 0.45 * spinBoost;
      gyroRing1.rotation.y += delta * 1.1 * spinBoost;
      gyroRing1.rotation.z += delta * 0.5 * spinBoost;
      gyroRing2.rotation.x += delta * 0.8 * spinBoost;
      gyroRing2.rotation.y -= delta * 0.7 * spinBoost;

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
      const w = container.clientWidth || 560;
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
      disposeObject3D(scene);
      envTex.dispose();
      renderer.dispose();
    };
  }, []);

  const handleSelectOption = (idx: number) => {
    if (isAnswered || finished) return;
    setSelectedOption(idx);
    const correct = idx === currentQ.correctIndex;
    if (correct) {
      setScore((prev) => prev + 1);
      setFeedback('correct');
    } else {
      setFeedback('wrong');
    }
    setFeedbackPulseId((prev) => prev + 1);
  };

  const handleNextQuestion = () => {
    if (questionIndex + 1 >= QUIZ_QUESTIONS.length) {
      setFinished(true);
      setFeedback(score >= Math.ceil(QUIZ_QUESTIONS.length / 2) ? 'correct' : 'idle');
      return;
    }
    setQuestionIndex((prev) => prev + 1);
    setSelectedOption(null);
    setFeedback('idle');
  };

  const handleRestart = () => {
    setQuestionIndex(0);
    setSelectedOption(null);
    setScore(0);
    setFinished(false);
    setFeedback('idle');
    setFeedbackPulseId((prev) => prev + 1);
  };

  const percentScore = Math.round((score / QUIZ_QUESTIONS.length) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1">
      {/* Left: 3D Energy Orb Viewport */}
      <section
        aria-label="3D quiz orb stage"
        className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              3D Loop Quiz Orb
            </h2>
            <p className="text-sm text-slate-600">
              Correct picks glow emerald green · Wrong picks shake crimson red
            </p>
          </div>
          <div className="text-xs font-medium text-slate-600 tabular-nums">
            {feedback === 'correct'
              ? 'Correct · Orb Charged'
              : feedback === 'wrong'
                ? 'Incorrect · Try Next'
                : 'Awaiting Answer'}
          </div>
        </div>

        <div className="relative flex-1 min-h-[340px] rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
          <div ref={mountRef} className="w-full h-full min-h-[340px]" />
          <div className="pointer-events-none absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-slate-900/85 border border-slate-800 text-[11px] text-slate-300">
            Drag to orbit · Scroll to zoom
          </div>
        </div>
      </section>

      {/* Right: Question Card & Final Score */}
      <section
        aria-label="Quiz challenge panel"
        className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-5"
      >
        {finished ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Award className="w-8 h-8" aria-hidden="true" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Quiz Complete
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Here is your Python <code className="font-mono text-slate-900">range()</code> loop score.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-8 py-5 flex items-center gap-8 tabular-nums">
              <div>
                <div className="text-xs font-medium text-slate-500">Final Score</div>
                <div className="text-3xl font-bold text-slate-900 font-mono mt-0.5">
                  {score} / {QUIZ_QUESTIONS.length}
                </div>
              </div>
              <div className="h-10 w-px bg-slate-200" aria-hidden="true" />
              <div>
                <div className="text-xs font-medium text-slate-500">Accuracy</div>
                <div className="text-3xl font-bold text-emerald-600 font-mono mt-0.5">
                  {percentScore}%
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Restart Quiz</span>
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-5">
              {/* Question Metadata Header (No Pills) */}
              <div className="flex items-center justify-between gap-4 text-xs font-medium text-slate-500 tabular-nums">
                <span>
                  Question {questionIndex + 1} of {QUIZ_QUESTIONS.length}
                </span>
                <span>
                  Score: <strong className="text-slate-900 font-mono">{score}</strong>
                </span>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  What numbers will this Python loop print?
                </h3>
              </div>

              {/* Python range() Code Block */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 font-mono text-sm sm:text-base text-slate-100 leading-7">
                <div>
                  <span className="text-sky-300 font-semibold">for</span>{' '}
                  <span>i</span>{' '}
                  <span className="text-sky-300 font-semibold">in</span>{' '}
                  <span className="text-amber-300">{currentQ.rangeExpr}</span>:
                </div>
                <div className="pl-6">
                  <span className="text-amber-300">print</span>(i)
                </div>
              </div>

              {/* Multiple Choice Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQ.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isThisCorrect = idx === currentQ.correctIndex;

                  let btnStyle =
                    'border-slate-300 bg-white hover:bg-slate-50 text-slate-900';
                  if (isAnswered) {
                    if (isThisCorrect) {
                      btnStyle =
                        'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500';
                    } else if (isSelected) {
                      btnStyle =
                        'border-rose-500 bg-rose-50 text-rose-900 ring-1 ring-rose-500';
                    } else {
                      btnStyle =
                        'border-slate-200 bg-slate-50 text-slate-400';
                    }
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(idx)}
                      className={`min-h-[52px] px-4 py-3 rounded-xl border text-left font-mono text-sm font-semibold tabular-nums transition-colors flex items-center justify-between gap-2 ${btnStyle} ${
                        isAnswered ? 'cursor-default' : 'cursor-pointer'
                      }`}
                    >
                      <span>{opt}</span>
                      {isAnswered && isThisCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                      )}
                      {isAnswered && isSelected && !isThisCorrect && (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feedback & Next Button Footer */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-h-[68px]">
              {isAnswered ? (
                <>
                  <div className="flex items-start gap-2 text-sm">
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <span className={isCorrect ? 'text-emerald-800' : 'text-rose-800'}>
                      <strong>{isCorrect ? 'Correct:' : 'Incorrect:'}</strong>{' '}
                      {currentQ.explanation}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>
                      {questionIndex + 1 >= QUIZ_QUESTIONS.length
                        ? 'See Final Score'
                        : 'Next Question'}
                    </span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <p className="text-xs text-slate-500">
                  Select the matching output sequence to test your answer on the 3D orb.
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
