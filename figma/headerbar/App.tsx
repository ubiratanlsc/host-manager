import { useState } from 'react';
import { MenuBar } from './components/MenuBar';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  const [showModal, setShowModal] = useState<string | null>(null);

  const handleNavigate = (route: string) => {
    console.log('Navegando para:', route);
    setCurrentRoute(route);
  };

  const handleCreateHost = () => {
    console.log('Criar novo host');
    setShowModal('host');
  };

  const handleCreateGroup = () => {
    console.log('Criar novo grupo');
    setShowModal('group');
  };

  const handleCreateTag = () => {
    console.log('Criar nova tag');
    setShowModal('tag');
  };

  const handleRequestClose = () => {
    // SEGURANÇA: Verifique se há alterações não salvas antes de fechar
    const hasUnsavedChanges = false; // Substitua pela sua lógica
    
    if (hasUnsavedChanges) {
      if (confirm('Você tem alterações não salvas. Deseja realmente sair?')) {
        // Permitir fechamento
        return true;
      }
      return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MenuBar
        onNavigate={handleNavigate}
        onCreateHost={handleCreateHost}
        onCreateGroup={handleCreateGroup}
        onCreateTag={handleCreateTag}
        onRequestClose={handleRequestClose}
      />
      
      <main className="pt-16 px-8">
        <div className="max-w-7xl mx-auto py-8">
          <h1 className="text-gray-900 dark:text-white mb-4">
            Rota atual: {currentRoute}
          </h1>
          
          {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-gray-900 dark:text-white mb-4">
                  Criar novo {showModal}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Este é um modal de exemplo. Substitua pelo seu formulário real.
                </p>
                <button
                  onClick={() => setShowModal(null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h2 className="text-gray-900 dark:text-white mb-2">Hosts</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Gerencie seus servidores e máquinas
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h2 className="text-gray-900 dark:text-white mb-2">Grupos</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Organize hosts em grupos lógicos
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h2 className="text-gray-900 dark:text-white mb-2">Tags</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Categorize com etiquetas personalizadas
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-blue-900 dark:text-blue-200 mb-2">
              Atalhos de teclado
            </h3>
            <ul className="text-blue-800 dark:text-blue-300 space-y-1">
              <li><kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs">Alt+1</kbd> Hosts</li>
              <li><kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs">Alt+2</kbd> Grupos</li>
              <li><kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs">Alt+3</kbd> Tags</li>
              <li><kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs">Alt+N</kbd> Menu Novo</li>
              <li><kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs">Ctrl+M</kbd> Minimizar</li>
              <li><kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs">Ctrl+Shift+M</kbd> Maximizar/Restaurar</li>
              <li><kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs">Ctrl+W</kbd> Fechar</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
