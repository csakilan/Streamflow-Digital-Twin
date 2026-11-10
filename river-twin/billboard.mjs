/** A label's local rotation must cancel its containing graph's world rotation. */
export function faceSceneLabels(labels,camera){
 const facing=camera.getWorldQuaternion(camera.quaternion.clone());
 for(const mesh of labels){
  const parent=mesh.parent.getWorldQuaternion(mesh.quaternion.clone());
  mesh.quaternion.copy(parent.invert()).multiply(facing);
 }
}
