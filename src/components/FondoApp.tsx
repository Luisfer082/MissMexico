import fondoHorizontal from '../assets/fondo-horizontal.webp'
import fondoVertical from '../assets/fondo-vertical.webp'

// Fondo oficial de Miss México, fijo detrás de todo el contenido.
// Con <picture> el navegador descarga solo la versión de la orientación actual
// (vertical en celular / tableta parada, horizontal en tableta acostada / laptop).
// Es un div fijo y no `background-attachment: fixed`, que en iOS se ve roto.
// El contenedor que lo use debe llevar `isolate` para que el -z-10 quede
// detrás de su contenido y no detrás del body.
function FondoApp() {
  return (
    <picture className="fixed inset-0 -z-10 bg-marino-950" aria-hidden="true">
      <source media="(orientation: portrait)" srcSet={fondoVertical} />
      <img src={fondoHorizontal} alt="" className="w-full h-full object-cover" />
    </picture>
  )
}

export default FondoApp
