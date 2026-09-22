import { useEffect, useRef } from "react";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uBgColor;
  uniform float uSpeed;
  uniform float uComplexity;
  uniform float uDensity;
  uniform float uIntensity;
  uniform vec2 uMouse;
  uniform float uHoverEffect;

  varying vec2 vUv;

  mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
  }

  void main() {
    vec2 p = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
    vec2 original_p = p;

    vec3 finalColor = vec3(0.0);
    float time = uTime * uSpeed * 0.5;

    p *= rot(0.2);

    if (uHoverEffect > 0.0) {
      vec2 m = uMouse;
      m.x *= uResolution.x / min(uResolution.x, uResolution.y);
      m.y *= uResolution.y / min(uResolution.x, uResolution.y);
      m *= rot(0.2);

      float mouseDist = length(p - m);
      float force = smoothstep(1.5, 0.0, mouseDist) * uHoverEffect;
      p += (p - m) * force * 0.15;
      p *= rot(force * 0.12);
    }

    float iterations = floor(uComplexity);

    for (float i = 1.0; i <= 20.0; i++) {
      if (i > iterations) break;

      p *= rot(sin(time * 0.05) * 0.1 + 0.08);

      vec2 q = p;
      float dist = length(p);
      q *= rot(dist * uDensity * 0.25 - time * 0.3);

      float freq = uDensity * 0.8;

      q.x += sin(q.y * freq + time * 0.5 + i * 0.15) * 0.5;
      q.y += cos(q.x * freq - time * 0.5 - i * 0.15) * 0.5;

      vec2 r = q;
      r.x += sin(q.y * freq * 2.0 - time * 0.8) * 0.25;
      r.y += cos(q.x * freq * 2.0 + time * 0.8) * 0.25;

      float wave = sin(r.x * freq * 1.5 + time) * 0.6
                 + cos(r.y * freq * 0.5 - time * 0.7) * 0.4;

      float d = abs(r.y - wave);

      float core = 0.005 / max(d, 0.002);
      float soft1 = exp(-d * 8.0) * 0.6;
      float soft2 = exp(-d * 2.0) * 0.2;

      float mixFactor = sin(r.x * 3.0 + r.y * 2.0 + time + i * 1.6) * 0.5 + 0.5;
      vec3 layerColor = mix(uColor1, uColor2, mixFactor);

      float attenuation = 1.0 / (i * 0.6 + 1.0);
      finalColor += layerColor * (core + soft1 + soft2) * uIntensity * attenuation * 30.0;

      p = r * 1.05;
    }

    finalColor += uBgColor * 0.5;

    float vignette = 1.0 - smoothstep(0.5, 2.5, length(original_p));
    finalColor *= vignette;

    finalColor = finalColor * (2.51 * finalColor + 0.03) / (finalColor * (2.43 * finalColor + 0.59) + 0.14);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export function Background() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (err) {
      console.warn("WebGL not available, skipping shader background", err);
      return;
    }

    const getSize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      return { w, h };
    };

    let { w, h } = getSize();
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const uniforms = {
      uTime: { value: 0.0 },
      uResolution: {
        value: new THREE.Vector2(
          w * Math.min(window.devicePixelRatio, 2),
          h * Math.min(window.devicePixelRatio, 2)
        ),
      },
      uColor1: { value: new THREE.Color("#ff6a00") },
      uColor2: { value: new THREE.Color("#a855f7") },
      uBgColor: { value: new THREE.Color("#05030a") },
      uSpeed: { value: 0.3 },
      uComplexity: { value: 8.0 },
      uDensity: { value: 3.2535 },
      uIntensity: { value: 0.03758 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uHoverEffect: { value: 0.0 },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      depthWrite: false,
      depthTest: false,
      transparent: true,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const clock = new THREE.Clock();
    let raf = 0;

    function animate() {
      raf = requestAnimationFrame(animate);
      uniforms.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    }

    function onResize() {
      const next = getSize();
      w = next.w;
      h = next.h;
      renderer.setSize(w, h);
      uniforms.uResolution.value.set(
        w * Math.min(window.devicePixelRatio, 2),
        h * Math.min(window.devicePixelRatio, 2)
      );
    }

    window.addEventListener("resize", onResize);
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ mixBlendMode: "screen", opacity: 0.85 }}
      aria-hidden
    />
  );
}
