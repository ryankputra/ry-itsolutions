"use client";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface HeroSignalSceneProps {
  isDark?: boolean;
  className?: string;
}

export default function HeroSignalScene({ isDark = true, className = "" }: HeroSignalSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animId: number;
    let isVisible = true;

    // ---------------------------------------------------------------
    // 1. Scene, Camera, High-Performance WebGL Renderer
    // ---------------------------------------------------------------
    const scene = new THREE.Scene();

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 380;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 0, 8.2);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.pointerEvents = "none";
    container.appendChild(renderer.domElement);

    // ---------------------------------------------------------------
    // 2. High-Tech Color Palette & Lighting
    // ---------------------------------------------------------------
    const primaryColor = isDark ? 0x3b82f6 : 0x2563eb; // Royal Blue / Electric Blue
    const cyanColor = isDark ? 0x06b6d4 : 0x0284c7;    // Cyan Neon
    const emeraldColor = isDark ? 0x10b981 : 0x059669; // Roamer Green
    const purpleAccent = isDark ? 0x8b5cf6 : 0x7c3aed; // Violet / Purple
    const coreDark = isDark ? 0x030712 : 0xf8fafc;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 1.0 : 1.3);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, isDark ? 2.2 : 1.8);
    keyLight.position.set(6, 6, 8);
    scene.add(keyLight);

    const rimLightBlue = new THREE.PointLight(cyanColor, isDark ? 3.5 : 2.5, 25);
    rimLightBlue.position.set(-6, 3, -4);
    scene.add(rimLightBlue);

    const rimLightEmerald = new THREE.PointLight(emeraldColor, isDark ? 2.8 : 2.0, 20);
    rimLightEmerald.position.set(4, -5, -3);
    scene.add(rimLightEmerald);

    // Master Group for smooth mouse tilt & rotation
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Shared circular soft glow particle texture
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = 64;
    glowCanvas.height = 64;
    const gCtx = glowCanvas.getContext("2d");
    if (gCtx) {
      const grad = gCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255, 255, 255, 1)");
      grad.addColorStop(0.25, "rgba(255, 255, 255, 0.85)");
      grad.addColorStop(0.6, "rgba(56, 189, 248, 0.4)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      gCtx.fillStyle = grad;
      gCtx.fillRect(0, 0, 64, 64);
    }
    const particleTexture = new THREE.CanvasTexture(glowCanvas);

    // ---------------------------------------------------------------
    // 3. Planetary Cyber Globe Structure
    // ---------------------------------------------------------------
    const globeRadius = 2.2;

    // A. Inner Holographic Core Sphere
    const coreGeo = new THREE.SphereGeometry(globeRadius * 0.98, 48, 48);
    const coreMat = new THREE.MeshStandardMaterial({
      color: coreDark,
      roughness: 0.15,
      metalness: 0.85,
      transparent: true,
      opacity: isDark ? 0.85 : 0.4,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    globeGroup.add(coreMesh);

    // B. Outer Geodesic Icosahedron Wireframe
    const wireGeo = new THREE.IcosahedronGeometry(globeRadius, 3);
    const wireMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      wireframe: true,
      transparent: true,
      opacity: isDark ? 0.35 : 0.25,
      roughness: 0.2,
      metalness: 0.8,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    globeGroup.add(wireMesh);

    // C. Longitude & Latitude Cyber Rings
    const latRingGroup = new THREE.Group();
    globeGroup.add(latRingGroup);

    [-0.6, 0, 0.6].forEach(latY => {
      const rAtY = Math.sqrt(Math.max(0.1, globeRadius * globeRadius - latY * latY * globeRadius * globeRadius));
      const ringG = new THREE.TorusGeometry(rAtY * 1.01, 0.008, 8, 80);
      const ringM = new THREE.MeshBasicMaterial({
        color: cyanColor,
        transparent: true,
        opacity: isDark ? 0.3 : 0.2,
      });
      const ringMesh = new THREE.Mesh(ringG, ringM);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = latY * globeRadius;
      latRingGroup.add(ringMesh);
    });

    // ---------------------------------------------------------------
    // 4. Global Roaming Telecom Hubs & Vertex Nodes
    // ---------------------------------------------------------------
    const hubCoords = [
      { name: "Jakarta", lat: -6.2, lon: 106.8 },
      { name: "Singapore", lat: 1.35, lon: 103.8 },
      { name: "Tokyo", lat: 35.6, lon: 139.6 },
      { name: "Sydney", lat: -33.8, lon: 151.2 },
      { name: "Dubai", lat: 25.2, lon: 55.2 },
      { name: "Frankfurt", lat: 50.1, lon: 8.6 },
      { name: "London", lat: 51.5, lon: -0.12 },
      { name: "New York", lat: 40.7, lon: -74.0 },
      { name: "San Francisco", lat: 37.7, lon: -122.4 },
      { name: "Sao Paulo", lat: -23.5, lon: -46.6 },
      { name: "Cape Town", lat: -33.9, lon: 18.4 },
      { name: "Seoul", lat: 37.5, lon: 126.9 },
    ];

    function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
    }

    const hubPoints: THREE.Vector3[] = [];
    const hubMarkersGroup = new THREE.Group();
    globeGroup.add(hubMarkersGroup);

    hubCoords.forEach((hub, i) => {
      const pos = latLonToVec3(hub.lat, hub.lon, globeRadius * 1.015);
      hubPoints.push(pos);

      // Base Beacon Pin
      const pinGeo = new THREE.SphereGeometry(0.045, 12, 12);
      const pinMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x38bdf8 : 0x34d399,
      });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.copy(pos);
      hubMarkersGroup.add(pin);

      // Concentric Radar Beacon Ripple Ring
      const rippleGeo = new THREE.RingGeometry(0.05, 0.075, 24);
      const rippleMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? cyanColor : emeraldColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const ripple = new THREE.Mesh(rippleGeo, rippleMat);
      ripple.position.copy(pos.clone().multiplyScalar(1.002));
      ripple.lookAt(pos.clone().multiplyScalar(2));
      hubMarkersGroup.add(ripple);
    });

    // Outer Geodesic Vertex Points
    const nodeCount = 90;
    const nodePositions = new Float32Array(nodeCount * 3);
    for (let i = 0; i < nodeCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI) * phi;
      const r = globeRadius * 1.008;
      nodePositions[i * 3] = r * Math.cos(theta) * Math.sin(phi);
      nodePositions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      nodePositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
    const nodeMat = new THREE.PointsMaterial({
      size: 0.16,
      color: 0x93c5fd,
      transparent: true,
      opacity: isDark ? 0.85 : 0.65,
      map: particleTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const nodesMesh = new THREE.Points(nodeGeo, nodeMat);
    globeGroup.add(nodesMesh);

    // ---------------------------------------------------------------
    // 5. Curved 3D Signal Arcs (Spline Flightpaths) & Travelling Photons
    // ---------------------------------------------------------------
    const arcConnections = [
      [0, 1], // Jakarta -> Singapore
      [1, 2], // Singapore -> Tokyo
      [2, 8], // Tokyo -> SF
      [8, 7], // SF -> NY
      [7, 6], // NY -> London
      [6, 5], // London -> Frankfurt
      [5, 4], // Frankfurt -> Dubai
      [4, 0], // Dubai -> Jakarta
      [0, 3], // Jakarta -> Sydney
      [7, 9], // NY -> Sao Paulo
      [4, 10], // Dubai -> Cape Town
      [2, 11], // Tokyo -> Seoul
    ];

    interface ArcData {
      curve: THREE.QuadraticBezierCurve3;
      tube: THREE.Mesh;
      photon: THREE.Mesh;
      speed: number;
      offset: number;
    }

    const arcs: ArcData[] = [];
    const photonGeo = new THREE.SphereGeometry(0.045, 12, 12);

    arcConnections.forEach(([fromIdx, toIdx], arcIdx) => {
      const p1 = hubPoints[fromIdx];
      const p2 = hubPoints[toIdx];
      if (!p1 || !p2) return;

      // Arc midpoint elevated outwards in normal direction
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const dist = p1.distanceTo(p2);
      const elevation = globeRadius + Math.min(1.4, Math.max(0.35, dist * 0.35));
      mid.normalize().multiplyScalar(elevation);

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.009, 6, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: arcIdx % 2 === 0 ? cyanColor : emeraldColor,
        transparent: true,
        opacity: isDark ? 0.45 : 0.3,
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      globeGroup.add(tube);

      // Glowing photon packet
      const photonMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
      });
      const photon = new THREE.Mesh(photonGeo, photonMat);
      globeGroup.add(photon);

      arcs.push({
        curve,
        tube,
        photon,
        speed: 0.35 + (arcIdx % 4) * 0.12,
        offset: (arcIdx * 0.22) % 1.0,
      });
    });

    // ---------------------------------------------------------------
    // 6. Orbiting LEO Telecom Satellites
    // ---------------------------------------------------------------
    interface Satellite {
      group: THREE.Group;
      radius: number;
      speed: number;
      inclination: number;
      phase: number;
    }

    const satellites: Satellite[] = [];

    const satConfigs = [
      { radius: 3.2, speed: 0.45, inc: Math.PI / 4, phase: 0 },
      { radius: 3.5, speed: -0.38, inc: -Math.PI / 3, phase: Math.PI },
      { radius: 3.8, speed: 0.3, inc: Math.PI / 6, phase: Math.PI / 2 },
    ];

    satConfigs.forEach(cfg => {
      const satGroup = new THREE.Group();

      // Satellite Main Body (Gold foil cube)
      const bodyGeo = new THREE.BoxGeometry(0.09, 0.09, 0.14);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.9,
        roughness: 0.2,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      satGroup.add(body);

      // Solar Panel Wings (Cyan metallic panels)
      const panelGeo = new THREE.BoxGeometry(0.38, 0.015, 0.08);
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.7,
        roughness: 0.3,
      });
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(0, 0, 0);
      satGroup.add(panel);

      // Beacon LED on satellite
      const ledGeo = new THREE.SphereGeometry(0.035, 8, 8);
      const ledMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(0, 0.06, 0);
      satGroup.add(led);

      // Directional Laser to Earth center
      const beamGeo = new THREE.CylinderGeometry(0.004, 0.012, cfg.radius * 0.8, 6);
      const beamMat = new THREE.MeshBasicMaterial({
        color: cyanColor,
        transparent: true,
        opacity: isDark ? 0.35 : 0.2,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = -cfg.radius * 0.4;
      satGroup.add(beam);

      globeGroup.add(satGroup);

      satellites.push({
        group: satGroup,
        radius: cfg.radius,
        speed: cfg.speed,
        inclination: cfg.inc,
        phase: cfg.phase,
      });
    });

    // Orbital path rings for satellites
    satConfigs.forEach(cfg => {
      const orbitGeo = new THREE.TorusGeometry(cfg.radius, 0.007, 8, 100);
      const orbitMat = new THREE.MeshBasicMaterial({
        color: primaryColor,
        transparent: true,
        opacity: isDark ? 0.18 : 0.1,
      });
      const orbitMesh = new THREE.Mesh(orbitGeo, orbitMat);
      orbitMesh.rotation.x = cfg.inc;
      orbitMesh.rotation.y = cfg.inc * 0.5;
      globeGroup.add(orbitMesh);
    });

    // ---------------------------------------------------------------
    // 7. Ambient Floating Cosmic Signal Particles
    // ---------------------------------------------------------------
    const particleCount = 220;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 3.6 + Math.random() * 3.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particlesMat = new THREE.PointsMaterial({
      size: 0.14,
      color: 0x93c5fd,
      transparent: true,
      opacity: isDark ? 0.65 : 0.4,
      map: particleTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cosmicDust = new THREE.Points(particlesGeo, particlesMat);
    scene.add(cosmicDust);

    // ---------------------------------------------------------------
    // 8. Mouse Parallax & Smooth Interactive Tilt
    // ---------------------------------------------------------------
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / (rect.width || 1);
      const y = (e.clientY - rect.top) / (rect.height || 1);
      targetX = (x - 0.5) * 1.6;
      targetY = (y - 0.5) * 1.6;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        const x = (touch.clientX - rect.left) / (rect.width || 1);
        const y = (touch.clientY - rect.top) / (rect.height || 1);
        targetX = (x - 0.5) * 1.2;
        targetY = (y - 0.5) * 1.2;
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 380;
      const newH = container.clientHeight || 380;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener("resize", handleResize);

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        cancelAnimationFrame(animId);
        clock.start();
        animate();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // ---------------------------------------------------------------
    // 9. Master Animation Loop
    // ---------------------------------------------------------------
    const clock = new THREE.Clock();

    const animate = () => {
      if (!isVisible) return;
      animId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      // Smooth mouse parallax damping
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      // Rotate Globe smoothly with mouse influence
      globeGroup.rotation.y = elapsed * 0.18 + mouseX * 0.75;
      globeGroup.rotation.x = Math.sin(elapsed * 0.12) * 0.12 + mouseY * 0.75;

      // Animate Arcs & Photons
      arcs.forEach(arc => {
        const t = (elapsed * arc.speed + arc.offset) % 1.0;
        const pos = arc.curve.getPoint(t);
        arc.photon.position.copy(pos);

        // Pulsing scale for photon
        const scale = 1 + Math.sin(elapsed * 12 + arc.offset * 10) * 0.35;
        arc.photon.scale.setScalar(scale);
      });

      // Animate Satellites along orbital paths
      satellites.forEach(sat => {
        const angle = elapsed * sat.speed + sat.phase;
        const x = Math.cos(angle) * sat.radius;
        const z = Math.sin(angle) * sat.radius;
        const y = Math.sin(angle * 2) * 0.4;

        sat.group.position.set(
          x * Math.cos(sat.inclination) - z * Math.sin(sat.inclination) * 0.5,
          y + z * Math.sin(sat.inclination),
          z * Math.cos(sat.inclination)
        );
        sat.group.lookAt(0, 0, 0);
      });

      // Counter-rotate cosmic dust
      cosmicDust.rotation.y = -elapsed * 0.04;
      cosmicDust.rotation.x = Math.cos(elapsed * 0.03) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // ---------------------------------------------------------------
    // 10. Memory Cleanup
    // ---------------------------------------------------------------
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose geometries & materials
      scene.clear();
      particleTexture.dispose();
      renderer.dispose();
    };
  }, [isDark]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[320px] sm:min-h-[420px] lg:min-h-[480px] flex items-center justify-center overflow-hidden pointer-events-none select-none ${className}`}
    >
      {/* High-tech ambient glowing radial aura behind 3D globe */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
        <div className="w-64 h-64 sm:w-96 sm:h-96 bg-primary/20 dark:bg-primary/25 rounded-full blur-3xl animate-pulse" />
        <div className="w-48 h-48 sm:w-72 sm:h-72 bg-emerald-500/15 dark:bg-emerald-400/20 rounded-full blur-2xl -translate-y-8 translate-x-12" />
      </div>
    </div>
  );
}
