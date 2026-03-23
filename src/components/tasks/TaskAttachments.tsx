import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Paperclip, Download, Trash2, FileText, Image, FileSpreadsheet, File, Loader2 } from "lucide-react";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getFileIcon(type: string | null) {
  if (!type) return <File className="h-4 w-4 text-muted-foreground" />;
  if (type.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500" />;
  if (type === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  if (type.includes("spreadsheet") || type.includes("excel")) return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  if (type.includes("word") || type.includes("document")) return <FileText className="h-4 w-4 text-blue-600" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

interface Attachment {
  id: string;
  task_id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  created_at: string;
}

interface TaskAttachmentsProps {
  taskId: string;
}

export default function TaskAttachments({ taskId }: TaskAttachmentsProps) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAttachments = async () => {
    const { data } = await supabase
      .from("task_attachments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });
    setAttachments((data as Attachment[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAttachments();
  }, [taskId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > MAX_SIZE) {
      toast({ variant: "destructive", title: "Arquivo muito grande", description: "Máximo permitido: 5MB" });
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ variant: "destructive", title: "Tipo não permitido", description: "Envie imagens, PDF, Word, Excel ou TXT" });
      return;
    }

    setUploading(true);
    const path = `${taskId}/${crypto.randomUUID()}_${file.name}`;

    const { error: uploadError } = await supabase.storage.from("task-attachments").upload(path, file);
    if (uploadError) {
      toast({ variant: "destructive", title: "Erro no upload", description: uploadError.message });
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from("task_attachments").insert({
      task_id: taskId,
      user_id: user.id,
      file_name: file.name,
      file_url: path,
      file_type: file.type,
      file_size: file.size,
      storage_path: path,
    } as any);

    if (dbError) {
      toast({ variant: "destructive", title: "Erro ao salvar anexo", description: dbError.message });
    } else {
      toast({ title: "Arquivo anexado!" });
      fetchAttachments();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = async (attachment: Attachment) => {
    const storagePath = attachment.storage_path || attachment.file_url;
    const { data, error } = await supabase.storage.from("task-attachments").createSignedUrl(storagePath, 60);
    if (error || !data?.signedUrl) {
      toast({ variant: "destructive", title: "Erro ao gerar link de download" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (attachment: Attachment) => {
    const storagePath = attachment.storage_path || attachment.file_url;
    await supabase.storage.from("task-attachments").remove([storagePath]);
    const { error } = await supabase.from("task_attachments").delete().eq("id", attachment.id);
    if (error) {
      toast({ variant: "destructive", title: "Erro ao excluir anexo" });
    } else {
      toast({ title: "Anexo removido" });
      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
    }
  };

  const canDelete = (attachment: Attachment) =>
    attachment.user_id === user?.id || role === "admin";

  if (loading) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Anexos ({attachments.length})</span>
      </div>

      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              {getFileIcon(att.file_type)}
              <span className="flex-1 truncate">{att.file_name}</span>
              {att.file_size && (
                <span className="text-xs text-muted-foreground shrink-0">{formatSize(att.file_size)}</span>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDownload(att)}>
                <Download className="h-3.5 w-3.5" />
              </Button>
              {canDelete(att) && (
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive" onClick={() => handleDelete(att)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        onChange={handleUpload}
      />
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
        {uploading ? "Enviando..." : "Anexar Arquivo"}
      </Button>
    </div>
  );
}
