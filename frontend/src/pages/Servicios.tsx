import { useState } from "react";
import { Link } from "react-router-dom";

const services = [
  {
    index: "Servicio 01",
    name: "Radiografía Panorámica",
    description:
      "Vista completa de ambas arcadas, articulaciones y senos maxilares en una sola imagen. El punto de partida de toda evaluación dental completa.",
    bullets: [
      "Planificación de implantes",
      "Diagnóstico de nervios y conductos",
      "Detección de patologías óseas",
      "Planificación quirúrgica",
    ],
    image: "/images/service-img-a.png",
    imageRight: false,
  },
  {
    index: "Servicio 02",
    name: "Tomografía Dental 3D",
    description:
      "Vista completa de ambas arcadas, articulaciones y senos maxilares en una sola imagen. El punto de partida de toda evaluación dental completa.",
    bullets: [
      "Planificación de implantes",
      "Diagnóstico de nervios y conductos",
      "Detección de patologías óseas",
      "Planificación quirúrgica",
    ],
    image: "/images/service-img-b.png",
    imageRight: true,
  },
  {
    index: "Servicio 03",
    name: "Cefalometría Digital",
    description:
      "Vista completa de ambas arcadas, articulaciones y senos maxilares en una sola imagen. El punto de partida de toda evaluación dental completa.",
    bullets: [
      "Planificación de implantes",
      "Diagnóstico de nervios y conductos",
      "Detección de patologías óseas",
      "Planificación quirúrgica",
    ],
    image: "/images/service-img-a.png",
    imageRight: false,
  },
  {
    index: "Servicio 04",
    name: "Radiografía Periapical",
    description:
      "Vista completa de ambas arcadas, articulaciones y senos maxilares en una sola imagen. El punto de partida de toda evaluación dental completa.",
    bullets: [
      "Planificación de implantes",
      "Diagnóstico de nervios y conductos",
      "Detección de patologías óseas",
      "Planificación quirúrgica",
    ],
    image: "/images/service-img-b.png",
    imageRight: true,
  },
];

const faqs = [
  { question: "¿Necesito Orden Médica?", answer: "No, en OrthoRad puedes agendar tu estudio directamente sin necesitar una orden médica previa. Sin embargo, si tu médico te la proporcionó, traerla ayuda a orientar mejor el diagnóstico." },
  { question: "¿Recibo los resultados digitalmente?", answer: "Sí. Todos nuestros estudios se entregan en formato digital a través de nuestro Portal de Resultados Online. También puedes descargarlos en JPG o PDF." },
  { question: "¿Son dolorosos los estudios?", answer: "No. Los estudios de radiología dental son completamente indoloros y no invasivos. Solo requieren que estés quieto unos segundos durante la toma." },
  { question: "¿Qué tan segura es la radiación?", answer: "Nuestros equipos digitales utilizan dosis de radiación mínimas, muy por debajo de los límites de seguridad internacionales. Son seguros para adultos y, con protección adecuada, para niños." },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-secondary/20">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left font-quicksand font-medium text-white text-sm hover:text-alternative transition-colors"
      >
        <span>{question}</span>
        <span className="text-lg ml-4 flex-shrink-0">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <p className="pb-4 text-alternative text-sm leading-relaxed font-inter">{answer}</p>
      )}
    </div>
  );
}

export default function Servicios() {
  return (
    <>
      {/* Hero */}
      <section
        className="relative min-h-[50vh] flex items-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/servicios-hero.png')" }}
      >
        <div className="absolute inset-0 bg-primary/60" />
        <div className="relative z-10 max-w-7xl mx-auto px-10 py-20">
          <div className="max-w-xl">
            <h1 className="font-montserrat font-bold text-white text-4xl md:text-5xl leading-tight mb-4">
              Nuestros servicios radiológicos
            </h1>
            <p className="text-white/80 text-sm font-inter mb-8 leading-relaxed">
              Comprometidos con tu bienestar, resultados en menos de 48 horas.
            </p>
            <Link
              to="/agenda"
              className="bg-secondary text-white px-8 py-3 rounded-lg font-quicksand font-medium hover:bg-primary transition-colors inline-block"
            >
              Agendar Cita
            </Link>
          </div>
        </div>
      </section>

      {/* Alternating service cards */}
      {services.map(({ index, name, description, bullets, image, imageRight }, i) => (
        <section key={i} className={i % 2 === 0 ? "bg-white py-16" : "bg-background py-16"}>
          <div className="max-w-7xl mx-auto px-6">
            <div className={`grid md:grid-cols-2 gap-12 items-center ${imageRight ? "" : ""}`}>
              {/* Image — alternates position */}
              {!imageRight && (
                <div className="rounded-2xl overflow-hidden h-72">
                  <img src={image} alt={name} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Text */}
              <div>
                <p className="text-secondary text-xs font-quicksand font-semibold mb-2">{index}</p>
                <h2 className="font-montserrat font-bold text-primary text-2xl md:text-3xl mb-4">
                  {name}
                </h2>
                <p className="text-text text-sm leading-relaxed mb-5">{description}</p>
                <ul className="space-y-2 mb-7">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-text text-sm font-inter">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/agenda"
                  className="bg-secondary text-white px-7 py-2.5 rounded-lg font-quicksand font-medium text-sm hover:bg-primary transition-colors inline-block"
                >
                  Agendar Cita
                </Link>
              </div>

              {imageRight && (
                <div className="rounded-2xl overflow-hidden h-72">
                  <img src={image} alt={name} className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
        </section>
      ))}

      {/* FAQ */}
      <section className="bg-primary py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-alternative text-xs font-quicksand font-semibold uppercase tracking-widest mb-2">
              Preguntas frecuentes
            </p>
            <h2 className="font-montserrat font-normal text-white text-3xl md:text-4xl">
              Todo lo que necesitas saber
            </h2>
          </div>
          <div className="divide-y divide-secondary/20 border-t border-secondary/20">
            {faqs.map((faq) => (
              <FAQItem key={faq.question} {...faq} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-secondary py-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="font-montserrat font-bold text-white text-2xl md:text-3xl mb-3 leading-tight">
              Agenda tu estudio radiológico de forma rápida y segura.
            </h2>
            <p className="text-white/80 text-sm font-inter leading-relaxed">
              Nuestro equipo está listo para ayudarte con atención profesional y tecnología moderna en
              cada diagnóstico
            </p>
          </div>
          <Link
            to="/agenda"
            className="bg-white text-secondary px-8 py-3 rounded-lg font-quicksand font-semibold hover:bg-background transition-colors flex-shrink-0 whitespace-nowrap"
          >
            Agendar Cita
          </Link>
        </div>
      </section>
    </>
  );
}
