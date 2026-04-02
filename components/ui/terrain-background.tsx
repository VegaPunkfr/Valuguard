"use client";

import { useEffect, useRef } from "react";

interface TerrainBackgroundProps {
  opacity?: number;
}

export default function TerrainBackground({ opacity = 0.18 }: TerrainBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    let cancelled = false;
    let rafId: number;
    let renderer: any;
    let resizeHandler: (() => void) | null = null;
    let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;

    function init() {
      if (cancelled || initRef.current) return;
      initRef.current = true;

      import("three").then((THREE) => {
        if (cancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 2000);
        camera.position.set(0, 52, 110);
        camera.lookAt(0, -4, 0);

        function resize() {
          if (!canvas) return;
          renderer.setSize(canvas.offsetWidth, canvas.offsetHeight, false);
          camera.aspect = canvas.offsetWidth / canvas.offsetHeight;
          camera.updateProjectionMatrix();
        }

        const SEG = 80, SW = 180, SH = 130;

        // Fill mesh
        const geoFill = new THREE.PlaneGeometry(SW, SH, SEG, SEG);
        geoFill.rotateX(-Math.PI / 2);
        const matFill = new THREE.MeshBasicMaterial({
          color: 0x05060E, transparent: true, opacity: 0.90, side: THREE.DoubleSide,
        });
        const meshFill = new THREE.Mesh(geoFill, matFill);
        scene.add(meshFill);

        // Wireframe
        const geoWire = new THREE.PlaneGeometry(SW, SH, SEG, SEG);
        geoWire.rotateX(-Math.PI / 2);
        const vCount = geoWire.attributes.position.count;
        const colBuf = new Float32Array(vCount * 3);
        geoWire.setAttribute("color", new THREE.BufferAttribute(colBuf, 3));
        const matWire = new THREE.MeshBasicMaterial({
          vertexColors: true, wireframe: true, transparent: true, opacity: 0.48,
        });
        const meshWire = new THREE.Mesh(geoWire, matWire);
        scene.add(meshWire);

        // Spark particles
        const N_SPARKS = 55;
        const sGeo = new THREE.BufferGeometry();
        const sPos = new Float32Array(N_SPARKS * 3);
        const sCol = new Float32Array(N_SPARKS * 3);
        for (let i = 0; i < N_SPARKS; i++) {
          sPos[i * 3] = (Math.random() - 0.5) * SW * 0.8;
          sPos[i * 3 + 1] = 0;
          sPos[i * 3 + 2] = (Math.random() - 0.5) * SH * 0.8;
          const r = Math.random();
          if (r > 0.7) {
            sCol[i*3]=0; sCol[i*3+1]=0.8; sCol[i*3+2]=0.77; // cyan
          } else if (r > 0.4) {
            sCol[i*3]=1; sCol[i*3+1]=0.9; sCol[i*3+2]=1;    // pearl white
          } else {
            sCol[i*3]=0.94; sCol[i*3+1]=0.65; sCol[i*3+2]=0; // gold
          }
        }
        sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
        sGeo.setAttribute("color", new THREE.BufferAttribute(sCol, 3));
        const sparks = new THREE.Points(sGeo, new THREE.PointsMaterial({
          size: 2.0, vertexColors: true, transparent: true, opacity: 0.85, sizeAttenuation: true,
        }));
        scene.add(sparks);

        // Pulse rings
        const rings: any[] = [];
        function addRing() {
          const rg = new THREE.RingGeometry(0.1, 0.4, 28);
          rg.rotateX(-Math.PI / 2);
          const rm = new THREE.MeshBasicMaterial({
            color: 0x00CFC4, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
          });
          const ring = new THREE.Mesh(rg, rm);
          ring.position.x = (Math.random() - 0.5) * SW * 0.65;
          ring.position.z = (Math.random() - 0.5) * SH * 0.65;
          ring.userData = { r: 0, maxR: 9 + Math.random() * 10, spd: 0.35 + Math.random() * 0.35 };
          scene.add(ring);
          rings.push(ring);
        }
        for (let i = 0; i < 5; i++) addRing();

        // Wave height function
        function wy(x: number, z: number, t: number): number {
          return (
            Math.sin(x * 0.07 + t * 0.55) * 7 +
            Math.sin(z * 0.10 + t * 0.40) * 5 +
            Math.sin((x + z) * 0.04 + t * 0.28) * 9 +
            Math.sin(x * 0.025 - z * 0.06 + t * 0.75) * 6 +
            Math.cos(x * 0.055 + z * 0.035 + t * 0.35) * 4
          );
        }

        let mouseY = 0;
        mouseMoveHandler = (e: MouseEvent) => { mouseY = (e.clientY / innerHeight - 0.5) * 2; };
        document.addEventListener("mousemove", mouseMoveHandler);

        const t0 = performance.now();
        function animate(now: number) {
          if (cancelled) return;
          rafId = requestAnimationFrame(animate);
          const t = (now - t0) * 0.001;

          const pF = geoFill.attributes.position;
          const pW = geoWire.attributes.position;
          const cW = geoWire.attributes.color;

          for (let i = 0; i < vCount; i++) {
            const x = pW.getX(i), z = pW.getZ(i);
            const y = wy(x, z, t);
            pF.setY(i, y);
            pW.setY(i, y);

            const n = (y + 18) / 36;
            if (n > 0.72) {
              const b = 0.5 + n * 0.5;
              cW.setXYZ(i, 0.7 * b, 0.95 * b, 0.95 * b);
            } else if (n > 0.40) {
              const b = 0.3 + n * 0.65;
              cW.setXYZ(i, 0.02, 0.72 * b, 0.70 * b);
            } else {
              const b = 0.12 + n * 0.35;
              cW.setXYZ(i, 0.07 * b, 0.07 * b, 0.35 * b);
            }

            if (i < N_SPARKS) {
              sPos[i * 3 + 1] = wy(sPos[i * 3], sPos[i * 3 + 2], t) + 1.5;
            }
          }

          pF.needsUpdate = true;
          pW.needsUpdate = true;
          cW.needsUpdate = true;
          sGeo.attributes.position.needsUpdate = true;

          rings.forEach((ring) => {
            ring.userData.r += ring.userData.spd * 0.04;
            if (ring.userData.r > ring.userData.maxR) {
              ring.userData.r = 0;
              ring.position.x = (Math.random() - 0.5) * SW * 0.65;
              ring.position.z = (Math.random() - 0.5) * SH * 0.65;
            }
            const p = ring.userData.r / ring.userData.maxR;
            ring.scale.set(ring.userData.r, ring.userData.r, ring.userData.r);
            (ring.material as any).opacity = 0.5 * (1 - p);
            ring.position.y = wy(ring.position.x, ring.position.z, t) + 0.3;
          });

          camera.position.y += (52 + mouseY * 4 - camera.position.y) * 0.02;
          camera.lookAt(0, -4, 0);

          const drift = Math.sin(t * 0.06) * 0.07;
          meshFill.rotation.y = drift;
          meshWire.rotation.y = drift;
          sparks.rotation.y = drift;

          renderer.render(scene, camera);
        }

        resize();
        resizeHandler = resize;
        window.addEventListener("resize", resize);
        animate(performance.now());
      });
    }

    // Lazy-load: first scroll OR 2.5s timeout
    let loaded = false;
    function once() {
      if (!loaded) { loaded = true; init(); }
    }
    window.addEventListener("scroll", once, { once: true, passive: true });
    const timeout = setTimeout(once, 2500);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      window.removeEventListener("scroll", once);
      if (rafId) cancelAnimationFrame(rafId);
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      if (mouseMoveHandler) document.removeEventListener("mousemove", mouseMoveHandler);
      if (renderer) {
        renderer.dispose();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        opacity,
      }}
    />
  );
}
