const teamSection = document.querySelector("#team");

async function loadTeamSection() {
  try {
    const response = await fetch("team/");

    if (!response.ok) {
      throw new Error(`Unable to load team section (${response.status})`);
    }

    const teamDocument = new DOMParser().parseFromString(await response.text(), "text/html");
    const sourceContent = teamDocument.querySelector(".team-content");

    if (!sourceContent) {
      throw new Error("Team section markup was not found");
    }

    const teamPageUrl = new URL(".", response.url);

    sourceContent.querySelectorAll("img[src]").forEach((image) => {
      image.src = new URL(image.getAttribute("src"), teamPageUrl).href;
    });

    sourceContent.querySelector(".team-footer")?.remove();

    const inlineContent = document.createElement("div");
    inlineContent.id = "team-content";
    inlineContent.className = sourceContent.className;
    inlineContent.append(...sourceContent.children);

    teamSection.querySelector(".team-section-loading")?.replaceWith(inlineContent);
    teamSection.setAttribute("aria-busy", "false");

    await import("./team.js");
  } catch (error) {
    const loadingMessage = teamSection.querySelector(".team-section-loading");

    if (loadingMessage) {
      loadingMessage.textContent = "The team section could not be loaded.";
    }

    teamSection.setAttribute("aria-busy", "false");
    console.error(error);
  }
}

loadTeamSection();
