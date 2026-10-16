"use client";
import Room from "./pofi/room.js";
import Notebook from "./pofi/notebook.js";
import type { Report } from "@/domain/report";

export function PofiRoom({
  today,
  notes,
  onClose,
}: {
  today: string;
  notes?: Report["pofiNotes"];
  onClose: () => void;
}) {
  return (
    <Room onClose={onClose}>
      <Notebook key={today} today={today} notes={notes} />
    </Room>
  );
}
