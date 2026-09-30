/** Qué bordes de una tira con desplazamiento horizontal tienen contenido oculto (para difuminarlos). */
export function scrollEdges(el: Pick<HTMLElement, 'scrollLeft' | 'scrollWidth' | 'clientWidth'>): { start: boolean; end: boolean } {
  // 1 px de margen: con zoom del navegador scrollLeft puede quedarse en decimales
  return {
    start: el.scrollLeft > 1,
    end: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
  };
}
