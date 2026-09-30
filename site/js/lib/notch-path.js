// Exact port of NotchShape.path (Sources/ClaudeMeter/NotchShape.swift).
// Quad curves; the top corners flare outward so the shape melts into the bezel.
export const notchPath = (w, h, rt, rb) =>
  `M0 0Q${rt} 0 ${rt} ${rt}L${rt} ${h - rb}Q${rt} ${h} ${rt + rb} ${h}L${w - rt - rb} ${h}Q${w - rt} ${h} ${w - rt} ${h - rb}L${w - rt} ${rt}Q${w - rt} 0 ${w} 0Z`;
