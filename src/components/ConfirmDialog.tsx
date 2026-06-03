import Modal from './Modal'

interface Props {
  titulo: string
  mensaje: string
  textoConfirmar?: string
  textoCancelar?: string
  // Estilo rojo para acciones destructivas (eliminar, cerrar etapa, etc.)
  peligro?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

// Diálogo de confirmación reutilizable sobre el Modal base. Sustituye a
// window.confirm para mantener coherencia visual con el resto de la app.
function ConfirmDialog({
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  peligro = false,
  onConfirmar,
  onCancelar,
}: Props) {
  return (
    <Modal titulo={titulo} onClose={onCancelar}>
      <div className="px-6 py-5">
        <p className="text-sm text-slate-600 leading-relaxed">{mensaje}</p>

        <div className="flex gap-3 pt-5">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 py-2 px-4 border border-gray-300 text-slate-700 font-medium rounded-lg text-sm
              hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className={`flex-1 py-2 px-4 text-white font-medium rounded-lg text-sm transition-colors
              focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                peligro
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
              }`}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmDialog
