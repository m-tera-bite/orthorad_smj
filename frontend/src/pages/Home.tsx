import { Link } from "react-router-dom";
import VennDiagram from "../components/VennDiagram";

const services = [
  { index: "01", name: "Tomografía Dental 3D", duration: "10-20 min" },
  { index: "02", name: "Cefalometría Digital", duration: "10-20 min" },
  { index: "03", name: "Radiografía Panorámica", duration: "10-20 min" },
  { index: "04", name: "Radiografía Periapical", duration: "10-20 min" },
  { index: "05", name: "Radiografías Bite Wing", duration: "10-20 min" },
];

const steps = [
  {
    number: "01",
    title: "Agenda tu cita",
    description:
      "Elige el especialista, la fecha y el horario que más te convenga desde nuestra app o sitio web. Recibe confirmación inmediata.",
  },
  {
    number: "02",
    title: "Evaluación integral",
    description:
      "El médico revisa tu historial, realiza el examen clínico y solicita los estudios necesarios. Todo queda en tu expediente digital.",
  },
  {
    number: "03",
    title: "Seguimiento personalizado",
    description:
      "Recibe tu plan de tratamiento, recordatorios de medicación y acceso directo a tu médico para cualquier duda.",
  },
];

const reviews = [
  { name: "Maria Perez", service: "Cefalometría Digital" },
  { name: "Maria Perez", service: "Cefalometría Digital" },
  { name: "Maria Perez", service: "Cefalometría Digital" },
];

const reviewText =
  '"Lo que más valoro es la continuidad del cuidado. Mi médico recuerda mi historial completo en cada visita y me llama para verificar cómo estoy. Nunca había sentido ese nivel de compromiso en otro centro médico."';

