import { useEffect, useRef } from 'react'

interface Props {
  titulo: string
  onClose: () => void
  children: React.ReactNode
}

// Modal base sobre el elemento <dialog> nativo: gestiona Escape, trampa de
// foco y backdrop sin listeners globales. Accesible por defecto (role dialog
// y aria-modal los aporta el navegador con showModal()).
function Modal({ titulo, onClose, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    // Bloquear el scroll del fondo mientras el modal está abierto.
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Clic sobre el backdrop (el propio <dialog>, no su contenido) cierra.
  const handleClickFondo = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleClickFondo}
      // max-h + flex: el header queda fijo y el contenido largo hace scroll
      // dentro del modal, para que en tableta horizontal (768px de alto) los
      // botones de guardar sigan siendo alcanzables.
      className="w-full max-w-md p-0 rounded-2xl bg-white shadow-xl backdrop:bg-black/50
        max-h-[90vh] flex flex-col"
    >
      {/* Header del modal */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="overflow-y-auto">{children}</div>
    </dialog>
  )
}

export default Modal
