import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const teamScript = await readFile(new URL("../team.js", import.meta.url), "utf8");

function createElement() {
  const classes = new Set();
  const attributes = new Map();
  const listeners = new Map();

  return {
    hidden: false,
    offsetHeight: 20,
    offsetTop: 0,
    textContent: "",
    attributes,
    listeners,
    classList: {
      contains: (name) => classes.has(name),
      remove: (name) => classes.delete(name),
      toggle(name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
      },
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
  };
}

function createTeamEnvironment() {
  const teamDefinitions = [
    ["presidents", "Presidents", "♡"],
    ["design-develop", "Design & Develop", "✦"],
    ["marketing-outreach-graphics", "Marketing · Outreach · Graphics", "◎"],
    ["sponsorships-finances", "Sponsorships · Finances", "$"],
    ["makeops", "MakeOps", "⚙"],
  ];
  const departments = teamDefinitions.map(([id, teamName, teamIcon]) => ({
    ...createElement(),
    id,
    dataset: { teamName, teamIcon },
  }));
  const menuItems = teamDefinitions.map(() => {
    const item = createElement();
    const button = createElement();
    item.querySelector = (selector) => selector === "button" ? button : null;
    return item;
  });
  const previousButton = createElement();
  const nextButton = createElement();
  const handheld = createElement();
  const memberStage = createElement();
  const handheldScreen = createElement();
  const screenMenu = {
    ...createElement(),
    clientHeight: 100,
    scrollTo() {},
  };
  const screenCount = createElement();
  const currentTeamTitle = createElement();
  const currentTeamIcon = createElement();
  const elements = new Map([
    [".team-control-up", previousButton],
    [".team-control-down", nextButton],
    [".handheld", handheld],
    [".member-stage", memberStage],
    [".handheld-screen", handheldScreen],
    [".screen-menu", screenMenu],
    [".screen-count", screenCount],
    [".current-team-title", currentTeamTitle],
    [".current-team-icon", currentTeamIcon],
  ]);

  const document = {
    querySelector: (selector) => elements.get(selector) ?? null,
    querySelectorAll(selector) {
      if (selector === ".department") return departments;
      if (selector === ".screen-menu li") return menuItems;
      return [];
    },
  };

  vm.runInNewContext(teamScript, {
    document,
    window: { matchMedia: () => ({ matches: true }) },
  });

  return {
    departments,
    menuItems,
    previousButton,
    nextButton,
    screenCount,
    currentTeamTitle,
  };
}

test("disabled MakeOps is excluded from selection, navigation, and the counter", async () => {
  const environment = createTeamEnvironment();
  const makeOpsDepartment = environment.departments.at(-1);
  const makeOpsMenuItem = environment.menuItems.at(-1);

  assert.equal(makeOpsDepartment.hidden, true);
  assert.equal(makeOpsMenuItem.hidden, true);
  assert.equal(environment.menuItems.filter((item) => !item.hidden).length, 4);
  assert.equal(environment.currentTeamTitle.textContent, "Presidents");
  assert.equal(environment.screenCount.textContent, "01 / 04");

  await environment.previousButton.listeners.get("click")();
  assert.equal(environment.currentTeamTitle.textContent, "Sponsorships · Finances");
  assert.equal(environment.screenCount.textContent, "04 / 04");
  assert.equal(makeOpsDepartment.hidden, true);

  await environment.nextButton.listeners.get("click")();
  assert.equal(environment.currentTeamTitle.textContent, "Presidents");
  assert.equal(environment.screenCount.textContent, "01 / 04");
  assert.equal(makeOpsDepartment.hidden, true);
});
