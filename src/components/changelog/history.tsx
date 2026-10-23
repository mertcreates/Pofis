"use client";

import { useEffect, useRef, useState } from "react";
import { version as currentVersion } from "../../../package.json";
import { changelog as bundledChangelog } from "@/data/changelog";
import { parseChangelog, type ChangelogRelease } from "@/domain/changelog";
import { ui } from "@/lib/ui-text.js";
import "./history.css";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function releaseId(version: string) {
  return `surum-${version.replaceAll(".", "-")}`;
}

function releaseGroups(release: ChangelogRelease) {
  return [
    [ui.changelog.categories.features, release.features],
    [ui.changelog.categories.fixes, release.fixes],
    [ui.changelog.categories.maintenance, release.maintenance],
  ].filter((group): group is [string, readonly string[]] => !!group[1]?.length);
}

export function ChangelogHistory({ focusVersion, onBack }: {
  focusVersion?: string;
  onBack?: () => void;
}) {
  const [releases, setReleases] = useState<readonly ChangelogRelease[]>(bundledChangelog);
  const [remoteSettled, setRemoteSettled] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const focused = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/changelog", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const next = parseChangelog((await response.json()).releases);
        if (active) setReleases(next);
      })
      .catch(error => console.warn(ui.diagnostics.changelogLoadFailed,
        error instanceof Error ? error.message : "UnknownError"))
      .finally(() => { if (active) setRemoteSettled(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const release = focusVersion ? releases.find(item => item.version === focusVersion) : undefined;
    if (focusVersion && !release && !remoteSettled) return;
    const key = release?.version ?? "top";
    if (focused.current === key) return;
    focused.current = key;
    const target = release
      ? document.querySelector<HTMLElement>(`#${releaseId(release.version)} h2`)
      : titleRef.current;
    if (!target) return;
    target.scrollIntoView({ block: "start" });
    target.focus({ preventScroll: true });
  }, [focusVersion, releases, remoteSettled]);

  return <section className="changelog-page" aria-labelledby="changelog-title">
    <header className="changelog-header">
      <h1 id="changelog-title" ref={titleRef} tabIndex={-1}>{ui.changelog.title}</h1>
      {onBack && <button type="button" className="text-button changelog-back" onClick={onBack}>
        {ui.changelog.back}
      </button>}
    </header>
    <ol className="changelog-timeline">
      {releases.map((release, index) => {
        const isCurrent = release.version === currentVersion;
        const isTarget = release.version === focusVersion;
        return <li className="changelog-stop" data-latest={index === 0 || undefined}
          data-target={isTarget || undefined} key={release.version}>
          <span className="changelog-marker" aria-hidden="true" />
          <article className="changelog-release" id={releaseId(release.version)}
            aria-labelledby={`${releaseId(release.version)}-title`} aria-current={isCurrent ? "true" : undefined}>
            <header className="changelog-release-header">
              <div>
                <h2 id={`${releaseId(release.version)}-title`} data-changelog-version={release.version} tabIndex={-1}>v{release.version}</h2>
                <time dateTime={release.publishedOn}>
                  {dateFormatter.format(new Date(`${release.publishedOn}T12:00:00Z`))}
                </time>
              </div>
              {isCurrent && <span className="changelog-current">{ui.changelog.current}</span>}
            </header>
            <div className="changelog-groups">
              {releaseGroups(release).map(([title, items]) => <section className="changelog-group" key={title}>
                <h3>{title}</h3>
                <ul>{items.map(item => <li key={item}>{item}</li>)}</ul>
              </section>)}
            </div>
          </article>
        </li>;
      })}
    </ol>
  </section>;
}
