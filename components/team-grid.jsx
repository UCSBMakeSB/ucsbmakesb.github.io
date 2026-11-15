import Image from "next/image";
import { team } from "../lib/team";

// Everyone at once, as instant photos pinned or taped to a cork board.
// Each print gets its own tilt and drop so the wall looks hand-hung.
const hang = [
  { r: -3, y: 0, fix: "tape" },
  { r: 2.5, y: 18, fix: "pin" },
  { r: -1.5, y: 6, fix: "pin" },
  { r: 3, y: 26, fix: "tape" },
  { r: -2.5, y: 4, fix: "pin" },
  { r: 2, y: 10, fix: "pin" },
  { r: -3.5, y: 28, fix: "tape" },
  { r: 1.5, y: 2, fix: "pin" },
  { r: -2, y: 20, fix: "tape" },
  { r: 3.5, y: 8, fix: "pin" },
];

export function TeamGrid() {
  return (
    <ul className="team-grid">
      {team.map(({ name, role, photo, position }, i) => {
        const { r, y, fix } = hang[i % hang.length];
        return (
          <li key={name} style={{ "--r": `${r}deg`, "--y": `${y}px` }} data-fix={fix}>
            <span className="team-fix" aria-hidden="true" />
            <div className="team-photo">
              <Image
                src={photo}
                alt={`${name}, ${role}`}
                fill
                sizes="(max-width: 600px) 42vw, 210px"
                style={{ objectPosition: position }}
              />
            </div>
            <p className="team-name">{name}</p>
            <p className="team-role">{role}</p>
          </li>
        );
      })}
    </ul>
  );
}
