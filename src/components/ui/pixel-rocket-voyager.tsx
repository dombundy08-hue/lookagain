"use client";

// Adapted from the Pixel Rocket Voyager hero: same Three.js + bloom + staggered pixel headline,
// re-skinned as a recovered Curiosity Hour broadcast. The rocket is a pixel cassette,
// the crypto coins are the Keeper's treasure, and something far back watches.

import React, { useEffect, useRef } from "react";
import { motion, useAnimation, useReducedMotion } from "framer-motion";
import { Eye } from "lucide-react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import { Button } from "@/components/ui/8bit-button";

export interface PixelRocketHeroProps {
  headline?: string;
  kicker?: string;
  subtitle?: React.ReactNode;
  ctaLabel?: string;
  onStart?: () => void;
  secondary?: React.ReactNode;
}

// --- Main Hero Component ---
export const PixelRocketHero = ({
  headline = "Look Again",
  kicker = "A Curiosity Hour lost episode",
  subtitle,
  ctaLabel = "Press Play",
  onStart,
  secondary,
}: PixelRocketHeroProps) => {
  const reduce = useReducedMotion();
  const textControls = useAnimation();
  const buttonControls = useAnimation();

  useEffect(() => {
    textControls.start((i: number) => ({
      opacity: 1,
      y: 0,
      transition: reduce
        ? { duration: 0 }
        : { delay: i * 0.06 + 1.2, duration: 1.1, ease: [0.2, 0.65, 0.3, 0.9] },
    }));
    buttonControls.start({ opacity: 1, transition: reduce ? { duration: 0 } : { delay: 2.4, duration: 1 } });
  }, [textControls, buttonControls, reduce]);

  return (
    <div className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden bg-background">
      <PixelVoyagerCanvas />
      <HeroNav />
      <div className="relative z-10 mt-24 px-4 text-center md:mt-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[-10%] -z-10 bg-[radial-gradient(ellipse_at_center,rgb(11_12_10/0.92)_35%,transparent_72%)]"
        />
        <motion.p
          custom={0}
          initial={{ opacity: 0, y: 20 }}
          animate={textControls}
          className="retro mb-6 text-[10px] uppercase tracking-[0.2em] text-muted-foreground md:text-xs"
        >
          {kicker}
        </motion.p>
        <h1
          className="retro keeper-voice text-3xl text-foreground sm:text-5xl md:text-7xl"
          style={{ textShadow: "3px 3px 0px #7a3b22" }}
          aria-label={headline}
        >
          {headline.split("").map((char, i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              custom={i}
              initial={{ opacity: 0, y: 50 }}
              animate={textControls}
              style={{ display: "inline-block", whiteSpace: "pre" }}
            >
              {char}
            </motion.span>
          ))}
        </h1>
        {subtitle ? (
          <motion.div
            custom={headline.length}
            initial={{ opacity: 0, y: 30 }}
            animate={textControls}
            className="mx-auto mt-8 max-w-xl text-2xl leading-snug text-muted-foreground"
          >
            {subtitle}
          </motion.div>
        ) : null}
        <motion.div initial={{ opacity: 0 }} animate={buttonControls} className="mt-10 flex flex-col items-center gap-6">
          <Button size="lg" onClick={onStart} autoFocus>
            <span aria-hidden="true">&#9654;</span> {ctaLabel}
          </Button>
          {secondary}
        </motion.div>
      </div>
      <RecBadge />
    </div>
  );
};

// --- Navigation Component ---
const HeroNav = () => {
  const reduce = useReducedMotion();
  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: reduce ? { duration: 0 } : { delay: 0.8, duration: 1 } }}
      className="absolute top-0 right-0 left-0 z-20 p-6"
      aria-label="Show"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="size-5 text-primary" aria-hidden="true" />
          <span className="retro text-[10px] text-foreground md:text-xs">Curiosity Hour</span>
        </div>
        <span className="retro text-[10px] text-muted-foreground">CH 3</span>
      </div>
    </motion.nav>
  );
};

const RecBadge = () => (
  <div className="retro pointer-events-none absolute bottom-6 left-6 z-20 flex items-center gap-3 text-[10px] text-muted-foreground" aria-hidden="true">
    <span className="blink inline-block size-2 bg-destructive" />
    PLAY &#9654; SP 0:00:00
  </div>
);

