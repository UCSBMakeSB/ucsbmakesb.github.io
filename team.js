const departmentLinks = Array.from(
  document.querySelectorAll('.department-nav a[href^="#"]'),
);

const linksByDepartment = new Map(
  departmentLinks.map((link) => [link.hash.slice(1), link]),
);

const departments = Array.from(document.querySelectorAll(".department"));

function setActiveDepartment(departmentId) {
  departmentLinks.forEach((link) => {
    if (link.hash === `#${departmentId}`) {
      link.setAttribute("aria-current", "true");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

departmentLinks.forEach((link) => {
  link.addEventListener("click", () => {
    setActiveDepartment(link.hash.slice(1));
  });
});

if ("IntersectionObserver" in window) {
  const departmentObserver = new IntersectionObserver(
    (entries) => {
      const currentDepartment = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => first.boundingClientRect.top - second.boundingClientRect.top)[0];

      if (currentDepartment && linksByDepartment.has(currentDepartment.target.id)) {
        setActiveDepartment(currentDepartment.target.id);
      }
    },
    {
      rootMargin: "-24% 0px -68% 0px",
      threshold: 0,
    },
  );

  departments.forEach((department) => departmentObserver.observe(department));
}
