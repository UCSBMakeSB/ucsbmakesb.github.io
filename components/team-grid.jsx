import Image from "next/image";
import { team } from "../lib/team";

export function TeamGrid() {
  return (
    <ul className="team-grid">
      {team.map(({ name, role, photo, position }) => (
        <li key={name}>
          <div className="team-photo">
            <Image
              src={photo}
              alt={`${name}, ${role}`}
              fill
              sizes="(max-width: 600px) 45vw, 220px"
              style={{ objectPosition: position }}
            />
          </div>
          <p className="team-name">{name}</p>
          <p className="team-role">{role}</p>
        </li>
      ))}
    </ul>
  );
}