export default function Home() {
  return (
    <>
      {/* Hero — Mensaje Principal | Figma: 1440×809, pad=120 all sides */}
      <section
        className="relative flex items-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/hero-bg.png')", minHeight: "809px" }}
      >
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 w-full py-[120px]">
          <div className="max-w-[573px]">
            <h1 className="font-montserrat font-bold text-primary text-[48px] leading-[1] tracking-heading mb-6">
              Radiología dental moderna para diagnósticos más precisos
            </h1>
            <p className="text-text font-inter text-base leading-[1.6] mb-10">
              Tecnología avanzada, imágenes de alta calidad y atención profesional diseñada para
              brindar confianza en cada estudio
            </p>
            <div className="flex gap-[47px] flex-wrap">
              <Link
                to="/agenda"
                className="bg-secondary text-white px-[46px] py-[10px] rounded-[5px] font-inter text-base leading-[1.6] hover:bg-primary transition-colors"
              >
                Agendar Cita
              </Link>
              <Link
                to="/sobre-nosotros"
                className="border border-primary text-primary bg-white/70 px-[46px] py-[10px] rounded-[5px] font-inter text-base leading-[1.6] hover:bg-primary hover:text-white transition-colors"
              >
                Contáctanos
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Comprometidos con tu salud | Figma: 1440×734, pad=120 L/R */}
      <section id="por-que-elegirnos" className="bg-primary" style={{ minHeight: "734px" }}>
        <div
          className="max-w-[1200px] mx-auto px-6 flex items-center"
          style={{ minHeight: "734px" }}
        >
          <div className="flex items-center gap-[169px] w-full">
            {/* Left: text + buttons | Figma: Frame 83 = 611×233 */}
            <div className="flex flex-col gap-[17px]" style={{ maxWidth: "611px" }}>
              <div className="flex flex-col gap-[17px]">
                <h2
                  className="font-montserrat font-bold text-white text-[48px] leading-[1] tracking-heading"
                >
                  Comprometidos con tu salud
                </h2>
                <p className="text-alternative font-inter text-base leading-[1.6]">
                  Tres pilares, un mismo compromiso.
                  <br />
                  Cada estudio en OrthoRad reúne precisión, seguridad y atención humana.
                </p>
              </div>
              <div className="flex gap-[255px] items-center mt-[12px]">
                <div className="flex gap-4">
                  <Link
                    to="/sobre-nosotros"
                    className="border border-alternative text-alternative px-[10px] py-[10px] rounded-[5px] font-inter text-base hover:bg-alternative hover:text-primary transition-colors whitespace-nowrap"
                  >
                    Sobre Nosotros
                  </Link>
                  <Link
                    to="/agenda"
                    className="bg-secondary text-white px-[10px] py-[10px] rounded-[5px] font-inter text-base hover:bg-alternative hover:text-primary transition-colors whitespace-nowrap"
                  >
                    Reserva tu cupo
                  </Link>
                </div>
              </div>
            </div>

            {/* Right: Venn diagram | Figma: Frame 84 = 584×595, image 549×549 */}
            <div className="flex-shrink-0 flex items-center justify-center">
              <VennDiagram />
            </div>
          </div>
        </div>
      </section>

      {/* Servicios de diagnóstico integral | Figma: 1440×960 */}
      <section className="bg-white" style={{ minHeight: "960px" }}>
        {/* Header: 1440×216, pad 60/120 */}
        <div className="max-w-[1200px] mx-auto px-6 pt-[60px] pb-[60px]">
          <div className="flex gap-[75px] items-start">
            <h2 className="font-montserrat font-bold text-primary text-[48px] leading-[1] tracking-heading whitespace-pre-line flex-shrink-0" style={{ maxWidth: "468px" }}>
              {"Servicios de\ndiagnóstico integral"}
            </h2>
            <p className="text-text font-inter text-base leading-[1.6] pt-3" style={{ maxWidth: "597px" }}>
              Contamos con una amplia gama de estudios atendidos por especialistas certificados,
              con resultados digitales en menos de 24 horas.
            </p>
          </div>
        </div>

        {/* Services grid: image left 600px + list right 600px, pad L/R 120 */}
        <div className="max-w-[1200px] mx-auto px-6 pb-[60px]">
          <div className="flex gap-0 items-stretch" style={{ minHeight: "570px" }}>
            {/* Image: 600×570 */}
            <div className="overflow-hidden rounded-l-xl" style={{ width: "600px", minHeight: "570px", padding: "10px" }}>
              <img
                src="/images/services-img.png"
                alt="Radiografía dental"
                className="w-full h-full object-cover rounded-xl"
                style={{ height: "550px" }}
              />
            </div>

            {/* Service list: 600×570, each item 600×93 pad 38/40 */}
            <div style={{ width: "600px" }}>
              {services.map(({ index, name, duration }) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b border-divider group"
                  style={{ height: "93px", paddingTop: "38px", paddingBottom: "38px", paddingLeft: "40px", paddingRight: "40px" }}
                >
                  <div className="flex items-center" style={{ gap: "129px" }}>
                    <span className="font-montserrat text-alternative font-semibold text-xs w-6 flex-shrink-0">
                      {index}
                    </span>
                    <span className="font-montserrat font-medium text-primary text-sm group-hover:text-secondary transition-colors">
                      {name}
                    </span>
                  </div>
                  <span className="text-xs text-text font-quicksand bg-background px-3 py-1 rounded-full border border-divider flex-shrink-0">
                    {duration}
                  </span>
                </div>
              ))}
              <div className="pt-8 px-10">
                <Link
                  to="/servicios"
                  className="border-2 border-secondary text-secondary px-8 py-3 rounded-lg font-quicksand font-medium text-sm hover:bg-secondary hover:text-white transition-colors inline-block"
                >
                  Ver todos los servicios
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tecnología | Figma: 1440×1118, pad=120 all sides, gap=36 */}
      <section className="bg-background-alt" style={{ minHeight: "1118px" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-[120px] flex flex-col gap-9">
          {/* Text block: 1112×167 gap=52 */}
          <div className="flex flex-col" style={{ gap: "52px" }}>
            <div>
              <h2
                className="font-montserrat font-bold text-primary text-[48px] leading-[1] tracking-heading text-center"
                style={{ maxWidth: "1112px" }}
              >
                Las mejores herramientas para que tu experiencia sea segura, fluida y moderna.
              </h2>
            </div>
            <p
              className="text-text font-inter text-[20px] leading-[35px] tracking-body text-center mx-auto"
              style={{ maxWidth: "691px" }}
            >
              Trabajamos con equipos radiológicos digitales modernos que permiten obtener imágenes
              más claras, rápidas y seguras.
            </p>
          </div>
          {/* Image container: 1105×596 r=10 */}
          <div
            className="overflow-hidden mx-auto w-full"
            style={{ borderRadius: "10px", maxWidth: "1105px", height: "596px" }}
          >
            <img
              src="/images/technology-img.png"
              alt="Tecnología radiológica"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Agenda en 1 minuto | Figma: 1440×692, gap=34 */}
      <section className="bg-primary" style={{ minHeight: "692px" }}>
        {/* Header: 1440×138, pad 17 top/bottom */}
        <div className="py-[17px] pt-[34px]">
          <div className="max-w-[1440px] px-[60px]">
            <h2
              className="font-montserrat font-normal text-white text-[56px] leading-[1] tracking-agenda text-center w-full"
            >
              Agenda en 1 minuto
            </h2>
          </div>
          <p className="text-alternative font-inter text-base leading-[1.6] text-center mt-2">
            Tres pasos simples para recibir la atención médica que mereces, cuando y donde la
            necesites.
          </p>
        </div>

        {/* Information Cards: 1440×287, pad L/R 120, gap=54 */}
        <div className="max-w-[1200px] mx-auto px-6 flex gap-[54px] justify-center mt-[34px]">
          {steps.map(({ number, title, description }) => (
            <div
              key={number}
              className="bg-secondary/20 flex-1 flex flex-col justify-between"
              style={{ borderRadius: "10px", height: "287px", padding: "36px 36px 36px 36px" }}
            >
              <span
                className="font-montserrat font-normal text-white tracking-agenda"
                style={{ fontSize: "56px", lineHeight: "1" }}
              >
                {number}
              </span>
              <div className="flex flex-col" style={{ gap: "15px" }}>
                <p className="font-montserrat font-semibold text-white text-sm">{title}</p>
                <p className="text-alternative font-inter text-xs leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Button */}
        <div className="flex justify-center mt-[34px] pb-[34px]">
          <Link
            to="/agenda"
            className="bg-secondary text-white px-10 py-3 rounded-[5px] font-inter text-base hover:bg-alternative hover:text-primary transition-colors"
          >
            Agendar Ahora
          </Link>
        </div>
      </section>

      {/* Reviews | Figma: 1440×763 */}
      <section className="bg-white" style={{ minHeight: "763px" }}>
        {/* Header: pad 17 top/bottom */}
        <div className="py-[34px]">
          <p className="font-quicksand font-semibold text-secondary uppercase tracking-widest text-xs text-center mb-2">
            Lo que dicen
          </p>
          <h2 className="font-montserrat font-bold text-primary text-[48px] leading-[1] tracking-heading text-center">
            NUESTROS PACIENTES
          </h2>
          <p className="text-text font-inter text-base text-center mt-3">
            Estas son algunas de sus historias.
          </p>
        </div>

        {/* Reviews list: pad L/R 120, gap=72 */}
        <div className="max-w-[1200px] mx-auto px-6 flex gap-[72px] justify-center pb-10">
          {reviews.map(({ name, service }, i) => (
            <div
              key={i}
              className="bg-background-alt border border-divider flex flex-col justify-between"
              style={{
                borderRadius: "10px",
                width: "352px",
                minHeight: "376px",
                paddingTop: "50px",
                paddingBottom: "50px",
                paddingLeft: "30px",
                paddingRight: "30px",
                gap: "28px",
              }}
            >
              <div className="flex gap-1">
                {[...Array(5)].map((_, s) => (
                  <span key={s} className="text-secondary text-sm">★</span>
                ))}
              </div>
              <p className="text-text font-inter text-sm leading-[1.6] italic flex-1">{reviewText}</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-white text-xs font-montserrat font-bold flex-shrink-0">
                  {name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-primary font-montserrat font-semibold text-sm">{name}</p>
                  <p className="text-text text-xs font-quicksand">{service}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation dots */}
        <div className="flex justify-center gap-2 pb-8">
          <button className="w-2.5 h-2.5 rounded-full bg-secondary" />
          <button className="w-2.5 h-2.5 rounded-full bg-divider" />
          <button className="w-2.5 h-2.5 rounded-full bg-divider" />
        </div>
      </section>

      {/* CTA | Figma: 1440×365, pad 88/120, gap=37 */}
      <section className="bg-secondary" style={{ minHeight: "365px" }}>
        <div
          className="max-w-[1200px] mx-auto px-6 flex items-center justify-between"
          style={{ minHeight: "365px", gap: "37px" }}
        >
          {/* Container: 714×189, gap=15 */}
          <div className="flex flex-col" style={{ maxWidth: "714px", gap: "15px" }}>
            <h2 className="font-montserrat font-bold text-white text-[48px] leading-[1] tracking-heading">
              Agenda tu estudio radiológico de forma rápida y segura.
            </h2>
            <p className="text-white/80 font-inter text-[20px] leading-[35px] tracking-body">
              Nuestro equipo está listo para ayudarte con atención profesional y tecnología moderna
              en cada diagnóstico
            </p>
          </div>
          <div className="flex-shrink-0">
            <Link
              to="/agenda"
              className="bg-white text-secondary px-10 py-[10px] rounded-[5px] font-inter text-base hover:bg-background transition-colors inline-block whitespace-nowrap"
            >
              Agendar Cita
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
