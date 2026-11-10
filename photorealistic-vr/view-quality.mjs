/** Keep a 4 km neighborhood visible around the focus, in full-size or miniature units. */
export function studyRange(focusDistance,metersToScene=1){
  if(!Number.isFinite(focusDistance)||focusDistance<0||!Number.isFinite(metersToScene)||metersToScene<=0)throw RangeError('Invalid study-view distance or scale');
  // Quantize upward to avoid changing the projection for every small orbit movement.
  const farMeters=Math.ceil((focusDistance/metersToScene+4000)/250)*250;
  return {far:farMeters*metersToScene,fogNear:(farMeters-1000)*metersToScene};
}
