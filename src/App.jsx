import ShaderHero from "./ShaderHero.jsx";
import "./ShaderHero.css";

export default function App() {
  return (
    <>
      <ShaderHero>
        <p className="eyebrow">// learning in public — signal_04</p>
        <h1>
          Building fluency, <span>one shipped thing</span> at a time.
        </h1>
        <p className="sub">
          A running log of turning "AI is scary" into working software —
          prompts, agents, and the occasional shader, documented as I go.
        </p>
        <a className="cta" href="#work">
          See the build log →
        </a>
      </ShaderHero>

      <section id="work" style={{ padding: "80px 24px", color: "#f5f1e8" }}>
        <p style={{ opacity: 0.6, maxWidth: 560 }}>
          Rest of the page goes here — this section just proves the hero
          scrolls out of the way like a normal section.
        </p>
      </section>
    </>
  );
}
