import { useState, useCallback } from 'react';
import { FileUp, Loader2, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ParsedQuestion {
  question_text: string;
  explanation: string;
  options: Array<{
    option_label: string;
    option_text: string;
    is_correct: boolean;
  }>;
}

interface MCQPDFUploaderProps {
  onParsed: (questions: ParsedQuestion[]) => void;
}

export function MCQPDFUploader({ onParsed }: MCQPDFUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === 'application/pdf') {
      setFile(droppedFile);
    } else {
      toast.error('Please upload a PDF file');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile?.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      toast.error('Please upload a PDF file');
    }
  };

  const handleParse = async () => {
    if (!file) return;

    setIsParsing(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:application/pdf;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('parse-mcq-pdf', {
        body: { pdfBase64: base64, fileName: file.name },
      });

      if (error) throw error;

      if (data.questions && data.questions.length > 0) {
        onParsed(data.questions);
        setFile(null);
      } else {
        toast.error('No questions detected in PDF. Please check the format.');
      }
    } catch (error: any) {
      console.error('PDF parse error:', error);
      toast.error(error.message || 'Failed to parse PDF');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <p className="mb-2">Upload a PDF containing MCQs. The AI will extract:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Questions and options from the document</li>
          <li>Answer keys (even if on separate pages)</li>
          <li>Works best with clearly formatted MCQs</li>
        </ul>
      </div>

      {!file ? (
        <Card
          className={cn(
            "border-2 border-dashed cursor-pointer transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="py-12">
            <label className="flex flex-col items-center cursor-pointer">
              <FileUp className={cn(
                "w-12 h-12 mb-4 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
              <p className="text-sm font-medium mb-1">
                {isDragging ? "Drop PDF here" : "Upload PDF"}
              </p>
              <p className="text-xs text-muted-foreground">
                Drag & drop or click to browse
              </p>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <CardContent className="py-4 flex items-center gap-3">
            <File className="w-8 h-8 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFile(null)}
              className="shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Button 
        onClick={handleParse} 
        disabled={!file || isParsing}
        className="w-full gap-2"
      >
        {isParsing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing PDF...
          </>
        ) : (
          <>
            <FileUp className="w-4 h-4" />
            Parse PDF with AI
          </>
        )}
      </Button>
    </div>
  );
}
