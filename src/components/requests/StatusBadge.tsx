import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { 
  label: string; 
  icon: typeof Clock; 
  className: string;
}> = {
  pending: { 
    label: "Pending", 
    icon: Clock,
    className: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20"
  },
  in_progress: { 
    label: "In Progress", 
    icon: Loader2,
    className: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
  },
  completed: { 
    label: "Completed", 
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/20 hover:bg-success/20"
  },
  rejected: { 
    label: "Rejected", 
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`gap-1.5 font-medium transition-colors ${config.className}`}
    >
      <motion.div
        animate={status === 'in_progress' ? { rotate: 360 } : {}}
        transition={{ duration: 1, repeat: status === 'in_progress' ? Infinity : 0, ease: 'linear' }}
      >
        <Icon className="h-3 w-3" />
      </motion.div>
      {config.label}
    </Badge>
  );
}
