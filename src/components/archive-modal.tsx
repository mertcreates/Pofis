import SourceModal from "./modal.js";
import type { ReactNode } from "react";

export type ModalProps = {
  open?: boolean;
  title: string;
  description?: string;
  className?: string;
  onClose: () => void;
  onBack?: () => void;
  backLabel?: string;
  onTitleClick?: () => void;
  children: ReactNode;
};
export default function ArchiveModal({
  open = true,
  description,
  onBack,
  backLabel,
  onTitleClick,
  ...props
}: ModalProps) {
  return (
    <SourceModal
      {...props}
      open={open}
      onTitleClick={onTitleClick}
      description={description}
      onBack={onBack}
      backLabel={backLabel}
    />
  );
}
