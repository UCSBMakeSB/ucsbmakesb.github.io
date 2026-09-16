const departments = Array.from(document.querySelectorAll(".department"));
const previousButton = document.querySelector(".team-control-up");
const nextButton = document.querySelector(".team-control-down");
const handheld = document.querySelector(".handheld");
const memberStage = document.querySelector(".member-stage");
const handheldScreen = document.querySelector(".handheld-screen");
const screenTeam = document.querySelector(".screen-team");
const screenIcon = document.querySelector(".screen-icon");
const screenCount = document.querySelector(".screen-count");
const currentTeamTitle = document.querySelector(".current-team-title");
const currentTeamIcon = document.querySelector(".current-team-icon");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let currentIndex = 0;
let isSwitching = false;

function paddedTeamNumber(index) {
  return String(index + 1).padStart(2, "0");
}

function updateTeamLabels(index) {
  const department = departments[index];
  const teamName = department.dataset.teamName;
  const teamIcon = department.dataset.teamIcon;

  screenTeam.textContent = teamName;
  screenIcon.textContent = teamIcon;
  screenCount.textContent = `Team ${paddedTeamNumber(index)} / ${paddedTeamNumber(departments.length - 1)}`;
  currentTeamTitle.textContent = teamName;
  currentTeamIcon.textContent = teamIcon;

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