// --- Three.js Canvas Component ---
const PixelVoyagerCanvas = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const width = () => mount.clientWidth || window.innerWidth;
    const height = () => mount.clientHeight || window.innerHeight;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // No WebGL: the plain background stands in.
    }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width() / height(), 0.1, 1000);
    camera.position.z = 25;
    renderer.setSize(width(), height());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    const pointer = new THREE.Vector2(0, 0);
    const clock = new THREE.Clock();
    const disposables: { dispose: () => void }[] = [];

    // Post-processing: soft bloom so only the amber and the eyes glow.
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width(), height()), 0.55, 0.35, 0.82);
    composer.addPass(bloomPass);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffe2b0, 1.1);
    key.position.set(5, 8, 12);
    scene.add(key);

    // --- Dust in the projector light ---
    const dustGeometry = new THREE.BufferGeometry();
    const dustVertices: number[] = [];
    for (let i = 0; i < 900; i++) {
      dustVertices.push((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100);
    }
    dustGeometry.setAttribute("position", new THREE.Float32BufferAttribute(dustVertices, 3));
    const dustMaterial = new THREE.PointsMaterial({ color: 0x8b8678, size: 0.12 });
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dust);
    disposables.push(dustGeometry, dustMaterial);

    // --- Pixel cassette ---
    const px = 0.25;
    const pixelGeo = new THREE.BoxGeometry(px, px, px);
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x3a3530, flatShading: true });
    const labelMat = new THREE.MeshStandardMaterial({ color: 0x8f866f, flatShading: true });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x14110b, flatShading: true });
    const reelMat = new THREE.MeshStandardMaterial({ color: 0xe3a54a, emissive: 0xe3a54a, emissiveIntensity: 0.9 });
    disposables.push(pixelGeo, shellMat, labelMat, windowMat, reelMat);

    const cassette = new THREE.Group();
    const W = 16;
    const H = 10;
    const reelCenters = [-3.5, 3.5];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const cx = x - (W - 1) / 2;
        const cy = (H - 1) / 2 - y;
        const inWindow = y >= 4 && y <= 6 && x >= 3 && x <= 12;
        const onReel = inWindow && reelCenters.some((r) => Math.abs(cx - r) <= 1);
        if (onReel) continue; // reels are their own spinning groups
        const inLabel = y >= 1 && y <= 7 && x >= 1 && x <= 14 && !inWindow;
        const mat = inWindow ? windowMat : inLabel ? labelMat : shellMat;
        const pixel = new THREE.Mesh(pixelGeo, mat);
        pixel.position.set(cx * px, cy * px, 0);
        cassette.add(pixel);
      }
    }
    const reels: THREE.Group[] = [];
    for (const r of reelCenters) {
      const reel = new THREE.Group();
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const tooth = new THREE.Mesh(pixelGeo, reelMat);
        tooth.position.set(dx * px, dy * px, px * 0.6);
        reel.add(tooth);
      }
      reel.position.set(r * px, -0.5 * px * 1, 0);
      reels.push(reel);
      cassette.add(reel);
    }
    cassette.scale.setScalar(1.4);
    cassette.position.set(0, 9, -4);
    scene.add(cassette);

    // --- The treasure: pixel coins ---
    const coinGroup = new THREE.Group();
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xb8913a, flatShading: true });
    disposables.push(coinMat);
    for (let i = 0; i < 14; i++) {
      const coin = new THREE.Group();
      for (let p = 0; p < 15; p++) {
        const pixel = new THREE.Mesh(pixelGeo, coinMat);
        const angle = (p / 15) * Math.PI * 2;
        pixel.position.set(Math.cos(angle) * 0.45, Math.sin(angle) * 0.45, 0);
        coin.add(pixel);
      }
      coin.position.set((Math.random() - 0.5) * 44, (Math.random() - 0.5) * 30, -4 - Math.random() * 16);
      coinGroup.add(coin);
    }
    scene.add(coinGroup);

    // --- Something far back. It only looks for a moment. ---
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe0483a, transparent: true, opacity: 0 });
    const eyeGeo = new THREE.BoxGeometry(0.5, 0.25, 0.1);
    disposables.push(eyeMat, eyeGeo);
    const eyes = new THREE.Group();
    for (const ex of [-0.7, 0.7]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.x = ex;
      eyes.add(eye);
    }
    eyes.position.set(14, 7, -30);
    scene.add(eyes);

    const handlePointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    if (!reduceMotion) window.addEventListener("pointermove", handlePointerMove);

    let frame = 0;
    const target = new THREE.Vector3();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Rests above the title; drifts toward the pointer without crossing the text.
      target.set(pointer.x * 9, 9 + pointer.y * 2 + Math.sin(elapsed * 0.6) * 0.5, -4);
      cassette.position.lerp(target, 0.03);
      cassette.rotation.y = (target.x - cassette.position.x) * 0.08 + Math.sin(elapsed * 0.3) * 0.15;
      cassette.rotation.x = -(target.y - cassette.position.y) * 0.08;

      for (const reel of reels) reel.rotation.z = -elapsed * 2.2;
      coinGroup.children.forEach((coin, i) => {
        coin.rotation.y = elapsed * (i % 2 === 0 ? 0.8 : -0.8);
      });
      dust.rotation.y = elapsed * 0.01;

      // Every ~19 seconds the eyes open for about a second.
      const cycle = elapsed % 19;
      eyeMat.opacity = cycle > 16 && cycle < 17.4 ? Math.sin(((cycle - 16) / 1.4) * Math.PI) * 0.85 : 0;

      composer.render();
    };

    if (reduceMotion) {
      composer.render();
    } else {
      animate();
    }

    const handleResize = () => {
      camera.aspect = width() / height();
      camera.updateProjectionMatrix();
      renderer.setSize(width(), height());
      composer.setSize(width(), height());
      if (reduceMotion) composer.render();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      disposables.forEach((d) => d.dispose());
      composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 z-0" />;
};

export default PixelRocketHero;
