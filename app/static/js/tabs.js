export function setupTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active', 'bg-white', 'font-bold'));
      document.querySelectorAll('.tab').forEach((t) => t.classList.add('bg-gray-200'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.add('hidden'));

      tab.classList.add('active', 'bg-white', 'font-bold');
      tab.classList.remove('bg-gray-200');
      document.getElementById(`${tabName}-tab`).classList.remove('hidden');
    });
  });
}