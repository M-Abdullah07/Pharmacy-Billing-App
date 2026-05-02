import React from "react";
import { AlertTriangle, X } from "lucide-react";

export function ConfirmDialog({ open, title, message, onConfirm, onClose, confirmText = "Confirm", cancelText = "Cancel", type = "danger" }) {
  if (!open) return null;

  const btnClass = type === "danger" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2 text-red-600">
            {type === "danger" && <AlertTriangle size={20} />}
            <h3 className="font-semibold text-lg">{title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 text-gray-600">
          {message}
        </div>
        <div className="flex justify-end space-x-2 p-4 bg-gray-50 border-t">
          <button onClick={onClose} className="px-4 py-2 border rounded-md hover:bg-gray-100 font-medium">
            {cancelText}
          </button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`px-4 py-2 rounded-md font-medium ${btnClass}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
