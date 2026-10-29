"use client";

import { type CSSProperties, useEffect, useId, useRef, useState } from "react";

type Props = {
  alt: string;
  blinkSequence?: number;
  className?: string;
  fetchPriority?: "high" | "low" | "auto";
  height: number;
  width: number;
};

const BASE_IMAGE = "/pofi/pofi-full.webp";
const BLINK_PATCH = "/pofi/pofi-blink-patch-v1.webp";

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function ease(value: number) {
  const progress = clamp(value);
  return progress < 0.5
    ? 4 * progress ** 3
    : 1 - (-2 * progress + 2) ** 3 / 2;
}

export default function PofiIdle({
  alt,
  blinkSequence = 0,
  className = "",
  fetchPriority,
  height,
  width,
}: Props) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const blinkLayerRef = useRef<SVGGElement>(null);
  const leftLidRef = useRef<SVGGElement>(null);
  const rightLidRef = useRef<SVGGElement>(null);
  const closedEyesRef = useRef<SVGGElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [autoBlinkSequence, setAutoBlinkSequence] = useState(0);
  const previousBlink = useRef({
    manual: blinkSequence,
    automatic: autoBlinkSequence,
  });
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const maskId = `pofi-eye-patch-${instanceId}`;
  const gradientId = `pofi-eye-feather-${instanceId}`;
  const leftEyeClipId = `pofi-left-eye-${instanceId}`;
  const rightEyeClipId = `pofi-right-eye-${instanceId}`;

  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    let intersectsViewport = false;
    const updateVisibility = () => {
      setIsVisible(intersectsViewport && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      intersectsViewport = entry.isIntersecting;
      updateVisibility();
    });
    const handleVisibilityChange = () => updateVisibility();

    observer.observe(element);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timeoutId: number | null = null;
    let blinkCount = 0;

    function schedule(delay: number) {
      timeoutId = window.setTimeout(() => {
        setAutoBlinkSequence((sequence) => sequence + 1);
        schedule(blinkCount++ % 2 ? 6200 : 4800);
      }, delay);
    }

    function updateSchedule() {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      timeoutId = null;
      blinkCount = 0;
      if (!reducedMotion.matches) schedule(4300);
    }

    updateSchedule();
    reducedMotion.addEventListener("change", updateSchedule);

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      reducedMotion.removeEventListener("change", updateSchedule);
    };
  }, [isVisible]);

  useEffect(() => {
    const previous = previousBlink.current;
    if (
      previous.manual === blinkSequence &&
      previous.automatic === autoBlinkSequence
    ) return;
    previousBlink.current = {
      manual: blinkSequence,
      automatic: autoBlinkSequence,
    };

    const blinkLayer = blinkLayerRef.current;
    const leftLid = leftLidRef.current;
    const rightLid = rightLidRef.current;
    const closedEyes = closedEyesRef.current;
    if (!blinkLayer || !leftLid || !rightLid || !closedEyes) return;

    function updateEyeClosure(amount: number) {
      const closing = clamp(amount);
      const openness = Math.max(0.025, 1 - closing);
      const fullyClosed = clamp((closing - 0.86) / 0.14);

      blinkLayer?.setAttribute("opacity", closing > 0.001 ? "1" : "0");
      leftLid?.setAttribute(
        "transform",
        `translate(0 524) scale(1 ${openness}) translate(0 -524)`,
      );
      rightLid?.setAttribute(
        "transform",
        `translate(0 531) scale(1 ${openness}) translate(0 -531)`,
      );
      leftLid?.setAttribute("opacity", String(1 - fullyClosed));
      rightLid?.setAttribute("opacity", String(1 - fullyClosed));
      closedEyes?.setAttribute("opacity", String(fullyClosed));
    }

    let actionTime = 0;
    let previousFrame: number | null = null;
    let frame = 0;

    function animate(now: number) {
      const delta =
        previousFrame === null ? 0 : Math.min(now - previousFrame, 80);
      previousFrame = now;
      actionTime += delta;
      const closure =
        actionTime < 100
          ? ease(actionTime / 100)
          : 1 - ease((actionTime - 145) / 150);

      updateEyeClosure(closure);
      if (actionTime >= 300) {
        updateEyeClosure(0);
        return;
      }
      frame = window.requestAnimationFrame(animate);
    }

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [autoBlinkSequence, blinkSequence]);

  return (
    <span
      ref={rootRef}
      className={`pofi-idle ${className}`.trim()}
      data-animation-active={isVisible ? "true" : "false"}
      style={{
        "--pofi-idle-width": `${width}px`,
        "--pofi-idle-height": `${height}px`,
      } as CSSProperties}
    >
      <span className="pofi-idle__sway">
        <span className="pofi-idle__breath">
          <img
            className="pofi-idle__base"
            src={BASE_IMAGE}
            width={width}
            height={height}
            alt={alt}
            fetchPriority={fetchPriority}
          />
          <svg
            className="pofi-idle__overlay"
            viewBox="0 0 1320 1320"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id={gradientId}>
                <stop offset=".76" stopColor="white" />
                <stop offset="1" stopColor="black" />
              </radialGradient>
              <mask
                id={maskId}
                maskUnits="userSpaceOnUse"
                x="460"
                y="430"
                width="470"
                height="190"
              >
                <ellipse
                  cx="539"
                  cy="524"
                  rx="71"
                  ry="87"
                  fill={`url(#${gradientId})`}
                />
                <ellipse
                  cx="855"
                  cy="531"
                  rx="71"
                  ry="87"
                  fill={`url(#${gradientId})`}
                />
              </mask>
              <clipPath id={leftEyeClipId}>
                <ellipse cx="539" cy="524" rx="50" ry="66" />
              </clipPath>
              <clipPath id={rightEyeClipId}>
                <ellipse cx="855" cy="531" rx="50" ry="66" />
              </clipPath>
            </defs>
            <g ref={blinkLayerRef} className="pofi-idle__blink" opacity="0">
              <image
                href={BLINK_PATCH}
                x="458"
                y="433"
                width="470"
                height="190"
                mask={`url(#${maskId})`}
                preserveAspectRatio="none"
              />
              <g ref={leftLidRef}>
                <image
                  href={BASE_IMAGE}
                  width="1320"
                  height="1320"
                  clipPath={`url(#${leftEyeClipId})`}
                />
              </g>
              <g ref={rightLidRef}>
                <image
                  href={BASE_IMAGE}
                  width="1320"
                  height="1320"
                  clipPath={`url(#${rightEyeClipId})`}
                />
              </g>
              <g
                ref={closedEyesRef}
                opacity="0"
                fill="none"
                stroke="#2b2240"
                strokeWidth="9"
                strokeLinecap="round"
              >
                <path d="M497 531 Q539 504 581 531" />
                <path d="M813 538 Q855 511 897 538" />
              </g>
            </g>
          </svg>
        </span>
      </span>
    </span>
  );
}
