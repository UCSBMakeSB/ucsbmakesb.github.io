const TEAM_GROUP_CONFIG = Object.freeze({
  makeops: { enabled: false },
});

const allDepartments = Array.from(document.querySelectorAll(".department"));
const allScreenMenuItems = Array.from(document.querySelectorAll(".screen-menu li"));
const previousButton = document.querySelector(".team-control-up");
const nextButton = document.querySelector(".team-control-down");
const handheld = document.querySelector(".handheld");
const memberStage = document.querySelector(".member-stage");
const handheldScreen = document.querySelector(".handheld-screen");
const screenMenu = document.querySelector(".screen-menu");
const screenCount = document.querySelector(".screen-count");
const currentTeamTitle = document.querySelector(".current-team-title");
const currentTeamIcon = document.querySelector(".current-team-icon");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const visibleTeamEntries = allDepartments
  .map((department, index) => ({
    department,
    menuItem: allScreenMenuItems[index],
    enabled: TEAM_GROUP_CONFIG[department.id]?.enabled !== false,
  }))
  .filter(({ enabled }) => enabled);

allDepartments.forEach((department) => {
  department.hidden = true;
});

allScreenMenuItems.forEach((item) => {
  item.hidden = true;
  item.classList.remove("is-selected");
  item.removeAttribute("aria-current");
  item.querySelector("button")?.setAttribute("aria-pressed", "false");
});

visibleTeamEntries.forEach(({ menuItem }) => {
  menuItem.hidden = false;
});

const departments = visibleTeamEntries.map(({ department }) => department);
const screenMenuItems = visibleTeamEntries.map(({ menuItem }) => menuItem);

let currentIndex = 0;
let isSwitching = false;

function paddedTeamNumber(index) {
  return String(index + 1).padStart(2, "0");
}

function updateTeamLabels(index) {
  const department = departments[index];
  const teamName = department.dataset.teamName;
  const teamIcon = department.dataset.teamIcon;

  screenCount.textContent = `${paddedTeamNumber(index)} / ${paddedTeamNumber(departments.length - 1)}`;
  currentTeamTitle.textContent = teamName;
  currentTeamIcon.textContent = teamIcon;

  screenMenuItems.forEach((item, itemIndex) => {
    const isCurrent = itemIndex === index;
    const itemButton = item.querySelector("button");
    item.classList.toggle("is-selected", isCurrent);
    itemButton?.setAttribute("aria-pressed", String(isCurrent));

    if (isCurrent) {
      item.setAttribute("aria-current", "true");
      const centeredOffset = item.offsetTop - (screenMenu.clientHeight - item.offsetHeight) / 2;
      screenMenu.scrollTo({
        top: Math.max(0, centeredOffset),
        behavior: reduceMotion.matches ? "auto" : "smooth",
      });
    } else {
      item.removeAttribute("aria-current");
    }
  });

}

function showTeam(index) {
  departments.forEach((department, departmentIndex) => {
    department.hidden = departmentIndex !== index;
  });
  updateTeamLabels(index);
  currentIndex = index;
}

async function switchTeam(nextIndex) {
  const normalizedIndex = (nextIndex + departments.length) % departments.length;

  if (normalizedIndex === currentIndex || isSwitching) {
    return;
  }

  if (reduceMotion.matches || typeof memberStage.animate !== "function") {
    showTeam(normalizedIndex);
    return;
  }

  isSwitching = true;
  const direction = normalizedIndex > currentIndex || (currentIndex === departments.length - 1 && normalizedIndex === 0) ? 1 : -1;

  try {
    await Promise.all([
      memberStage.animate(
        [
          { opacity: 1, transform: "translateY(0)" },
          { opacity: 0, transform: `translateY(${-8 * direction}px)` },
        ],
        { duration: 110, easing: "ease-in", fill: "forwards" },
      ).finished,
      handheldScreen.animate(
        [
          { opacity: 1, transform: "translateX(0)" },
          { opacity: 0.55, transform: `translateX(${-5 * direction}px)` },
        ],
        { duration: 110, easing: "ease-in", fill: "forwards" },
      ).finished,
    ]);

    showTeam(normalizedIndex);

    await Promise.all([
      memberStage.animate(
        [
          { opacity: 0, transform: `translateY(${10 * direction}px)` },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 150, easing: "ease-out", fill: "forwards" },
      ).finished,
      handheldScreen.animate(
        [
          { opacity: 0.55, transform: `translateX(${5 * direction}px)` },
          { opacity: 1, transform: "translateX(0)" },
        ],
        { duration: 150, easing: "ease-out", fill: "forwards" },
      ).finished,
    ]);
  } finally {
    isSwitching = false;
  }
}

previousButton.addEventListener("click", () => switchTeam(currentIndex - 1));
nextButton.addEventListener("click", () => switchTeam(currentIndex + 1));

screenMenuItems.forEach((item, itemIndex) => {
  item.addEventListener("click", () => switchTeam(itemIndex));
});

handheld.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp") {
    event.preventDefault();
    switchTeam(currentIndex - 1);
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    switchTeam(currentIndex + 1);
  }
});

showTeam(currentIndex);
