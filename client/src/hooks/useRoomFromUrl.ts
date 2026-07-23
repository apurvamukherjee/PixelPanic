import { useParams } from "react-router-dom";

export function useRoomFromUrl(): string | null {
  const { code } = useParams<{ code: string }>();
  return code ? code.toUpperCase() : null;
}
