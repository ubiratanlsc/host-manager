import { Pencil, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

export interface Tag {
  id: number;
  name: string;
  description: string;
  color: string;
}

interface TagCardProps {
  tag: Tag;
  onEdit: (tag: Tag) => void;
  onDelete: (id: number) => void;
}

export function TagCard({ tag, onEdit, onDelete }: TagCardProps) {
  // Função para verificar se a cor é clara ou escura
  const isLightColor = (hex: string) => {
    const rgb = parseInt(hex.substring(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    return luma > 186;
  };

  const textColor = isLightColor(tag.color) ? "#000000" : "#ffffff";

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] duration-200 rounded-xl">
      <div
        className="h-2"
        style={{ backgroundColor: tag.color }}
      />
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div
            className="px-3 py-1.5 rounded-lg inline-flex items-center gap-2"
            style={{ backgroundColor: tag.color }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: textColor, opacity: 0.7 }}
            />
            <span style={{ color: textColor }}>
              {tag.name}
            </span>
          </div>
        </div>

        <p className="text-muted-foreground mb-4 min-h-[3rem]">
          {tag.description}
        </p>

        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(tag)}
            className="flex-1 rounded-lg"
          >
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(tag.id)}
            className="rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
