import { useState } from "react";
import { Plus, Moon, Sun, Tags } from "lucide-react";
import { TagCard, Tag } from "./components/TagCard";
import { TagModal } from "./components/TagModal";
import { Button } from "./components/ui/button";

// Dados iniciais de exemplo
const INITIAL_TAGS: Tag[] = [
  {
    id: 1,
    name: "Frontend",
    description: "Desenvolvimento de interfaces de usuário e experiência do usuário",
    color: "#3b82f6",
  },
  {
    id: 2,
    name: "Backend",
    description: "Lógica de servidor, APIs e bancos de dados",
    color: "#10b981",
  },
  {
    id: 3,
    name: "Design",
    description: "UI/UX, design de interfaces e prototipagem",
    color: "#ec4899",
  },
  {
    id: 4,
    name: "DevOps",
    description: "Infraestrutura, deployment e automação",
    color: "#f59e0b",
  },
  {
    id: 5,
    name: "Mobile",
    description: "Desenvolvimento de aplicações móveis nativas e híbridas",
    color: "#8b5cf6",
  },
  {
    id: 6,
    name: "Testing",
    description: "Testes automatizados, QA e garantia de qualidade",
    color: "#06b6d4",
  },
  {
    id: 7,
    name: "Security",
    description: "Segurança de aplicações e proteção de dados",
    color: "#ef4444",
  },
  {
    id: 8,
    name: "Analytics",
    description: "Análise de dados, métricas e relatórios",
    color: "#84cc16",
  },
];

export default function App() {
  const [tags, setTags] = useState<Tag[]>(INITIAL_TAGS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Função para adicionar ou editar tag
  const handleSaveTag = (tagData: Omit<Tag, "id"> & { id?: number }) => {
    if (tagData.id) {
      // Editar tag existente
      setTags(tags.map((tag) => 
        tag.id === tagData.id 
          ? { ...tag, ...tagData } as Tag
          : tag
      ));
    } else {
      // Criar nova tag
      const newTag: Tag = {
        ...tagData,
        id: Math.max(...tags.map(t => t.id), 0) + 1,
      } as Tag;
      setTags([...tags, newTag]);
    }
  };

  // Função para deletar tag
  const handleDeleteTag = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta tag?")) {
      setTags(tags.filter((tag) => tag.id !== id));
    }
  };

  // Função para abrir modal de edição
  const handleEditTag = (tag: Tag) => {
    setSelectedTag(tag);
    setIsModalOpen(true);
  };

  // Função para abrir modal de criação
  const handleCreateTag = () => {
    setSelectedTag(null);
    setIsModalOpen(true);
  };

  // Função para fechar modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTag(null);
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className={`min-h-screen transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Tags className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1>Galeria de Tags</h1>
                <p className="text-muted-foreground">
                  Gerencie todas as tags do sistema
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleDarkMode}
                className="rounded-lg"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>

              <Button
                onClick={handleCreateTag}
                className="rounded-lg gap-2"
              >
                <Plus className="w-5 h-5" />
                Nova Tag
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-muted-foreground">
            <span>{tags.length} {tags.length === 1 ? "tag" : "tags"} cadastradas</span>
          </div>
        </div>

        {/* Grid de Tags */}
        {tags.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Tags className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="mb-2">Nenhuma tag cadastrada</h3>
            <p className="text-muted-foreground mb-6">
              Comece criando sua primeira tag
            </p>
            <Button onClick={handleCreateTag} className="rounded-lg gap-2">
              <Plus className="w-5 h-5" />
              Criar Primeira Tag
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tags.map((tag) => (
              <TagCard
                key={tag.id}
                tag={tag}
                onEdit={handleEditTag}
                onDelete={handleDeleteTag}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <TagModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveTag}
        tag={selectedTag}
      />
    </div>
  );
}
