"use strict";

import { compareStrings } from "./stringUtils.js";

const isContainerUp = (container) =>
  container.status.indexOf("Paused") === -1 && container.status.indexOf("Up") > -1;

const compareStatus = (a, b) => Number(isContainerUp(b)) - Number(isContainerUp(a));

const composeKey = (compose) => [
  compose.project,
  compose.configFiles,
  compose.workingDir,
].join("\u0000");

const compareComposeGroups = (a, b) => {
  const statusCompare = Number(b.running > 0) - Number(a.running > 0);
  if (statusCompare !== 0) return statusCompare;

  return compareStrings(getComposeLabel(a.compose), getComposeLabel(b.compose));
};

const compareByService = (a, b) => {
  const statusCompare = compareStatus(a, b);
  if (statusCompare !== 0) return statusCompare;

  return compareStrings(a.compose.service, b.compose.service);
};

export const getComposeCommandParams = (compose) => [
  "-f",
  `${compose.configFiles}`,
  "--project-directory",
  `${compose.workingDir}`,
  "-p",
  `${compose.project}`,
];

export const getComposeLabel = (compose) => compose.project;

export const groupComposeServices = (containers) => {
  const groups = new Map();
  const devcontainers = [];
  const singles = [];

  containers.forEach((container) => {
    if (!container.compose) {
      if (container.devcontainer) {
        devcontainers.push(container);
      } else {
        singles.push(container);
      }
      return;
    }

    const key = composeKey(container.compose);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        compose: container.compose,
        services: [],
        running: 0,
        total: 0,
      });
    }

    const group = groups.get(key);
    group.services.push(container);
    group.total += 1;
    if (isContainerUp(container)) group.running += 1;
  });

  const grouped = Array.from(groups.values()).map((group) => ({
    ...group,
    services: [...group.services].sort(compareByService),
  }));

  grouped.sort(compareComposeGroups);

  return { grouped, devcontainers, singles };
};

export const getComposeStatusClass = (running, total) => {
  if (running === 0) return "status-compose-stopped";
  if (running < total) return "status-compose-partial";
  return "status-compose-running";
};
