
import React, { useState, useCallback } from 'react';
import { QuestionIcon, XMarkIcon } from '../utils';
import AlertDialog from '../components/AlertDialog';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "¿Cómo creo un nuevo jugador?",
    answer: "Ve a \"Gestionar Jugadores\" desde el menú. En la sección \"Añadir Nuevo Jugador a Plantilla Global\", rellena los campos de nombre, número (opcional) y posición (opcional). Luego, pulsa el botón \"Añadir Jugador\". Si omites el nombre o el número, se generarán automáticamente. También puedes pegar una lista de nombres en el campo \"Nombre del Jugador\" para añadir varios jugadores a la vez; se les asignarán números secuenciales."
  },
  {
    question: "¿Cómo edito un jugador existente?",
    answer: "En \"Gestionar Jugadores\", busca al jugador en la lista de la plantilla global. Pulsa el icono del lápiz (Editar) junto al jugador. Modifica los datos en el formulario que aparece y pulsa el icono de guardar (disco) para confirmar los cambios."
  },
  {
    question: "¿Cómo configuro un nuevo partido?",
    answer: "Desde la página de Inicio, pulsa \"Nuevo Partido\" o ve a \"Configurar Partido\" desde el menú. En esta página, puedes ajustar las reglas del juego (número de cuartos, duración, faltas para bonus, etc.) usando los botones +/- o escribiendo directamente. Nombra a los equipos Local y Visitante, y selecciona los jugadores para cada equipo pulsando los botones azules con el ícono de \"añadir usuario\". Puedes cargar equipos predefinidos o seleccionar jugadores de tu plantilla global. Si no hay jugadores en la plantilla global al intentar seleccionar, el modal te guiará para ir a la gestión de jugadores. Una vez configurado, pulsa \"Iniciar Partido\"."
  },
  {
    question: "¿Cómo registro estadísticas durante un partido?",
    answer: "En la página del partido, selecciona la pestaña del equipo (Local o Visitante). Para los jugadores \"En Cancha\", verás botones de acceso rápido (+1, +2, +3, R, A, S, BLK, PF) para las estadísticas más comunes. También puedes pulsar el ícono de gráfico (Estadísticas Completas) junto al nombre del jugador para abrir un modal con todas las estadísticas detalladas. Los cambios en este modal se guardan automáticamente. Junto al nombre de cada jugador en cancha, verás un resumen de sus Puntos (PTS), Rebotes (REB), Asistencias (AST) y Faltas Personales (PF)."
  },
  {
    question: "¿Cómo realizo una sustitución?",
    answer: "En la página del partido, debajo de las listas de jugadores en cancha y banca de un equipo, pulsa el botón \"Sustitución\". Se abrirá un modal donde podrás seleccionar un jugador para que salga de la cancha y otro de la banca para que entre. Confirma para realizar el cambio."
  },
   {
    question: "¿Cómo se activan las expulsiones por faltas?",
    answer: "En la \"Configuración del Partido\", marca la casilla \"Permitir Expulsiones por Faltas\". Luego, establece el número de \"Faltas para Expulsión\". Durante el partido, si un jugador alcanza este límite, aparecerá un indicador \"EXPULSADO\" debajo de su nombre y no podrá registrar más estadísticas (excepto corregir una falta)."
  },
  {
    question: "¿Puedo añadir jugadores a un equipo durante un partido ya iniciado?",
    answer: "Sí. En la página del partido, debajo de la sección de la banca del equipo activo, encontrarás un botón \"Añadir Jugador (Plantilla)\". Esto te permitirá seleccionar jugadores de tu plantilla global que no estén participando ya en el partido (ni en tu equipo ni en el contrario) y añadirlos a la banca de tu equipo."
  },
  {
    question: "¿Cómo veo el historial de partidos?",
    answer: "Selecciona \"Historial\" en el menú de navegación. Verás una lista de todos los partidos completados. Puedes pulsar en cualquier partido para expandir sus detalles, incluyendo estadísticas de jugadores y puntuaciones por cuarto."
  },
  {
    question: "¿Cómo exporto las estadísticas de un partido?",
    answer: "En la página de \"Historial\", realiza una pulsación larga sobre la tarjeta del partido que deseas exportar (o haz clic si estás en escritorio). Aparecerá un menú contextual con la opción \"Exportar CSV\". También, si expandes los detalles del partido, encontrarás un botón similar."
  },
   {
    question: "¿Cómo cambio entre tema claro y oscuro?",
    answer: "Abre el menú de navegación (icono de tres puntos verticales en la esquina superior derecha). Encontrarás una opción para \"Cambiar a Tema Oscuro\" o \"Cambiar a Tema Claro\", dependiendo del tema actual. Púlsala para cambiar la apariencia de la aplicación."
  },
  {
    question: "¿Cómo gestiono los equipos (crear, asignar jugadores)?",
    answer: "Ve a \"Gestionar Jugadores\". En la sección \"Equipos\", puedes crear un nuevo equipo ingresando un nombre y pulsando \"Crear Equipo y Asignar Jugadores\". Esto abrirá un modal para seleccionar jugadores de tu plantilla global para ese nuevo equipo. Para equipos existentes, puedes editar su nombre o pulsar el icono de \"Gestionar Jugadores\" para cambiar los jugadores asignados."
  },
  {
    question: "¿Cómo selecciono varios jugadores o partidos para eliminarlos?",
    answer: "Tanto en la lista de jugadores de la \"Plantilla Global\" (en Gestionar Jugadores) como en la lista de partidos del \"Historial\", puedes realizar una pulsación larga sobre un elemento para activar el modo de selección múltiple (o un clic normal si estás en un dispositivo de escritorio y no hay un menú contextual). Aparecerán casillas de verificación para que selecciones los elementos que deseas. Luego, podrás usar el botón \"Eliminar Seleccionados\"."
  },
  {
    question: "¿Qué pasa si cierro la aplicación durante un partido?",
    answer: "El estado actual del partido se guarda automáticamente en tu dispositivo. Cuando vuelvas a abrir la aplicación, en la página de Inicio verás un botón \"Reanudar Partido\" que te permitirá continuar donde lo dejaste."
  },
  {
    question: "¿Los datos se guardan en la nube?",
    answer: "No, actualmente todos los datos de la aplicación (jugadores, equipos, historial de partidos) se guardan localmente en el almacenamiento de tu navegador. Si limpias los datos de navegación de este sitio, perderás toda la información registrada."
  },
];

