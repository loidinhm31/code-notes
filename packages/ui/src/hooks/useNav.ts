import { createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";

export const BasePathContext = createContext<string>("");
export const PortalContainerContext = createContext<HTMLElement | null>(null);

export function usePortalContainer() {
  return useContext(PortalContainerContext);
}

export function useNav() {
  const basePath = useContext(BasePathContext);
  const navigate = useNavigate();

  const to = (path: string) => (basePath ? `${basePath}/${path}` : path);

  const nav = (path: string) => navigate(to(path));

  return { to, nav };
}
