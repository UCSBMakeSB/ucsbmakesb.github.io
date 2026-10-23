import Image from "next/image";
import Form from "next/form";
import { Dropdown } from "../../components/dropdown";
import { FaqItem } from "../../components/faq-section";
import { Header, Footer } from "../../components/page-layout";

const applyUrl =
  "https://docs.google.com/forms/d/e/1FAIpQLSc69LeujVIem99yf-DhmwljMJxpeXlxWjMpiGqNGNK5MQrKGQ/viewform?usp=publish-editor";

const sponsorUrl =
  "mailto:patrick_liu@ucsb.edu?subject=MakeSB%202027%20Sponsorship";

const info = `Over 36+ hours, teams will design, prototype, and demo hardware projects using parts, tools, and resources provided at the event.

Event Details
Building Location: TBD
Cost: Free
Food and parts: Provided

Participants will have access to resources such as 3D printing through the Library and IEEE Makerspace, electronics components, cameras, displays, drone/RC parts, ESP32s, and other hardware supplies. You may also bring your own parts, but completed projects are not allowed.

Leading up to MakeSB, we will host MakeWeek, a series of hour-long workshops covering topics such as CAD, ESP32 development, electronics, and hardware prototyping.

You may register with a team of up to 4 people. Each team member must register individually and enter the exact same team name. If you do not have a team, register as an individual, and we will help place you into a team before or during the event.

We are also looking for volunteers, mentors, faculty, industry guests, and alumni who are interested in helping students build and refine their projects.

Prizes and Tracks will be released soon!
`;

const majors = [
  { value: "electrical-engineering", label: "Electrical Engineering" },
  { value: "computer-engineering", label: "Computer Engineering" },
  { value: "computer-science", label: "Computer Science" },
  { value: "mechanical-engineering", label: "Mechanical Engineering" },
  { value: "aerospace-engineering", label: "Aerospace Engineering" },
  { value: "math", label: "Math" },
  { value: "math-cs", label: "Math-CS" },
  { value: "data-science", label: "Data Science" },
  { value: "undeclared", label: "Undeclared" },
  { value: "other", label: "Other" },
];

const years = [
  { value: "freshman", label: "Freshman" },
  { value: "sophomore", label: "Sophomore" },
  { value: "junior", label: "Junior" },
  { value: "senior", label: "Senior" },
  { value: "5-plus-year", label: "5+ Year" },
  { value: "transfer-1st-year", label: "1st Year Transfer" },
  { value: "transfer-2nd-year", label: "2nd Year Transfer" },
  { value: "transfer-3rd-year", label: "3rd Year Transfer" },
  { value: "graduate", label: "Graduate" },
];

const ages = [
  { value: "under-18", label: "<18" },
  { value: "18", label: "18" },
  { value: "19", label: "19" },
  { value: "20", label: "20" },
  { value: "21", label: "21" },
  { value: "22", label: "22" },
  { value: "over-22", label: ">22" },
];

