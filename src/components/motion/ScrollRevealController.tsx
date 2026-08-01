import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

const revealSelector = [
  "main > header",
  "main > section",
  "main section",
  "main article",
  "main .card",
  "main .section-heading",
  "main .tab-shell",
  "main .admin-panel",
  "main .live-auction-stage > *",
  ".public-footer .footer-content > *",
].join(",");

function revealDirection(element: HTMLElement) {
  if (
    element.matches(
      ".live-visual-column, .detail-gallery, .winner-alert-body > :first-child",
    )
  )
    return "left";

  if (
    element.matches(
      ".live-competition-column, .detail-summary-card, aside, .winner-alert-body > :last-child",
    )
  )
    return "right";

  return "up";
}

function canAnimate(element: HTMLElement) {
  if (
    element.closest(
      '[role="dialog"], [aria-modal="true"], .sgdg-dialog__panel, [data-no-scroll-reveal]',
    )
  )
    return false;

  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
}

export function ScrollRevealController() {
  const location = useLocation();

  useLayoutEffect(() => {
    let observer: IntersectionObserver | null = null;
    document.documentElement.classList.remove("sgdg-scroll-motion-ready");
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(revealSelector),
    ).filter(canAnimate);

    elements.forEach((element, index) => {
      element.dataset.scrollReveal = "";
      element.dataset.scrollRevealDirection = revealDirection(element);
      element.style.setProperty(
        "--scroll-reveal-delay",
        `${Math.min(index % 4, 3) * 70}ms`,
      );
    });

    void document.documentElement.offsetHeight;
    document.documentElement.classList.add("sgdg-scroll-motion-ready");

    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      elements.forEach((element) =>
        element.classList.add("is-scroll-revealed"),
      );
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const element = entry.target as HTMLElement;
            element.classList.add("is-scroll-revealed");
            observer?.unobserve(element);
          });
        },
        {
          threshold: 0.08,
          rootMargin: "0px 0px -8% 0px",
        },
      );

      elements.forEach((element) => observer?.observe(element));
    }

    return () => {
      observer?.disconnect();
      document.documentElement.classList.remove("sgdg-scroll-motion-ready");
      elements.forEach((element) => {
        element.classList.remove("is-scroll-revealed");
        delete element.dataset.scrollReveal;
        delete element.dataset.scrollRevealDirection;
        element.style.removeProperty("--scroll-reveal-delay");
      });
    };
  }, [location.pathname]);

  return null;
}
