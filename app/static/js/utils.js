export function showNotification(message, type = "info") {
  let notificationContainer = document.getElementById("notificationContainer");
  if (!notificationContainer) {
    notificationContainer = document.createElement("div");
    notificationContainer.id = "notificationContainer";
    notificationContainer.className = "fixed bottom-4 right-4 z-50";
    document.body.appendChild(notificationContainer);
  }

  const notification = document.createElement("div");
  notification.className = `mb-2 p-3 rounded-lg shadow-lg transition-all duration-300 transform translate-x-0 ${
    type === "success"
      ? "bg-green-500 text-white"
      : type === "error"
      ? "bg-red-500 text-white"
      : "bg-blue-500 text-white"
  }`;
  notification.innerHTML = message;
  notificationContainer.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("opacity-0", "translate-x-full");
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