const HelpPage: React.FC = React.memo(() => {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [formState, setFormState] = useState({ name: '', email: '', subject: '', message: '' });
  const [showConfirmation, setShowConfirmation] = useState(false);

  const toggleFAQ = useCallback((index: number) => {
    setOpenFAQ(prevOpenFAQ => (prevOpenFAQ === index ? null : index));
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd send this data to a server
    console.log("Form submitted (simulated):", formState);
    setShowConfirmation(true);
    setFormState({ name: '', email: '', subject: '', message: '' }); // Reset form
  }, [formState]);

  const closeConfirmation = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  return (
    <div className="container mx-auto px-4">
      <div className="space-y-8 py-6">
        <h1 className="text-4xl font-bold text-center text-gray-800 dark:text-white mb-10">Página de Ayuda</h1>

        <section className="bg-white dark:bg-brand-surface p-6 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center">
            <QuestionIcon className="w-7 h-7 mr-3 text-brand-accent" />
            Preguntas Frecuentes (FAQ)
          </h2>
          <div className="space-y-3">
            {faqData.map((item, index) => (
              <div key={index} className="border border-gray-200 dark:border-slate-700 rounded-md overflow-hidden">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex justify-between items-center p-4 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 focus:outline-none"
                  aria-expanded={openFAQ === index}
                  aria-controls={`faq-content-${index}`}
                >
                  <span className="text-md font-medium text-gray-700 dark:text-white text-left">{item.question}</span>
                  <span className={`transform transition-transform duration-200 ${openFAQ === index ? 'rotate-180' : 'rotate-0'}`}>
                    <svg className="w-5 h-5 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </span>
                </button>
                {openFAQ === index && (
                  <div id={`faq-content-${index}`} className="p-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-sm">
                    <p className="whitespace-pre-line">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-brand-surface p-6 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">Contactar Soporte (Simulación)</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nombre</label>
              <input
                type="text"
                name="name"
                id="name"
                value={formState.name}
                onChange={handleInputChange}
                required
                className="w-full p-2.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white border border-gray-300 dark:border-slate-600 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent select-auto"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Correo Electrónico</label>
              <input
                type="email"
                name="email"
                id="email"
                value={formState.email}
                onChange={handleInputChange}
                required
                className="w-full p-2.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white border border-gray-300 dark:border-slate-600 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent select-auto"
              />
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Asunto</label>
              <input
                type="text"
                name="subject"
                id="subject"
                value={formState.subject}
                onChange={handleInputChange}
                required
                className="w-full p-2.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white border border-gray-300 dark:border-slate-600 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent select-auto"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Mensaje</label>
              <textarea
                name="message"
                id="message"
                rows={4}
                value={formState.message}
                onChange={handleInputChange}
                required
                className="w-full p-2.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white border border-gray-300 dark:border-slate-600 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent select-auto"
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
            >
              Enviar Mensaje
            </button>
          </form>
        </section>

        <AlertDialog
          isOpen={showConfirmation}
          onClose={closeConfirmation}
          title="Mensaje Enviado (Simulación)"
        >
          <p>Tu mensaje ha sido enviado con éxito (simulación). Un miembro de nuestro equipo de soporte se pondrá en contacto contigo pronto.</p>
        </AlertDialog>
      </div>
    </div>
  );
});

export default HelpPage;