const countries = [
  { value: "united-states", label: "United States of America" },
  { value: "afghanistan", label: "Afghanistan" },
  { value: "albania", label: "Albania" },
  { value: "algeria", label: "Algeria" },
  { value: "argentina", label: "Argentina" },
  { value: "armenia", label: "Armenia" },
  { value: "australia", label: "Australia" },
  { value: "austria", label: "Austria" },
  { value: "azerbaijan", label: "Azerbaijan" },
  { value: "bahrain", label: "Bahrain" },
  { value: "bangladesh", label: "Bangladesh" },
  { value: "belarus", label: "Belarus" },
  { value: "belgium", label: "Belgium" },
  { value: "bolivia", label: "Bolivia" },
  { value: "bosnia-and-herzegovina", label: "Bosnia and Herzegovina" },
  { value: "brazil", label: "Brazil" },
  { value: "bulgaria", label: "Bulgaria" },
  { value: "cambodia", label: "Cambodia" },
  { value: "cameroon", label: "Cameroon" },
  { value: "canada", label: "Canada" },
  { value: "chile", label: "Chile" },
  { value: "china", label: "China" },
  { value: "colombia", label: "Colombia" },
  { value: "costa-rica", label: "Costa Rica" },
  { value: "croatia", label: "Croatia" },
  { value: "cuba", label: "Cuba" },
  { value: "cyprus", label: "Cyprus" },
  { value: "czech-republic", label: "Czech Republic" },
  { value: "denmark", label: "Denmark" },
  { value: "dominican-republic", label: "Dominican Republic" },
  { value: "ecuador", label: "Ecuador" },
  { value: "egypt", label: "Egypt" },
  { value: "el-salvador", label: "El Salvador" },
  { value: "estonia", label: "Estonia" },
  { value: "ethiopia", label: "Ethiopia" },
  { value: "finland", label: "Finland" },
  { value: "france", label: "France" },
  { value: "georgia", label: "Georgia" },
  { value: "germany", label: "Germany" },
  { value: "ghana", label: "Ghana" },
  { value: "greece", label: "Greece" },
  { value: "guatemala", label: "Guatemala" },
  { value: "honduras", label: "Honduras" },
  { value: "hong-kong", label: "Hong Kong" },
  { value: "hungary", label: "Hungary" },
  { value: "iceland", label: "Iceland" },
  { value: "india", label: "India" },
  { value: "indonesia", label: "Indonesia" },
  { value: "iran", label: "Iran" },
  { value: "iraq", label: "Iraq" },
  { value: "ireland", label: "Ireland" },
  { value: "israel", label: "Israel" },
  { value: "italy", label: "Italy" },
  { value: "jamaica", label: "Jamaica" },
  { value: "japan", label: "Japan" },
  { value: "jordan", label: "Jordan" },
  { value: "kazakhstan", label: "Kazakhstan" },
  { value: "kenya", label: "Kenya" },
  { value: "kuwait", label: "Kuwait" },
  { value: "latvia", label: "Latvia" },
  { value: "lebanon", label: "Lebanon" },
  { value: "lithuania", label: "Lithuania" },
  { value: "luxembourg", label: "Luxembourg" },
  { value: "malaysia", label: "Malaysia" },
  { value: "mexico", label: "Mexico" },
  { value: "morocco", label: "Morocco" },
  { value: "nepal", label: "Nepal" },
  { value: "netherlands", label: "Netherlands" },
  { value: "new-zealand", label: "New Zealand" },
  { value: "nicaragua", label: "Nicaragua" },
  { value: "nigeria", label: "Nigeria" },
  { value: "north-korea", label: "North Korea" },
  { value: "norway", label: "Norway" },
  { value: "pakistan", label: "Pakistan" },
  { value: "panama", label: "Panama" },
  { value: "paraguay", label: "Paraguay" },
  { value: "peru", label: "Peru" },
  { value: "philippines", label: "Philippines" },
  { value: "poland", label: "Poland" },
  { value: "portugal", label: "Portugal" },
  { value: "puerto-rico", label: "Puerto Rico" },
  { value: "qatar", label: "Qatar" },
  { value: "romania", label: "Romania" },
  { value: "russia", label: "Russia" },
  { value: "saudi-arabia", label: "Saudi Arabia" },
  { value: "serbia", label: "Serbia" },
  { value: "singapore", label: "Singapore" },
  { value: "slovakia", label: "Slovakia" },
  { value: "slovenia", label: "Slovenia" },
  { value: "south-africa", label: "South Africa" },
  { value: "south-korea", label: "South Korea" },
  { value: "spain", label: "Spain" },
  { value: "sri-lanka", label: "Sri Lanka" },
  { value: "sweden", label: "Sweden" },
  { value: "switzerland", label: "Switzerland" },
  { value: "syria", label: "Syria" },
  { value: "taiwan", label: "Taiwan" },
  { value: "thailand", label: "Thailand" },
  { value: "turkey", label: "Turkey" },
  { value: "ukraine", label: "Ukraine" },
  { value: "united-arab-emirates", label: "United Arab Emirates" },
  { value: "united-kingdom", label: "United Kingdom" },
  { value: "uruguay", label: "Uruguay" },
  { value: "uzbekistan", label: "Uzbekistan" },
  { value: "venezuela", label: "Venezuela" },
  { value: "vietnam", label: "Vietnam" },
  { value: "yemen", label: "Yemen" },
  { value: "zimbabwe", label: "Zimbabwe" },
  { value: "other", label: "Other" },
];

