export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
        <p className="text-base text-gray-800 text-center">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-700 text-sm py-3 rounded-xl font-medium"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 text-white text-sm py-3 rounded-xl font-medium"
          >
            Да
          </button>
        </div>
      </div>
    </div>
  )
}
