import { Link } from "react-router-dom";

const team = [
  {
    name: "Carlos Méndez",
    role: "Director Médico · Radiólogo Dental",
    bio: "Especialista en radiología oral y maxilofacial con más de 12 años de experiencia. Egresado de la Universidad de San Carlos de Guatemala con posgrado en diagnóstico radiológico.",
    image: "/images/doctor-1.png",
  },
  {
    name: "Carlos Méndez",
    role: "Director Médico · Radiólogo Dental",
    bio: "Especialista en radiología oral y maxilofacial con más de 12 años de experiencia. Egresado de la Universidad de San Carlos de Guatemala con posgrado en diagnóstico radiológico.",
    image: "/images/doctor-2.png",
  },
];

export default function SobreNosotros() {
  return (
    <>
      {/* Historia */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="font-montserrat font-semibold text-secondary text-base mb-1">Conozca</p>
              <h1 className="font-montserrat font-normal text-primary text-4xl md:text-5xl mb-8 leading-tight">
                Nuestra Historia
              </h1>
              <p className="text-text text-sm leading-relaxed mb-5">
                Nacimos para llenar un vacío real en los servicios de radiología e imagenología dental
                en Guatemala, una necesidad que se hizo cada vez más visible a medida que crecían los
                asegurados del sector privado y el sistema público se quedaba corto.
              </p>
              <p className="text-text text-sm leading-relaxed mb-8">
                Desde el primer día nos propusimos algo sencillo pero ambicioso: que cualquier persona
                pueda acceder a un servicio de calidad, con equipos de última tecnología.
              </p>
              <Link
                to="/agenda"
                className="bg-secondary text-white px-7 py-3 rounded-lg font-quicksand font-medium text-sm hover:bg-primary transition-colors inline-block"
              >
                Contáctanos
              </Link>
            </div>
            <div className="rounded-2xl overflow-hidden h-[440px]">
              <img
                src="/images/clinic-photo.png"
                alt="Clínica OrthoRad"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Nuestro Equipo */}
      <section className="bg-background py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-montserrat font-bold text-primary text-3xl md:text-4xl mb-4">
              Nuestro Equipo
            </h2>
            <p className="text-text text-sm max-w-lg mx-auto leading-relaxed">
              Especialistas certificados comprometidos con la excelencia diagnóstica reconocidos por su
              calidez y compromiso con sus pacientes.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {team.map(({ name, role, bio, image }, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-divider">
                <div className="h-56 overflow-hidden">
                  <img src={image} alt={name} className="w-full h-full object-cover object-top" />
                </div>
                <div className="p-6">
                  <h4 className="font-montserrat font-bold text-primary text-base mb-1">{name}</h4>
                  <p className="text-secondary text-xs font-quicksand mb-3">{role}</p>
                  <p className="text-text text-xs leading-relaxed">{bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="font-montserrat font-bold text-white text-2xl md:text-3xl mb-3 leading-tight">
              Tu diagnóstico preciso comienza aquí
            </h2>
            <p className="text-alternative text-sm font-inter leading-relaxed">
              Agenda hoy y recibe tu estudio radiológico con tecnología de punta, atención profesional
              y resultados digitales en 24 horas.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Link
              to="/agenda"
              className="bg-white text-primary px-8 py-3 rounded-lg font-quicksand font-semibold hover:bg-background transition-colors inline-block whitespace-nowrap"
            >
              Agendar Cita
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
