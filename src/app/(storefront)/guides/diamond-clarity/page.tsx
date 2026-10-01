import type { Metadata } from "next";
import { GuideLayout, GuideSection } from "@/components/guides/guide-layout";
import { ClarityGuide } from "@/components/home/education";
import { guideBySlug } from "@/config/guides";
import { CLARITY_SCALE, CUT_GRADES } from "@/lib/jewelry";

const guide = guideBySlug("diamond-clarity");
export const metadata: Metadata = { title: guide.title, description: guide.description };

const SECTIONS = [
  { id: "scale", label: "The clarity scale" },
  { id: "explorer", label: "Clarity explorer" },
  { id: "eye-clean", label: "Where eye-clean begins" },
  { id: "four-cs", label: "Clarity and the other Cs" },
  { id: "lab-grown", label: "Lab-grown diamonds" },
  { id: "buying", label: "Buying on Loupe" },
];

const GROUPS = ["Flawless", "VVS", "VS", "SI", "Included"] as const;

export default function DiamondClarityGuide() {
  return (
    <GuideLayout slug="diamond-clarity" sections={SECTIONS} cta={{ label: "Shop GIA & IGI certified diamonds", href: "/shop?gem=diamond,lab-grown-diamond&cert=gia,igi" }}>
      <GuideSection id="scale" title="Eleven grades, one magnification">
        <p>
          Nearly every diamond formed with tiny crystals, feathers or clouds inside it — <strong>inclusions</strong> — and small marks on its surface, called{" "}
          <strong>blemishes</strong>. Clarity grades how visible those are to a trained grader looking through a 10× loupe, from Flawless to Included.
        </p>
        <div className="my-6 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-line text-[11px] tracking-[0.12em] text-muted uppercase">
                <th className="py-2.5 pr-3 font-medium">Grade</th>
                <th className="py-2.5 pr-3 font-medium">Name</th>
                <th className="py-2.5 font-medium">At 10× magnification</th>
              </tr>
            </thead>
            {GROUPS.map((group) => (
              <tbody key={group} className="border-b border-line">
                {CLARITY_SCALE.filter((g) => g.group === group).map((g) => (
                  <tr key={g.grade} className="align-top">
                    <td className="py-2.5 pr-3 font-mono text-[13px] text-gold-deep">{g.grade}</td>
                    <td className="py-2.5 pr-3 text-ink">{g.name}</td>
                    <td className="py-2.5 text-ink-soft">{g.detail}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
        <p>Graders consider five things: the size of each inclusion, how many there are, where they sit, what they are, and how much they contrast with the stone.</p>
      </GuideSection>

      <section id="explorer" aria-label="Clarity explorer" className="scroll-mt-28">
        <ClarityGuide guideLink={false} />
      </section>

      <GuideSection id="eye-clean" title="Where eye-clean begins">
        <p>
          The grade that matters most day to day is whether you can see anything without magnification. For most round brilliants under two carats, that line falls around{" "}
          <strong>VS2 to SI1</strong> — the sweet spot for value.
        </p>
        <ul>
          <li>
            <strong>Shape changes the answer.</strong> Brilliant cuts (round, oval, cushion) scatter light and hide inclusions well. Step cuts (emerald, Asscher) have long, open
            facets that act like windows — stay at VS2 or higher.
          </li>
          <li>
            <strong>Size changes it too.</strong> A larger stone has larger facets, so the same inclusion is easier to spot on three carats than on one.
          </li>
          <li>
            <strong>Position matters.</strong> An inclusion under a prong or near the edge can be invisible once set; one under the table (the flat top) is the first thing you
            see.
          </li>
        </ul>
        <p>When a listing says &ldquo;eye-clean&rdquo;, ask the jeweler for a face-up video — most on Loupe will send one the same day.</p>
      </GuideSection>

      <GuideSection id="four-cs" title="Clarity and the other Cs">
        <p>
          Clarity is rarely the best place to spend. <strong>Cut</strong> decides how much a diamond sparkles, so buy the best cut you can — graded from{" "}
          {Object.values(CUT_GRADES).join(", ").toLowerCase()} for round brilliants. <strong>Colour</strong> runs from D (colourless) down the alphabet; in yellow or rose gold,
          a G–J stone faces up beautifully white. <strong>Carat</strong> is weight, not size — two stones of the same weight can look quite different depending on how they&rsquo;re
          cut.
        </p>
        <p>A well-cut, G-colour, SI1 diamond will often look better — and cost far less — than a poorly cut D-flawless.</p>
      </GuideSection>

      <GuideSection id="lab-grown" title="Lab-grown diamonds">
        <p>
          Laboratory-grown diamonds are real diamonds — the same carbon crystal — grown in weeks rather than billions of years. They&rsquo;re graded on the same colour and
          clarity scales, most often by IGI, and every report states plainly that the stone is laboratory-grown. Many are laser-inscribed on the girdle to match.
        </p>
        <p>On Loupe, lab-grown stones are always labelled as such, and they have their own filter so you never mistake one for the other.</p>
      </GuideSection>

      <GuideSection id="buying" title="Buying a diamond on Loupe">
        <ul>
          <li>Filter by certification to see only diamonds with a GIA or IGI report attached.</li>
          <li>Open the report from the listing before you buy — every report number has been checked against the lab&rsquo;s own register by our team.</li>
          <li>When your piece arrives, compare the girdle inscription with the report. You have a three-day inspection window before the jeweler is paid.</li>
        </ul>
      </GuideSection>
    </GuideLayout>
  );
}
