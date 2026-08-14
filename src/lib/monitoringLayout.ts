/**
 * Grid kartu titik pantau (dashboard publik & admin).
 * `auto-fit` + `minmax` supaya jumlah kolom mengikuti lebar viewport dan jumlah perangkat (1–N) tetap rapi dan setinggi.
 */
export function getMonitoringGridClass(deviceCount: number): string {
  const gap = 'gap-4 sm:gap-5';
  const align = 'items-stretch';
  if (deviceCount <= 0) {
    return `grid w-full grid-cols-1 ${gap} ${align}`;
  }
  if (deviceCount === 1) {
    return `grid w-full grid-cols-1 ${gap} ${align} mx-auto max-w-xl`;
  }
  /* min ~260px per kolom: 3 titik sejajar mulai ~≥900px lebar konten; mobile tetap 1 kolom penuh */
  return `grid w-full ${gap} ${align} [grid-template-columns:repeat(auto-fit,minmax(min(100%,16.25rem),1fr))]`;
}