export default function Apply() {
  return (
    <>
      <Header fixed />
      <main id="main" className="hero apply-hero">
        <div id="form-main" className="form-main">
          <div className="form-header">
            <div>
              <h1 className="form-header-text">
                Build Something <span>Real</span>
              </h1>
              <h2>
                Register today for UCSB's first hardware hackathon and make
                something special. <em>How will you change the world?</em>
              </h2>
            </div>
            <div>
              <Image
                src="/assets/faq-smile.png"
                className="apply-bird"
                width={540 / 5}
                height={710 / 5}
                alt="Bird that's so excited for you to register that it's jumping up and down."
              />
              <div className="apply-bird-shadow" />
            </div>
          </div>

          <FaqItem question="Have questions?" answer={info} inline />

          <Form action="/apply" className="application-form">
            <div className="application-form-fields">
              <label
                className="application-form-field"
                htmlFor="preferred-first-name"
              >
                <span>Preferred first name</span>
                <input
                  id="preferred-first-name"
                  name="preferredFirstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  className="application-form-input"
                />
              </label>

              <label className="application-form-field" htmlFor="last-name">
                <span>Last name</span>
                <input
                  id="last-name"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  className="application-form-input"
                />
              </label>

              <label className="application-form-field" htmlFor="email">
                <span>Email</span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="application-form-input"
                />
              </label>

              <label className="application-form-field" htmlFor="mobile-number">
                <span>Mobile number</span>
                <input
                  id="mobile-number"
                  name="mobileNumber"
                  type="tel"
                  autoComplete="tel"
                  required
                  className="application-form-input"
                />
              </label>

              <label
                className="application-form-field"
                htmlFor="emergency-contact-name"
              >
                <span>Emergency contact name</span>
                <input
                  id="emergency-contact-name"
                  name="emergencyContactName"
                  type="text"
                  autoComplete="name"
                  required
                  className="application-form-input"
                />
              </label>

              <label
                className="application-form-field"
                htmlFor="emergency-contact-mobile-number"
              >
                <span>Emergency contact mobile number</span>
                <input
                  id="emergency-contact-mobile-number"
                  name="emergencyContactMobileNumber"
                  type="tel"
                  autoComplete="tel"
                  required
                  className="application-form-input"
                />
              </label>
            </div>

            <Dropdown
              id="major"
              label="College major"
              name="major"
              required
              options={majors}
            />

            <Dropdown
              id="year"
              label="College year"
              name="year"
              required
              options={years}
            />

            <Dropdown id="age" label="Age" name="age" required options={ages} />

            <Dropdown
              id="country"
              label="Country of Residence"
              name="country"
              required
              options={countries}
            />

            <Dropdown
              id="school"
              label="Institution"
              name="school"
              required
              options={[
                {
                  value: "ucsb",
                  label: "University of California, Santa Barbara (UCSB)",
                },
              ]}
            />

            <label className="application-form-field application-checkbox" htmlFor="waiver">
              <input
                type="checkbox"
                id="waiver"
                name="waiver"
                required
                className=""
              />
              <span>
                Do you understand that, you are personally responsible for your
                own well being including any injury, as well as that of any
                possessions you may bring?
              </span>
            </label>

            <button type="submit" className="application-form-submit">
              Continue
            </button>
          </Form>
        </div>
      </main>

      <Footer applyUrl={"/apply"} sponsorUrl={sponsorUrl} />
    </>
  );
}
